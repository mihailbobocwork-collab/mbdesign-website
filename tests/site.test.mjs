import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat,cp,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const built=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:root,encoding:'utf8'});assert.equal(built.status,0,built.stderr);
// scripts/build.mjs can publish the full portfolio or a landing-only version (limitedPortfolio).
// The page tests below check whichever version is switched on.
const limited=/const limitedPortfolio = true;/.test(await readFile(path.join(root,'scripts/build.mjs'),'utf8'));
const landing=limited?test:test.skip,full=limited?test.skip:test;
const htmlFiles=[];async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else if(p.endsWith('.html'))htmlFiles.push(p);}}await walk(path.join(root,'dist'));
test('Every generated page has a title, language, viewport, and one h1',async()=>{for(const file of htmlFiles){const html=await readFile(file,'utf8');assert.match(html,/<html lang="en">/,file);assert.match(html,/name="viewport"/,file);assert.match(html,/<title>.+<\/title>/,file);assert.equal((html.match(/<h1[ >]/g)||[]).length,1,file);}});
test('Local links, images, scripts, styles and fragment targets resolve',async()=>{const dist=path.join(root,'dist');for(const file of htmlFiles){const html=await readFile(file,'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate IDs in '+file);for(const match of html.matchAll(/(?:src|href)="([^" ]+)"/g)){const href=match[1].replaceAll('&amp;','&');if(/^(https?:|mailto:|data:)/.test(href))continue;const url=new URL(href,'http://site'+path.relative(dist,file).replace(/index.html$/,'').replace(/^/,'/'));let target=url.pathname==='/'?path.join(dist,'index.html'):path.join(dist,url.pathname);const info=await stat(target).catch(()=>null);assert.ok(info,`${file} references missing ${href}`);if(info.isDirectory())target=path.join(target,'index.html');await stat(target);if(url.pathname==='/contact/'&&url.hash.startsWith('#message=')){const message=decodeURIComponent(url.hash.slice(9));assert.ok(message.length>0&&message.length<=3000);continue;}if(url.hash){const body=await readFile(target,'utf8');assert.ok(body.includes(`id="${url.hash.slice(1)}"`),`Missing fragment ${href}`);}}}});
test('Public pages are open to search on mihaiboboc.com and render supplied logo',async()=>{for(const file of htmlFiles.filter(f=>!f.includes('/admin/'))){const html=await readFile(file,'utf8');assert.doesNotMatch(html,/noindex/,file);assert.match(html,/assets\/logo.svg/);if(file.endsWith('404.html'))continue;assert.match(html,/<link rel="canonical" href="https:\/\/mihaiboboc\.com\//,file);assert.match(html,/<meta property="og:image" content="https:\/\/mihaiboboc\.com\/assets\/share\/og-image\.jpg">/,file);}
 const home=await readFile(path.join(root,'dist/index.html'),'utf8');const person=JSON.parse(home.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);assert.equal(person['@type'],'Person');assert.equal(person.url,'https://mihaiboboc.com/');
 assert.equal(await readFile(path.join(root,'dist/robots.txt'),'utf8'),'User-agent: *\nDisallow: /admin/\nSitemap: https://mihaiboboc.com/sitemap.xml\n');
 assert.match(await readFile(path.join(root,'dist/sitemap.xml'),'utf8'),/<loc>https:\/\/mihaiboboc\.com\/<\/loc>/);
 await readFile(path.join(root,'dist/assets/share/og-image.jpg'));
 // Staging copies on pages.dev stay out of search results.
 assert.match(await readFile(path.join(root,'dist/_headers'),'utf8'),/https:\/\/mbdesign-website\.pages\.dev\/\*\n  X-Robots-Tag: noindex/);const original=await readFile(path.join(root,'public/assets/logo.svg'));assert.deepEqual(await readFile(path.join(root,'dist/assets/logo.svg')),original);});
test('A content edit reaches the built site',async()=>{const temp=await mkdtemp(path.join(os.tmpdir(),'mb-content-'));try{for(const item of ['scripts','public','content'])await cp(path.join(root,item),path.join(temp,item),{recursive:true});const file=path.join(temp,'content/site.json');const data=JSON.parse(await readFile(file,'utf8'));data.intro='A changed introduction & safe <markup>.';data.turnstileSiteKey='public-test-key';await writeFile(file,JSON.stringify(data));const result=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:temp,encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(await readFile(path.join(temp,'dist/index.html'),'utf8'),/A changed introduction &amp; safe &lt;markup&gt;\./);const contact=await readFile(path.join(temp,'dist/contact/index.html'),'utf8');assert.match(contact,/data-turnstile-site-key="public-test-key"/);assert.match(contact,/data-hero-flow data-inquiry-entry/);assert.match(contact,/hero-flow-form/);}finally{await rm(temp,{recursive:true,force:true});}});

full('Work navigation targets the homepage section while page destinations stay separate',async()=>{
 const home=await readFile(path.join(root,'dist/index.html'),'utf8');
 assert.match(home,/<section id="work" tabindex="-1"/);
 assert.equal((home.match(/class="home-work-card(?: |")/g)||[]).length,6);
 for(const file of htmlFiles.filter(f=>!f.includes('/admin/'))){
  const html=await readFile(file,'utf8'),navigation=html.match(/<nav id="navigation"[^>]*>(.*?)<\/nav>/s)[1];
  assert.ok(!html.includes('href="/services/'),file);
  const isHome=file===path.join(root,'dist/index.html');
  assert.ok(navigation.includes(`href="${isHome?'#work':'/#work'}"`),file);
  for(const destination of ['contact'])assert.ok(navigation.includes(`href="/${destination}/"`),file);
 }
});

// Both API endpoints must survive Pages' function-routing filter.
test('Deployment routing includes the booking and admin endpoints only',async()=>{const routes=JSON.parse(await readFile(path.join(root,'dist/_routes.json'),'utf8'));assert.deepEqual(routes.include,['/api/calendar','/api/bookings','/api/admin/*']);const home=await readFile(path.join(root,'dist/index.html'),'utf8');assert.ok(!/calendly/i.test(home));});

test('Pricing and Playground are paused without publishing their pages or links',async()=>{for(const route of ['pricing','playground','playground/calendar','playground/inquiry'])await assert.rejects(()=>stat(path.join(root,'dist',route,'index.html')));for(const file of htmlFiles){const html=await readFile(file,'utf8');assert.ok(!/href="\/(pricing|playground)\//.test(html));}});

full('Private projects invite a contextual request instead of showing a password prompt',async()=>{
 const p=JSON.parse(await readFile(path.join(root,'content/projects/7code-tech.json'),'utf8'));
 const html=await readFile(path.join(root,'dist/work/7code-tech/index.html'),'utf8');
 assert.match(html,/I’d be happy to walk you through this one/);
 assert.ok(html.includes('/contact/?case-study=7code-tech&amp;project=7code%20Tech#message='+encodeURIComponent(p.requestMessage)));
 assert.ok(!/type="password"|Please enter the password/.test(html));
});

full('The collection is removed, homepage work remains the destination and top shortcuts are available',async()=>{
 await assert.rejects(()=>stat(path.join(root,'dist/work/index.html')));
 const home=await readFile(path.join(root,'dist/index.html'),'utf8');assert.ok(!home.includes('full case study collection'));
 const redirects=await readFile(path.join(root,'dist/_redirects'),'utf8');assert.match(redirects,/\/work\/ \/#work 302/);
 for(const file of htmlFiles.filter(f=>!f.includes('/admin/'))){const html=await readFile(file,'utf8');assert.ok(!html.includes('href="/work/"'),file);assert.match(html,/class="floating-top"/);}
 for(const p of ['lendit-flyers','lendit-gazebo','7code-tech'])assert.ok(home.includes(`href="/work/${p}/"`));
 const lendit=await readFile(path.join(root,'dist/work/lendit/index.html'),'utf8');assert.match(lendit,/<article class="case-study"/);assert.ok(!lendit.includes('chapter-story'));assert.match(lendit,/Lendit peer-to-peer marketplace/);assert.equal((lendit.match(/<figure class="case-art/g)||[]).length,24);
});


full('About portrait preserves its ratio without cached CSS',async()=>{
 const html=await readFile(path.join(root,'dist/index.html'),'utf8');
 assert.match(html,/<img[^>]+src="\/assets\/about\/mihail-boboc.jpg"[^>]+style="[^"]*height:auto;aspect-ratio:1 \/ 1;object-fit:contain/);
});

test('Stylesheet URLs match their current contents',async()=>{
 const {createHash}=await import('node:crypto');
 const html=await readFile(path.join(root,'dist/index.html'),'utf8');
 const hash=createHash('sha256').update(await readFile(path.join(root,'public/assets/site-chrome.css'))).digest('hex').slice(0,12);
 assert.ok(html.includes('/assets/site-chrome.css?v='+hash));
 assert.ok(!html.includes('?v=undefined'));
});

// Landing-only version: one page with the hero, the work preview and About in the focus view.
landing('The landing shows the work preview and About, and every page reaches the inquiry',async()=>{
 const home=await readFile(path.join(root,'dist/index.html'),'utf8');
 const {studies}=JSON.parse(await readFile(path.join(root,'content/case-studies.json'),'utf8'));
 assert.equal((home.match(/class="work-preview-card"/g)||[]).length,studies.filter(s=>!s.hidden).length);
 const site=JSON.parse(await readFile(path.join(root,'content/site.json'),'utf8'));
 assert.match(home,new RegExp(`class="about-photo"><img src="${site.aboutPhoto.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]+width="1200" height="1200"`));
 assert.match(home,/<nav id="navigation"[^>]*>.*?href="#about"/s);
 for(const file of htmlFiles.filter(f=>!f.includes('/admin/'))){
  const html=await readFile(file,'utf8');
  assert.match(html,/href="\/contact\/"/,file);assert.match(html,/class="floating-top"/,file);
  assert.ok(!/href="\/(work|services|about|privacy)\//.test(html),file);
 }
});

landing('Hidden pages are not published and their addresses lead home',async()=>{
 for(const route of ['work','work/lendit','work/7code-tech','about','services','privacy'])await assert.rejects(()=>stat(path.join(root,'dist',route,'index.html')),route);
 const redirects=await readFile(path.join(root,'dist/_redirects'),'utf8');
 for(const route of ['/work','/work/*','/about','/services/*','/privacy'])assert.match(redirects,new RegExp('^'+route.replace('*','\\*')+' / 302$','m'),route);
});

test('Inquiry wording edited in the admin reaches the homepage, the inquiry and the emails',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'mb-inquiry-'));
 try{
  for(const item of ['scripts','public','content','lib'])await cp(path.join(root,item),path.join(temp,item),{recursive:true});
  const file=path.join(temp,'content/inquiry.json'),copy=JSON.parse(await readFile(file,'utf8'));
  Object.assign(copy,{heroPlaceholder:'What are you\nbuilding?',subjectBrand:'Branding & <logos>',topicQuestion:'What’s on your mind?',engagementProject:'One project'});
  await writeFile(file,JSON.stringify(copy));
  const result=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:temp,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const home=await readFile(path.join(temp,'dist/index.html'),'utf8');
  assert.match(home,/placeholder="What are you&#10;building\?"/);assert.match(home,/data-subject="brand" aria-pressed="false">Branding &amp; &lt;logos&gt;</);
  const details=await import(path.join(temp,'public/assets/components/inquiry-details.js'));
  assert.equal(details.COPY.topicQuestion,'What’s on your mind?');
  assert.equal(details.ENGAGEMENTS.find(e=>e.id==='project').label,'One project');
  assert.equal(details.SUBJECTS.find(s=>s.id==='brand').prompt,'I’d like to discuss a branding & <logos> project.');
 }finally{await rm(temp,{recursive:true,force:true});}
});
