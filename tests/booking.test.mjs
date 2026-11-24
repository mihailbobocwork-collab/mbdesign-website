import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {localBookingDB} from '../scripts/local-booking-db.mjs';
import {createBookingAPI,validateSubmission} from '../lib/booking-api.js';
import {createBookingStore} from '../lib/booking-store.js';
import {createGoogleProvider,meetingReceipt} from '../lib/google-calendar.js';
import {bookingSettings,availableSlots,monthRange} from '../lib/scheduling.js';
import raw from '../content/booking.json' with {type:'json'};
const root=fileURLToPath(new URL('../',import.meta.url)),NOW=Date.parse('2026-11-19T07:00:00Z');
const env={GOOGLE_CLIENT_ID:'mock-client',GOOGLE_CLIENT_SECRET:'mock-secret',GOOGLE_REFRESH_TOKEN:'mock-refresh',BOOKING_HOST_EMAIL:'owner@example.com',BOOKING_LOCAL:'true'};
const answers={topic:'App',name:'Alex',email:'alex@example.com',company:'Team',message:'A thoughtful product conversation.',subject:'product'};
const input=(id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',extra={})=>({id,kind:'meeting',answers,timeZone:'Europe/Chisinau',startTime:'2026-11-20T08:00:00.000Z',...extra});
const request=body=>new Request('http://localhost:4173/api/bookings',{method:'POST',headers:{Origin:'http://localhost:4173','Content-Type':'application/json'},body:JSON.stringify(body)});
function setup(options={}){
 const db=localBookingDB(root,{memory:true}),calls={create:0,message:0,busy:0},provider={busy:async()=>{calls.busy++;return [];},find:async()=>null,hold:async(_env,data)=>{calls.create++;return {id:data.id,status:'confirmed'};},requestNotice:async()=>{calls.notice=(calls.notice||0)+1;return 'notice';},requestReceived:async()=>'received',message:async()=>{calls.message++;return {id:'mail'};},...options.provider};
 const api=createBookingAPI({...options,provider,clock:options.clock||(()=>NOW)});return {db,calls,api,env:{...env,BOOKING_DB:db}};
}
test('Scheduling enforces host hours, notice, blocked dates and conflict buffers',()=>{
 const settings=bookingSettings({...raw,blockedDates:['2026-11-23']});
 const slots=availableSlots({start:NOW,end:Date.parse('2026-11-24T12:00Z'),settings,now:NOW,busy:[{start:Date.parse('2026-11-20T08:30Z'),end:Date.parse('2026-11-20T09:00Z')}]});
 assert.ok(slots.length);assert.ok(!slots.some(s=>s.startTime.startsWith('2026-11-23')));
 assert.ok(!slots.some(s=>s.startTime==='2026-11-20T08:00:00.000Z'||s.startTime==='2026-11-20T09:00:00.000Z'));
 for(const s of slots){const d=new Date(s.startTime);assert.ok([1,2,3,4,5].includes(d.getUTCDay()));assert.ok(d.getUTCHours()>=8&&d.getUTCHours()<=14);assert.ok(Date.parse(s.startTime)>=NOW+86400000);}
 for(const month of ['',null,'2026-13','2028-01','2026-09'])assert.equal(monthRange(month,NOW),null);
 assert.ok(monthRange('2026-12',NOW));assert.throws(()=>bookingSettings({...raw,workingHours:'17:00-10:00'}));
});
test('Scheduling aligns quarter-hour zones and adjusts to daylight saving',()=>{
 const settings=bookingSettings({...raw,timeZone:'Asia/Kathmandu'}),start=Date.parse('2026-11-20T00:00Z');
 const slots=availableSlots({start,end:start+86400000,settings,now:start-2*86400000});assert.equal(slots[0].startTime,'2026-11-20T04:15:00.000Z');
 for(const [day,expected] of [['2027-01-04','08'],['2027-07-05','07']]){const start=Date.parse(day+'T00:00Z'),values=availableSlots({start,end:start+86400000,settings:bookingSettings(raw),now:start-3*86400000});assert.equal(values[0].startTime,day+'T'+expected+':00:00.000Z');}
});
test('Meeting requests are held for approval, idempotent, and changed payloads cannot reuse an ID',async()=>{
 const s=setup();try{const first=await s.api.submit(s.env,request(input()));assert.equal(first.status,201);const receipt=await first.json();assert.equal(receipt.status,'requested');assert.equal(receipt.meetUrl,undefined);assert.equal(s.calls.notice,1);
 const again=await s.api.submit(s.env,request(input()));assert.equal(again.status,200);assert.equal((await again.json()).status,'requested');assert.equal(s.calls.create,1);assert.equal(s.calls.notice,1);
 assert.equal((await s.api.submit(s.env,request(input(undefined,{answers:{...answers,name:'Different'}})))).status,409);assert.equal(s.calls.create,1);
 }finally{s.db.close();}
});
test('Simultaneous requests for one time hold it only once',async()=>{
 const s=setup();try{const responses=await Promise.all([s.api.submit(s.env,request(input())),s.api.submit(s.env,request(input('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb')))]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);assert.equal(s.calls.create,1);
 }finally{s.db.close();}
});
test('Uncertain writes retain their reservation and never blindly write again',async()=>{
 let calls=0;const s=setup({provider:{hold:async()=>{calls++;throw Error('timeout');}}});try{
 assert.equal((await s.api.submit(s.env,request(input()))).status,202);assert.equal((await s.api.submit(s.env,request(input()))).status,202);assert.equal(calls,1);
 assert.equal((await s.api.submit(s.env,request(input('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb')))).status,409);
 }finally{s.db.close();}
});
test('Later status checks recover an event by its deterministic ID',async()=>{
 let now=NOW,findId;const s=setup({clock:()=>now,provider:{hold:async()=>{throw Error('network');},find:async(_env,id)=>{findId=id;return {id,status:'confirmed'};}}});try{
 await s.api.submit(s.env,request(input()));now+=6000;const response=await s.api.submit(s.env,request(input()));assert.equal(response.status,200);assert.equal((await response.json()).status,'requested');assert.match(findId,/^mb[a-f0-9]{64}$/);
 }finally{s.db.close();}
});
test('Message delivery is confirmed once and cleanup failures preserve confirmed truth',async()=>{
 const s=setup({storeFactory:db=>({...createBookingStore(db),cleanup:async()=>{throw Error('storage');}})});try{
 const body=input(undefined,{kind:'message'});assert.equal((await s.api.submit(s.env,request(body))).status,201);assert.equal((await s.api.submit(s.env,request(body))).status,200);assert.equal(s.calls.message,1);assert.equal(s.calls.create,0);
 }finally{s.db.close();}
});
test('Unconfigured, cross-origin, invalid and unavailable requests cannot create an event',async()=>{
 const s=setup({provider:{busy:async()=>{throw Error('private error mock-secret');}}});try{
 assert.equal((await s.api.submit({},request(input()))).status,503);
 assert.equal((await s.api.submit(s.env,new Request('http://localhost:4173/api/bookings',{method:'POST',headers:{Origin:'https://evil.example'}}))).status,403);
 assert.equal(validateSubmission(input(undefined,{answers:{...answers,email:'a@example.com\r\nBcc:x@x.com'}})),null);
 assert.equal(validateSubmission(input(undefined,{answers:{...answers,message:'x'.repeat(3001)}})),null);
 const failed=await s.api.submit(s.env,request(input()));assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('mock-secret'));assert.equal(s.calls.create,0);
 }finally{s.db.close();}
});
test('Production verification checks hostname; no sample slots leak into live availability',async()=>{
 const s=setup({fetcher:async()=>Response.json({success:true,hostname:'wrong.example',action:'inquiry'})});try{
 const body=input(undefined,{challengeToken:'mock-token'}),req=new Request('https://portfolio.example/api/bookings',{method:'POST',headers:{Origin:'https://portfolio.example','Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await s.api.submit({...s.env,TURNSTILE_SECRET:'mock'},req)).status,403);assert.equal(s.calls.create,0);
 const response=await s.api.availability({},new Request('http://localhost:4173/api/calendar?month=2026-12'));assert.equal(response.status,503);assert.equal((await response.json()).slots,undefined);
 }finally{s.db.close();}
});
test('Database limits request six and releases expired completed locks',async()=>{
 const s=setup();try{const store=createBookingStore(s.db);for(let i=0;i<5;i++)assert.equal(await store.limit('bucket',NOW),true);assert.equal(await store.limit('bucket',NOW),false);
 await store.reserve({id:'one',fingerprint:'hash',kind:'meeting',start:NOW,end:NOW+1800000,eventId:'event',now:NOW,buffer:900000});await store.finish('one','confirmed',{},NOW);
 assert.equal((await store.busy(NOW,NOW+1800000,NOW+120001)).length,0);
 }finally{s.db.close();}
});
test('Google provider fails closed, holds requests privately and sends Meet invitations only on approval',async()=>{
 const calls=[];const provider=createGoogleProvider({fetcher:async(url,options)=>{calls.push({url,options});if(url.includes('oauth2'))return Response.json({access_token:'mock-access',expires_in:3600});if(url.endsWith('/freeBusy'))return Response.json({calendars:{'owner@example.com':{errors:[{reason:'forbidden'}]}}});return Response.json({id:'event',status:'confirmed'});}});
 await assert.rejects(()=>provider.busy(env,NOW,NOW+86400000));await provider.hold(env,{id:'event',startTime:input().startTime,endTime:'2026-11-20T08:30:00Z',answers,timeZone:'Europe/Chisinau'});
 let call=calls.at(-1),body=JSON.parse(call.options.body);assert.match(call.url,/sendUpdates=none/);assert.equal(call.options.method,'POST');assert.equal(body.attendees,undefined);assert.equal(body.conferenceData,undefined);assert.equal(body.visibility,'private');assert.match(body.summary,/^Pending approval: /);
 await provider.approve(env,{id:'event',answers,timeZone:'Europe/Chisinau'});
 call=calls.at(-1);body=JSON.parse(call.options.body);assert.equal(call.options.method,'PATCH');assert.match(call.url,/events\/event\?conferenceDataVersion=1&sendUpdates=all/);assert.equal(body.conferenceData.createRequest.conferenceSolutionKey.type,'hangoutsMeet');assert.equal(body.attendees[0].email,answers.email);assert.equal(body.guestsCanModify,false);assert.equal(body.summary,'App — Alex');
 await provider.release(env,'event');call=calls.at(-1);assert.equal(call.options.method,'DELETE');assert.match(call.url,/sendUpdates=none/);assert.equal(calls.filter(c=>c.url.includes('oauth2')).length,1);
});
test('Gmail sends only to the owner with a visitor reply address; receipts reject unsafe URLs',async()=>{
 let mail;const provider=createGoogleProvider({fetcher:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'mock'});mail=Buffer.from(JSON.parse(options.body).raw,'base64url').toString('utf8');return Response.json({id:'mail'});}});
 await provider.message(env,{id:'event',answers:{...answers,name:'Alex 😄'}});assert.match(mail,/To: owner@example.com\r\nReply-To: alex@example.com\r\n/);assert.ok(!mail.includes('Bcc:'));
 for(const url of ['https://meet.google.com.evil.example/abc','javascript:alert(1)','https://user@meet.google.com/abc'])assert.equal(meetingReceipt({id:'event',status:'confirmed',hangoutLink:url},'start','end').meetUrl,'');
 assert.equal(meetingReceipt({id:'event',status:'confirmed'},'start','end').videoStatus,'pending');assert.throws(()=>meetingReceipt({id:'event',status:'cancelled'},'start','end'));
});

test('Topic and description are separately validated and cannot inject headers',()=>{
 const good=input(undefined,{answers:{...answers,topic:'App'}});assert.equal(validateSubmission(good).answers.topic,'App');
 for(const topic of [undefined,'', 'x'.repeat(201),'App\r\nBcc: attacker@example.com'])assert.equal(validateSubmission({...good,answers:{...good.answers,topic}}),null);
 assert.equal(validateSubmission({...good,answers:{...good.answers,message:'app'}}),null);
});
test('Nameless inquiries accept the hero collaboration choice and standalone bookings can omit project context',()=>{
 const response={...answers,name:'',company:'',topic:'Graphic Design',subject:'graphic',engagement:'partnership',budget:'3000-4999',message:'App'};
 const message=input(undefined,{kind:'message',answers:response});
 assert.equal(validateSubmission(message).answers.engagement,'partnership');
 assert.equal(validateSubmission(message).answers.budget,'3000-4999');
 assert.equal(validateSubmission({...message,answers:{...response,budget:'invalid'}}),null);
 assert.equal(validateSubmission({...message,answers:{...response,engagement:undefined}}),null);
 assert.equal(validateSubmission({...message,answers:{...response,engagement:'other'}}),null);
 assert.equal(validateSubmission({...message,answers:{...response,message:''}}),null);
 const booking=input(undefined,{answers:{...answers,name:'',company:'',subject:'',message:''}});
 assert.equal(validateSubmission(booking).answers.message,'');
});

test('Google event and email carry the topic alongside the full description',async()=>{
 const sent=[];const provider=createGoogleProvider({fetcher:async(url,options)=>{if(url.includes('oauth2'))return Response.json({access_token:'mock-token',expires_in:3600});sent.push({url,body:JSON.parse(options.body)});return Response.json({id:'mock-id',status:'confirmed'});}});
 const brief={...answers,topic:'App',engagement:'partnership',budget:'3000-4999',message:'A detailed app brief with useful context.\nSecond line.'};
 await provider.hold(env,{id:'mock-event',startTime:'2026-11-20T08:00:00Z',endTime:'2026-11-20T08:30:00Z',answers:brief,timeZone:'UTC'});
 assert.equal(sent[0].body.summary,'Pending approval: App — Alex');assert.ok(sent[0].body.description.includes('Topic: App'));assert.ok(sent[0].body.description.includes(brief.message));assert.match(sent[0].body.description,/Budget \(EUR\): €3,000–€4,999 per month/);
 await provider.message(env,{id:'mock-message',answers:brief});const mail=Buffer.from(sent[1].body.raw,'base64url').toString('utf8');const subject=mail.match(/Subject: =\?UTF-8\?B\?(.+)\?=/)[1];assert.equal(Buffer.from(subject,'base64').toString(),'Project inquiry — App');
 const body=Buffer.from(mail.split('\r\n\r\n')[1],'base64').toString('utf8');assert.ok(body.includes('Topic: App'));assert.ok(body.includes(brief.message));assert.match(body,/Budget \(EUR\): €3,000–€4,999 per month/);
});

test('Meeting confirmation email reaches the guest and owner with time, topic and safe Meet link',async()=>{
 let mail;const provider=createGoogleProvider({fetcher:async(url,options)=>{
  if(url.includes('oauth2'))return Response.json({access_token:'mock'});
  mail=Buffer.from(JSON.parse(options.body).raw,'base64url').toString('utf8');return Response.json({id:'confirmation'});
 }});
 const data={id:'event',event:{id:'event',status:'confirmed',hangoutLink:'https://meet.google.com/abc-defg-hij'},answers,startTime:input().startTime,endTime:'2026-11-20T08:30:00Z',timeZone:'Europe/Chisinau'};
 assert.equal(await provider.meetingConfirmation(env,data),'accepted');assert.match(mail,/To: alex@example.com\r\nCc: owner@example.com\r\nReply-To: owner@example.com/);
 const text=Buffer.from(mail.split('\r\n\r\n')[1],'base64').toString('utf8');assert.match(text,/10:00/);assert.match(text,/Europe\/Chisinau/);assert.match(text,/Topic: App/);assert.match(text,/https:\/\/meet.google.com\/abc-defg-hij/);
 await provider.meetingConfirmation(env,{...data,answers:{...answers,email:env.BOOKING_HOST_EMAIL}});assert.ok(!mail.includes('Cc:'));
});

test('Request emails are attempted once and a failed email never cancels the request',async()=>{
 for(const fail of [false,true]){
  let attempts=0;const s=setup({provider:{requestReceived:async()=>{attempts++;if(fail)throw Error('mail unavailable');return 'sent';}}});
  try{
   const first=await s.api.submit(s.env,request(input()));assert.equal(first.status,201);const receipt=await first.json();assert.equal(receipt.status,'requested');assert.equal(receipt.emailStatus,fail?'unconfirmed':'accepted');
   const again=await s.api.submit(s.env,request(input()));assert.equal(again.status,200);assert.equal(attempts,1);assert.equal(s.calls.create,1);
  }finally{s.db.close();}
 }
});
