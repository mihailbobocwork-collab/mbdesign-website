import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOW_KEY, STEP, HeroInquiry, readFlow, answerError, inquiryPayload, previousInquiryStep, looksLikeSubject, shortSubject, defaultSubject, writeError} from '../public/assets/components/hero-inquiry.js';
import {SUBJECTS, ENGAGEMENTS, emailError} from '../public/assets/components/inquiry-details.js';

test('Saved and legacy answers survive reload without requiring name or company', () => {
  const saved = {message:'First line\nSecond line',subject:'graphic',engagement:'project',budget:'1000-2999',meeting:'no',title:'Subject',note:'Hello\nthere',wrote:true,email:'alex@example.com'};
  assert.deepEqual(readFlow({getItem:key => key === FLOW_KEY ? JSON.stringify(saved) : null}), saved);
  assert.deepEqual(readFlow({getItem:() => JSON.stringify({topic:'Previous topic',name:'Alex',subject:'hiring',meeting:'yes'})}),
    {message:'Previous topic',subject:'',engagement:'',budget:'',meeting:'yes',title:'',note:'',wrote:false,email:''});
  for (const raw of ['null','{broken','{"message":42,"email":{}}']) {
    assert.deepEqual(readFlow({getItem:() => raw}), {message:'',subject:'',engagement:'',budget:'',meeting:'',title:'',note:'',wrote:false,email:''});
  }
  assert.equal(readFlow({getItem:() => JSON.stringify({message:'x'.repeat(6000)})}).message.length, 6000);
});

test('Each service starts the answer state and keeps existing draft text', () => {
  assert.equal(SUBJECTS.length, 3);
  assert.ok(SUBJECTS.every(service => service.label));
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
    topic:SUBJECTS[1].label,message:first.message
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
  assert.equal(previousInquiryStep(STEP.email,'no'), STEP.write);
  assert.equal(previousInquiryStep(STEP.write,'no'), STEP.preference);
  assert.equal(previousInquiryStep(STEP.calendar,'yes'), STEP.preference);
  assert.ok(emailError('alex@company'));
  assert.equal(emailError(' alex+design@example.com '), '');
});

test('Sending a message: a subject-like homepage note becomes the subject, a sentence becomes the message', () => {
  for (const subject of ['Redesign of our booking app','Logo for a coffee shop','Need help with my app','Lendit'])
    assert.equal(looksLikeSubject(subject), true, subject);
  for (const sentence of ['I need a new website for my bakery','We are looking for a designer','Hi Mihai','Can you help with our onboarding?',
    'Redesign of our booking app.','Line one\nLine two','A longer note that keeps going about the product we are building right now','']) 
    assert.equal(looksLikeSubject(sentence), false, sentence);
  const long = 'We are a small team building a marketplace for renting outdoor gear between neighbours and we need help with the whole product';
  const short = shortSubject(long);
  assert.ok(short.endsWith('…') && Array.from(short).length <= 120 && long.startsWith(short.slice(0, -1)));
  assert.equal(defaultSubject({message:'Booking app redesign'}), 'Booking app redesign');
  assert.equal(defaultSubject({message:'I need a new website.'}, 'Lendit case study'), 'Lendit case study');
  assert.equal(defaultSubject({message:'I need a new website.',subject:'brand'}), SUBJECTS.find(service => service.id === 'brand').label);
  assert.equal(defaultSubject({message:'I need a new website.'}), '');
  assert.ok(writeError('  '));
  assert.ok(writeError('x'.repeat(3001)));
  assert.equal(writeError('Hello'), '');
  const answers = {subject:'',engagement:'project',budget:'unsure',meeting:'no',email:'a@example.com',message:'Booking app redesign',title:'',note:' Hi Mihai,\nwe need flows. '};
  assert.deepEqual(inquiryPayload(answers), {name:'',company:'',subject:'',engagement:'project',budget:'unsure',email:'a@example.com',topic:'Booking app redesign',message:'Hi Mihai,\nwe need flows.'});
  assert.equal(inquiryPayload({...answers,title:'Edited subject'}).topic, 'Edited subject');
  // A sentence on the homepage and no subject: the message's first line is the subject.
  assert.equal(inquiryPayload({...answers,message:'I need a new website.',note:'I need a new website.\nMore'}).topic, 'I need a new website.');
  // A call request keeps the homepage note as the message.
  assert.equal(inquiryPayload({...answers,meeting:'yes'}).message, 'Booking app redesign');
});
