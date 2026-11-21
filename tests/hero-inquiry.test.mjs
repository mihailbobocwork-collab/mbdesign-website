import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOW_KEY, STEP, HeroInquiry, readFlow, answerError, inquiryPayload, previousInquiryStep} from '../public/assets/components/hero-inquiry.js';
import {SUBJECTS, ENGAGEMENTS, emailError} from '../public/assets/components/inquiry-details.js';

test('Saved and legacy answers survive reload without requiring name or company', () => {
  const saved = {message:'First line\nSecond line',subject:'graphic',engagement:'project',budget:'1000-2999',meeting:'no',email:'alex@example.com'};
  assert.deepEqual(readFlow({getItem:key => key === FLOW_KEY ? JSON.stringify(saved) : null}), saved);
  assert.deepEqual(readFlow({getItem:() => JSON.stringify({topic:'Previous topic',name:'Alex',subject:'hiring',meeting:'yes'})}),
    {message:'Previous topic',subject:'',engagement:'',budget:'',meeting:'yes',email:''});
  for (const raw of ['null','{broken','{"message":42,"email":{}}']) {
    assert.deepEqual(readFlow({getItem:() => raw}), {message:'',subject:'',engagement:'',budget:'',meeting:'',email:''});
  }
  assert.equal(readFlow({getItem:() => JSON.stringify({message:'x'.repeat(6000)})}).message.length, 6000);
});

test('Each service starts the answer state and keeps existing draft text', () => {
  assert.deepEqual(SUBJECTS.map(service => service.label), ['Product Design', 'Graphic Design', 'Brand Identity']);
  const flow = Object.create(HeroInquiry.prototype);
  flow.answers = {};
  flow.editor = {input:{value:'Our own project idea\nMore context'}};
  const opened = [];
  flow.start = message => opened.push({subject:flow.answers.subject,message});
  for (const service of SUBJECTS) flow.chooseSubject(service.id);
  assert.deepEqual(opened, SUBJECTS.map(service => ({subject:service.id,message:flow.editor.input.value})));
});

test('The first answer accepts a short note or a service and preserves multiline context', () => {
  assert.ok(answerError('   ',''));
  assert.equal(answerError('App',''), '');
  assert.equal(answerError('', 'graphic'), '');
  assert.ok(answerError('x'.repeat(3001), 'graphic'));
  const first = {subject:'graphic',engagement:'partnership',budget:'3000-4999',email:' alex@example.com ',message:'First line\nSecond line'};
  assert.deepEqual(inquiryPayload(first), {
    name:'',company:'',subject:'graphic',engagement:'partnership',budget:'3000-4999',email:'alex@example.com',
    topic:'Graphic Design',message:first.message
  });
  assert.equal(inquiryPayload({...first,message:''}).message,SUBJECTS[1].prompt);
});

test('Collaboration and budget are required and email comes after intent and any meeting slot', () => {
  assert.deepEqual(ENGAGEMENTS.map(option => option.label), ['Long-term partnership','Project-based']);
  const flow = Object.create(HeroInquiry.prototype);
  Object.assign(flow, {active:true,busy:false,step:STEP.engagement,answers:{engagement:'',budget:''},form:{querySelector:() => null}});
  const destinations = [];
  flow.changeStep = step => destinations.push(step);
  flow.next();
  assert.deepEqual(destinations, []);
  flow.answers.engagement = 'project';
  flow.next();
  assert.deepEqual(destinations, [STEP.budget]);
  flow.step = STEP.budget;
  flow.next();
  assert.deepEqual(destinations, [STEP.budget]);
  flow.answers.budget = 'unsure';
  flow.next();
  assert.deepEqual(destinations, [STEP.budget, STEP.preference]);
  assert.equal(previousInquiryStep(STEP.preference,'no'), STEP.budget);
  assert.equal(previousInquiryStep(STEP.email,'yes'), STEP.calendar);
  assert.equal(previousInquiryStep(STEP.email,'no'), STEP.preference);
  assert.equal(previousInquiryStep(STEP.calendar,'yes'), STEP.preference);
  assert.ok(emailError('alex@company'));
  assert.equal(emailError(' alex+design@example.com '), '');
});
