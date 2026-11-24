import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';
import {localBookingDB} from '../scripts/local-booking-db.mjs';
import {createBookingAPI} from '../lib/booking-api.js';
import {createBookingAdmin} from '../lib/booking-admin.js';
import {createAdminAuth} from '../lib/admin-auth.js';

const root=fileURLToPath(new URL('../',import.meta.url)),NOW=Date.parse('2026-11-19T07:00:00Z');
const env={GOOGLE_CLIENT_ID:'mock-client',GOOGLE_CLIENT_SECRET:'mock-secret',GOOGLE_REFRESH_TOKEN:'mock-refresh',BOOKING_HOST_EMAIL:'owner@example.com',BOOKING_LOCAL:'true'};
const answers={topic:'App',name:'Alex',email:'alex@example.com',company:'Team',message:'A thoughtful product conversation.',subject:'product'};
const ID='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',OTHER='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const input=(id=ID,extra={})=>({id,kind:'meeting',answers,timeZone:'Europe/Chisinau',startTime:'2026-11-20T08:00:00.000Z',...extra});
const submitRequest=body=>new Request('http://localhost:4173/api/bookings',{method:'POST',headers:{Origin:'http://localhost:4173','Content-Type':'application/json'},body:JSON.stringify(body)});
const adminGet=()=>new Request('http://localhost:4173/api/admin/bookings');
const adminPost=(body,origin='http://localhost:4173')=>new Request('http://localhost:4173/api/admin/bookings',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});

function setup({provider:overrides={},clock}={}){
 const db=localBookingDB(root,{memory:true}),calls={hold:[],approve:[],release:[],confirmation:[],decline:[]};
 const provider={
  busy:async()=>[],find:async()=>null,message:async()=>({id:'mail'}),requestNotice:async()=>'n',requestReceived:async()=>'r',
  hold:async(_env,data)=>{calls.hold.push(data);return {id:data.id,status:'confirmed'};},
  approve:async(_env,data)=>{calls.approve.push(data);return {id:data.id,status:'confirmed',hangoutLink:'https://meet.google.com/abc-defg-hij'};},
  release:async(_env,id)=>{calls.release.push(id);},
  meetingConfirmation:async(_env,data)=>{calls.confirmation.push(data);return 'accepted';},
  declineNotice:async(_env,data)=>{calls.decline.push(data);return 'sent';},
  ...overrides
 };
 const time=clock||(()=>NOW);
 return {db,calls,env:{...env,BOOKING_DB:db},api:createBookingAPI({provider,clock:time}),admin:createBookingAdmin({provider,clock:time})};
}
const meetingsOf=async(s)=>(await (await s.admin.list(s.env,adminGet())).json()).meetings;

test('A meeting request waits in the admin with its details until it is answered',async()=>{
 const s=setup();try{
  assert.equal((await s.api.submit(s.env,submitRequest(input()))).status,201);
  const [meeting]=await meetingsOf(s);
  assert.equal(meeting.status,'requested');assert.equal(meeting.answers.email,'alex@example.com');assert.equal(meeting.timeZone,'Europe/Chisinau');assert.equal(meeting.startTime,'2026-11-20T08:00:00.000Z');
  // The held time is not offered to anyone else.
  assert.equal((await s.api.submit(s.env,submitRequest(input(OTHER)))).status,409);
 }finally{s.db.close();}
});

test('Approving sends the invitation once and the guest’s receipt becomes confirmed',async()=>{
 const s=setup();try{
  await s.api.submit(s.env,submitRequest(input()));
  const response=await s.admin.decide(s.env,adminPost({id:ID,action:'approve'}));
  assert.equal(response.status,200);const {meeting}=await response.json();
  assert.equal(meeting.status,'confirmed');assert.equal(meeting.meetUrl,'https://meet.google.com/abc-defg-hij');assert.equal(meeting.decision.action,'approved');
  assert.equal(s.calls.approve.length,1);assert.match(s.calls.approve[0].id,/^mb[a-f0-9]{64}$/);assert.equal(s.calls.approve[0].answers.email,'alex@example.com');assert.equal(s.calls.confirmation.length,1);
  const again=await s.admin.decide(s.env,adminPost({id:ID,action:'approve'}));assert.equal(again.status,409);assert.equal(s.calls.approve.length,1);
  const receipt=await (await s.api.submit(s.env,submitRequest(input()))).json();assert.equal(receipt.status,'confirmed');assert.equal(receipt.meetUrl,'https://meet.google.com/abc-defg-hij');
 }finally{s.db.close();}
});

test('Declining frees the slot, emails the guest with the note and sends no invitation',async()=>{
 const s=setup();try{
  await s.api.submit(s.env,submitRequest(input()));
  const response=await s.admin.decide(s.env,adminPost({id:ID,action:'decline',note:'Fully booked that week.'}));
  assert.equal(response.status,200);const {meeting}=await response.json();
  assert.equal(meeting.status,'declined');assert.equal(meeting.decision.note,'Fully booked that week.');
  assert.equal(s.calls.release.length,1);assert.equal(s.calls.decline[0].note,'Fully booked that week.');assert.equal(s.calls.approve.length,0);
  assert.equal((await s.api.submit(s.env,submitRequest(input(OTHER)))).status,201);
 }finally{s.db.close();}
});

test('A failed approval changes nothing and can be retried; past times can only be declined',async()=>{
 let fail=true,now=NOW;const s=setup({clock:()=>now,provider:{approve:async(_env,data)=>{if(fail)throw Error('google');return {id:data.id,status:'confirmed'};}}});try{
  await s.api.submit(s.env,submitRequest(input()));
  assert.equal((await s.admin.decide(s.env,adminPost({id:ID,action:'approve'}))).status,502);
  assert.equal((await meetingsOf(s))[0].status,'requested');
  now=Date.parse('2026-11-20T09:00:00Z');fail=false;
  assert.equal((await s.admin.decide(s.env,adminPost({id:ID,action:'approve'}))).status,409);
  assert.equal((await s.admin.decide(s.env,adminPost({id:ID,action:'decline'}))).status,200);
 }finally{s.db.close();}
});

test('Admin actions refuse other origins, unknown actions and missing sign-in',async()=>{
 const s=setup();try{
  await s.api.submit(s.env,submitRequest(input()));
  assert.equal((await s.admin.decide(s.env,adminPost({id:ID,action:'approve'},'https://evil.example'))).status,403);
  assert.equal((await s.admin.decide(s.env,adminPost({id:ID,action:'delete'}))).status,400);
  const live={...s.env,BOOKING_LOCAL:undefined};
  assert.equal((await s.admin.list(live,adminGet())).status,503);
  const withAccess={...live,ACCESS_TEAM_DOMAIN:'team.cloudflareaccess.com',ACCESS_AUD:'aud'};
  assert.equal((await s.admin.list(withAccess,adminGet())).status,401);
  assert.equal((await s.admin.decide(withAccess,adminPost({id:ID,action:'approve'}))).status,401);
  assert.equal(s.calls.approve.length,0);
 }finally{s.db.close();}
});

test('Cloudflare Access tokens are verified by signature, audience, issuer, expiry and allowed email',async()=>{
 const {subtle}=webcrypto;
 const pair=await subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await subtle.exportKey('jwk',pair.publicKey),kid:'key-1'};
 const b64=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
 const sign=async payload=>{const head=b64({alg:'RS256',kid:'key-1'})+'.'+b64(payload);return head+'.'+Buffer.from(await subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(head))).toString('base64url');};
 let fetches=0;const auth=createAdminAuth({clock:()=>NOW,fetcher:async url=>{fetches++;assert.equal(url,'https://team.cloudflareaccess.com/cdn-cgi/access/certs');return Response.json({keys:[jwk]});}});
 const live={ACCESS_TEAM_DOMAIN:'https://team.cloudflareaccess.com/',ACCESS_AUD:'aud-123'};
 const good={aud:['aud-123'],iss:'https://team.cloudflareaccess.com',exp:NOW/1000+600,email:'Owner@Example.com'};
 const req=token=>new Request('https://site.example/api/admin/bookings',{headers:token?{'Cf-Access-Jwt-Assertion':token}:{}});
 assert.deepEqual(await auth(live,req(await sign(good))),{email:'Owner@Example.com'});
 assert.equal(await auth(live,req(await sign({...good,aud:['other']}))),null);
 assert.equal(await auth(live,req(await sign({...good,iss:'https://evil.cloudflareaccess.com'}))),null);
 assert.equal(await auth(live,req(await sign({...good,exp:NOW/1000-1}))),null);
 const token=await sign(good),at=token.lastIndexOf('.')+20;assert.equal(await auth(live,req(token.slice(0,at)+(token[at]==='A'?'B':'A')+token.slice(at+1))),null);
 assert.equal(await auth(live,req('')),null);
 assert.deepEqual(await auth({...live,ADMIN_EMAILS:'owner@example.com, other@example.com'},req(await sign(good))),{email:'Owner@Example.com'});
 assert.equal(await auth({...live,ADMIN_EMAILS:'someone@example.com'},req(await sign(good))),null);
 assert.equal(fetches,1);
 // Loopback development is let through only with BOOKING_LOCAL.
 assert.equal((await auth({BOOKING_LOCAL:'true'},new Request('http://localhost:4173/api/admin/bookings'))).local,true);
 assert.equal(await auth({BOOKING_LOCAL:'true'},new Request('https://site.example/api/admin/bookings')),null);
});
