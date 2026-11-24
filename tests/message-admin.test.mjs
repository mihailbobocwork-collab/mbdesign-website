import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {localBookingDB} from '../scripts/local-booking-db.mjs';
import {createBookingAPI} from '../lib/booking-api.js';
import {createMessageAdmin} from '../lib/message-admin.js';
import {createGoogleProvider} from '../lib/google-calendar.js';

const root=fileURLToPath(new URL('../',import.meta.url)),NOW=Date.parse('2026-11-19T07:00:00Z');
const env={GOOGLE_CLIENT_ID:'mock-client',GOOGLE_CLIENT_SECRET:'mock-secret',GOOGLE_REFRESH_TOKEN:'mock-refresh',BOOKING_HOST_EMAIL:'owner@example.com',BOOKING_FROM_EMAIL:'hello@example.com',BOOKING_LOCAL:'true'};
const answers={topic:'App redesign',name:'Alex Morgan',email:'alex@example.com',company:'Team',message:'We need help with onboarding.\nCan we talk?',subject:'product'};
const ID='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const submit=body=>new Request('http://localhost:4173/api/bookings',{method:'POST',headers:{Origin:'http://localhost:4173','Content-Type':'application/json'},body:JSON.stringify(body)});
const get=(query='')=>new Request('http://localhost:4173/api/admin/messages'+query);
const post=(body,origin='http://localhost:4173')=>new Request('http://localhost:4173/api/admin/messages',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});

function setup({reply}={}){
 const db=localBookingDB(root,{memory:true}),calls={message:[],reply:[]};
 const provider={busy:async()=>[],find:async()=>null,message:async(_env,data)=>{calls.message.push(data);return {id:'mail'};},reply:reply||(async(_env,data)=>{calls.reply.push(data);return 'sent';})};
 return {db,calls,env:{...env,BOOKING_DB:db},api:createBookingAPI({provider,clock:()=>NOW}),admin:createMessageAdmin({provider,clock:()=>NOW})};
}
const inbox=async s=>(await (await s.admin.list(s.env,get())).json()).messages;

test('A message from the website arrives in the inbox unread, with its text',async()=>{
 const s=setup();try{
  assert.equal((await s.api.submit(s.env,submit({id:ID,kind:'message',answers}))).status,201);
  assert.equal(s.calls.message[0].adminUrl,'http://localhost:4173/admin/messages/');
  const [message]=await inbox(s);
  assert.equal(message.read,false);assert.equal(message.answers.message,answers.message);assert.deepEqual(message.replies,[]);
  // The visitor's status check still gets the plain receipt.
  assert.deepEqual(await (await s.api.submit(s.env,submit({id:ID,kind:'message',answers}))).json(),{status:'confirmed',kind:'message'});
 }finally{s.db.close();}
});

test('Reading, replying once per draft, and deleting',async()=>{
 const s=setup();try{
  await s.api.submit(s.env,submit({id:ID,kind:'message',answers}));
  assert.equal((await (await s.admin.act(s.env,post({id:ID,action:'read'}))).json()).message.read,true);
  assert.equal((await (await s.admin.act(s.env,post({id:ID,action:'unread'}))).json()).message.read,false);
  const reply={id:ID,action:'reply',body:'  Hi Alex,\r\nhappy to talk.  ',replyId:'draft-0001'};
  const first=await (await s.admin.act(s.env,post(reply))).json();
  assert.equal(first.message.read,true);assert.equal(first.message.replies.length,1);assert.equal(first.message.replies[0].body,'Hi Alex,\nhappy to talk.');
  assert.equal(s.calls.reply.length,1);assert.equal(s.calls.reply[0].answers.email,'alex@example.com');assert.equal(s.calls.reply[0].body,'Hi Alex,\nhappy to talk.');
  // A double click (same draft id) doesn't send twice.
  await s.admin.act(s.env,post(reply));assert.equal(s.calls.reply.length,1);
  assert.equal((await s.admin.act(s.env,post({...reply,body:'',replyId:'draft-0002'}))).status,422);
  assert.equal((await s.admin.act(s.env,post({id:ID,action:'delete'}))).status,200);
  assert.deepEqual(await inbox(s),[]);
  assert.equal((await s.admin.act(s.env,post({id:ID,action:'delete'}))).status,404);
 }finally{s.db.close();}
});

test('A failed reply is not recorded and says whether anything went out',async()=>{
 const s=setup({reply:async()=>{throw Object.assign(Error('mail_failed'),{definite:false});}});try{
  await s.api.submit(s.env,submit({id:ID,kind:'message',answers}));
  const response=await s.admin.act(s.env,post({id:ID,action:'reply',body:'Hello',replyId:'draft-0001'}));
  assert.equal(response.status,502);assert.match((await response.json()).message,/Sent folder/);
  assert.deepEqual((await inbox(s))[0].replies,[]);
 }finally{s.db.close();}
});

test('The inbox refuses other origins, unknown actions and missing sign-in',async()=>{
 const s=setup();try{
  await s.api.submit(s.env,submit({id:ID,kind:'message',answers}));
  assert.equal((await s.admin.act(s.env,post({id:ID,action:'read'},'https://evil.example'))).status,403);
  assert.equal((await s.admin.act(s.env,post({id:ID,action:'forward'}))).status,400);
  const live={...s.env,BOOKING_LOCAL:undefined,ACCESS_TEAM_DOMAIN:'team.cloudflareaccess.com',ACCESS_AUD:'aud'};
  assert.equal((await s.admin.list(live,get())).status,401);
  assert.equal((await s.admin.act(live,post({id:ID,action:'delete'}))).status,401);
  assert.equal((await inbox(s)).length,1);
  // Local samples never touch the database or Gmail.
  const samples=(await (await s.admin.list(s.env,get('?sample'))).json());
  assert.equal(samples.sample,true);assert.ok(samples.messages.length>=3);
 }finally{s.db.close();}
});

test('A reply email comes from the public address with the original message quoted',async()=>{
 const sent=[];
 const fetcher=async(url,init={})=>{
  if(url.includes('oauth2'))return Response.json({access_token:'token',expires_in:3600});
  sent.push(JSON.parse(init.body));return Response.json({id:'gmail-1'});
 };
 const provider=createGoogleProvider({fetcher,clock:()=>NOW});
 await provider.reply(env,{id:'msg-reply-1',answers,body:'Hi Alex,\nhappy to talk.'});
 const raw=Buffer.from(sent[0].raw,'base64url').toString('utf8');
 assert.match(raw,/^From: Mihai Boboc <hello@example\.com>\r\nTo: alex@example\.com\r\nReply-To: hello@example\.com\r\n/);
 const subject=Buffer.from(raw.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1],'base64').toString('utf8');
 assert.equal(subject,'Re: App redesign');
 const body=Buffer.from(raw.split('\r\n\r\n')[1],'base64').toString('utf8');
 assert.equal(body,'Hi Alex,\nhappy to talk.\n\n—\nYou wrote:\n> We need help with onboarding.\n> Can we talk?');
});
