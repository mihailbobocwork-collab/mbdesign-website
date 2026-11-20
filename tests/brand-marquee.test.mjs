import test from 'node:test';
import assert from 'node:assert/strict';
import {BrandMarquee} from '../public/assets/components/brand-marquee.js';

test('Brand motion pauses for user intent, reduced motion, hidden tabs, and offscreen placement',()=>{
  const el=Object.create(BrandMarquee.prototype),previous=globalThis.document,attributes={};
  Object.assign(el,{dataset:{},motion:{matches:false},visible:true,userPaused:false,
    button:{hidden:false,setAttribute:(key,value)=>attributes[key]=value}});
  globalThis.document={hidden:false};
  try{
    el.update();assert.equal(el.dataset.playing,'true');
    el.userPaused=true;el.update();assert.equal(el.dataset.playing,'false');assert.equal(attributes['aria-label'],'Resume brand logos');
    el.visible=false;el.update();el.visible=true;el.update();assert.equal(el.dataset.playing,'false','Coming back onscreen must not override a deliberate pause');
    el.userPaused=false;el.motion.matches=true;el.update();assert.equal(el.dataset.playing,'false');assert.equal(el.button.hidden,true);
    el.motion.matches=false;globalThis.document.hidden=true;el.update();assert.equal(el.dataset.playing,'false');
    globalThis.document.hidden=false;el.visible=false;el.update();assert.equal(el.dataset.playing,'false');
    el.visible=true;el.update();assert.equal(el.dataset.playing,'true');assert.equal(el.button.hidden,false);
  }finally{globalThis.document=previous;}
});
