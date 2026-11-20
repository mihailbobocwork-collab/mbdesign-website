import test from 'node:test';
import assert from 'node:assert/strict';
import {BookingAction} from '../public/assets/components/booking-action.js';
class Button extends EventTarget{constructor(){super();this.textContent='Send message';this.disabled=false;}}
const body={kind:'message',answers:{name:'Alex',email:'alex@example.com',message:'A product inquiry.'},timeZone:'UTC'};
test('A slow submission blocks double clicks, preserves its retry ID, and waits for provider confirmation',async()=>{
 const previousFetch=globalThis.fetch,previousStorage=globalThis.sessionStorage,storage=new Map();globalThis.sessionStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 let resolveFirst,calls=[],success=0;const button=new Button(),status={textContent:''};globalThis.fetch=async(_url,options)=>{calls.push(JSON.parse(options.body));return calls.length===1?new Promise(resolve=>resolveFirst=resolve):Response.json({status:'confirmed',kind:'message'});};
 try{const action=new BookingAction({button,status,body,onSuccess:()=>success++});const first=action.send();await new Promise(resolve=>setTimeout(resolve,20));await action.send();assert.equal(calls.length,1);assert.equal(button.disabled,true);
 resolveFirst(Response.json({status:'pending',message:'Still confirming.'},{status:202}));await first;assert.equal(success,0);assert.equal(button.textContent,'Check status');assert.equal(button.disabled,false);
 await action.send();assert.equal(calls.length,2);assert.equal(calls[0].id,calls[1].id);assert.equal(success,1);action.destroy();
 }finally{globalThis.fetch=previousFetch;globalThis.sessionStorage=previousStorage;}
});
test('Unavailable delivery leaves the message editable and never shows a false thank-you',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({error:'not_connected',message:'Not connected yet.'},{status:503});let success=false;const button=new Button(),status={textContent:''};
 try{const action=new BookingAction({button,status,body,onSuccess:()=>success=true});await action.send();assert.equal(success,false);assert.equal(status.textContent,'Not connected yet.');assert.equal(button.disabled,false);assert.equal(button.textContent,'Send message');action.destroy();}finally{globalThis.fetch=previous;}
});

test('A verification API error leaves the button usable and explains how to recover',async()=>{
 const previous=globalThis.turnstile,previousFetch=globalThis.fetch;let calls=0;
 globalThis.turnstile={render:()=> 'widget',getResponse(){throw Error('widget not ready');},remove(){}};globalThis.fetch=async()=>{calls++;throw Error('must not send');};
 const button=new Button(),status={textContent:''};
 try{const action=new BookingAction({button,status,challenge:{},siteKey:'public-key',body,onSuccess(){}});await new Promise(resolve=>setImmediate(resolve));await action.send();assert.match(status.textContent,/Verification isn’t ready/);assert.equal(button.disabled,false);assert.equal(calls,0);action.destroy();}finally{globalThis.turnstile=previous;globalThis.fetch=previousFetch;}
});
test('Missing verification reveals the challenge and never sends a request',async()=>{
 const previous=globalThis.turnstile;let scrolled=false;globalThis.turnstile={render:()=> 'widget',getResponse:()=>'',remove(){}};
 const button=new Button(),status={textContent:''};
 try{const action=new BookingAction({button,status,challenge:{scrollIntoView(){scrolled=true;}},siteKey:'public-key',body,onSuccess(){}});await new Promise(resolve=>setImmediate(resolve));await action.send();assert.equal(scrolled,true);assert.match(status.textContent,/verification below/);assert.equal(button.disabled,false);action.destroy();}finally{globalThis.turnstile=previous;}
});
