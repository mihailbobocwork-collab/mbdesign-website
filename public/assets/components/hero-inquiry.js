import {FOOTER_HANDOFF} from './footer-inquiry.js';
import {track} from '../analytics.js';
import {saveDraft,hasMessage} from './hero-typewriter.js';
import {MessageEditor, MESSAGE_LIMIT, messageLimitError} from './message-editor.js';
import {TransitionMotion} from './transition-motion.js';
import {brandEntrance} from './brand-loader.js';
import {MeetingCalendar} from './meeting-calendar.js';
import {BookingAction} from './booking-action.js';

export const FLOW_KEY = 'mihail:hero-flow:v1';
export const SUBJECTS = [
  {id:'product',label:'A new product',prompt:'I’m working on a new product and would love a design partner.'},
  {id:'system',label:'A Design System',prompt:'I’m looking for help building a clear, consistent design system.'},
  {id:'brand',label:'Brand Identity',prompt:'I’m working on a brand identity and would love a design partner.'},
  {id:'hiring',label:'Hiring a designer',prompt:'Hi Mihail, we’re looking for a product designer to join our team. I’d love to tell you more about the role.'}
];
export function withHeroTopic(answers,message){
 if(message===answers.topic)return answers;
 return {...answers,topic:Array.from(message.split('\n')[0]).slice(0,200).join(''),message:message.length>200||message.includes('\n')?message:answers.message===message||SUBJECTS.some(s=>s.prompt===answers.message)?'':answers.message||''};
}
export function questionsForSubject(subject){
  if(subject!=='hiring')return QUESTIONS;
  return QUESTIONS.map(q=>q.key==='message'?{...q,title:'Tell me about the role',placeholder:'A little about the team and opportunity…',label:'About the role'}:q.key==='company'?{...q,title:'Which company or team?',placeholder:'Company or team',label:'Company or team'}:q);
}
export const QUESTIONS = [
  {key:'topic',title:'What’s the topic?',placeholder:'An app, a role, an idea…',label:'Topic',type:'text',max:200},
  {key:'name',title:'What should I call you?',placeholder:'Your name',label:'Your name',type:'text',autocomplete:'name',max:100},
  {key:'email',title:'Where can I reach you?',placeholder:'you@company.com',label:'Email address',type:'email',autocomplete:'email',max:254},
  {key:'company',title:'Who are you building with?',placeholder:'Company or project name',label:'Company or project name',type:'text',autocomplete:'organization',max:150,optional:true},
  {key:'message',title:'Tell me a little more',placeholder:'What would you like me to know?',label:'Your message',type:'textarea',max:MESSAGE_LIMIT}
];
export function validateAnswer(key,value,subject=''){
  if(key==='topic'&&(!hasMessage(value)||Array.from(value).length>200||/[\r\n]/.test(value)))return 'Add a topic of up to 200 characters on one line.';
  if(key==='message'&&!hasMessage(value))return subject==='hiring'?'Tell me a little about the role.':'Tell me a little about your project.';
  if(key==='message'&&value.trim().length<20)return 'Please add a little more detail (at least 20 characters).';
  if(key==='message'&&messageLimitError(value))return messageLimitError(value);
  if(key==='name'&&!hasMessage(value))return 'Please enter your name.';
  if(key==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))return 'Please enter a valid email address.';
  return '';
}
export function readFlow(storage){
  try {const saved=JSON.parse(storage.getItem(FLOW_KEY)||'{}');const answers={};for(const key of ['message','name','email','company','subject','meeting','topic'])answers[key]=typeof saved[key]==='string'?(key==='message'?saved[key]:saved[key].slice(0,254)):'';return answers;}catch{return {message:'',name:'',email:'',company:'',subject:'',meeting:'',topic:''};}
}
export function previousInquiryStep(step,meeting){return step===8?4:step===5?8:step===6?(meeting==='yes'?5:8):step-1;}
export function stepAfterMeetingChoice(meeting){return 8;}
export function stepAfterDetails(meeting){return meeting==='yes'?5:6;}
export function formatInquiry(a){return `${a.subject==='hiring'?'Hiring inquiry':'Project inquiry'}\n\nName: ${a.name}\nEmail: ${a.email}\nCompany: ${a.company||'Not specified'}\nTopic: ${a.topic||'Not specified'}\nSubject: ${SUBJECTS.find(s=>s.id===a.subject)?.label||'Let’s figure it out'}\n\n${a.message}`;}

export class HeroInquiry {
  constructor(shell){
    this.shell=shell;this.hero=shell.querySelector('.figma-hero');this.container=shell.querySelector('.hero-introduction');
    this.idle=shell.querySelector('.hero-idle');this.editor=shell.querySelector('interactive-typewriter');
    this.panel=shell.querySelector('.hero-flow-panel');this.content=this.panel.querySelector('.hero-step-content');
    this.back=this.panel.querySelector('.hero-flow-back');this.progress=this.panel.querySelector('.hero-flow-progress');
    this.form=this.panel.querySelector('form');this.motion=matchMedia('(prefers-reduced-motion: reduce)');
    this.transition=new TransitionMotion(this.motion);
    try{this.storage=sessionStorage;}catch{}
    this.answers=readFlow(this.storage);this.active=false;this.busy=false;this.step=1;this.version=0;
    this.surroundings=[document.querySelector('#navigation'),document.querySelector('.menu-toggle'),this.hero.querySelector('.hero-portrait'),shell.querySelector('.hero-client-strip'),...document.querySelectorAll('main > :not(.figma-hero-shell)'),document.querySelector('main + .wrap')].filter(Boolean);
    this.originalStates=new Map();this.downloadURL='';this.siteKey=shell.dataset.turnstileSiteKey||'';this.preview=shell.dataset.inquiryPreview==='true'||document.body.dataset.localBookingPreview==='true';this.booking=null;this.bookingBusy=false;this.meetingSelection=null;
    this.editor.addEventListener('hero-inquiry-start',event=>{event.preventDefault();this.start(event.detail.message);});
    this.editor.addEventListener('hero-inquiry-reset',()=>this.resetDraft());
    this.form.addEventListener('submit',event=>{event.preventDefault();this.next();});
    this.form.addEventListener('input',event=>{const field=event.target.closest('[data-answer]');if(field){this.answers[field.name]=field.value;this.persist();this.clearError(field);this.resizeField(field);}});
    this.form.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&event.keyCode!==229&&event.target.matches('[data-answer]')){event.preventDefault();this.next();}});
    this.back.addEventListener('click',()=>{if(this.busy||this.bookingBusy)return;if(this.step===7)this.completeAndReturn();else if(this.step===0)this.exit();else this.changeStep(previousInquiryStep(this.step,this.answers.meeting));});
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
  persist(){try{this.storage?.setItem(FLOW_KEY,JSON.stringify(this.answers));}catch{}saveDraft(this.storage,this.answers.topic||this.answers.message);}
  updateSubjectUI(){
    const hiring=this.answers.subject==='hiring';
    this.editor.dataset.subject=this.answers.subject;
    this.idle.dataset.subject=this.answers.subject;
    this.editor.input.placeholder=hiring?'Tell me about the role':'What are you working on?';
    this.editor.input.setAttribute('aria-label',this.editor.input.placeholder);
    this.idle.querySelector('.hero-subject-hint')?.setAttribute('aria-hidden',String(!hiring));
    this.idle.querySelectorAll('button[data-subject]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.subject===this.answers.subject)));
    this.editor.syncInput();
  }
  resetDraft(){
    this.answers.message='';this.answers.topic='';this.answers.subject='';this.answers.meeting='';this.meetingSelection=null;this.persist();this.updateSubjectUI();
  }
  chooseSubject(id){
    const subject=SUBJECTS.find(s=>s.id===id);if(!subject)return;
    const previous=SUBJECTS.find(s=>s.id===this.answers.subject);
    const current=this.editor.input.value;
    if(!hasMessage(current)||current===previous?.prompt)this.editor.input.value=subject.prompt;
    this.answers.subject=id;this.answers.topic=this.editor.input.value.split('\n')[0].slice(0,200);this.persist();
    this.updateSubjectUI();
    this.editor.reveal();this.editor.syncInput();this.editor.input.focus({preventScroll:true});this.editor.input.setSelectionRange(this.editor.input.value.length,this.editor.input.value.length);
  }
  async start(message){
    if(this.active||this.busy||!hasMessage(message)||messageLimitError(message))return;
    this.answers=withHeroTopic(this.answers,message);this.persist();this.step=0;this.active=true;this.busy=true;const version=++this.version;
    this.beforeScroll=window.scrollY;
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
    if(!this.active||this.busy||(this.step>=4&&this.step!==8))return;
    const field=this.form.querySelector('[data-answer]');if(!field)return;
    this.capture();const error=validateAnswer(field.name,field.value,this.answers.subject);
    if(error){field.setAttribute('aria-invalid','true');this.form.querySelector('.hero-flow-error').textContent=error;field.focus({preventScroll:true});return;}
    this.changeStep(this.step===8?stepAfterDetails(this.answers.meeting):this.step+1);
  }
  clearError(field){field.removeAttribute('aria-invalid');const error=this.form.querySelector('.hero-flow-error');if(error)error.textContent='';}
  async changeStep(step){
    if(!this.active||this.busy||this.bookingBusy)return;
    this.capture();this.busy=true;if(window.scrollY>24)window.scrollTo({top:0,behavior:this.motion.matches?'instant':'smooth'});const version=++this.version;const oldHeight=this.container.getBoundingClientRect().height;
    this.container.style.height=oldHeight+'px';this.container.dataset.transitioning='true';this.panel.setAttribute('aria-busy','true');
    const order=[0,1,2,3,4,8,5,6,7];const direction=order.indexOf(step)<order.indexOf(this.step)?-1:1;
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
    if(this.step===5)this.mountBooking();
  }
  render(){
    if(!this.preview)track('inquiry_step',{step:({0:'topic',1:'name',2:'email',3:'company',4:'meeting_preference',8:'message',5:'calendar',6:'review',7:'complete'})[this.step]});
    this.messageEditor?.destroy();this.messageEditor=null;
    this.booking?.destroy();this.booking=null;this.messageAction?.destroy();this.messageAction=null;delete this.container.dataset.booking;this.back.disabled=false;
    const questions=questionsForSubject(this.answers.subject),hiring=this.answers.subject==='hiring';
    this.progress.textContent=this.step===8?'A little more detail':this.step<4?`Question ${this.step+1} of 4`:this.step===4?'One more thing':this.step===5?'Choose a time':this.step===6?'A final look':this.receipt?.preview?'Preview complete':this.receipt?.kind==='message'?'Message received':'Meeting confirmed';
    this.back.textContent=this.step===0||this.step===7?'Back to website':'Back';
    this.content.replaceChildren();
    if(this.step<4||this.step===8){
      const question=this.step===8?questions[4]:questions[this.step];
      const title=document.createElement('h1');title.id='hero-flow-question';title.className='hero-flow-question';title.textContent=question.title;
      const helper=document.createElement('p');helper.className='hero-flow-helper';helper.id='hero-flow-helper';helper.textContent=question.key==='topic'?'Use a short subject or keyword. You can edit your introduction here.':question.optional?'Optional. You can leave this blank.':this.step===1?'Your topic is saved. Let’s get to know you.':this.step===2?'Just for this conversation. No mailing lists.':hiring?'A little about the team, opportunity, and what you’re looking for.':'Take your time. Shift + Enter adds a new line.';
      const field=document.createElement(question.type==='textarea'?'textarea':'input');
      field.name=question.key;field.id='hero-flow-answer';field.dataset.answer='';field.className='hero-flow-answer';field.placeholder=question.placeholder;
      field.setAttribute('aria-label',question.label);field.setAttribute('aria-describedby','hero-flow-helper hero-flow-error');if(question.key!=='message')field.maxLength=question.max;field.value=this.answers[question.key]||'';
      if(question.type==='textarea'){field.rows=1;}else{field.type=question.type;field.autocomplete=question.autocomplete;}
      field.enterKeyHint='next';field.required=!question.optional;
      const error=document.createElement('p');error.id='hero-flow-error';error.className='hero-flow-error';error.setAttribute('role','alert');
      const actions=document.createElement('div');actions.className='hero-flow-actions';
      const next=document.createElement('button');next.type='submit';next.className='hero-flow-continue';next.textContent=question.optional?'Continue / skip':'Continue';
      const hint=document.createElement('span');hint.className='hero-flow-key-hint';hint.textContent='or press Enter';
      actions.append(next,hint);this.content.append(title,helper,field);
      if(question.type==='textarea'){
        const counter=document.createElement('p');counter.id='hero-flow-count';counter.className='message-count';counter.hidden=true;
        const status=document.createElement('span');status.id='hero-flow-limit-status';status.className='sr-only';status.setAttribute('role','status');
        field.setAttribute('aria-describedby','hero-flow-helper hero-flow-count hero-flow-error hero-flow-limit-status');
        if(this.step===8)helper.textContent=this.answers.meeting==='yes'?'What would you like to discuss on our call? Add any useful context. Shift + Enter adds a new line.':'Tell me what you have in mind and how I can help. Shift + Enter adds a new line.';helper.textContent+=' At least 20 characters, up to 3,000.';this.content.append(counter,status);
        this.messageEditor=new MessageEditor(field,{counter,status,button:next});
      }
      this.content.append(error,actions);this.resizeField(field);
    }else if(this.step===4){
      const title=document.createElement('h1');title.tabIndex=-1;title.className='hero-flow-question';title.textContent=hiring?'Shall we talk about the role?':'Shall we talk about your project?';
      const helper=document.createElement('p');helper.className='hero-flow-helper';helper.textContent='A short Google Meet call, or we can start over email.';
      const choices=document.createElement('div');choices.className='hero-meeting-options';
      for(const [value,label] of [['yes','Let’s have a meeting'],['no','Just send my message']]){const button=document.createElement('button');button.type='button';button.className=value==='yes'?'hero-flow-continue':'button';button.textContent=label;button.setAttribute('aria-pressed',String(this.answers.meeting===value));button.addEventListener('click',()=>{this.answers.meeting=value;if(value==='no')this.meetingSelection=null;this.persist();this.changeStep(stepAfterMeetingChoice(value));});choices.append(button);}
      this.content.append(title,helper,choices);
    }else if(this.step===6){
      const title=document.createElement('h1');title.tabIndex=-1;title.className='hero-flow-question';title.textContent='Does this feel right?';
      const helper=document.createElement('p');helper.className='hero-flow-helper';helper.textContent=this.answers.meeting==='yes'?'Your details and our meeting time, all in one place. Confirm when you’re ready.':'Check your details before sending your message.';
      const review=document.createElement('dl');review.className='hero-flow-review';
      for(const [i,q] of questions.entries()){
        const row=document.createElement('div');const term=document.createElement('dt');term.textContent=q.label;
        const detail=document.createElement('dd');detail.textContent=this.answers[q.key]||'Not specified';
        const edit=document.createElement('button');edit.type='button';edit.className='hero-flow-edit';edit.dataset.editStep=String(i===4?8:i);edit.textContent='Edit';edit.setAttribute('aria-label','Edit '+q.label.toLowerCase());
        row.append(term,detail,edit);review.append(row);
      }
      const button=document.createElement('button');button.type='button';button.className='hero-flow-continue';button.textContent=this.preview?'Confirm preview':this.answers.meeting==='yes'?'Confirm meeting':'Send message';
      const preference=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd'),edit=document.createElement('button');term.textContent='Meeting';detail.textContent=this.answers.meeting==='yes'?'Yes, let’s meet on Google Meet':'Start over email';edit.type='button';edit.className='hero-flow-edit';edit.textContent='Edit';edit.dataset.editStep='4';edit.setAttribute('aria-label','Edit meeting preference');preference.append(term,detail,edit);review.append(preference);
      this.content.append(title,helper,review,button);
      const challenge=document.createElement('div'),status=document.createElement('p');status.className='booking-status';status.setAttribute('role','status');this.content.append(challenge,status);
      const meeting=this.answers.meeting==='yes';
      if(meeting&&this.meetingSelection){
        const row=document.createElement('div'),term=document.createElement('dt'),detail=document.createElement('dd'),edit=document.createElement('button');term.textContent='When';
        const selection=this.meetingSelection;
        detail.textContent=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:selection.timeZone,timeZoneName:'short'}).format(new Date(selection.startTime))+` · ${selection.durationMinutes} min · Google Meet`;
        edit.type='button';edit.className='hero-flow-edit';edit.dataset.editStep='5';edit.textContent='Edit';edit.setAttribute('aria-label','Change meeting time');row.append(term,detail,edit);review.append(row);
      }
      if(meeting&&!this.meetingSelection){button.disabled=true;status.textContent='Choose a meeting time before confirming.';}
      else this.messageAction=new BookingAction({button,status,challenge,siteKey:this.siteKey,preview:this.preview,body:{kind:meeting?'meeting':'message',answers:{...this.answers},timeZone:meeting?this.meetingSelection.timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,...(meeting?{startTime:this.meetingSelection.startTime}:{})},onSuccess:receipt=>{this.receipt=receipt;this.bookingBusy=false;this.changeStep(7);}});
    }else if(this.step===5){
      this.container.dataset.booking='true';
      const title=document.createElement('h1');title.tabIndex=-1;title.className='hero-flow-question';title.textContent='Let’s find a time.';
      const helper=document.createElement('p');helper.className='hero-flow-helper';helper.textContent=hiring?'A conversation about the team, the role, and how we could work together.':'A conversation about your idea, what you need, and how we could work together.';
      const slot=document.createElement('div');slot.className='hero-booking-slot';slot.setAttribute('aria-label','Meeting scheduler');slot.setAttribute('role','region');this.bookingSlot=slot;
      const actions=document.createElement('div');actions.className='hero-flow-actions';
      const download=document.createElement('button');download.type='button';download.className='hero-flow-edit';download.dataset.download='';download.textContent='Keep a copy of my message';actions.append(download);
      this.content.append(title,helper,slot,actions);
    }else{
      const title=document.createElement('h1');title.tabIndex=-1;title.className='hero-flow-question';title.textContent=this.receipt?.preview?'That’s the meeting flow.':this.receipt?.kind==='message'?'Thanks for reaching out.':'You’re booked.';
      const helper=document.createElement('p');helper.className='hero-flow-helper';helper.textContent=this.receipt?.preview?'Preview complete. No message, event, or invitation was created.':this.receipt?.kind==='message'?'Your message has been delivered. I look forward to continuing the conversation.':this.receipt?.emailStatus==='accepted'?'Your meeting is saved. A separate confirmation email is on its way, alongside your calendar invitation.':'Your meeting is saved. Email delivery hasn’t been confirmed; keep your meeting details below.';
      const home=document.createElement('button');home.type='button';home.className='hero-flow-continue';home.textContent='Back to website';home.addEventListener('click',()=>this.completeAndReturn());
      const actions=document.createElement('div');actions.className='hero-flow-actions hero-confirmation-actions';
      this.content.append(title,helper);
      if(this.receipt?.startTime){const time=document.createElement('p');time.className='hero-flow-helper';const zone=this.meetingSelection?.timeZone||Intl.DateTimeFormat().resolvedOptions().timeZone;time.textContent=new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeStyle:'short',timeZone:zone}).format(new Date(this.receipt.startTime))+' · '+zone+' · Google Meet';this.content.append(time);}
      if(this.receipt?.meetUrl){const meet=document.createElement('a');meet.className='text-link';meet.href=this.receipt.meetUrl;meet.target='_blank';meet.rel='noopener';meet.textContent='Your Google Meet link';actions.append(meet);}else if(this.receipt?.kind!=='message'&&!this.receipt?.preview){const note=document.createElement('p');note.className='meeting-note';note.textContent=this.receipt?.videoStatus==='unavailable'?'I’ll share the video link before we meet.':'The video link is being prepared. Check your calendar invitation for the latest details.';this.content.append(note);}actions.append(home);this.content.append(actions);
    }
    if(this.preview&&this.step===6){const note=document.createElement('p');note.className='meeting-preview-note';note.textContent='Interaction preview · Nothing is sent or booked.';this.content.prepend(note);}
    const privacy=this.panel.querySelector('.hero-flow-privacy');
    privacy.replaceChildren(document.createTextNode(this.step===7?'Your details are used only for this conversation. ':'Nothing is sent or booked until you confirm. Your answers stay in this browser tab while you edit. '));
    const privacyLink=document.createElement('a');privacyLink.href='/privacy/';privacyLink.textContent='Privacy details';privacy.append(privacyLink,document.createTextNode('.'));
  }
  mountBooking(){
    if(!this.active||this.step!==5||!this.bookingSlot?.isConnected)return;
    this.booking=new MeetingCalendar({element:this.bookingSlot,siteKey:this.siteKey,answers:{...this.answers},selection:this.meetingSelection,preview:this.preview,onSelect:selection=>{
      if(this.active&&this.step===5&&!this.busy){this.meetingSelection=selection;this.changeStep(6);}
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
  focusField(){const target=this.form.querySelector('[data-answer]')||this.form.querySelector('.hero-flow-question');target?.focus({preventScroll:true});}
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
    else{this.editor.input.value=this.answers.topic||this.answers.message;this.editor.syncInput();this.editor.finishTyping();}
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
    const link=document.createElement('a');link.href=this.downloadURL;link.download=this.answers.subject==='hiring'?'hiring-inquiry.txt':'project-inquiry.txt';link.click();
  }
}
function initializeHeroInquiry(){const shell=document.querySelector('[data-hero-flow]');if(shell)new HeroInquiry(shell);}
if(globalThis.document){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeHeroInquiry,{once:true});else initializeHeroInquiry();}
