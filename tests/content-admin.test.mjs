import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createContentAdmin,githubFiles,formatJSON} from '../lib/content-admin.js';
import {CONTENT_SECTIONS,checkSection,sectionById} from '../public/admin/content-schema.js';

const read=async file=>readFile(new URL('../'+file,import.meta.url),'utf8');
const local={BOOKING_LOCAL:'true'};
const get=()=>new Request('http://localhost:4173/api/admin/content');
const post=(body,origin='http://localhost:4173')=>new Request('http://localhost:4173/api/admin/content',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});

// The real content files, kept in memory.
async function memoryStore(){
 const files=new Map();let n=0;
 for(const file of ['content/site.json','content/booking.json','content/case-studies.json'])files.set(file,{text:await read(file),version:'v0'});
 const uploads=new Map(),commits=[];
 return {files,uploads,commits,source:'local',
  async read(_env,file){return {...files.get(file)};},
  // One call per save, like one GitHub commit.
  async commit(_env,changes,message){
   commits.push({paths:changes.map(c=>c.path),message});const versions={};
   for(const change of changes){if(change.bytes)uploads.set(change.path,{bytes:change.bytes,message});else{versions[change.path]='v'+(++n);files.set(change.path,{text:change.text,version:versions[change.path],message});}}
   return {versions,commit:''};
  }};
}
const setup=async()=>{const store=await memoryStore();return {store,admin:createContentAdmin({localStore:store})};};
const sections=async admin=>Object.fromEntries((await (await admin.list(local,get())).json()).sections.map(s=>[s.id,s]));

test('Every editable field exists in the content files and passes its own check',async()=>{
 for(const section of CONTENT_SECTIONS){
  const data=JSON.parse(await read(section.file));
  for(const field of section.fields)assert.ok(field.key in data,`${section.file} has ${field.key}`);
  assert.deepEqual(checkSection(section,data).errors,undefined,section.id);
  // Saving rewrites the file in its existing layout, so a commit only shows the edited lines.
  assert.equal(formatJSON(data),await read(section.file));
 }
});

test('Saving one section changes only its keys and keeps the rest of the file',async()=>{
 const {store,admin}=await setup();
 const {home,about}=await sections(admin);
 const response=await admin.save(local,post({section:'home',version:home.version,values:{...home.values,intro:'Hello, I’m Mihai\nyour design partner  '}}));
 assert.equal(response.status,200);const result=await response.json();
 assert.equal(result.saved,true);assert.equal(result.values.intro,'Hello, I’m Mihai\nyour design partner');
 const before=JSON.parse(await read('content/site.json')),after=JSON.parse(store.files.get('content/site.json').text);
 assert.deepEqual({...after,intro:before.intro},before);
 assert.match(store.files.get('content/site.json').message,/homepage/);
 // About shares the file, so its old version is now stale.
 const stale=await admin.save(local,post({section:'about',version:about.version,values:{...about.values,aboutBody:'New story.'}}));
 assert.equal(stale.status,409);assert.equal((await stale.json()).error,'conflict');
 const fresh=await admin.save(local,post({section:'about',version:result.version,values:{...about.values,aboutBody:'New story.'}}));
 assert.equal(fresh.status,200);
});

test('Invalid values are refused with a message per field and nothing is written',async()=>{
 const {store,admin}=await setup();const {home,meetings}=await sections(admin);
 const bad=await admin.save(local,post({section:'home',version:home.version,values:{...home.values,intro:'',contactEmail:'nope',linkedinUrl:'http://x.example'}}));
 assert.equal(bad.status,422);const {errors}=await bad.json();
 assert.deepEqual(Object.keys(errors).sort(),['contactEmail','intro','linkedinUrl']);
 const hours=await admin.save(local,post({section:'meetings',version:meetings.version,values:{...meetings.values,workingHours:'10:00-12:00, 11:00-14:00'}}));
 assert.equal(hours.status,422);assert.ok((await hours.json()).errors.workingHours);
 const days=await admin.save(local,post({section:'meetings',version:meetings.version,values:{...meetings.values,weekdays:[]}}));
 assert.equal(days.status,422);
 assert.equal(store.files.get('content/site.json').version,'v0');assert.equal(store.files.get('content/booking.json').version,'v0');
});

test('Meeting availability saves in the shape the scheduler reads',async()=>{
 const {store,admin}=await setup();const {meetings}=await sections(admin);
 const response=await admin.save(local,post({section:'meetings',version:meetings.version,values:{...meetings.values,weekdays:[4,2,2],workingHours:' 14:00-17:00 ,09:30-12:00',blockedDates:['2026-12-25','2026-12-24','2026-12-25'],durationMinutes:45}}));
 assert.equal(response.status,200);
 const saved=JSON.parse(store.files.get('content/booking.json').text);
 assert.deepEqual(saved.weekdays,[2,4]);assert.equal(saved.workingHours,'14:00-17:00, 09:30-12:00');assert.deepEqual(saved.blockedDates,['2026-12-24','2026-12-25']);assert.equal(saved.durationMinutes,45);
 assert.equal(saved.timeZone,'Europe/Chisinau');
 const same=await (await admin.save(local,post({section:'meetings',version:(await response.json()).version,values:{...meetings.values,weekdays:[2,4],workingHours:'14:00-17:00, 09:30-12:00',blockedDates:['2026-12-24','2026-12-25'],durationMinutes:45}}))).json();
 assert.equal(same.unchanged,true);
});

test('Content saving refuses other origins, unknown sections and missing sign-in',async()=>{
 const {admin}=await setup();const {home}=await sections(admin);
 assert.equal((await admin.save(local,post({section:'home',version:home.version,values:home.values},'https://evil.example'))).status,403);
 assert.equal((await admin.save(local,post({section:'secrets',version:home.version,values:{}}))).status,400);
 assert.equal((await admin.list({},get())).status,503);
 const live={ACCESS_TEAM_DOMAIN:'team.cloudflareaccess.com',ACCESS_AUD:'aud'};
 assert.equal((await admin.list(live,get())).status,401);
 assert.equal((await admin.save(live,post({section:'home',version:home.version,values:home.values}))).status,401);
});

test('GitHub saving makes one commit with the file and its new images, and refuses a stale version',async()=>{
 const site=await read('content/site.json'),calls=[];let head='head-1';
 const fetcher=async(url,init={})=>{
  calls.push({url,init,body:init.body?JSON.parse(init.body):null});
  assert.equal(init.headers.Authorization,'Bearer token-123');
  const at=url.replace('https://api.github.com/repos/mihailbobocwork-collab/mbdesign-website','');
  if(at.startsWith('/contents/'))return Response.json({sha:'sha-1',content:Buffer.from(site).toString('base64').replace(/(.{60})/g,'$1\n')});
  if(at==='/git/ref/heads/main')return Response.json({object:{sha:head}});
  if(at.startsWith('/git/commits/'))return Response.json({tree:{sha:'tree-0'}});
  if(at==='/git/blobs')return Response.json({sha:'blob-'+calls.filter(c=>c.url.endsWith('/git/blobs')).length});
  if(at==='/git/trees')return Response.json({sha:'tree-1'});
  if(at==='/git/commits')return Response.json({sha:'commit-9'});
  if(at==='/git/refs/heads/main')return head==='head-1'?Response.json({}):new Response('{}',{status:422});
  throw Error('unexpected '+at);
 };
 const auth=Object.assign(async()=>({email:'owner@example.com'}),{verify:async()=>({email:'owner@example.com'})});
 const admin=createContentAdmin({auth,store:githubFiles({fetcher})});
 const env={GITHUB_CONTENT_TOKEN:' token-123 '};
 const live=new Request('https://site.example/api/admin/content');
 const listed=await (await admin.list(env,live)).json();
 assert.equal(listed.source,'github');
 const about=listed.sections.find(s=>s.id==='about');
 const jpeg=Buffer.from([0xff,0xd8,0xff,0xe0,1,2,3]).toString('base64');
 const save=()=>admin.save(env,new Request('https://site.example/api/admin/content',{method:'POST',headers:{Origin:'https://site.example'},body:JSON.stringify({section:'about',version:'sha-1',values:{...about.values,aboutBody:'A shorter story — with “quotes”.',aboutPhoto:'upload:abcdefgh12'},uploads:{abcdefgh12:{data:jpeg,name:'about-photo'}}})}));
 const saved=await (await save()).json();
 assert.equal(saved.commit,'commit-9');assert.equal(saved.version,'blob-2');
 const blobs=calls.filter(c=>c.url.endsWith('/git/blobs'));assert.equal(blobs.length,2);
 assert.deepEqual([...Buffer.from(blobs[0].body.content,'base64')].slice(0,3),[0xff,0xd8,0xff]);
 assert.equal(JSON.parse(Buffer.from(blobs[1].body.content,'base64').toString('utf8')).aboutBody,'A shorter story — with “quotes”.');
 const tree=calls.find(c=>c.url.endsWith('/git/trees')).body;
 assert.equal(tree.base_tree,'tree-0');assert.match(tree.tree[0].path,/^public\/assets\/uploads\/about-photo-\d{14}-[a-f0-9-]{6}\.jpg$/);assert.equal(tree.tree[1].path,'content/site.json');
 const commit=calls.find(c=>c.url.endsWith('/git/commits')&&c.body).body;
 assert.deepEqual(commit.parents,['head-1']);assert.match(commit.message,/with 1 new image/);
 assert.deepEqual(calls.at(-1).body,{sha:'commit-9',force:false});assert.equal(calls.at(-1).init.method,'PATCH');
 // Someone else moved the branch in between: the ref update is refused and reported as a conflict.
 head='head-2';assert.equal((await save()).status,409);
 assert.equal((await admin.list({},live)).status,503);
});

test('The schema rejects values the site can’t use',()=>{
 const meetings=sectionById('meetings');
 const base={weekdays:[1],workingHours:'10:00-17:00',timeZone:'Europe/Chisinau',durationMinutes:30,stepMinutes:30,bufferMinutes:15,noticeHours:24,horizonDays:60,blockedDates:[]};
 assert.ok(checkSection(meetings,base).values);
 assert.ok(checkSection(meetings,{...base,timeZone:'Mars/Olympus'}).errors.timeZone);
 assert.ok(checkSection(meetings,{...base,durationMinutes:31}).errors.durationMinutes);
 assert.ok(checkSection(meetings,{...base,noticeHours:0}).errors.noticeHours);
 assert.ok(checkSection(meetings,{...base,blockedDates:['2026-13-45']}).errors.blockedDates);
 assert.ok(checkSection(meetings,{...base,workingHours:'17:00-10:00'}).errors.workingHours);
});

test('A new About photo is uploaded with the save and the page points at it',async()=>{
 const {store,admin}=await setup();const {about}=await sections(admin);
 const jpeg=Buffer.from([0xff,0xd8,0xff,0xe0,0,16,74,70,73,70,0,1]).toString('base64');
 const response=await admin.save(local,post({section:'about',version:about.version,values:{...about.values,aboutPhoto:'upload:abcdefgh12'},uploads:{abcdefgh12:{data:jpeg,name:'about-photo'}}}));
 assert.equal(response.status,200);
 const {values}=await response.json();
 assert.match(values.aboutPhoto,/^\/assets\/uploads\/about-photo-\d{14}-[a-f0-9-]{6}\.jpg$/);
 const [[file,upload]]=[...store.uploads];
 assert.equal(file,'public'+values.aboutPhoto);assert.equal(upload.bytes[0],0xff);assert.match(upload.message,/about from the admin with 1 new image/);
 assert.equal(JSON.parse(store.files.get('content/site.json').text).aboutPhoto,values.aboutPhoto);
});

test('Photos that aren’t images, or paths outside the site’s images, are refused',async()=>{
 const {store,admin}=await setup();const {about}=await sections(admin);
 const text=Buffer.from('<svg onload=alert(1)>').toString('base64');
 const bad=await admin.save(local,post({section:'about',version:about.version,values:{...about.values,aboutPhoto:'upload:abcdefgh12'},uploads:{abcdefgh12:{data:text}}}));
 assert.equal(bad.status,422);assert.ok((await bad.json()).errors.aboutPhoto);
 const path=await admin.save(local,post({section:'about',version:about.version,values:{...about.values,aboutPhoto:'https://evil.example/x.jpg'}}));
 assert.equal(path.status,422);
 assert.equal(store.uploads.size,0);assert.equal(store.files.get('content/site.json').version,'v0');
});

test('Case studies save their words and order; their ids and images stay tied together',async()=>{
 const {store,admin}=await setup();const {cases}=await sections(admin);
 const list=cases.values.studies;assert.equal(list.length,8);
 const reordered=[list[1],{...list[0],title:'  A rental   marketplace for neighbours. ',body:['First.','Second.'],facts:[{label:'Year',value:'2026',placeholder:true}]},...list.slice(2)];
 const response=await admin.save(local,post({section:'cases',version:cases.version,values:{studies:reordered}}));
 assert.equal(response.status,200);
 const saved=JSON.parse(store.files.get('content/case-studies.json').text).studies;
 assert.deepEqual(saved.map(s=>s.id).slice(0,2),[list[1].id,list[0].id]);
 assert.equal(saved[1].title,'A rental marketplace for neighbours.');assert.deepEqual(saved[1].body,['First.','Second.']);assert.equal(saved[1].facts[0].placeholder,true);
 // Adding, dropping or renaming a study is refused: its images are set in code by id.
 const {cases:fresh}=await sections(admin);
 const dropped=await admin.save(local,post({section:'cases',version:fresh.version,values:{studies:fresh.values.studies.slice(1)}}));
 assert.equal(dropped.status,409);
 const renamed=await admin.save(local,post({section:'cases',version:fresh.version,values:{studies:[{...fresh.values.studies[0],id:'new-one'},...fresh.values.studies.slice(1)]}}));
 assert.equal(renamed.status,409);
 const empty=await admin.save(local,post({section:'cases',version:fresh.version,values:{studies:[{...fresh.values.studies[0],body:[]},...fresh.values.studies.slice(1)]}}));
 assert.equal(empty.status,422);assert.match((await empty.json()).errors.studies,/paragraph/);
});

test('Every case study in the content file has its images in the code, and the other way round',async()=>{
 const {LAYOUT,loadStudies}=await import('../scripts/work-preview.mjs');
 const {studies}=JSON.parse(await read('content/case-studies.json'));
 assert.deepEqual(studies.map(s=>s.id).sort(),LAYOUT.map(l=>l.id).sort());
 assert.equal((await loadStudies(fileURLToPath(new URL('../',import.meta.url)))).length,LAYOUT.length);
});

test('Case studies take an uploaded cover and added photos in one save',async()=>{
 const {store,admin}=await setup();const {cases}=await sections(admin);
 const png=Buffer.from([0x89,0x50,0x4e,0x47,13,10,26,10]).toString('base64'),jpeg=Buffer.from([0xff,0xd8,0xff,0xe1]).toString('base64');
 const [first,...others]=cases.values.studies;
 const edited={...first,thumbnail:{src:'upload:cover000001',width:800,height:600,fit:'fit'},photos:[{src:'upload:photo000001',width:2400,height:1500,alt:'  Team  workshop '},{src:'upload:photo000002',width:1200,height:1600,alt:''}]};
 const response=await admin.save(local,post({section:'cases',version:cases.version,values:{studies:[edited,...others]},uploads:{cover000001:{data:png,name:'lendit-cover'},photo000001:{data:jpeg,name:'lendit-photo'},photo000002:{data:jpeg,name:'lendit-photo'},unused00001:{data:jpeg}}}));
 assert.equal(response.status,200);
 assert.equal(store.commits.length,1);assert.equal(store.commits[0].paths.length,4);assert.match(store.commits[0].message,/with 3 new images/);
 const saved=JSON.parse(store.files.get('content/case-studies.json').text).studies[0];
 assert.match(saved.thumbnail.src,/^\/assets\/uploads\/lendit-cover-.*\.png$/);assert.equal(saved.thumbnail.fit,'fit');
 assert.equal(saved.photos.length,2);assert.equal(saved.photos[0].alt,'Team workshop');assert.match(saved.photos[1].src,/\.jpg$/);
 for(const photo of [saved.thumbnail,...saved.photos])assert.ok(store.uploads.has('public'+photo.src));
 // A token without its image is refused, and nothing is written.
 const {cases:fresh}=await sections(admin);
 const missing=await admin.save(local,post({section:'cases',version:fresh.version,values:{studies:[{...fresh.values.studies[0],photos:[{src:'upload:gone000001',width:10,height:10,alt:''}]},...fresh.values.studies.slice(1)]}}));
 assert.equal(missing.status,422);assert.equal(store.commits.length,1);
});

test('The site shows an uploaded cover and the added photos',async()=>{
 const {cardArt}=await import('../scripts/work-preview.mjs');
 const study={id:'x',name:'X',category:'Y',cover:{laptop:'7code-laptop',width:1,height:1,alt:''},thumbnail:{src:'/assets/uploads/x.png',width:800,height:600,fit:'fit'}};
 assert.match(await cardArt('',study,new Map()),/^<img class="work-preview-cover" src="\/assets\/uploads\/x\.png"/);
 assert.match(await cardArt('',{...study,thumbnail:{...study.thumbnail,fit:'fill'}},new Map()),/^<span class="work-preview-photo"><img src="\/assets\/uploads\/x\.png"/);
});
