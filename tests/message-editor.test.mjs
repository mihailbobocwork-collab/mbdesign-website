import test from 'node:test';
import assert from 'node:assert/strict';
import {MESSAGE_LIMIT,characterCount,messageLimitError,fittedMessageSize} from '../public/assets/components/message-editor.js';
import {InteractiveTypewriter} from '../public/assets/components/hero-typewriter.js';
import {validateAnswer,readFlow,FLOW_KEY} from '../public/assets/components/hero-inquiry.js';

test('The 3,000-character boundary counts Unicode characters and validates without truncation',()=>{
  const atLimit='✨'.repeat(MESSAGE_LIMIT),oversized=atLimit+'🙂';
  assert.equal(characterCount(oversized),3001);
  assert.equal(messageLimitError(atLimit),'');
  assert.equal(messageLimitError(oversized),'Remove 1 character to continue (3,000 maximum).');
  assert.equal(validateAnswer('message',atLimit),'');
  assert.ok(validateAnswer('message',oversized,'hiring'));
  const saved=readFlow({getItem:key=>key===FLOW_KEY?JSON.stringify({message:oversized}):null});
  assert.equal(saved.message,oversized);
});

test('Long input fits to a readable floor; minor edits keep the settled size',()=>{
  const options={base:77,minimum:32,previous:77,substantial:true,cap:260,measure:size=>size*20};
  assert.equal(fittedMessageSize(options),32);
  assert.equal(fittedMessageSize({...options,base:29,minimum:22}),22);
  // Removing a word does not inflate the font; deleting a large block can fit afresh.
  assert.equal(fittedMessageSize({...options,previous:32,substantial:false,measure:()=>100}),32);
  assert.equal(fittedMessageSize({...options,previous:32,substantial:true,measure:()=>100}),77);
  assert.equal(fittedMessageSize({...options,previous:50,substantial:false}),32);
});

test('Enter on an oversized hero draft keeps it intact and cannot start the form',()=>{
  const el=Object.create(InteractiveTypewriter.prototype),value='A'.repeat(3100);
  let focused=false,announced=false,started=false;
  Object.assign(el,{input:{value,focus:()=>{focused=true;}},messageEditor:{announceLimit:()=>{announced=true;}},dispatchEvent:()=>{started=true;}});
  el.submit();
  assert.equal(el.input.value,value);assert.equal(focused,true);assert.equal(announced,true);assert.equal(started,false);
});
