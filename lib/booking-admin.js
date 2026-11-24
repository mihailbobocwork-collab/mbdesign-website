// Admin API for meeting requests: list them, approve (send the real invitation) or decline
// (free the slot and tell the guest). Signed in through Cloudflare Access (admin-auth.js).
import {createGoogleProvider,googleConfigured,meetingReceipt} from './google-calendar.js';
import {createBookingStore} from './booking-store.js';
import {createAdminAuth,accessConfigured,isLocal} from './admin-auth.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(code,message,status)=>json({error:code,message},status);
const iso=ms=>new Date(ms).toISOString();

export function meetingView(row){
 const {stored={}}=row,details=stored.details||{},receipt=stored.receipt||stored,decision=stored.decision||null;
 return {
  id:row.id,status:row.status,startTime:iso(row.start_ms),endTime:iso(row.end_ms),requestedAt:iso(row.created_at),
  timeZone:details.timeZone||'',answers:details.answers||null,
  meetUrl:receipt?.meetUrl||'',inviteEmail:receipt?.emailStatus||'',decision
 };
}

// Labelled sample requests, only for reviewing the admin on a local preview (`?sample`).
function samples(now){
 const day=86400000,at=(days,hour)=>{const d=new Date(now+days*day);d.setUTCHours(hour,0,0,0);return d.getTime();};
 const row=(id,status,days,hour,answers,extra={})=>({id,status,start_ms:at(days,hour),end_ms:at(days,hour)+1800000,created_at:now-Math.round(days*3600000),stored:{details:{answers,timeZone:'Europe/Chisinau'},...extra}});
 return [
  row('sample-1','requested',2,8,{name:'Alex Morgan',email:'alex@example.com',company:'Northwind',topic:'Product Design',subject:'product',engagement:'project',budget:'5000-9999',message:'We are rebuilding onboarding for our B2B analytics app and need a designer to lead the flows and UI over the next two months.'}),
  row('sample-2','requested',4,11,{name:'Priya Shah',email:'priya@example.com',company:'',topic:'Brand Identity',subject:'brand',message:'A new identity for a small coffee roastery opening in spring.'}),
  row('sample-3','confirmed',6,9,{name:'Jonas Weber',email:'jonas@example.com',company:'Fieldnote',topic:'Design partner',subject:'product',engagement:'partnership',budget:'3000-4999',message:'Looking for an ongoing design partner for our research platform.'},{receipt:{meetUrl:'https://meet.google.com/abc-defg-hij',emailStatus:'accepted'},decision:{action:'approved',at:now-3600000}}),
  row('sample-4','declined',-3,13,{name:'Sam Lee',email:'sam@example.com',company:'',topic:'Graphic Design',subject:'graphic',message:'Quick question about a poster series.'},{decision:{action:'declined',note:'I’m fully booked that week. Could we talk by email instead?',at:now-5*86400000}})
 ];
}

export function createBookingAdmin({provider=createGoogleProvider(),clock=()=>Date.now(),storeFactory=createBookingStore,auth=createAdminAuth()}={}){
 const sampleState=new Map();
 async function gate(env,request){
  const who=await auth(env,request);
  if(who)return {who};
  return {response:accessConfigured(env)||isLocal(env,request)?fail('signin','Please sign in again.',401):fail('not_connected','Admin sign-in isn’t set up yet.',503)};
 }
 async function list(env,request){
  const {who,response}=await gate(env,request);if(response)return response;
  if(who.local&&new URL(request.url).searchParams.has('sample'))return json({sample:true,signedInAs:who.email,meetings:samples(clock()).map(row=>({...row,...sampleState.get(row.id)})).map(meetingView)});
  if(!env.BOOKING_DB)return fail('not_connected','The bookings database isn’t connected yet.',503);
  try{const rows=await storeFactory(env.BOOKING_DB).meetings();return json({signedInAs:who.email,google:googleConfigured(env),meetings:rows.map(meetingView)});}
  catch{return fail('unavailable','Requests couldn’t be loaded. Please try again.',503);}
 }
 async function decide(env,request){
  if(request.method!=='POST')return fail('method','Not available.',405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return fail('origin','Please use the admin on this website.',403);
  const {who,response}=await gate(env,request);if(response)return response;
  let body;try{body=await request.json();}catch{return fail('invalid','Something was missing. Please try again.',400);}
  const action=body?.action,id=String(body?.id||''),note=typeof body?.note==='string'?body.note.trim().slice(0,1000):'';
  if(!['approve','decline'].includes(action)||!id)return fail('invalid','Something was missing. Please try again.',400);
  const now=clock();
  if(who.local&&id.startsWith('sample-')){
   sampleState.set(id,action==='approve'?{status:'confirmed',stored:{...samples(now).find(r=>r.id===id)?.stored,receipt:{meetUrl:'https://meet.google.com/sam-plel-ink',emailStatus:'accepted'},decision:{action:'approved',at:now}}}:{status:'declined',stored:{...samples(now).find(r=>r.id===id)?.stored,decision:{action:'declined',note,at:now}}});
   return json({sample:true,meeting:meetingView({...samples(now).find(r=>r.id===id),...sampleState.get(id)})});
  }
  if(!env.BOOKING_DB||!googleConfigured(env))return fail('not_connected','Google Calendar isn’t connected yet.',503);
  const store=storeFactory(env.BOOKING_DB);
  try{
   const row=await store.meeting(id);
   if(!row)return fail('missing','That request no longer exists.',404);
   if(row.status!=='requested')return json({meeting:meetingView(row),message:'This request has already been answered.'},409);
   const details=row.stored.details;if(!details?.answers?.email)return fail('details','This request is missing its details. Please answer it from Google Calendar.',409);
   if(action==='approve'&&row.start_ms<=now)return fail('past','This time has already passed. Decline it instead.',409);
   const event={id:row.event_id,answers:details.answers,startTime:iso(row.start_ms),endTime:iso(row.end_ms),timeZone:details.timeZone||'UTC'};
   if(!await store.claim(id,'requested',action==='approve'?'approving':'declining',now))return json({meeting:meetingView(await store.meeting(id)),message:'This request has already been answered.'},409);
   if(action==='approve'){
    let receipt;
    try{receipt=meetingReceipt(await provider.approve(env,event),event.startTime,event.endTime);}
    catch{await store.claim(id,'approving','requested',clock());return fail('google','Google Calendar couldn’t send the invitation. Nothing was sent; please try again.',502);}
    try{receipt.emailStatus=await provider.meetingConfirmation(env,{...event,id:row.event_id,event:{id:row.event_id,status:'confirmed',hangoutLink:receipt.meetUrl}});}catch{receipt.emailStatus='unconfirmed';}
    await store.finish(id,'confirmed',{receipt,details,decision:{action:'approved',at:clock(),by:who.email}},clock());
   }else{
    try{await provider.release(env,row.event_id);}
    catch{await store.claim(id,'declining','requested',clock());return fail('google','The calendar hold couldn’t be removed. Nothing was sent; please try again.',502);}
    let emailStatus='accepted';try{await provider.declineNotice(env,{...event,id:row.event_id,note});}catch{emailStatus='unconfirmed';}
    await store.finish(id,'declined',{receipt:{status:'declined',kind:'meeting',startTime:event.startTime,endTime:event.endTime,emailStatus},details,decision:{action:'declined',note,at:clock(),by:who.email}},clock());
   }
   return json({meeting:meetingView(await store.meeting(id))});
  }catch{return fail('unavailable','That couldn’t be completed right now. Please try again.',503);}
 }
 return {list,decide};
}
const admin=createBookingAdmin();export const listMeetings=admin.list,decideMeeting=admin.decide;
