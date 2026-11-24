import {FOOTER_HANDOFF} from './footer-inquiry.js';
import {track} from '../analytics.js';
import {saveDraft,hasMessage,readContactEntry} from './hero-typewriter.js';
import {MessageEditor, messageLimitError} from './message-editor.js';
import {TransitionMotion} from './transition-motion.js';
import {brandEntrance} from './brand-loader.js';
import {MeetingCalendar} from './meeting-calendar.js';
import {BookingAction} from './booking-action.js';
import {SUBJECTS,ENGAGEMENTS,BUDGET_RANGES,budgetLabel,emailError,topicFromMessage,formatMeeting} from './inquiry-details.js';

export const FLOW_KEY = 'mihail:hero-flow:v1';
export const STEP = Object.freeze({answer:0,engagement:1,budget:2,preference:3,calendar:4,email:5,review:6,complete:7});

export function readFlow(storage,key=FLOW_KEY) {
  let saved;
  try { saved=JSON.parse(storage.getItem(key)||'{}'); } catch { /* Storage is optional. */ }
  const text=(key,max)=>typeof saved?.[key]==='string'?saved[key].slice(0,max):'';
  return {
    message:text('message',Infinity)||text('topic',200),
    subject:SUBJECTS.some(s=>s.id===saved?.subject)?saved.subject:'',
    engagement:ENGAGEMENTS.some(e=>e.id===saved?.engagement)?saved.engagement:'',
    budget:BUDGET_RANGES.some(range=>range.id===saved?.budget)?saved.budget:'',
    meeting:['yes','no'].includes(saved?.meeting)?saved.meeting:'',
    email:text('email',254)
  };
}

export function answerError(message,subject) {
  return messageLimitError(message) || (!hasMessage(message)&&!subject?'Tell me a little about what you’re working on.':'');
}

export function previousInquiryStep(step,meeting) {
  if(step===STEP.email)return meeting==='yes'?STEP.calendar:STEP.preference;
  return step-1;
}

export function inquiryPayload(answers,entryTopic='') {
  const service=SUBJECTS.find(s=>s.id===answers.subject);
  return {
    name:'',company:'',email:answers.email.trim(),subject:answers.subject,engagement:answers.engagement,
    ...(answers.budget?{budget:answers.budget}:{}),
    topic:entryTopic||service?.label||topicFromMessage(answers.message)||'Design inquiry',
    message:answers.message.trim()||service?.prompt||''
  };
}

export function formatInquiry(answers,entryTopic) {
  const a=inquiryPayload(answers,entryTopic),engagement=ENGAGEMENTS.find(e=>e.id===a.engagement)?.label;
  return [a.topic,engagement,budgetLabel(a),a.email,a.message].filter(Boolean).join('\n\n');
}

function element(tag,className,text) {
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text)el.textContent=text;
  return el;
}

function control(label,className,type='button') {
  const el=element('button',className,label);
  el.type=type;
  return el;
}

export class HeroInquiry {
  constructor(shell){
    this.shell=shell;this.hero=shell.querySelector('.figma-hero');this.container=shell.querySelector('.hero-introduction');
    this.idle=shell.querySelector('.hero-idle');this.editor=shell.querySelector('interactive-typewriter');
    this.panel=shell.querySelector('.hero-flow-panel');this.content=this.panel.querySelector('.hero-step-content');
    this.back=this.panel.querySelector('.hero-flow-back');this.progress=this.panel.querySelector('.hero-flow-progress');
    this.form=this.panel.querySelector('form');this.motion=matchMedia('(prefers-reduced-motion: reduce)');
    this.transition=new TransitionMotion(this.motion);
    try{this.storage=sessionStorage;}catch{}
    this.direct=shell.hasAttribute('data-inquiry-entry');
    const entry=this.direct?readContactEntry(this.storage,location,history):null;
    this.flowKey=entry?.caseSlug?FLOW_KEY+':case:'+entry.caseSlug:FLOW_KEY;
    this.draftKey=entry?.draftKey;
    this.entryTopic=entry?.topic;
    this.answers=readFlow(this.storage,this.flowKey);this.active=false;this.busy=false;this.step=STEP.answer;
    this.surroundings=[document.querySelector('#navigation'),document.querySelector('.menu-toggle'),this.hero.querySelector('.hero-portrait'),shell.querySelector('.hero-client-strip'),...document.querySelectorAll('main > :not(.figma-hero-shell)'),document.querySelector('main + .wrap')].filter(Boolean);
    this.originalStates=new Map();this.downloadURL='';this.siteKey=shell.dataset.turnstileSiteKey||'';this.preview=shell.dataset.inquiryPreview==='true'||document.body.dataset.localBookingPreview==='true';this.booking=null;this.bookingBusy=false;this.meetingSelection=null;
    this.editor.addEventListener('hero-inquiry-start',event=>{event.preventDefault();this.start(event.detail.message);});
    this.editor.addEventListener('hero-inquiry-reset',()=>this.resetDraft());
    this.form.addEventListener('submit',event=>{event.preventDefault();this.next();});
    this.form.addEventListener('input',event=>{const field=event.target.closest('[data-answer]');if(field){this.answers[field.name]=field.value;this.persist();this.clearError(field);this.resizeField(field);}});
    this.form.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229&&event.target.matches('[data-answer]')){event.preventDefault();this.next();}});
    this.back.addEventListener('click',()=>{if(this.busy||this.bookingBusy)return;if(this.step===STEP.complete)this.completeAndReturn();else if(this.step===STEP.answer)this.exit();else this.changeStep(previousInquiryStep(this.step,this.answers.meeting));});
    this.panel.addEventListener('click',event=>{const edit=event.target.closest('[data-edit-step]');if(edit&&!this.busy)this.changeStep(Number(edit.dataset.editStep));if(event.target.closest('[data-download]'))this.download();});
    this.idle.querySelectorAll('button[data-subject]').forEach(button=>button.addEventListener('click',()=>this.chooseSubject(button.dataset.subject)));
    document.querySelector('.hero-brand')?.addEventListener('click',event=>{if(this.active){event.preventDefault();if(!this.bookingBusy)this.exit();}});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented&&this.active&&!this.bookingBusy){event.preventDefault();this.exit();}});
    const contactButton=document.querySelector('.nav-contact');
    contactButton?.addEventListener('click',event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      this.start(this.editor.input.value,{trigger:contactButton});
    });
    window.addEventListener('popstate',event=>{
      if(this.direct)return;
      if(event.state?.heroInquiry){
        if(!this.active)this.start(this.editor.input.value,{trigger:event.state.viaContact?contactButton:null,fromHistory:true});
      }else if(this.active&&!this.bookingBusy)this.exit(false);
    });
    window.addEventListener('pagehide',event=>{if(!event.persisted)this.booking?.destroy();if(this.downloadURL)URL.revokeObjectURL(this.downloadURL);});
    this.panel.addEventListener('meeting-busy',event=>{this.bookingBusy=event.detail;this.back.disabled=event.detail;for(const control of this.panel.querySelectorAll('[data-edit-step],[data-download],[data-finish]'))control.disabled=event.detail;});
    this.updateSubjectUI();
    if(entry){this.start(entry.message);return;}
    if(history.state?.viaContact)this.start(this.editor.input.value,{trigger:contactButton,fromHistory:true});
    document.addEventListener('portfolio-inquiry',event=>{event.preventDefault();this.start(event.detail.message);});
    try{const pending=this.storage?.getItem(FOOTER_HANDOFF);if(pending&&hasMessage(pending)&&!messageLimitError(pending)){requestAnimationFrame(async()=>{await brandEntrance?.promise;await this.start(pending);if(this.active)this.storage?.removeItem(FOOTER_HANDOFF);});}}catch{}
  }
  persist(){try{this.storage?.setItem(this.flowKey||FLOW_KEY,JSON.stringify(this.answers));}catch{}saveDraft(this.storage,this.answers.message,this.draftKey);}
  updateSubjectUI(){
    this.editor.dataset.subject=this.answers.subject;
    this.idle.querySelectorAll('button[data-subject]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.subject===this.answers.subject)));
    this.editor.syncInput();
  }
  resetDraft(){
    this.answers.message='';this.answers.subject='';this.answers.engagement='';this.answers.budget='';this.answers.meeting='';
    this.meetingSelection=null;this.persist();this.updateSubjectUI();
  }
  chooseSubject(id){
    if(this.active||this.busy||!SUBJECTS.some(s=>s.id===id))return;
    if(this.answers.subject===id){this.answers.subject='';this.persist();this.updateSubjectUI();return;}
    this.answers.subject=id;
    this.start(this.editor.input.value);
  }
  async start(message,{trigger=null,fromHistory=false}={}){
    if(this.active||this.busy||(!this.direct&&!trigger&&!fromHistory&&!this.answers.subject&&!hasMessage(message)))return;
    this.entryTrigger=trigger;
    this.answers.message=message;this.persist();
    // A typed message with no suggestion already answers the first question, so go straight to how we'd work together.
    this.step=!this.answers.subject&&hasMessage(message)?STEP.engagement:STEP.answer;
    this.active=true;this.busy=true;
    this.originalStates.clear();
    for(const el of this.surroundings)this.originalStates.set(el,{inert:el.inert,hidden:el.hidden});
    if(!this.direct){
      try{
        if(!fromHistory)history.pushState({...history.state,heroInquiry:true,viaContact:Boolean(trigger)},'',location.href);
        this.ownsHistory=true;
      }catch{}
    }
    const open=()=>{
      this.idle.inert=true;this.idle.hidden=true;
      this.panel.hidden=false;this.panel.inert=true;
      this.render();
      for(const el of this.surroundings){
        el.inert=true;
        // The portrait still reserves the desktop column.
        if(!el.classList.contains('hero-portrait'))el.hidden=true;
      }
      document.body.dataset.inquiryActive='true';
      document.body.dataset.inquiryReady='true';
      document.body.removeAttribute('data-inquiry-opening');
      this.container.dataset.flow='true';this.hero.setAttribute('aria-label','Get in touch');
      if(window.scrollY)window.scrollTo({top:0,behavior:'instant'});
    };
    if(this.direct)open();
    else await this.morph(open,'enter');
    this.panel.inert=false;this.busy=false;
    this.focusField();
  }

  async morph(update,direction){
    if(this.motion.matches){update();return;}
    if(!document.startViewTransition){
      update();
      const target=this.active?this.panel:this.idle;
      this.fallbackTransition=this.transition.run(target,[{opacity:.55,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:300});
      await this.fallbackTransition;
      this.fallbackTransition=null;
      target.style.removeProperty('opacity');target.style.removeProperty('transform');
      return;
    }
    const html=document.documentElement;
    html.dataset.heroTransition=direction;
    try{
      const transition=document.startViewTransition(update);
      this.viewTransition=transition;
      // A hidden tab or a viewport resize can skip the animation and still update the DOM.
      transition.ready.catch(()=>{});
      await transition.finished;
    }finally{
      this.viewTransition=null;
      delete html.dataset.heroTransition;
    }
  }

  capture(){const field=this.form.querySelector('[data-answer]');if(field){this.answers[field.name]=field.value;this.persist();}}
  next(){
    if(!this.active||this.busy)return;
    const field=this.form.querySelector('[data-answer]');
    if(this.step===STEP.engagement&&this.answers.engagement){this.changeStep(STEP.budget);return;}
    if(this.step===STEP.budget&&this.answers.budget){this.changeStep(STEP.preference);return;}
    if(!field)return;
    this.capture();
    const error=this.step===STEP.answer?answerError(field.value,this.answers.subject):emailError(field.value);
    if(error){field.setAttribute('aria-invalid','true');this.form.querySelector('.hero-flow-error').textContent=error;field.focus({preventScroll:true});return;}
    this.changeStep(this.step===STEP.answer?STEP.engagement:STEP.review);
  }
  clearError(field){field.removeAttribute('aria-invalid');const error=this.form.querySelector('.hero-flow-error');if(error)error.textContent='';}
  async changeStep(step){
    if(!this.active||this.busy||this.bookingBusy)return;
    this.capture();this.busy=true;
    this.panel.setAttribute('aria-busy','true');
    const direction=step<this.step?'back':'forward';
    await this.morph(()=>{
      this.panel.inert=true;
      this.step=step;
      this.render();
      // Fill the calendar's space before it enters, including while availability loads.
      if(this.step===STEP.calendar)this.mountBooking();
      if(window.scrollY>24)window.scrollTo({top:0,behavior:'instant'});
    },direction);
    this.panel.inert=false;
    this.busy=false;
    this.panel.removeAttribute('aria-busy');
    this.focusField();
  }
  render(){
    const {answer,engagement,budget,preference,calendar,email,review,complete}=STEP;
    const step=this.step;
    if(!this.preview)track('inquiry_step',{step:['message','engagement','budget','meeting_preference','calendar','email','review','complete'][step]});
    this.messageEditor?.destroy();this.messageEditor=null;
    this.booking?.destroy();this.booking=null;this.messageAction?.destroy();this.messageAction=null;
    delete this.container.dataset.booking;this.back.disabled=false;
    this.back.textContent=step===answer||step===complete?'Back to website':'Back';
    this.progress.textContent=step<=preference?`Question ${step+1} of ${preference+1}`:step===calendar?'Choose a time':step===email?'Contact details':step===review?'A final look':this.receipt?.preview?'Preview complete':this.receipt?.kind==='message'?'Message received':'Meeting confirmed';
    this.content.replaceChildren();
    if(step===answer||step===email)this.renderField(step===email);
    else if(step===engagement)this.renderEngagement();
    else if(step===budget)this.renderBudget();
    else if(step===preference)this.renderPreference();
    else if(step===calendar)this.renderCalendar();
    else if(step===review)this.renderReview();
    else this.renderReceipt();
    this.panel.querySelector('.hero-flow-privacy').textContent=step===complete?'Your details are used only for this conversation.':'Your draft stays in this browser tab. You’ll review your details before confirming.';
  }

  heading(title,helper){
    const h=element('h1','hero-flow-question',title);h.tabIndex=-1;
    this.content.append(h);
    if(!helper){h.classList.add('is-solo');return;}
    const p=element('p','hero-flow-helper',helper);p.id='hero-flow-helper';
    this.content.append(p);
  }

  renderField(isEmail){
    const meeting=this.answers.meeting==='yes';
    const service=SUBJECTS.find(s=>s.id===this.answers.subject);
    this.heading(isEmail?(meeting?'Where should I send the invite?':'Where should I reply?'):'What can I help you with?',
      isEmail?(meeting?'I’ll send the Google Meet invitation to this address.':'I’ll use this address to reply to your message.'):
        '');
    const field=element(isEmail?'input':'textarea','hero-flow-answer');
    field.name=isEmail?'email':'message';field.id='hero-flow-answer';field.dataset.answer='';
    field.placeholder=isEmail?'you@company.com':service?'Tell me more…':'Tell me about your project…';
    field.setAttribute('aria-label',isEmail?'Email address':'Your project');
    field.setAttribute('aria-describedby',isEmail?'hero-flow-helper hero-flow-error':'hero-flow-error');
    field.value=this.answers[field.name]||'';field.enterKeyHint='next';
    if(isEmail){field.type='email';field.autocomplete='email';field.maxLength=254;}else field.rows=1;
    const next=control('Continue','hero-flow-continue','submit');
    const actions=element('div','hero-flow-actions');
    actions.append(next,element('span','hero-flow-key-hint','or press Enter'));
    if(!isEmail&&service)this.content.append(this.subjectTag(service,field));
    this.content.append(field);
    if(!isEmail){
      const counter=element('p','message-count');counter.id='hero-flow-count';counter.hidden=true;
      const status=element('span','sr-only');status.id='hero-flow-limit-status';status.setAttribute('role','status');
      field.setAttribute('aria-describedby','hero-flow-count hero-flow-error hero-flow-limit-status');
      this.content.append(counter,status);this.messageEditor=new MessageEditor(field,{counter,status,button:next});
    }
    const error=element('p','hero-flow-error');error.id='hero-flow-error';error.setAttribute('role','alert');
    this.content.append(error,actions);
  }

  // The suggestion picked on the homepage, shown as a tag above the note. Removing it asks for a description instead.
  subjectTag(service,field){
    const tag=element('span','hero-flow-tag');
    const remove=control('','hero-flow-tag-remove');
    remove.setAttribute('aria-label',`Remove ${service.label}`);
    remove.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    remove.addEventListener('click',()=>{
      this.answers.subject='';this.persist();this.updateSubjectUI();
      tag.remove();
      field.placeholder='Tell me about your project…';
      field.focus({preventScroll:true});
    });
    tag.append(element('span','hero-flow-tag-label',service.label),remove);
    return tag;
  }

  renderEngagement(){
    this.heading('How would you like to work together?','Choose the option that best fits what you have in mind.');
    this.renderChoices('engagement','Type of collaboration',ENGAGEMENTS);
  }

  renderBudget(){
    this.heading('Budget range (EUR)',this.answers.engagement==='partnership'
      ?'What monthly budget do you have in mind?':'What’s your estimated budget for the whole project?');
    this.renderChoices('budget','Budget range (EUR)',BUDGET_RANGES);
  }

  renderChoices(name,legend,options){
    const group=element('fieldset',`hero-choice-options hero-${name}-options`);
    group.append(element('legend','sr-only',legend));
    const next=control('Continue','hero-flow-continue','submit');next.disabled=!this.answers[name];
    for(const {id,label} of options){
      const option=element('label','hero-choice-option');
      const radio=element('input');radio.type='radio';radio.name=name;radio.value=id;radio.checked=this.answers[name]===id;
      radio.addEventListener('change',()=>{
        if(name==='engagement'&&this.answers.engagement!==id)this.answers.budget='';
        this.answers[name]=id;this.persist();next.disabled=false;
      });
      option.append(radio,element('span','',label));group.append(option);
    }
    const actions=element('div','hero-flow-actions');actions.append(next);
    this.content.append(group,actions);
  }

  renderPreference(){
    this.heading('How would you like to start?','We can talk on Google Meet or start over email.');
    const choices=element('div','hero-meeting-options');
    for(const [value,label] of [['yes','Book a discovery call'],['no','Send a message']]){
      const button=control(label,value==='yes'?'hero-flow-continue':'button');
      button.setAttribute('aria-pressed',String(this.answers.meeting===value));
      button.addEventListener('click',()=>{
        if(this.busy||this.bookingBusy)return;
        this.answers.meeting=value;if(value==='no')this.meetingSelection=null;
        this.persist();this.changeStep(value==='yes'?STEP.calendar:STEP.email);
      });
      choices.append(button);
    }
    this.content.append(choices);
  }

  reviewRow(list,label,value,step){
    const row=element('div');const edit=control('Edit','hero-flow-edit');
    edit.dataset.editStep=String(step);edit.setAttribute('aria-label','Edit '+label.toLowerCase());
    row.append(element('dt','',label),element('dd','',value),edit);list.append(row);
  }

  renderReview(){
    const meeting=this.answers.meeting==='yes';
    const payload=inquiryPayload(this.answers,this.entryTopic);
    this.heading('Does this feel right?',meeting?'Review your details before confirming the call.':'Review your details before sending your message.');
    const review=element('dl','hero-flow-review');
    if(payload.subject)this.reviewRow(review,'Service',SUBJECTS.find(service=>service.id===payload.subject)?.label,STEP.answer);
    if(this.entryTopic)this.reviewRow(review,'Topic',this.entryTopic,STEP.answer);
    this.reviewRow(review,'Your project',payload.message,STEP.answer);
    this.reviewRow(review,'Collaboration',ENGAGEMENTS.find(e=>e.id===payload.engagement)?.label,STEP.engagement);
    this.reviewRow(review,'Budget (EUR)',budgetLabel(payload),STEP.budget);
    this.reviewRow(review,'Next step',meeting?'Discovery call':'Send a message',STEP.preference);
    if(meeting&&this.meetingSelection)this.reviewRow(review,'When',formatMeeting(this.meetingSelection),STEP.calendar);
    this.reviewRow(review,'Email',payload.email,STEP.email);
    const button=control(this.preview?'Confirm preview':meeting?'Confirm meeting':'Send message','hero-flow-continue');
    const challenge=element('div'),status=element('p','booking-status');status.setAttribute('role','status');
    this.content.append(review,button,challenge,status);
    if(meeting&&!this.meetingSelection){button.disabled=true;status.textContent='Choose a meeting time before confirming.';return;}
    this.messageAction=new BookingAction({
      button,status,challenge,siteKey:this.siteKey,preview:this.preview,
      body:{kind:meeting?'meeting':'message',answers:payload,timeZone:meeting?this.meetingSelection.timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,...(meeting?{startTime:this.meetingSelection.startTime}:{})},
      onSuccess:receipt=>{this.receipt=receipt;this.bookingBusy=false;this.changeStep(STEP.complete);}
    });
  }

  renderCalendar(){
    this.container.dataset.booking='true';
    this.heading('Let’s find a time.','Choose a time for a short discovery call on Google Meet.');
    this.bookingSlot=element('div','hero-booking-slot');
    this.bookingSlot.setAttribute('aria-label','Meeting scheduler');this.bookingSlot.setAttribute('role','region');
    const download=control('Keep a copy of my answer','hero-flow-edit');download.dataset.download='';
    const actions=element('div','hero-flow-actions');actions.append(download);
    this.content.append(this.bookingSlot,actions);
  }

  renderReceipt(){
    const receipt=this.receipt;
    this.heading(receipt?.preview?'Preview complete.':receipt?.kind==='message'?'Thanks for reaching out.':'You’re booked.',
      receipt?.preview?'You’ve reached the end of the inquiry preview.':receipt?.kind==='message'?'I look forward to continuing the conversation.':
      receipt?.emailStatus==='accepted'?'Your Google Meet invitation and confirmation are on their way.':'Your meeting is saved. Keep the details below for reference.');
    if(receipt?.startTime)this.content.append(element('p','hero-flow-helper',formatMeeting({startTime:receipt.startTime,timeZone:this.meetingSelection?.timeZone||'UTC'})));
    const actions=element('div','hero-flow-actions hero-confirmation-actions');
    if(receipt?.meetUrl){
      const link=element('a','text-link','Your Google Meet link');link.href=receipt.meetUrl;link.target='_blank';link.rel='noopener';actions.append(link);
    }else if(receipt?.kind==='meeting'&&!receipt.preview){
      this.content.append(element('p','meeting-note',receipt.videoStatus==='unavailable'?'I’ll share the video link before we meet.':'Check your calendar invitation for the latest meeting link.'));
    }
    const home=control('Back to website','hero-flow-continue');home.dataset.finish='';
    home.addEventListener('click',()=>this.completeAndReturn());actions.append(home);this.content.append(actions);
  }

  mountBooking(){
    if(!this.active||this.step!==STEP.calendar||!this.bookingSlot?.isConnected)return;
    this.booking=new MeetingCalendar({element:this.bookingSlot,siteKey:this.siteKey,answers:{...this.answers},selection:this.meetingSelection,preview:this.preview,onSelect:selection=>{
      if(this.active&&this.step===STEP.calendar&&!this.busy){this.meetingSelection=selection;this.changeStep(STEP.email);}
    }});
    this.booking.mount();
  }

  resizeField(field){if(field.tagName==='TEXTAREA')this.messageEditor?.update();}
  completeAndReturn(){
    if(this.busy)return;
    return this.exit(true,{completed:true});
  }
  focusField(){const target=this.form.querySelector('.hero-flow-question');target?.focus({preventScroll:true});}
  async exit(updateHistory=true,{completed=false}={}){
    if(!this.active||this.bookingBusy)return;
    if(this.viewTransition){
      const current=this.viewTransition;
      current.skipTransition();
      await current.finished;
    }else if(this.fallbackTransition)await this.fallbackTransition;
    if(!this.active||this.bookingBusy)return;
    this.messageAction?.destroy();
    this.capture();this.booking?.destroy();this.booking=null;this.active=false;this.busy=true;
    if(this.direct){
      if(completed)this.resetDraft();
      window.location.replace('/');
      return;
    }
    this.messageEditor?.destroy();this.messageEditor=null;
    if(updateHistory&&this.ownsHistory&&history.state?.heroInquiry){history.back();this.ownsHistory=false;}
    const restore=()=>{
      document.body.removeAttribute('data-inquiry-ready');
      document.body.removeAttribute('data-inquiry-active');
      this.container.removeAttribute('data-flow');
      this.container.removeAttribute('data-booking');
      this.hero.setAttribute('aria-label','Introduction');
      for(const [el,state] of this.originalStates){el.hidden=state.hidden;el.inert=state.inert;}
      this.panel.hidden=true;
      this.idle.hidden=false;this.idle.inert=true;
      if(completed){
        this.editor.input.value='';this.resetDraft();
        // After the logo, the introduction types itself again like a first visit.
        if(brandEntrance)this.editor.replayIntroduction();else this.editor.returnToIntroduction();
      }else{
        this.editor.input.value=this.answers.message;
        this.updateSubjectUI();this.editor.finishTyping();
        if(!this.entryTrigger)this.editor.reveal();
      }
      if(window.scrollY)window.scrollTo({top:0,behavior:'instant'});
    };
    // A finished inquiry returns through the animated logo; it restores the homepage behind it.
    if(completed&&brandEntrance)await brandEntrance.play({restore});
    else await this.morph(restore,'leave');
    this.idle.inert=false;this.busy=false;
    if(completed)document.querySelector('.hero-brand')?.focus({preventScroll:true});
    else if(this.entryTrigger)this.entryTrigger.focus({preventScroll:true});
    else this.editor.input.focus({preventScroll:true});
  }
  download(){
    if(this.downloadURL)URL.revokeObjectURL(this.downloadURL);
    this.downloadURL=URL.createObjectURL(new Blob([formatInquiry(this.answers,this.entryTopic)],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=this.downloadURL;link.download='project-inquiry.txt';link.click();
  }
}
function initializeHeroInquiry(){const shell=document.querySelector('[data-hero-flow]');if(shell)new HeroInquiry(shell);}
if(globalThis.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeHeroInquiry,{once:true});else initializeHeroInquiry();}
