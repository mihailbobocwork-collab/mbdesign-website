import test from 'node:test';
import assert from 'node:assert/strict';
import {FLOW_KEY, SUBJECTS, HeroInquiry, readFlow, validateAnswer, formatInquiry, questionsForSubject, previousInquiryStep, stepAfterMeetingChoice} from '../public/assets/components/hero-inquiry.js';
import {DRAFT_KEY} from '../public/assets/components/hero-typewriter.js';

test('Inquiry answers survive reload, reject malformed storage, and preserve oversized drafts for editing',()=>{
  const stored={message:'First line\nSecond line',name:'Alex',email:'alex@example.com',company:'',subject:'product',meeting:'',topic:''};
  assert.deepEqual(readFlow({getItem:key=>key===FLOW_KEY?JSON.stringify(stored):null}),stored);
  for(const raw of ['null','{broken','{"message":42,"name":{}}']){
    assert.deepEqual(readFlow({getItem:()=>raw}),{message:'',name:'',email:'',company:'',subject:'',meeting:'',topic:''});
  }
  assert.equal(readFlow({getItem:()=>JSON.stringify({message:'x'.repeat(6000)})}).message.length,6000);
  assert.doesNotThrow(()=>readFlow({getItem(){throw Error('blocked');}}));
});

test('Required answers and email validation stop progression; company can be skipped',()=>{
  assert.ok(validateAnswer('message',' \n '));
  assert.ok(validateAnswer('name',''));
  for(const email of ['','alex','alex@company','a b@example.com'])assert.ok(validateAnswer('email',email));
  assert.equal(validateAnswer('email',' alex+design@example.com '),'');
  assert.equal(validateAnswer('message','My product\nA second line'),'');
  assert.equal(validateAnswer('company',''),'');
});

test('Subject suggestions replace other presets but preserve visitor-written text',()=>{
  const flow=Object.create(HeroInquiry.prototype);
  const input={value:'',focus(){},setSelectionRange(){}};
  flow.editor={input,reveal(){},syncInput(){}};
  flow.idle={querySelectorAll:()=>[]};flow.answers={};flow.persist=()=>{};
  flow.updateSubjectUI=()=>{};
  flow.chooseSubject('product');assert.equal(input.value,SUBJECTS[0].prompt);
  flow.chooseSubject('system');assert.equal(input.value,SUBJECTS[1].prompt);
  input.value='Our own project idea\nWith a second line';
  flow.chooseSubject('brand');
  assert.equal(flow.answers.topic,'Our own project idea');
  assert.equal(flow.answers.subject,'brand');
});

test('Hiring collects a topic, contact details and a separate description with a simple editable opening suggestion',()=>{
  const questions=questionsForSubject('hiring');
  assert.deepEqual(questions.map(q=>q.key),['topic','name','email','company','message']);
  assert.equal(questions[4].title,'Tell me about the role');
  assert.equal(questions[3].optional,true);
  assert.ok(SUBJECTS.find(s=>s.id==='hiring').prompt.startsWith('Hi Mihail,'));
  assert.equal(validateAnswer('message','','hiring'),'Tell me a little about the role.');
  const message='We’re hiring a product designer.\nRemote, full-time.';
  const output=formatInquiry({subject:'hiring',name:'Alex',email:'alex@example.com',company:'Team',message});
  assert.ok(output.startsWith('Hiring inquiry\n'));
  assert.ok(output.includes('Subject: Hiring a designer'));
  assert.ok(output.endsWith(message));
});

test('Hiring fills an empty or preset message and keeps a visitor-written message intact',()=>{
  const flow=Object.create(HeroInquiry.prototype),input={value:'',focus(){},setSelectionRange(){}};
  flow.editor={input,reveal(){},syncInput(){}};flow.answers={};flow.persist=()=>{};flow.updateSubjectUI=()=>{};
  const hiring=SUBJECTS.find(s=>s.id==='hiring').prompt;
  flow.chooseSubject('hiring');assert.equal(input.value,hiring);
  flow.chooseSubject('product');flow.chooseSubject('hiring');assert.equal(input.value,hiring);
  input.value='We’re hiring for our climate research team.\nHere are the details.';
  flow.chooseSubject('brand');flow.chooseSubject('hiring');
  assert.equal(input.value,'We’re hiring for our climate research team.\nHere are the details.');
});

test('Reset clears the saved message and subject while preserving separately entered contact answers',()=>{
  const values=new Map([[DRAFT_KEY,'Old message']]);
  const flow=Object.create(HeroInquiry.prototype);
  flow.storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  flow.answers={message:'Old message',subject:'hiring',name:'Alex',email:'alex@example.com',company:'Team'};
  let refreshed=false;flow.updateSubjectUI=()=>{refreshed=true;};
  flow.resetDraft();
  assert.equal(flow.answers.message,'');assert.equal(flow.answers.subject,'');
  assert.equal(flow.answers.name,'Alex');assert.equal(flow.answers.email,'alex@example.com');
  assert.equal(values.has(DRAFT_KEY),false);
  assert.equal(readFlow(flow.storage).message,'');assert.equal(readFlow(flow.storage).subject,'');
  assert.equal(refreshed,true);
});

test('Prepared inquiry includes the exact multiline project and selected subject',()=>{
  const output=formatInquiry({name:'Alex',email:'alex@example.com',company:'',subject:'system',message:'First line\nSecond line & details'});
  assert.ok(output.includes('Name: Alex\nEmail: alex@example.com'));
  assert.ok(output.includes('Company: Not specified\nTopic: Not specified\nSubject: A Design System'));
  assert.ok(output.endsWith('First line\nSecond line & details'));
});

test('Both meeting choices collect a separate description before calendar or review',()=>{assert.equal(stepAfterMeetingChoice('yes'),8);assert.equal(stepAfterMeetingChoice('no'),8);assert.equal(previousInquiryStep(8,'yes'),4);assert.equal(previousInquiryStep(6,'yes'),5);assert.equal(previousInquiryStep(6,'no'),8);assert.equal(previousInquiryStep(5,'yes'),8);});

test('A one-word hero becomes a topic; longer introductions retain all their details',async()=>{
 const {withHeroTopic}=await import('../public/assets/components/hero-inquiry.js');
 assert.deepEqual(withHeroTopic({message:'',topic:''},'app'),{message:'',topic:'app'});
 const long='A product\n'+ 'Important context. '.repeat(30);const saved=withHeroTopic({message:'',topic:''},long);assert.equal(saved.topic,'A product');assert.equal(saved.message,long);
 const preserved=withHeroTopic({message:'My detailed brief is already written.',topic:'app'},'website');assert.equal(preserved.message,'My detailed brief is already written.');assert.equal(preserved.topic,'website');
});
test('Both paths stop a one-word description and require details before time selection or final review',()=>{
 const flow=Object.create(HeroInquiry.prototype),field={name:'message',value:'app',setAttribute(){},focus(){}};const error={textContent:''};
 flow.active=true;flow.busy=false;flow.step=8;flow.answers={topic:'app',subject:'',meeting:'no'};flow.persist=()=>{};flow.form={querySelector:s=>s==='[data-answer]'?field:error};let destination=null;flow.changeStep=n=>destination=n;
 flow.next();assert.equal(destination,null);assert.match(error.textContent,/20 characters/);assert.equal(flow.answers.topic,'app');
 field.value='We are planning an app to help local families.';flow.next();assert.equal(destination,6);assert.equal(flow.answers.message,field.value);
 flow.answers.meeting='yes';flow.next();assert.equal(destination,5);assert.equal(flow.answers.topic,'app');
});
