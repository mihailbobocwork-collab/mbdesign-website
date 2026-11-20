import test from 'node:test';
import assert from 'node:assert/strict';
import {handoffInquiry,FOOTER_HANDOFF} from '../public/assets/components/footer-inquiry.js';
test('The homepage handles footer text directly without navigation or sending',()=>{let navigated=false;assert.equal(handoffInquiry('A new app',{dispatch:()=>false,navigate:()=>navigated=true}),true);assert.equal(navigated,false);});
test('Case-study footer preserves the message before returning to the homepage flow',()=>{const saved=new Map();let destination;handoffInquiry('A new app',{storage:{setItem:(k,v)=>saved.set(k,v)},dispatch:()=>true,navigate:url=>destination=url});assert.equal(saved.get(FOOTER_HANDOFF),'A new app');assert.equal(destination,'/');});
test('Blocked storage keeps text in a fragment fallback; empty and oversized ideas cannot navigate',()=>{let destination;handoffInquiry('A new app',{storage:{setItem(){throw Error('blocked');}},dispatch:()=>true,navigate:url=>destination=url});assert.equal(destination,'/contact/#message=A%20new%20app');for(const value of [' ','x'.repeat(3001)])assert.equal(handoffInquiry(value,{dispatch(){throw Error('must not run');}}),false);});
