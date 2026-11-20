import rawSettings from '../content/booking.json' with {type:'json'};
import {bookingSettings,monthRange,availableSlots,MINUTE} from './scheduling.js';
import {createGoogleProvider,googleConfigured,meetingReceipt} from './google-calendar.js';
import {createBookingStore} from './booking-store.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(code,message,status=503)=>json({error:code,message},status);
export async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function validateSubmission(input){
 if(!input||!['meeting','message'].includes(input.kind)||!/^[-a-zA-Z0-9]{20,80}$/.test(input.id||''))return null;
 const source=input.answers;if(!source)return null;const answers={};
 if(typeof source.topic!=='string'||!source.topic.trim()||Array.from(source.topic).length>200||/[\u0000-\u001f]/.test(source.topic)||typeof source.message!=='string'||source.message.trim().length<20)return null;answers.topic=source.topic?.trim()||'';
 if(source.offer!==undefined&&(typeof source.offer!=='string'||Array.from(source.offer).length>150||/[\u0000-\u001f]/.test(source.offer)))return null;answers.offer=source.offer||'';
 for(const [key,max] of [['name',100],['email',254],['company',150],['message',3000],['subject',20]]){
  if(typeof source[key]!=='string')return null;const value=source[key];if(Array.from(value).length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))return null;answers[key]=key==='message'?value:value.trim();
 }
 if(!answers.name||/[\r\n]/.test(answers.name)||!answers.message.trim()||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)||!['','product','system','brand','hiring'].includes(answers.subject))return null;
 let timeZone=String(input.timeZone||'UTC');try{new Intl.DateTimeFormat('en-GB',{timeZone});}catch{return null;}
 let startTime='';if(input.kind==='meeting'){const stamp=Date.parse(input.startTime);if(!Number.isFinite(stamp))return null;startTime=new Date(stamp).toISOString();}
 return {id:input.id,kind:input.kind,answers,timeZone,startTime};
}
async function readBody(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('invalid_body');
 const reader=request.body?.getReader();if(!reader)throw Error('invalid_body');let size=0,text='';const decoder=new TextDecoder();
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();throw Error('invalid_body');}text+=decoder.decode(value,{stream:true});}return JSON.parse(text+decoder.decode());
}
export function createBookingAPI({provider=createGoogleProvider(),settings=rawSettings,clock=()=>Date.now(),fetcher=fetch,storeFactory=createBookingStore}={}){
 const config=bookingSettings(settings);let availabilityCache;
 const local=(env,request)=>env.BOOKING_LOCAL==='true'&&['localhost','127.0.0.1'].includes(new URL(request.url).hostname);
 const ready=(env,request)=>googleConfigured(env)&&Boolean(env.BOOKING_DB)&&(local(env,request)||Boolean(env.TURNSTILE_SECRET));
 async function challenge(env,request,token){
  if(local(env,request))return true;if(typeof token!=='string'||!token||token.length>4096)return false;
  const response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)return false;const data=await response.json();return data.success===true&&data.hostname===new URL(request.url).hostname&&data.action==='inquiry';
 }
 async function availability(env,request){
  if(request.method!=='GET')return fail('method','Not available.',405);const month=new URL(request.url).searchParams.get('month'),range=monthRange(month,clock());if(!range)return fail('month','Choose a month within the next six months.',400);
  if(!ready(env,request))return fail('not_connected','Meeting booking isn’t connected just yet. You can still send a message.');
  try{
   const store=storeFactory(env.BOOKING_DB),key=month+'|'+env.GOOGLE_REFRESH_TOKEN+'|'+JSON.stringify(config);
   if(availabilityCache?.key===key&&availabilityCache.until>clock())return json(availabilityCache.body);
   const busy=await provider.busy(env,range.start-config.bufferMinutes*MINUTE,range.end+config.bufferMinutes*MINUTE),reserved=await store.busy(range.start-config.bufferMinutes*MINUTE,range.end+config.bufferMinutes*MINUTE,clock());
   const body={month,slots:availableSlots({...range,settings:config,busy:[...busy,...reserved],now:clock()}),durationMinutes:config.durationMinutes,platform:'Google Meet'};
   availabilityCache={key,until:clock()+15000,body};return json(body);
  }catch{return fail('unavailable','Available times couldn’t be loaded. Please try again shortly.');}
 }
 async function submit(env,request){
  if(request.method!=='POST')return fail('method','Not available.',405);
  const origin=new URL(request.url).origin;if(request.headers.get('origin')!==origin)return fail('origin','Please submit from this website.',403);
  if(!ready(env,request))return fail('not_connected','Sending and meeting booking aren’t connected yet. Your answers are safe here.');
  let raw;try{raw=await readBody(request);}catch{return fail('invalid','Please check your details.',400);}const input=validateSubmission(raw);if(!input)return fail('invalid','Please check your details.',400);
  const store=storeFactory(env.BOOKING_DB),fingerprint=await digest(JSON.stringify(input)),now=clock();
  try{
   const existing=await store.get(input.id);
   if(existing){
    if(existing.fingerprint!==fingerprint)return fail('changed','Your details have changed. Please review them again.',409);
    if(existing.status==='confirmed')return json(JSON.parse(existing.result_json));
    if(existing.status==='failed')return fail('failed','That attempt could not be completed. Please review your details and try again.',409);
    if(input.kind==='meeting'&&now-existing.updated_at>5000){
     try{const found=await provider.find(env,existing.event_id);if(found){const receipt=meetingReceipt(found,new Date(existing.start_ms).toISOString(),new Date(existing.end_ms).toISOString());await store.finish(input.id,'confirmed',receipt,now);availabilityCache=null;return json(receipt);}}catch{}
    }
    return json({status:'pending',message:input.kind==='meeting'?'Your meeting is still being confirmed. Check again before making another booking.':'Your message is still being confirmed. Please keep this page open; avoid sending it again.'},202);
   }
   if(!await challenge(env,request,raw.challengeToken))return fail('challenge','Please complete the quick verification and try again.',403);
   const bucket=await digest((request.headers.get('CF-Connecting-IP')||'local')+'|'+Math.floor(now/3600000)+'|'+env.GOOGLE_CLIENT_SECRET);
   if(!await store.limit(bucket,now))return fail('rate','A few requests have already been made. Please try again later.',429);
   let start=0,end=0;
   if(input.kind==='meeting'){
    start=Date.parse(input.startTime);end=start+config.durationMinutes*MINUTE;
    const busy=await provider.busy(env,start-config.bufferMinutes*MINUTE,end+config.bufferMinutes*MINUTE);
    if(!availableSlots({start,end,settings:config,busy,now}).some(s=>s.startTime===input.startTime))return fail('slot_gone','That time is no longer available. Please choose another.',409);
   }
   const eventId='mb'+await digest(input.id),reserved=await store.reserve({id:input.id,fingerprint,kind:input.kind,start,end,eventId,now,buffer:config.bufferMinutes*MINUTE});
   if(!reserved)return fail('slot_gone','That time has just been selected. Please choose another.',409);
   availabilityCache=null;
   let receipt;
   try{
    if(input.kind==='meeting'){const event=await provider.create(env,{id:eventId,startTime:input.startTime,endTime:new Date(end).toISOString(),answers:input.answers,timeZone:config.timeZone});receipt=meetingReceipt(event,input.startTime,new Date(end).toISOString());}
    else{await provider.message(env,{id:eventId,answers:input.answers});receipt={status:'confirmed',kind:'message'};}
   }catch(error){await store.finish(input.id,error.definite?'failed':'uncertain',null,clock());return error.definite?fail('failed','That couldn’t be completed. Your answers are safe; please try again.'):json({status:'pending',message:'This is taking longer than expected. Check the status before trying another submission.'},202);}
   // A confirmed provider result stays confirmed even if a housekeeping write fails.
   try{await store.finish(input.id,'confirmed',receipt,clock());}catch{}
   try{await store.cleanup(clock());}catch{}
   return json(receipt,201);

  }catch{return fail('unavailable','That couldn’t be completed right now. Your answers are safe here.');}
 }
 return {availability,submit};
}
const service=createBookingAPI();export const availability=service.availability,submit=service.submit;
