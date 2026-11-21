import {FOOTER_HANDOFF} from './footer-inquiry.js';
import {track} from '../analytics.js';
import {saveDraft,hasMessage} from './hero-typewriter.js';
import {MessageEditor, messageLimitError} from './message-editor.js';
import {TransitionMotion} from './transition-motion.js';
import {brandEntrance} from './brand-loader.js';
import {MeetingCalendar} from './meeting-calendar.js';
import {BookingAction} from './booking-action.js';
import {SUBJECTS,ENGAGEMENTS,emailError,topicFromMessage,formatMeeting} from './inquiry-details.js';

export const FLOW_KEY = 'mihail:hero-flow:v1';
export const STEP = Object.freeze({answer:0,engagement:1,preference:2,calendar:3,email:4,review:5,complete:6});

export function readFlow(storage) {
  let saved;
  try { saved=JSON.parse(storage.getItem(FLOW_KEY)||'{}'); } catch { /* Storage is optional. */ }
  const text=(key,max)=>typeof saved?.[key]==='string'?saved[key].slice(0,max):'';
  return {
    message:text('message',Infinity)||text('topic',200),
    subject:SUBJECTS.some(s=>s.id===saved?.subject)?saved.subject:'',
    engagement:ENGAGEMENTS.some(e=>e.id===saved?.engagement)?saved.engagement:'',
    meeting:['yes','no'].includes(saved?.meeting)?saved.meeting:'',
    email:text('email',254)
  };
}

export function answerError(message,subject) {
  return messageLimitError(message) || (!hasMessage(message)&&!subject?'Choose a design service or leave a short note.':'');
}

export function previousInquiryStep(step,meeting) {
  if(step===STEP.email)return meeting==='yes'?STEP.calendar:STEP.preference;
  return step-1;
}

export function inquiryPayload(answers) {
  const service=SUBJECTS.find(s=>s.id===answers.subject);
  return {
    name:'',company:'',email:answers.email.trim(),subject:answers.subject,engagement:answers.engagement,
    topic:service?.label||topicFromMessage(answers.message)||'Design inquiry',
    message:answers.message.trim()||service?.prompt||''
  };
}

export function formatInquiry(answers) {
  const a=inquiryPayload(answers),engagement=ENGAGEMENTS.find(e=>e.id===a.engagement)?.label;
  return [a.topic,engagement,a.email,a.message].filter(Boolean).join('\n\n');
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
    this.answers=readFlow(this.storage);this.active=false;this.busy=false;this.step=STEP.answer;this.version=0;
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
    window.addEventListener('popstate',()=>{if(this.active&&!this.bookingBusy)this.exit(false);});
    window.addEventListener('pagehide',event=>{if(!event.persisted)this.booking?.destroy();if(this.downloadURL)URL.revokeObjectURL(this.downloadURL);});
    this.panel.addEventListener('meeting-busy',event=>{this.bookingBusy=event.detail;this.back.disabled=event.detail;for(const control of this.panel.querySelectorAll('[data-edit-step],[data-download],[data-finish]'))control.disabled=event.detail;});
    this.updateSubjectUI();
    document.addEventListener('portfolio-inquiry',event=>{event.preventDefault();this.start(event.detail.message);});
    try{const pending=this.storage?.getItem(FOOTER_HANDOFF);if(pending&&hasMessage(pending)&&!messageLimitError(pending)){requestAnimationFrame(async()=>{await brandEntrance?.promise;await this.start(pending);if(this.active)this.storage?.removeItem(FOOTER_HANDOFF);});}}catch{}
  }
  persist(){try{this.storage?.setItem(FLOW_KEY,JSON.stringify(this.answers));}catch{}saveDraft(this.storage,this.answers.message);}
  updateSubjectUI(){
    this.editor.dataset.subject=this.answers.subject;
    this.idle.querySelectorAll('button[data-subject]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.subject===this.answers.subject)));
    this.editor.syncInput();
  }
  resetDraft(){
    this.answers.message='';this.answers.subject='';this.answers.engagement='';this.answers.meeting='';
    this.meetingSelection=null;this.persist();this.updateSubjectUI();
  }
  chooseSubject(id){
    if(this.active||this.busy||!SUBJECTS.some(s=>s.id===id))return;
    this.answers.subject=id;
    this.start(this.editor.input.value);
  }
  async start(message){
    if(this.active||this.busy||(!this.answers.subject&&!hasMessage(message)))return;
    this.answers.message=message;this.persist();this.step=STEP.answer;
    this.active=true;this.busy=true;const version=++this.version;
    this.originalStates.clear();for(const el of this.surroundings){this.originalStates.set(el,{inert:el.inert,hidden:el.hidden});el.inert=true;}
    const oldHeight=this.idle.getBoundingClientRect().height;
    this.container.style.height=oldHeight+'px';this.container.dataset.transitioning='true';
    this.idle.inert=true;this.panel.style.opacity='0';this.panel.hidden=false;this.panel.inert=true;this.render();
    this.content.style.removeProperty('opacity');this.content.style.removeProperty('transform');
    this.progress.style.removeProperty('opacity');
    try{history.pushState({...history.state,heroInquiry:true},'',location.href);this.ownsHistory=true;}catch{}
    const newHeight=this.panel.getBoundingClientRect().height;
    document.body.dataset.inquiryActive='true';this.container.dataset.flow='true';this.hero.setAttribute('aria-label','Get in touch');
    // Long project drafts may have scrolled the logo offscreen before Continue.
    window.scrollTo({top:0,behavior:this.motion.matches?'instant':'smooth'});
    await Promise.all([
      this.animate(this.idle,[{},{opacity:0,transform:'translateY(-4px)'}],{duration:420}),
      this.animate(this.panel,[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:620,delay:150}),
      this.animate(this.container,[{height:oldHeight+'px'},{height:newHeight+'px'}],{duration:770})
    ]);
    if(version!==this.version)return;
    this.idle.hidden=true;this.panel.inert=false;this.busy=false;
    // Keep the portrait’s slot so the form remains anchored to the introduction.
    for(const el of this.surroundings)if(!el.classList.contains('hero-portrait'))el.hidden=true;
    document.body.dataset.inquiryReady='true';
    this.releaseLayout();
    this.focusField();
  }
  animate(el,keyframes,options={}){
    return this.transition.run(el,keyframes,options);
  }
  releaseLayout(){
    this.container.style.removeProperty('height');delete this.container.dataset.transitioning;
    this.panel.removeAttribute('aria-busy');
  }
  capture(){const field=this.form.querySelector('[data-answer]');if(field){this.answers[field.name]=field.value;this.persist();}}
  next(){
    if(!this.active||this.busy)return;
    const field=this.form.querySelector('[data-answer]');
    if(this.step===STEP.engagement&&this.answers.engagement){this.changeStep(STEP.preference);return;}
    if(!field)return;
    this.capture();
    const error=this.step===STEP.answer?answerError(field.value,this.answers.subject):emailError(field.value);
    if(error){field.setAttribute('aria-invalid','true');this.form.querySelector('.hero-flow-error').textContent=error;field.focus({preventScroll:true});return;}
    this.changeStep(this.step===STEP.answer?STEP.engagement:STEP.review);
  }
  clearError(field){field.removeAttribute('aria-invalid');const error=this.form.querySelector('.hero-flow-error');if(error)error.textContent='';}
  async changeStep(step){
    if(!this.active||this.busy||this.bookingBusy)return;
    this.capture();this.busy=true;if(window.scrollY>24)window.scrollTo({top:0,behavior:this.motion.matches?'instant':'smooth'});const version=++this.version;const oldHeight=this.container.getBoundingClientRect().height;
    this.container.style.height=oldHeight+'px';this.container.dataset.transitioning='true';this.panel.setAttribute('aria-busy','true');
    const direction=step<this.step?-1:1;
    await Promise.all([
      this.animate(this.content,[{},{opacity:0,transform:`translateY(${-direction*4}px)`}],{duration:260}),
      this.animate(this.progress,[{},{opacity:0}],{duration:260})
    ]);
    if(version!==this.version)return;
    this.step=step;this.render();const newHeight=this.panel.getBoundingClientRect().height;
    await Promise.all([
      this.animate(this.content,[{opacity:0,transform:`translateY(${direction*6}px)`},{opacity:1,transform:'translateY(0)'}],{duration:480}),
      this.animate(this.progress,[{opacity:0},{opacity:1}],{duration:480}),
      this.animate(this.container,[{height:oldHeight+'px'},{height:newHeight+'px'}],{duration:480})
    ]);
    if(version!==this.version)return;
    this.busy=false;this.releaseLayout();this.focusField();
    if(this.step===STEP.calendar)this.mountBooking();
  }
  render(){
    const {answer,engagement,preference,calendar,email,review,complete}=STEP;
    const step=this.step;
    if(!this.preview)track('inquiry_step',{step:['message','engagement','meeting_preference','calendar','email','review','complete'][step]});
    this.messageEditor?.destroy();this.messageEditor=null;
    this.booking?.destroy();this.booking=null;this.messageAction?.destroy();this.messageAction=null;
    delete this.container.dataset.booking;this.back.disabled=false;
    this.back.textContent=step===answer||step===complete?'Back to website':'Back';
    this.progress.textContent=step<=preference?`Question ${step+1} of 3`:step===calendar?'Choose a time':step===email?'Contact details':step===review?'A final look':this.receipt?.preview?'Preview complete':this.receipt?.kind==='message'?'Message received':'Meeting confirmed';
    this.content.replaceChildren();
    if(step===answer||step===email)this.renderField(step===email);
    else if(step===engagement)this.renderEngagement();
    else if(step===preference)this.renderPreference();
    else if(step===calendar)this.renderCalendar();
    else if(step===review)this.renderReview();
    else this.renderReceipt();
    this.panel.querySelector('.hero-flow-privacy').textContent=step===complete?'Your details are used only for this conversation.':'Your draft stays in this browser tab. You’ll review your details before confirming.';
  }

  heading(title,helper){
    const h=element('h1','hero-flow-question',title);h.tabIndex=-1;
    const p=element('p','hero-flow-helper',helper);p.id='hero-flow-helper';
    this.content.append(h,p);
  }

  renderField(isEmail){
    const meeting=this.answers.meeting==='yes';
    const service=SUBJECTS.find(s=>s.id===this.answers.subject);
    this.heading(isEmail?(meeting?'Where should I send the invite?':'Where should I reply?'):'What can I help you with?',
      isEmail?(meeting?'I’ll send the Google Meet invitation to this address.':'I’ll use this address to reply to your message.'):
        service?`You selected ${service.label}. Add a note if you’d like.`:'Tell me a little about what you’re working on.');
    const field=element(isEmail?'input':'textarea','hero-flow-answer');
    field.name=isEmail?'email':'message';field.id='hero-flow-answer';field.dataset.answer='';
    field.placeholder=isEmail?'you@company.com':'What are you working on?';
    field.setAttribute('aria-label',isEmail?'Email address':'Your project');
    field.setAttribute('aria-describedby','hero-flow-helper hero-flow-error');
    field.value=this.answers[field.name]||'';field.enterKeyHint='next';
    if(isEmail){field.type='email';field.autocomplete='email';field.maxLength=254;}else field.rows=1;
    const next=control('Continue','hero-flow-continue','submit');
    const actions=element('div','hero-flow-actions');
    actions.append(next,element('span','hero-flow-key-hint','or press Enter'));
    this.content.append(field);
    if(!isEmail){
      const counter=element('p','message-count');counter.id='hero-flow-count';counter.hidden=true;
      const status=element('span','sr-only');status.id='hero-flow-limit-status';status.setAttribute('role','status');
      field.setAttribute('aria-describedby','hero-flow-helper hero-flow-count hero-flow-error hero-flow-limit-status');
      this.content.append(counter,status);this.messageEditor=new MessageEditor(field,{counter,status,button:next});
    }
    const error=element('p','hero-flow-error');error.id='hero-flow-error';error.setAttribute('role','alert');
    this.content.append(error,actions);
  }

  renderEngagement(){
    this.heading('How would you like to work together?','Choose the option that best fits what you have in mind.');
    const group=element('fieldset','hero-engagement-options');
    group.append(element('legend','sr-only','Type of collaboration'));
    const next=control('Continue','hero-flow-continue','submit');next.disabled=!this.answers.engagement;
    for(const {id,label} of ENGAGEMENTS){
      const option=element('label','hero-engagement-option');
      const radio=element('input');radio.type='radio';radio.name='engagement';radio.value=id;radio.checked=this.answers.engagement===id;
      radio.addEventListener('change',()=>{this.answers.engagement=id;this.persist();next.disabled=false;});
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
    const payload=inquiryPayload(this.answers);
    this.heading('Does this feel right?',meeting?'Review your details before confirming the call.':'Review your details before sending your message.');
    const review=element('dl','hero-flow-review');
    if(payload.subject)this.reviewRow(review,'Service',payload.topic,STEP.answer);
    this.reviewRow(review,'Your project',payload.message,STEP.answer);
    this.reviewRow(review,'Collaboration',ENGAGEMENTS.find(e=>e.id===payload.engagement)?.label,STEP.engagement);
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
  async completeAndReturn(){
    if(!this.active||this.busy)return;
    this.busy=true;
    if(brandEntrance)await brandEntrance.play({restore:()=>this.exit(true,{completed:true})});
    else await this.exit(true,{completed:true});
    document.querySelector('.hero-brand')?.focus({preventScroll:true});
  }
  focusField(){const target=this.form.querySelector('.hero-flow-question');target?.focus({preventScroll:true});}
  async exit(updateHistory=true,{completed=false}={}){
    if(!this.active||this.bookingBusy)return;
    this.messageAction?.destroy();
    this.capture();this.booking?.destroy();this.booking=null;this.active=false;this.busy=true;const version=++this.version;
    this.transition.cancel();
    const oldHeight=this.container.getBoundingClientRect().height;
    this.container.style.height=oldHeight+'px';this.container.dataset.transitioning='true';
    this.messageEditor?.destroy();this.messageEditor=null;
    if(updateHistory&&this.ownsHistory&&history.state?.heroInquiry){history.back();this.ownsHistory=false;}
    document.body.removeAttribute('data-inquiry-ready');
    for(const [el,state] of this.originalStates){el.hidden=state.hidden;el.inert=state.inert;}
    if(completed){this.editor.input.value='';this.resetDraft();this.editor.returnToIntroduction();window.scrollTo({top:0,behavior:'instant'});}
    else{this.editor.input.value=this.answers.message;this.updateSubjectUI();this.editor.syncInput();this.editor.finishTyping();}
    this.idle.style.opacity='0';this.idle.style.transform='translateY(4px)';
    this.idle.hidden=false;this.idle.inert=true;this.panel.inert=true;
    const newHeight=this.idle.getBoundingClientRect().height;
    document.body.removeAttribute('data-inquiry-active');this.container.removeAttribute('data-flow');this.hero.setAttribute('aria-label','Introduction');
    await Promise.all([
      this.animate(this.panel,[{},{opacity:0,transform:'translateY(-4px)'}],{duration:360}),
      this.animate(this.idle,[{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:620,delay:120}),
      this.animate(this.container,[{height:oldHeight+'px'},{height:newHeight+'px'}],{duration:740})
    ]);
    if(version!==this.version)return;
    this.panel.hidden=true;this.idle.inert=false;this.busy=false;this.releaseLayout();
    if(completed)document.querySelector('.hero-brand')?.focus({preventScroll:true});
    else{this.editor.reveal();this.editor.input.focus({preventScroll:true});}
  }
  download(){
    if(this.downloadURL)URL.revokeObjectURL(this.downloadURL);
    this.downloadURL=URL.createObjectURL(new Blob([formatInquiry(this.answers)],{type:'text/plain;charset=utf-8'}));
    const link=document.createElement('a');link.href=this.downloadURL;link.download='project-inquiry.txt';link.click();
  }
}
function initializeHeroInquiry(){const shell=document.querySelector('[data-hero-flow]');if(shell)new HeroInquiry(shell);}
if(globalThis.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeHeroInquiry,{once:true});else initializeHeroInquiry();}
