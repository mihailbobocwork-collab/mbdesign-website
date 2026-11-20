import {BookingAction} from './booking-action.js';
const DAY=86400000;
export function zonedDay(value,timeZone){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
 const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
export function groupSlots(slots,timeZone,month){
 const groups=new Map();
 for(const slot of slots){if(!Number.isFinite(Date.parse(slot.startTime)))continue;const key=zonedDay(slot.startTime,timeZone);if(!key.startsWith(month+'-'))continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(slot);}
 for(const values of groups.values())values.sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime));return groups;
}
export function monthGrid(month){
 const [year,m]=month.split('-').map(Number),first=new Date(Date.UTC(year,m-1,1));
 return {year,month:m-1,offset:(first.getUTCDay()+6)%7,days:new Date(Date.UTC(year,m,0)).getUTCDate()};
}
export function slotTimeLabel(value,timeZone,peers=[]){
 const formatter=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone}),label=formatter.format(new Date(value));
 if(peers.filter(s=>formatter.format(new Date(s.startTime))===label).length<2)return label;
 const offset=new Intl.DateTimeFormat('en-GB',{timeZone,timeZoneName:'shortOffset'}).formatToParts(new Date(value)).find(p=>p.type==='timeZoneName').value;
 return label+' '+offset;
}
function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function button(text,className,action){const el=node('button',className,text);el.type='button';el.addEventListener('click',action);return el;}
export class MeetingCalendar{
 constructor({element,answers={},onBooked,onSelect,selection=null,siteKey='',preview=false,fetcher=(...args)=>fetch(...args)}){
  Object.assign(this,{element,answers,onBooked,onSelect,selection,siteKey,preview,fetcher});
  this.timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';this.month=zonedDay(Date.now(),this.timeZone).slice(0,7);this.firstMonth=this.month;this.slots=[];this.state='loading';this.version=0;this.disposed=false;
 }
 async mount(){if(this.selection){this.timeZone=this.selection.timeZone;this.month=zonedDay(this.selection.startTime,this.timeZone).slice(0,7);}await this.load();}
 async load(){
  if(this.disposed)return;
  this.controller?.abort();this.controller=new AbortController();const version=++this.version;this.state='loading';this.selectedDay='';this.selectedTime='';this.slots=[];this.render();
  try{
   if(this.preview){this.slots=this.previewSlots();this.state='preview';}
   else{
    const response=await this.fetcher('/api/calendar?'+new URLSearchParams({month:this.month}),{signal:this.controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('unavailable');const data=await response.json();
    if(version!==this.version||this.disposed)return;
    if(!Array.isArray(data.slots))throw Error('unavailable');
    this.slots=data.slots.filter(s=>typeof s.startTime==='string'&&Date.parse(s.startTime)>Date.now()&&typeof s.endTime==='string'&&Date.parse(s.endTime)>Date.parse(s.startTime));this.duration=data.durationMinutes||30;this.state='ready';
   }
  }catch(error){if(error.name==='AbortError'||version!==this.version||this.disposed)return;this.state='unavailable';}
  if(version!==this.version||this.disposed)return;
  if(this.selection&&zonedDay(this.selection.startTime,this.timeZone).startsWith(this.month+'-')&&this.slots.some(s=>s.startTime===this.selection.startTime)){this.selectedTime=this.selection.startTime;this.selectedDay=zonedDay(this.selectedTime,this.timeZone);}this.selection=null;this.render();
 }
 previewSlots(){
  const {year,month,days}=monthGrid(this.month),slots=[];
  for(let day=1;day<=days;day++){
   const date=new Date(Date.UTC(year,month,day,10));if([0,6].includes(date.getUTCDay())||date.getTime()<Date.now()+DAY||day%3===0)continue;
   for(const hour of [9,11,14]){const startTime=new Date(Date.UTC(year,month,day,hour)).toISOString();slots.push({startTime,endTime:new Date(Date.parse(startTime)+1800000).toISOString()});}
  }
  return slots;
 }
 moveMonth(delta){
  const {year,month}=monthGrid(this.month),next=new Date(Date.UTC(year,month+delta,1));this.month=next.toISOString().slice(0,7);this.load();
 }
 render(){
  this.action?.destroy();this.action=null;if(this.disposed)return;
  const focused=this.element.contains(document.activeElement)?document.activeElement:null;
  const focusSelector=focused?.classList.contains('meeting-zone')?'.meeting-zone':focused?.closest('.meeting-month-header')?'.meeting-month':null;
  this.element.replaceChildren();this.element.dataset.state=this.state;
  const root=node('div','meeting-calendar');this.element.append(root);
  if(this.preview){const note=node('p','meeting-preview-note','Design preview · Sample times, not Mihail’s availability.');root.append(note);}
  const meta=node('div','meeting-meta');meta.append(node('span','',`${this.duration||30}-minute conversation`),node('span','','Google Meet'));root.append(meta);
  const columns=node('div','meeting-columns'),dateSide=node('section','meeting-date-side'),timeSide=node('section','meeting-time-side');dateSide.setAttribute('aria-label','Choose a day');timeSide.setAttribute('aria-label','Choose a time');columns.append(dateSide,timeSide);root.append(columns);
  const {year,month,offset,days}=monthGrid(this.month),groups=groupSlots(this.slots,this.timeZone,this.month);
  if(!groups.has(this.selectedDay))this.selectedDay=[...groups.keys()].sort()[0]||'';
  if(this.selectedTime&&!(groups.get(this.selectedDay)||[]).some(s=>s.startTime===this.selectedTime))this.selectedTime='';
  const header=node('div','meeting-month-header'),heading=node('h2','meeting-month',new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month,1))));heading.tabIndex=-1;
  const nav=node('div','meeting-month-nav'),previous=button('‹','meeting-month-button',()=>this.moveMonth(-1)),next=button('›','meeting-month-button',()=>this.moveMonth(1));
  for(const [control,path] of [[previous,'m15 18-6-6 6-6'],[next,'m9 18 6-6-6-6']]){
   control.textContent='';const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),line=document.createElementNS('http://www.w3.org/2000/svg','path');
   svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','20');svg.setAttribute('height','20');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');line.setAttribute('d',path);line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','1.8');line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');svg.append(line);control.append(svg);
  }
  previous.setAttribute('aria-label','Previous month');next.setAttribute('aria-label','Next month');previous.disabled=this.month<=this.firstMonth;
  const first=monthGrid(this.firstMonth);next.disabled=(year*12+month)-(first.year*12+first.month)>=6;nav.append(previous,next);header.append(heading,nav);dateSide.append(header);
  const table=node('table','meeting-days');table.setAttribute('aria-label',heading.textContent);const thead=node('thead'),tr=node('tr');
  for(const day of ['Mo','Tu','We','Th','Fr','Sa','Su']){const th=node('th','',day);th.scope='col';tr.append(th);}thead.append(tr);table.append(thead);
  const body=node('tbody');let row;
  for(let cell=0;cell<Math.ceil((offset+days)/7)*7;cell++){
   if(cell%7===0){row=node('tr');body.append(row);}const td=node('td');row.append(td);const day=cell-offset+1;if(day<1||day>days)continue;
   const key=`${this.month}-${String(day).padStart(2,'0')}`,times=groups.get(key)||[];
   const control=button(String(day),'meeting-day',()=>{this.selectedDay=key;this.selectedTime='';this.render();this.element.querySelector(`[data-day="${key}"]`)?.focus({preventScroll:true});});
   control.disabled=!times.length||this.state==='loading';control.dataset.day=key;control.setAttribute('aria-pressed',String(key===this.selectedDay));
   const date=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(year,month,day)));
   control.setAttribute('aria-label',`${date}${times.length?', '+times.length+' times available':''}`);control.tabIndex=key===this.selectedDay?0:-1;
   control.addEventListener('keydown',event=>{
    const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];if(!delta)return;event.preventDefault();
    for(let target=day+delta;target>=1&&target<=days;target+=delta){const candidate=this.element.querySelector(`[data-day="${this.month}-${String(target).padStart(2,'0')}"]`);if(candidate&&!candidate.disabled){candidate.focus();break;}}
   });td.append(control);
  }
  table.append(body);dateSide.append(table);
  const zoneLabel=node('label','meeting-zone-label','Times shown in'),zone=node('select','meeting-zone');zone.setAttribute('aria-label','Meeting time zone');
  const zones=[...new Set(['UTC',this.timeZone,...(Intl.supportedValuesOf?.('timeZone')||['UTC'])])];
  for(const value of zones){const option=node('option','',value.replaceAll('_',' '));option.value=value;option.selected=value===this.timeZone;zone.append(option);}
  zone.addEventListener('change',()=>{this.timeZone=zone.value;this.selectedDay=this.selectedTime?zonedDay(this.selectedTime,this.timeZone):'';this.render();this.element.querySelector('.meeting-zone').focus({preventScroll:true});});zoneLabel.append(zone);dateSide.append(zoneLabel);
  let dateTitle='Your time, your pace.';
  if(this.selectedDay)dateTitle=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(this.selectedDay+'T12:00:00Z'));
  timeSide.append(node('h3','meeting-selected-date',dateTitle));
  const status=node('p','meeting-availability');status.setAttribute('role','status');
  status.textContent=this.state==='loading'?'Checking available times…':this.state==='unavailable'?'Meeting booking isn’t connected just yet. You can still send a message.':!this.selectedDay?'No times this month. Try the next month.':'Choose a time that works for you.';timeSide.append(status);
  const times=node('div','meeting-times');
  for(const slot of groups.get(this.selectedDay)||[]){
   const label=slotTimeLabel(slot.startTime,this.timeZone,groups.get(this.selectedDay)||[]);
   const control=button(label,'meeting-time',()=>{this.selectedTime=slot.startTime;this.render();this.element.querySelector(`[data-time="${slot.startTime}"]`)?.focus({preventScroll:true});});
   control.dataset.time=slot.startTime;control.setAttribute('aria-pressed',String(this.selectedTime===slot.startTime));times.append(control);
  }
  timeSide.append(times);
  if(this.selectedTime){
   const next=button(this.preview?'Preview this time':'Review this time','hero-flow-continue meeting-continue',()=>this.selectTime());timeSide.append(next);
   timeSide.append(node('p','meeting-note',this.preview?'This is a design preview. No meeting will be booked.':'You’ll review the time before a Google Meet invitation is created.'));
  }
  if(focusSelector)this.element.querySelector(focusSelector)?.focus({preventScroll:true});
 }
 selectTime(){
  const slot=this.slots.find(s=>s.startTime===this.selectedTime);if(!slot)return;
  if(this.onSelect){this.onSelect({...slot,timeZone:this.timeZone,durationMinutes:this.duration||30});return;}
  this.element.replaceChildren();const root=node('div','meeting-confirm');this.element.append(root);
  const back=button('Change time','meeting-direct',()=>this.render());root.append(back);
  const title=node('h2','meeting-month',this.preview?'Preview your meeting':'Ready to meet?');title.tabIndex=-1;root.append(title);
  root.append(node('p','meeting-confirm-time',new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:this.timeZone,timeZoneName:'short'}).format(new Date(slot.startTime))));
  root.append(node('p','meeting-note',`${this.duration||30} minutes · Google Meet`));
  if(!this.preview)root.append(node('p','meeting-note',`The invitation will be sent to ${this.answers.email}.`));
  root.append(node('p','meeting-note',this.preview?'Sample meeting only. This preview cannot create an appointment.':'Confirming creates the calendar event and a unique Google Meet link. Nothing is booked before you confirm.'));
  const challenge=node('div','booking-challenge'),status=node('p','booking-status');status.setAttribute('role','status');
  const confirm=button(this.preview?'Confirm preview':'Confirm meeting','hero-flow-continue meeting-continue',()=>{});root.append(challenge,status,confirm);
  this.action=new BookingAction({button:confirm,status,challenge,siteKey:this.siteKey,preview:this.preview,body:{kind:'meeting',answers:this.answers,startTime:slot.startTime,timeZone:this.timeZone},onSuccess:receipt=>{
   if(this.preview){root.replaceChildren(node('h2','meeting-month','That’s the meeting flow.'),node('p','meeting-note','Preview complete. No event or invitation was created.'),button('Back to calendar','meeting-direct',()=>this.render()));}
   else this.onBooked(receipt);
  }});
  root.addEventListener('meeting-busy',event=>{back.disabled=event.detail;});title.focus({preventScroll:true});
 }

 destroy(){this.disposed=true;++this.version;this.controller?.abort();this.action?.destroy();}
}
const preview=globalThis.document?.querySelector('[data-calendar-preview]');
if(preview)new MeetingCalendar({element:preview,preview:true}).mount();
