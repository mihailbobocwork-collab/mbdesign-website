const menu=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#navigation');
function closeMenu(){menu?.setAttribute('aria-expanded','false');navigation?.classList.remove('open');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));navigation.classList.toggle('open',open);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});
navigation?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
const siteHeader=document.querySelector('.site-header');
const workSection=document.querySelector('#work');
const workNavigation=navigation?.querySelector('a[href="#work"]');
let headerFrame=0;
function updateHeader(){
 headerFrame=0;
 siteHeader?.setAttribute('data-scrolled',String(window.scrollY>24));
 if(workSection&&workNavigation){const rect=workSection.getBoundingClientRect();if(rect.top<180&&rect.bottom>120)workNavigation.setAttribute('aria-current','location');else workNavigation.removeAttribute('aria-current');}
}
window.addEventListener('scroll',()=>{if(!headerFrame)headerFrame=requestAnimationFrame(updateHeader);},{passive:true});
window.addEventListener('pageshow',updateHeader);
updateHeader();
// Only the nearest button moves, by at most 5px. The native pointer is untouched.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(hover: hover) and (pointer: fine)');
const magnetic=[...document.querySelectorAll('[data-magnetic]')];
let active=null,frame=0,pointer=null;
const resetMagnet=()=>{if(active){active.style.removeProperty('--mx');active.style.removeProperty('--my');active=null;}};
function updateMagnet(){frame=0;if(!pointer||reduced.matches||!fine.matches)return resetMagnet();let nearest=null,distance=Infinity;
 for(const el of magnetic){if(el.hidden||el.matches(':focus-visible')||!el.getClientRects().length)continue;const r=el.getBoundingClientRect();const x=r.left+r.width/2-(parseFloat(el.style.getPropertyValue('--mx'))||0),y=r.top+r.height/2-(parseFloat(el.style.getPropertyValue('--my'))||0);const dx=pointer.x-x,dy=pointer.y-y;const edge=Math.hypot(Math.max(Math.abs(dx)-r.width/2,0),Math.max(Math.abs(dy)-r.height/2,0));if(edge<65&&edge<distance){distance=edge;nearest={el,dx,dy};}}
 if(active!==nearest?.el)resetMagnet();if(nearest){active=nearest.el;const strength=(1-distance/65)*.065;active.style.setProperty('--mx',`${Math.max(-5,Math.min(5,nearest.dx*strength))}px`);active.style.setProperty('--my',`${Math.max(-5,Math.min(5,nearest.dy*strength))}px`);}}
document.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse')return;pointer={x:event.clientX,y:event.clientY};if(!frame)frame=requestAnimationFrame(updateMagnet);},{passive:true});
document.addEventListener('pointerleave',()=>{pointer=null;resetMagnet();});
window.addEventListener('scroll',()=>{pointer=null;resetMagnet();},{passive:true});
document.addEventListener('focusin',resetMagnet);reduced.addEventListener('change',resetMagnet);fine.addEventListener('change',resetMagnet);
for(const filter of document.querySelectorAll('[data-filter]'))filter.addEventListener('click',()=>{for(const f of document.querySelectorAll('[data-filter]')){const on=f===filter;f.setAttribute('aria-pressed',String(on));f.classList.toggle('active',on);}let count=0;for(const p of document.querySelectorAll('[data-category]')){p.hidden=filter.dataset.filter!=='all'&&p.dataset.category!==filter.dataset.filter;if(!p.hidden)count++;}document.querySelector('#filter-status').textContent=`Showing ${count} ${count===1?'project':'projects'}.`;});
const palettes={moss:['#dfe9d6','#546643','#b9c79e','#f1f3d9'],lilac:['#e6deed','#695879','#bba4ca','#f1e9dc'],ink:['#dadfe3','#283b4a','#869fae','#edf0e5']};
for(const b of document.querySelectorAll('[data-palette]'))b.addEventListener('click',()=>{const colors=palettes[b.dataset.palette],stage=document.querySelector('#palette-stage');['--pbg','--p1','--p2','--p3'].forEach((p,i)=>stage.style.setProperty(p,colors[i]));document.querySelectorAll('[data-palette]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
document.querySelector('#tracking')?.addEventListener('input',event=>{const value=(Number(event.target.value)/100).toFixed(2)+'em';document.querySelector('#type-sample').style.letterSpacing=value;document.querySelector('#tracking-value').textContent=value;});
document.querySelector('#magnet-demo')?.addEventListener('click',()=>{document.querySelector('#magnet-status').textContent='A small movement. The cursor stays yours.';});
const form=document.querySelector('#inquiry-form');
if(form){
 const bookingPreview=document.body.dataset.localBookingPreview==='true';
 let offers=[],prepared='',downloadUrl='',contactBooking=null,messageAction=null;
 const select=form.elements.offer,result=document.querySelector('#inquiry-result'),calendarSlot=document.querySelector('#contact-booking'),calendarButton=document.querySelector('#inquiry-book'),sendButton=document.querySelector('#inquiry-send'),sendStatus=document.querySelector('#contact-send-status');
 const query=new URLSearchParams(location.search).get('offer');if([...select.options].some(o=>o.value===query))select.value=query;
 const context=document.querySelector('#offer-context'),updateContext=()=>{const o=offers.find(x=>x.id===select.value);context.textContent=o?`${o.name} · ${o.price} · ${o.duration}${o.id==='partner'?' · 2-month initial term':''}`:'We’ll find the right scope together.';};
 fetch('/assets/offers.json').then(r=>r.json()).then(data=>{offers=data;updateContext();}).catch(()=>{});select.addEventListener('change',updateContext);
 const requestedTopic=new URLSearchParams(location.search).get('topic');if(requestedTopic)form.elements.topic.value=requestedTopic.slice(0,200);
 const caseParams=new URLSearchParams(location.search),caseSlug=caseParams.get('case-study'),caseRequest=/^[a-z0-9-]{1,80}$/.test(caseSlug||''),caseName=(caseParams.get('project')||(caseSlug==='7code-tech'?'7code Tech':caseSlug?.replaceAll('-',' '))||'').slice(0,100);
 if(caseRequest){form.elements.topic.value=caseName+' case study request';const note=form.querySelector('.case-request-context');note.hidden=false;note.textContent=`You’re asking about the ${caseName} case study. Add a little context below and I’ll share it with you.`;}
 const topicDraftKey='mihail:contact-topic:'+(caseRequest?caseSlug:'general');
 try{const saved=sessionStorage.getItem(topicDraftKey);if(saved&&!requestedTopic)form.elements.topic.value=saved;form.elements.topic.addEventListener('input',()=>sessionStorage.setItem(topicDraftKey,form.elements.topic.value));}catch{}
 const answers=()=>({name:form.elements.name.value,email:form.elements.email.value,company:form.elements.company.value,subject:'',topic:form.elements.topic.value,offer:select.selectedOptions[0].textContent,message:form.elements.message.value});
 function confirmed(receipt){
  contactBooking?.destroy();messageAction?.destroy();calendarSlot.hidden=true;
  for(const child of form.children)if(child!==result)child.hidden=true;
  result.querySelector('h2').textContent=receipt.preview?'Preview complete.':receipt.kind==='message'?'Thanks for reaching out.':'You’re booked.';
  result.querySelector('.eyebrow').textContent=receipt.preview?'Interaction preview':receipt.kind==='message'?'Message received':'Meeting confirmed';
  document.querySelector('#delivery-note').textContent=receipt.preview?'No message, event or invitation was created.':receipt.kind==='message'?'Your message has been delivered. I look forward to continuing the conversation.':'Google has sent your calendar invitation. I look forward to our conversation.';
  document.querySelector('#inquiry-preview').hidden=true;document.querySelector('#contact-verification').replaceChildren();sendStatus.textContent='';
  const actions=result.querySelector('.result-actions');actions.replaceChildren();
  if(receipt.meetUrl){const link=document.createElement('a');link.href=receipt.meetUrl;link.target='_blank';link.rel='noopener';link.className='button';link.textContent='Your Google Meet link';actions.append(link);}
  const home=document.createElement('a');home.href='/';home.className='button dark';home.textContent='Back to website';actions.append(home);result.focus({preventScroll:true});result.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
 }
 form.addEventListener('input',event=>{if(event.target.closest('#inquiry-result'))return;contactBooking?.destroy();messageAction?.destroy();calendarSlot.hidden=true;calendarButton.disabled=false;result.hidden=true;prepared='';});
 let selectedMeeting=null;
 function prepareText(a){return `${caseRequest?caseName+' case study request':form.elements.meeting.value==='yes'?'Meeting request':'Project inquiry'}\n\nName: ${a.name}\nEmail: ${a.email}\nCompany: ${a.company||'Not specified'}\nTopic: ${a.topic}\n\n${a.message}`;}
 function showResult(){document.querySelector('#inquiry-email').hidden=true;result.hidden=false;result.focus({preventScroll:true});result.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'nearest'});}
 async function finalReview(){
  const a=answers(),meeting=form.elements.meeting.value==='yes';
  if(meeting&&!selectedMeeting)return;
  contactBooking?.destroy();calendarSlot.hidden=true;messageAction?.destroy();sendStatus.textContent='';
  prepared=prepareText(a);
  if(meeting)prepared+='\n\nMeeting: '+new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeStyle:'short',timeZone:selectedMeeting.timeZone}).format(new Date(selectedMeeting.startTime))+' · '+selectedMeeting.timeZone+' · Google Meet';
  result.querySelector('.eyebrow').textContent='A final look';result.querySelector('h2').textContent='Does this feel right?';
  const preview=document.querySelector('#inquiry-preview');preview.hidden=false;preview.textContent=prepared;
  document.querySelector('#delivery-note').textContent=bookingPreview?'Interaction preview · Review your details. Nothing will be sent or booked.':meeting?'Review your details and chosen time before confirming.':'Review your message before sending.';
  calendarButton.textContent='Change time';calendarButton.hidden=!meeting;calendarButton.disabled=false;sendButton.hidden=false;sendButton.textContent=bookingPreview?'Confirm preview':meeting?'Confirm meeting':'Send message';showResult();
  const {BookingAction}=await import('./components/booking-action.js');messageAction=new BookingAction({button:sendButton,status:sendStatus,challenge:document.querySelector('#contact-verification'),siteKey:form.dataset.turnstileSiteKey,preview:bookingPreview,body:{kind:meeting?'meeting':'message',answers:a,timeZone:meeting?selectedMeeting.timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,...(meeting?{startTime:selectedMeeting.startTime}:{})},onSuccess:confirmed});
 }
 async function chooseMeetingTime(){
  messageAction?.destroy();sendStatus.textContent='';document.querySelector('#contact-verification').replaceChildren();calendarButton.hidden=sendButton.hidden=true;
  result.querySelector('.eyebrow').textContent='Choose a time';result.querySelector('h2').textContent='Let’s find a time.';document.querySelector('#inquiry-preview').hidden=true;document.querySelector('#delivery-note').textContent='Choose a day and time, then we’ll review everything together.';
  showResult();
  try{const {MeetingCalendar}=await import('./components/meeting-calendar.js');calendarSlot.hidden=false;contactBooking?.destroy();contactBooking=new MeetingCalendar({element:calendarSlot,answers:answers(),selection:selectedMeeting,siteKey:form.dataset.turnstileSiteKey,preview:bookingPreview,onSelect:selection=>{selectedMeeting=selection;finalReview();}});await contactBooking.mount();calendarSlot.scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});}
  catch{sendStatus.textContent='The calendar could not load. Your answers are safe here.';}
 }
 form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;prepared=prepareText(answers());if(form.elements.meeting.value==='yes')chooseMeetingTime();else{selectedMeeting=null;finalReview();}});
 calendarButton.addEventListener('click',chooseMeetingTime);
 document.querySelector('#inquiry-edit').addEventListener('click',()=>{contactBooking?.destroy();messageAction?.destroy();calendarSlot.hidden=true;calendarButton.disabled=false;result.hidden=true;form.elements.message.focus();});
 document.querySelector('#inquiry-download').addEventListener('click',()=>{if(!prepared)return;if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(new Blob([prepared],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=downloadUrl;link.download='project-inquiry.txt';link.click();});
 form.addEventListener('meeting-busy',event=>{for(const el of form.querySelectorAll('input,select,textarea,button[type=submit],#inquiry-edit,#inquiry-book'))el.disabled=event.detail;});
 window.addEventListener('pagehide',event=>{if(!event.persisted){contactBooking?.destroy();messageAction?.destroy();}if(downloadUrl)URL.revokeObjectURL(downloadUrl);});
}

const backToTop=document.querySelector('.floating-top');
if(backToTop){
 backToTop.hidden=false;
 const updateTop=()=>{const visible=window.scrollY>480;backToTop.dataset.visible=String(visible);backToTop.setAttribute('aria-hidden',String(!visible));backToTop.tabIndex=visible?0:-1;};
 window.addEventListener('scroll',updateTop,{passive:true});document.addEventListener('scroll',updateTop,{capture:true,passive:true});window.addEventListener('pageshow',updateTop);
 backToTop.addEventListener('click',()=>{const behavior=matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';window.scrollTo({top:0,behavior});document.querySelector('#main')?.focus({preventScroll:true});});updateTop();
}
