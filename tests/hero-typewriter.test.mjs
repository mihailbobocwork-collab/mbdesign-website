import test from 'node:test';
import assert from 'node:assert/strict';
import {DRAFT_KEY,typingDelay,hasMessage,saveDraft,readDraft,inquiryURL,messageFromFragment,readContactEntry,InteractiveTypewriter} from '../public/assets/components/hero-typewriter.js';
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
test('Message handoff round-trips multiline, symbols, emoji and markup as text',()=>{const message='A product idea & a question? #UX\nSecond line: café ✨ <script>plain text</script>';const url=inquiryURL(message);assert.equal(messageFromFragment(url.slice(url.indexOf('#'))),message);assert.equal(messageFromFragment('#other'),null);assert.equal(messageFromFragment('#message=%invalid'),null);assert.equal(hasMessage(' \n '),false);assert.equal(hasMessage(message),true);});
test('Draft persistence can be cleared and gracefully tolerates blocked storage',()=>{const s=storage();saveDraft(s,'Our product idea');assert.equal(s.getItem(DRAFT_KEY),'Our product idea');assert.equal(readDraft(s),'Our product idea');saveDraft(s,'');assert.equal(readDraft(s),'');const blocked={getItem(){throw Error('denied');},setItem(){throw Error('denied');},removeItem(){throw Error('denied');}};assert.doesNotThrow(()=>saveDraft(blocked,'still editable'));assert.equal(readDraft(blocked),'');});
test('Contact entry preserves multiline drafts and removes the fragment',()=>{
  const s=storage(), pathname='/contact/';
  let cleaned='';
  const history={state:null,replaceState:(_,__,url)=>cleaned=url};
  const hash='#message='+encodeURIComponent('First line\nSecond line & details');
  const initial=readContactEntry(s,{hash,pathname,search:''},history);
  assert.equal(initial.message,'First line\nSecond line & details');
  assert.equal(cleaned,pathname);
  saveDraft(s,initial.message+'\nEdited on contact',initial.draftKey);
  assert.match(readContactEntry(s,{hash,pathname,search:''},history).message,/Edited on contact$/);

});
test('Ordinary typing takes 50–80ms with longer punctuation pauses',()=>{assert.equal(typingDelay('a',()=>0),50);assert.equal(typingDelay('a',()=>1),80);assert.ok(typingDelay(',',()=>0)>typingDelay('a',()=>1));assert.ok(typingDelay('.',()=>0)>typingDelay(',',()=>1));});
test('An empty hover exit restores the finished introduction without replay',()=>{const el=Object.create(InteractiveTypewriter.prototype);Object.assign(el,{input:{value:''},characters:Array.from('Hello.'),fullText:'Hello.',intro:{textContent:'He'},dataset:{typing:'true',editing:'true'},hovered:false,contains:()=>false});const previous=globalThis.document;globalThis.document={activeElement:null};try{el.restore();assert.equal(el.intro.textContent,'Hello.');assert.equal(el.dataset.typing,'false');assert.equal(el.dataset.editing,'false');assert.equal(el.index,6);}finally{globalThis.document=previous;}});
test('Pointer exit never resets typed text or an actively focused editor',()=>{const el=Object.create(InteractiveTypewriter.prototype);Object.assign(el,{input:{value:'Keep this draft'},dataset:{editing:'true'},hovered:false,contains:()=>false});const previous=globalThis.document;globalThis.document={activeElement:null};try{el.restore();assert.equal(el.input.value,'Keep this draft');assert.equal(el.dataset.editing,'true');el.input.value='';el.contains=()=>true;el.restore();assert.equal(el.dataset.editing,'true');}finally{globalThis.document=previous;}});

test('A brief pointer exit waits, re-entry cancels restoration, and reduced motion skips the hold',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const el=Object.create(InteractiveTypewriter.prototype);
  Object.assign(el,{motion:{matches:false},input:{value:''},characters:Array.from('Hello.'),fullText:'Hello.',intro:{textContent:'Hello.'},dataset:{typing:'false',editing:'true'},hovered:false,contains:()=>false});
  const previous=globalThis.document;globalThis.document={activeElement:null};
  try{
    el.scheduleRestore();t.mock.timers.tick(400);assert.equal(el.dataset.editing,'true');
    el.reveal();t.mock.timers.tick(600);assert.equal(el.dataset.editing,'true');
    el.scheduleRestore();t.mock.timers.tick(849);assert.equal(el.dataset.editing,'true');
    t.mock.timers.tick(1);assert.equal(el.dataset.editing,'false');
    el.reveal();el.motion.matches=true;el.scheduleRestore();t.mock.timers.tick(0);
    assert.equal(el.dataset.editing,'false');
  }finally{globalThis.document=previous;}
});

test('A mouse exit releases scroll-activated Listening while a touch exit keeps it available',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const el=Object.create(InteractiveTypewriter.prototype);
  Object.assign(el,{motion:{matches:true},input:{value:''},characters:[],fullText:'',intro:{textContent:''},
    dataset:{editing:'true'},scrolledToListen:true,contains:()=>false});
  const previous=globalThis.document;globalThis.document={activeElement:null};
  try{
    el.scheduleRestore({pointerType:'touch'});t.mock.timers.tick(0);
    assert.equal(el.dataset.editing,'true');
    el.scheduleRestore({pointerType:'mouse'});t.mock.timers.tick(0);
    assert.equal(el.dataset.editing,'false');
  }finally{globalThis.document=previous;}
});

test('Reset returns a suggestion or manual message to a focused blank editor',()=>{
  for(const subject of ['hiring','product','']){
    const el=Object.create(InteractiveTypewriter.prototype),s=storage();let focused=false;saveDraft(s,'Old idea');
    Object.assign(el,{hovered:true,engagementHovered:false,input:{value:'Old idea',focus:()=>{focused=true;}},mirror:{textContent:''},send:{hidden:false},reset:{hidden:false},dataset:{editing:'true',focused:'true',typing:'false',subject},storage:s,fullText:'Hello.',characters:Array.from('Hello.'),intro:{textContent:'Hello.'},portrait:{dataset:{}},dispatchEvent:()=>{el.dataset.subject='';}});
    el.resetMessage();
    assert.equal(el.input.value,'');assert.equal(readDraft(s),'');assert.equal(focused,true);
    assert.equal(el.dataset.editing,'true');assert.equal(el.hoverFocus,true);assert.equal(el.dataset.focused,'true');
    assert.equal(el.dataset.subject,'');assert.equal(el.send.hidden,true);assert.equal(el.portrait.dataset.writing,'false');
    assert.equal(el.intro.textContent,'Hello.');
  }
});

test('An empty hover-focused editor releases focus and restores the intro only after leaving',()=>{
  const el=Object.create(InteractiveTypewriter.prototype),previous=globalThis.document;
  const input={value:'',blur(){globalThis.document.activeElement=null;}};
  Object.assign(el,{input,hovered:true,hoverFocus:true,engagementHovered:false,contains:node=>node===input,dataset:{editing:'true',focused:'true',typing:'false'},fullText:'Hello.',characters:Array.from('Hello.'),intro:{textContent:'Hello.'}});
  globalThis.document={activeElement:input};
  try{el.restore();assert.equal(el.dataset.editing,'true');el.hovered=false;el.restore();assert.equal(el.dataset.editing,'false');assert.equal(el.dataset.focused,'false');assert.equal(globalThis.document.activeElement,null);}finally{globalThis.document=previous;}
});

test('Hover focuses the editor without stealing another input or converting keyboard focus',()=>{
  const el=Object.create(InteractiveTypewriter.prototype),previous=globalThis.document;let focused=0;
  el.input={focus(){focused++;}};globalThis.document={activeElement:null};
  try{el.focusFromHover();assert.equal(focused,1);assert.equal(el.hoverFocus,true);el.hoverFocus=false;globalThis.document.activeElement=el.input;el.focusFromHover();assert.equal(el.hoverFocus,false);globalThis.document.activeElement={matches:()=>true};el.focusFromHover();assert.equal(focused,1);}finally{globalThis.document=previous;}
});

test('Keyboard reset stays ready for typing with intentional keyboard focus',()=>{
  const el=Object.create(InteractiveTypewriter.prototype);let focused=false;
  Object.assign(el,{input:{value:'A draft',focus:()=>{focused=true;}},mirror:{textContent:''},send:{hidden:false},reset:{hidden:false},dataset:{editing:'true',typing:'false'},fullText:'Hello.',characters:Array.from('Hello.'),intro:{textContent:'Hello.'},dispatchEvent:()=>{}});
  el.resetMessage({keyboard:true});assert.equal(focused,true);assert.equal(el.hoverFocus,false);assert.equal(el.dataset.editing,'true');
});

test('The portrait listens with an empty editor, writes with text, and returns when text is cleared',()=>{
  const el=Object.create(InteractiveTypewriter.prototype);
  Object.assign(el,{input:{value:''},dataset:{editing:'true'},portrait:{dataset:{}},idle:{dataset:{}},suggestions:{inert:true}});
  el.updateEngagement();assert.equal(el.portrait.dataset.engaged,'true');assert.equal(el.portrait.dataset.writing,'false');assert.equal(el.suggestions.inert,false);
  el.input.value='A role opportunity';el.updateEngagement();assert.equal(el.portrait.dataset.writing,'true');
  el.input.value='';el.updateEngagement();assert.equal(el.portrait.dataset.engaged,'true');assert.equal(el.portrait.dataset.writing,'false');
  el.input.value=' \n ';el.updateEngagement();assert.equal(el.portrait.dataset.writing,'false');
  el.dataset.editing='false';el.updateEngagement();
  assert.equal(el.portrait.dataset.engaged,'false');assert.equal(el.suggestions.inert,true);
});

test('A completed inquiry returns to the introduction, clears the draft, and permits a fresh hover',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const el=Object.create(InteractiveTypewriter.prototype),s=storage(),previous=globalThis.document;
  const input={value:'Completed inquiry',blur(){globalThis.document.activeElement=null;}};
  saveDraft(s,input.value);globalThis.document={activeElement:input};
  Object.assign(el,{input,storage:s,mirror:{textContent:''},send:{hidden:false},reset:{hidden:false},
    hovered:true,engagementHovered:true,hoverFocus:true,composing:true,
    dataset:{editing:'true',focused:'true',typing:'false',subject:''},
    fullText:'Hey there.',characters:Array.from('Hey there.'),intro:{textContent:'Hey there.'},
    portrait:{dataset:{}},idle:{dataset:{}},suggestions:{inert:false}});
  el.finishTimer=setTimeout(()=>{el.dataset.editing='true';},50);
  try{
    el.returnToIntroduction();t.mock.timers.tick(1000);
    assert.equal(el.dataset.editing,'false');assert.equal(el.dataset.focused,'false');
    assert.equal(el.dataset.typing,'false');assert.equal(el.intro.textContent,'Hey there.');
    assert.equal(input.value,'');assert.equal(readDraft(s),'');assert.equal(el.hovered,false);
    assert.equal(el.portrait.dataset.engaged,'false');assert.equal(el.suggestions.inert,true);
    assert.equal(el.send.hidden,true);assert.equal(el.reset.hidden,true);
    el.reveal();assert.equal(el.dataset.editing,'true');assert.equal(el.portrait.dataset.writing,'false');
  }finally{globalThis.document=previous;}
});

test('A case-study request has its own draft and keeps the visitor’s general inquiry intact',()=>{
  const s=storage();
  saveDraft(s,'My existing project idea');
  const history={state:null,replaceState(){}};
  const location={pathname:'/contact/',search:'?case-study=7code-tech&project=7code%20Tech',hash:'#message='+encodeURIComponent('Please share 7code Tech.')};
  const entry=readContactEntry(s,location,history);
  assert.equal(entry.message,'Please share 7code Tech.');
  assert.equal(entry.topic,'7code Tech case study request');
  saveDraft(s,entry.message+' I’m recruiting.',entry.draftKey);
  assert.equal(readContactEntry(s,{...location,hash:''},history).message,'Please share 7code Tech. I’m recruiting.');
  assert.equal(readDraft(s),'My existing project idea');
});
