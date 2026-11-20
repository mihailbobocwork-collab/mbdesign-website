import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,stat,cp,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {authorization,callback} from '../lib/oauth.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const built=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:root,encoding:'utf8'});assert.equal(built.status,0,built.stderr);
const htmlFiles=[];async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else if(p.endsWith('.html'))htmlFiles.push(p);}}await walk(path.join(root,'dist'));
test('Every generated page has a title, language, viewport, and one h1',async()=>{for(const file of htmlFiles){const html=await readFile(file,'utf8');assert.match(html,/<html lang="en">/,file);assert.match(html,/name="viewport"/,file);assert.match(html,/<title>.+<\/title>/,file);assert.equal((html.match(/<h1[ >]/g)||[]).length,1,file);}});
test('Local links, images, scripts, styles and fragment targets resolve',async()=>{const dist=path.join(root,'dist');for(const file of htmlFiles){const html=await readFile(file,'utf8');const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate IDs in '+file);for(const match of html.matchAll(/(?:src|href)="([^" ]+)"/g)){const href=match[1].replaceAll('&amp;','&');if(/^(https?:|mailto:|data:)/.test(href))continue;const url=new URL(href,'http://site'+path.relative(dist,file).replace(/index.html$/,'').replace(/^/,'/'));let target=url.pathname==='/'?path.join(dist,'index.html'):path.join(dist,url.pathname);const info=await stat(target).catch(()=>null);assert.ok(info,`${file} references missing ${href}`);if(info.isDirectory())target=path.join(target,'index.html');await stat(target);if(url.pathname==='/contact/'&&url.hash.startsWith('#message=')){const message=decodeURIComponent(url.hash.slice(9));assert.ok(message.length>0&&message.length<=3000);continue;}if(url.hash){const body=await readFile(target,'utf8');assert.ok(body.includes(`id="${url.hash.slice(1)}"`),`Missing fragment ${href}`);}}}});
test('Public pages keep draft indexing off and render supplied logo',async()=>{for(const file of htmlFiles.filter(f=>!f.includes('/admin/'))){const html=await readFile(file,'utf8');assert.match(html,/noindex,nofollow/);assert.match(html,/assets\/logo.svg/);}const original=await readFile(path.join(root,'public/assets/logo.svg'));assert.deepEqual(await readFile(path.join(root,'dist/assets/logo.svg')),original);});
test('CMS fields correspond to content and a content edit reaches the built site',async()=>{const config=JSON.parse(await readFile(path.join(root,'dist/admin/config.yml'),'utf8'));assert.equal(config.backend.name,'github');assert.equal(config.backend.auth_endpoint,'auth');for(const collection of config.collections){for(const item of collection.files||[]){const data=JSON.parse(await readFile(path.join(root,item.file),'utf8'));for(const field of item.fields)assert.ok(field.name in data,`${field.name} missing in ${item.file}`);}}const temp=await mkdtemp(path.join(os.tmpdir(),'mb-content-'));try{for(const item of ['scripts','public','content','cms.config.json'])await cp(path.join(root,item),path.join(temp,item),{recursive:true});const file=path.join(temp,'content/site.json');const data=JSON.parse(await readFile(file,'utf8'));data.intro='A changed introduction & safe <markup>.';data.turnstileSiteKey='public-test-key';await writeFile(file,JSON.stringify(data));const result=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:temp,encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.match(await readFile(path.join(temp,'dist/index.html'),'utf8'),/A changed introduction &amp; safe &lt;markup&gt;\./);const contact=await readFile(path.join(temp,'dist/contact/index.html'),'utf8');assert.match(contact,/data-turnstile-site-key="public-test-key"/);assert.match(contact,/<button id="inquiry-book" type="button" class="button dark" hidden>Choose a time<\/button>/);}finally{await rm(temp,{recursive:true,force:true});}});
const env={SITE_URL:'https://portfolio.example',GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret',GITHUB_REPO:'owner/portfolio',GITHUB_ALLOWED_USERS:'owner'};
async function session(){const response=await authorization(env,new Request(env.SITE_URL+'/auth'));return {response,url:new URL(response.headers.get('location')),cookie:response.headers.get('set-cookie').split(';')[0]};}
test('OAuth uses state, PKCE, exact callback and a secure short-lived cookie',async()=>{const {response,url}=await session();assert.equal(response.status,302);assert.equal(url.origin,'https://github.com');assert.equal(url.searchParams.get('redirect_uri'),env.SITE_URL+'/callback');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('scope'),'public_repo');assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax; Path=\/; Max-Age=600/);assert.ok(url.searchParams.get('state').length>=32);await assert.rejects(()=>authorization(env,new Request('https://attacker.example/auth')));});
test('OAuth rejects missing, wrong, and expired state before calling GitHub',async()=>{const {cookie}=await session();const noFetch=()=>{throw Error('Should never request GitHub');};for(const [query,c] of [['state=wrong&code=test',cookie],['state=anything&code=test',''],['state=expired&code=test','__Host-mb-oauth='+encodeURIComponent(JSON.stringify({state:'expired',verifier:'test',expires:1}))]]){const res=await callback(env,new Request(env.SITE_URL+'/callback?'+query,{headers:{Cookie:c}}),noFetch);assert.equal(res.status,400);assert.equal(res.headers.get('cache-control'),'no-store');}});
function mockGitHub(login='owner',push=true){return async(url,options)=>{if(url.includes('access_token')){const body=JSON.parse(options.body);assert.ok(body.code_verifier);assert.equal(body.redirect_uri,env.SITE_URL+'/callback');return Response.json({access_token:'mock-access-token'});}if(url.endsWith('/user'))return Response.json({login});return Response.json({permissions:{push}});};}
test('OAuth authorizes only allowed users with repository write access',async()=>{for(const [user,push] of [['stranger',true],['owner',false]]){const {url,cookie}=await session();const response=await callback(env,new Request(env.SITE_URL+'/callback?code=test&state='+url.searchParams.get('state'),{headers:{Cookie:cookie}}),mockGitHub(user,push));assert.equal(response.status,403);assert.ok(!(await response.text()).includes('mock-access-token'));}});
test('OAuth success uses an exact-origin popup handshake and clears its cookie',async()=>{const {url,cookie}=await session();const response=await callback(env,new Request(env.SITE_URL+'/callback?code=test&state='+url.searchParams.get('state'),{headers:{Cookie:cookie}}),mockGitHub());assert.equal(response.status,200);const html=await response.text();assert.match(html,/authorization:github:success/);assert.match(html,/event.origin!==origin\|\|event.source!==window.opener/);assert.ok(!html.includes("postMessage('*'"));assert.match(response.headers.get('set-cookie'),/Max-Age=0/);assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);});

test('Work navigation targets the homepage section while page destinations stay separate',async()=>{
 const home=await readFile(path.join(root,'dist/index.html'),'utf8');
 assert.match(home,/<section id="work" tabindex="-1"/);
 assert.equal((home.match(/class="home-work-card(?: |")/g)||[]).length,6);
 for(const file of htmlFiles.filter(f=>!f.includes('/admin/'))){
  const html=await readFile(file,'utf8'),navigation=html.match(/<nav id="navigation"[^>]*>(.*?)<\/nav>/s)[1];
  assert.ok(!html.includes('href="/services/'),file);
  const isHome=file===path.join(root,'dist/index.html');
  assert.ok(navigation.includes(`href="${isHome?'#work':'/#work'}"`),file);
  for(const destination of ['about','contact'])assert.ok(navigation.includes(`href="/${destination}/"`),file);
 }
});

// Both API endpoints must survive Pages' function-routing filter.
test('Deployment routing includes authentication and custom booking endpoints',async()=>{const routes=JSON.parse(await readFile(path.join(root,'dist/_routes.json'),'utf8'));for(const route of ['/auth','/callback','/api/calendar','/api/bookings'])assert.ok(routes.include.includes(route));const home=await readFile(path.join(root,'dist/index.html'),'utf8');assert.ok(!/calendly/i.test(home));});

test('Pricing and Playground are paused without publishing their pages or links',async()=>{for(const route of ['pricing','playground','playground/calendar','playground/inquiry'])await assert.rejects(()=>stat(path.join(root,'dist',route,'index.html')));for(const file of htmlFiles){const html=await readFile(file,'utf8');assert.ok(!/href="\/(pricing|playground)\//.test(html));}});

test('Private projects invite a contextual request instead of showing a password prompt',async()=>{
 const p=JSON.parse(await readFile(path.join(root,'content/projects/7code-tech.json'),'utf8'));
 const html=await readFile(path.join(root,'dist/work/7code-tech/index.html'),'utf8');
 assert.match(html,/I’d be happy to walk you through this one/);
 assert.ok(html.includes('/contact/?case-study=7code-tech&amp;project=7code%20Tech#message='+encodeURIComponent(p.requestMessage)));
 assert.ok(!/type="password"|Please enter the password/.test(html));
});

test('The collection is removed, homepage work remains the destination and top shortcuts are available',async()=>{
 await assert.rejects(()=>stat(path.join(root,'dist/work/index.html')));
 const home=await readFile(path.join(root,'dist/index.html'),'utf8');assert.ok(!home.includes('full case study collection'));
 const redirects=await readFile(path.join(root,'dist/_redirects'),'utf8');assert.match(redirects,/\/work\/ \/#work 302/);
 for(const file of htmlFiles.filter(f=>!f.includes('/admin/'))){const html=await readFile(file,'utf8');assert.ok(!html.includes('href="/work/"'),file);assert.match(html,/class="floating-top"/);}
 for(const p of ['lendit-flyers','lendit-gazebo','7code-tech'])assert.ok(home.includes(`href="/work/${p}/"`));
 const lendit=await readFile(path.join(root,'dist/work/lendit/index.html'),'utf8');assert.match(lendit,/<article class="case-study"/);assert.ok(!lendit.includes('chapter-story'));assert.match(lendit,/Lendit peer-to-peer marketplace/);assert.equal((lendit.match(/<figure class="case-art/g)||[]).length,24);
});


test('Manual CMS launch supplies one complete configuration without reloading collections',async()=>{
 const {runInNewContext}=await import('node:vm');
 const config=JSON.parse(await readFile(path.join(root,'dist/admin/config.yml'),'utf8'));
 let click,received,fetches=0;const status={textContent:''},launch={hidden:true,addEventListener(_event,fn){click=fn;}},setup={remove(){}};
 const window={CMS:{init(options){received=options.config;}}};
 const document={querySelector:selector=>({'#status':status,'#launch':launch,'#setup':setup}[selector]),createElement:()=>({}),body:{append(script){assert.equal(window.CMS_MANUAL_INIT,true);script.onload();}}};
 await runInNewContext(await readFile(path.join(root,'public/admin/setup.js'),'utf8'),{window,document,fetch:async()=>{fetches++;return {json:async()=>({...config,backend:{...config.backend,repo:'owner/site',base_url:'https://example.com'}})};}});
 click();assert.equal(fetches,1);assert.equal(received.load_config_file,false);assert.equal(received.collections.length,config.collections.length);assert.equal(new Set(received.collections.map(c=>c.name)).size,received.collections.length);
});

test('About portrait preserves its ratio without cached CSS and stylesheet URLs match current contents',async()=>{
 const {createHash}=await import('node:crypto');
 const html=await readFile(path.join(root,'dist/about/index.html'),'utf8');
 assert.match(html,/<img[^>]+src="\/assets\/about\/mihail-boboc.jpg"[^>]+style="[^"]*height:auto;aspect-ratio:1 \/ 1;object-fit:contain/);
 const hash=createHash('sha256').update(await readFile(path.join(root,'public/assets/site-chrome.css'))).digest('hex').slice(0,12);
 assert.ok(html.includes('/assets/site-chrome.css?v='+hash));
 assert.ok(!html.includes('?v=undefined'));
});
