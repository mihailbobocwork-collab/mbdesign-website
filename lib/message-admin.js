// Admin API for messages sent from the website's inquiry form (/api/admin/messages): read them,
// mark them read or unread, answer by email from the public address, or delete them.
// Signed in through Cloudflare Access like the rest of the admin.
import {createGoogleProvider,googleConfigured,publicSender} from './google-calendar.js';
import {createBookingStore} from './booking-store.js';
import {createAdminAuth,adminGate} from './admin-auth.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(code,message,status,extra={})=>json({error:code,message,...extra},status);
const iso=ms=>new Date(ms).toISOString();
export const REPLY_MAX=5000;

export function messageView(row){
 const stored=row.stored||{},details=stored.details||{},answers=details.answers||null;
 return {
  id:row.id,receivedAt:iso(row.created_at),timeZone:details.timeZone||'',answers,
  // Messages saved before the inbox existed have no text; they count as read.
  read:stored.read??!answers,
  replies:(stored.replies||[]).map(reply=>({id:reply.id,at:iso(reply.at),body:reply.body}))
 };
}

// Labelled samples for reviewing the inbox on a local preview (`?sample`). Nothing is sent.
function samples(now){
 const hour=3600000;
 const row=(id,ago,answers,extra={})=>({id,created_at:now-ago,stored:{details:{answers,timeZone:'Europe/London'},read:false,replies:[],...extra}});
 return [
  row('sample-m1',2*hour,{name:'Hannah Ortiz',email:'hannah@example.com',company:'Brightline',topic:'Product Design',subject:'product',engagement:'project',budget:'5000-9999',message:'Hi Mihai, we are a small health-tech team rebuilding our patient onboarding. Our current flow loses about half of new users before they finish. Would you be open to a 6–8 week project starting in January? Happy to share our analytics.'}),
  row('sample-m2',26*hour,{name:'Tom Becker',email:'tom@example.com',company:'',topic:'Brand Identity',subject:'brand',message:'Looking for a logo and simple brand guidelines for a cycling café opening next spring.'},{read:true}),
  row('sample-m3',5*24*hour,{name:'',email:'recruiting@example.com',company:'Northwind',topic:'Hiring',subject:'hiring',message:'We have a Senior Product Designer role (remote, EU) and your portfolio stood out. Would you be interested in a short call?'},{read:true,replies:[{id:'r1',at:now-4*24*hour,body:'Thanks for reaching out! I’m focused on freelance work right now, but happy to stay in touch.'}]})
 ];
}

export function createMessageAdmin({provider=createGoogleProvider(),clock=()=>Date.now(),storeFactory=createBookingStore,auth=createAdminAuth()}={}){
 const sampleState=new Map();
 const sampleRows=now=>samples(now).filter(row=>sampleState.get(row.id)!=='deleted').map(row=>({...row,stored:{...row.stored,...sampleState.get(row.id)}}));
 async function list(env,request){
  const {who,response}=await adminGate(auth,env,request);if(response)return response;
  if(who.local&&new URL(request.url).searchParams.has('sample'))return json({sample:true,signedInAs:who.email,replyFrom:publicSender(env)||'',messages:sampleRows(clock()).map(messageView)});
  if(!env.BOOKING_DB)return fail('not_connected','The messages database isn’t connected yet.',503);
  try{const rows=await storeFactory(env.BOOKING_DB).messages();return json({signedInAs:who.email,google:googleConfigured(env),replyFrom:publicSender(env)||'',messages:rows.map(messageView)});}
  catch{return fail('unavailable','Messages couldn’t be loaded. Please try again.',503);}
 }
 async function act(env,request){
  if(request.method!=='POST')return fail('method','Not available.',405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return fail('origin','Please use the admin on this website.',403);
  const {who,response}=await adminGate(auth,env,request);if(response)return response;
  let body;try{body=await request.json();}catch{return fail('invalid','Something was missing. Please try again.',400);}
  const action=body?.action,id=String(body?.id||''),text=typeof body?.body==='string'?body.body.replace(/\r\n?/g,'\n').trim():'',replyId=String(body?.replyId||'');
  if(!['read','unread','reply','delete'].includes(action)||!id)return fail('invalid','Something was missing. Please try again.',400);
  if(action==='reply'&&(!text||text.length>REPLY_MAX||!/^[a-z0-9-]{8,64}$/.test(replyId)))return fail('invalid',text.length>REPLY_MAX?`Keep the reply under ${REPLY_MAX} characters.`:'Write a reply first.',422);
  const now=clock();
  if(who.local&&id.startsWith('sample-')){
   const row=sampleRows(now).find(item=>item.id===id);if(!row)return fail('gone','This message was deleted.',404);
   if(action==='delete'){sampleState.set(id,'deleted');return json({sample:true,deleted:true});}
   const stored=row.stored;
   const next=action==='reply'?{read:true,replies:stored.replies.some(r=>r.id===replyId)?stored.replies:[...stored.replies,{id:replyId,at:now,body:text}]}:{read:action==='read'};
   sampleState.set(id,{...sampleState.get(id),...next});
   return json({sample:true,message:messageView({...row,stored:{...stored,...next}})});
  }
  if(!env.BOOKING_DB)return fail('not_connected','The messages database isn’t connected yet.',503);
  const store=storeFactory(env.BOOKING_DB);
  try{
   if(action==='delete')return (await store.removeMessage(id))?json({deleted:true}):fail('gone','This message was already deleted.',404);
   const row=await store.message(id);if(!row)return fail('gone','This message was deleted.',404);
   const stored={...row.stored,replies:row.stored.replies||[]};
   if(action==='read'||action==='unread'){stored.read=action==='read';await store.saveMessage(id,stored,row.updated_at);return json({message:messageView({...row,stored})});}
   // Reply: a repeated click (same replyId) never sends twice.
   if(stored.replies.some(reply=>reply.id===replyId))return json({message:messageView({...row,stored})});
   const answers=stored.details?.answers;
   if(!answers?.email)return fail('invalid','This message has no email address to answer.',422);
   if(!googleConfigured(env))return fail('not_connected','Gmail isn’t connected yet.',503);
   try{await provider.reply(env,{id:`${id}-reply-${replyId}`,answers,body:text});}
   catch(error){return fail('send_failed',error.definite?'The reply couldn’t be sent. Nothing went out; please try again.':'The reply may not have been sent. Check your Gmail Sent folder before trying again.',502);}
   stored.replies=[...stored.replies,{id:replyId,at:now,body:text}];stored.read=true;
   try{await store.saveMessage(id,stored,now);}catch{}
   return json({message:messageView({...row,stored})});
  }catch{return fail('unavailable','That couldn’t be completed. Please try again.',503);}
 }
 return {list,act};
}

const admin=createMessageAdmin();
export const listMessages=(env,request)=>admin.list(env,request);
export const actOnMessage=(env,request)=>admin.act(env,request);
