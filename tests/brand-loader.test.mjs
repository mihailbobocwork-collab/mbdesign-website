import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {InteractiveTypewriter} from '../public/assets/components/hero-typewriter.js';
const boot=await readFile(new URL('../public/assets/components/brand-loader-boot.js',import.meta.url),'utf8');

function runBoot({seen=false,reduced=false,back=false,blocked=false}={}){
  const dataset={},timers=[],events=[];
  runInNewContext(boot,{
    document:{documentElement:{dataset}},
    sessionStorage:{getItem(){if(blocked)throw Error('blocked');return seen?'seen':null;}},
    matchMedia:()=>({matches:reduced}),performance:{getEntriesByType:()=>[{type:back?'back_forward':'navigate'}]},
    setTimeout:(callback,delay)=>timers.push({callback,delay}),dispatchEvent:event=>events.push(event.type),Event:class{constructor(type){this.type=type;}}
  });
  return {dataset,timers,events};
}
test('The brand entrance is only queued for a first visit, respecting motion and history',()=>{
  assert.equal(runBoot().dataset.brandBoot,'pending');
  for(const state of [{seen:true},{reduced:true},{back:true}]){
    const result=runBoot(state);assert.equal(result.dataset.brandBoot,undefined);assert.equal(result.timers.length,0);
  }
});
test('A missing loader module or blocked storage cannot permanently hide the website',()=>{
  const {dataset,timers,events}=runBoot({blocked:true});
  assert.equal(dataset.brandBoot,'pending');assert.ok(timers[0].delay<=4500);
  timers[0].callback();assert.equal(dataset.brandBoot,undefined);assert.equal(dataset.brandSequence,'done');
  assert.deepEqual(events,['brand-loader-skip']);
});
test('The headline starts after the logo reveal once, and later returns never replay it',t=>{
  t.mock.timers.enable({apis:['setTimeout']});let typed=0;
  const element=Object.create(InteractiveTypewriter.prototype);
  Object.assign(element,{motion:{matches:false},input:{value:''},intro:{textContent:''},dataset:{typing:'waiting'},typeCharacter:()=>typed++});
  assert.equal(typed,0);element.beginTyping();t.mock.timers.tick(180);assert.equal(typed,1);
  element.beginTyping();t.mock.timers.tick(5000);assert.equal(typed,1);
});
