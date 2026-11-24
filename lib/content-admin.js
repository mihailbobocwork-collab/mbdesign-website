// Admin API for site content (/api/admin/content). Each section edits a few keys of one file in
// content/ (public/admin/content-schema.js). Saving commits that file to GitHub; Cloudflare Pages
// then rebuilds the site from the commit. Signed in through Cloudflare Access like the Requests tab.
import {CONTENT_SECTIONS,sectionById,checkSection,pick,UPLOAD_TOKEN} from '../public/admin/content-schema.js';
import {bookingSettings} from './scheduling.js';
import {createAdminAuth,adminGate} from './admin-auth.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(code,message,status,extra={})=>json({error:code,message,...extra},status);
const DEFAULT_REPO='mihailbobocwork-collab/mbdesign-website';
// Same layout as the hand-written files: short lists stay on one line, so commits stay readable.
export const formatJSON=data=>JSON.stringify(data,null,2).replace(/\[\n\s+([^\[\]{}]*?)\n\s*\]/g,(match,inner)=>{const items=inner.split(/,\n\s+/);return items.every(item=>item.length<=40)?'['+items.join(', ')+']':match;})+'\n';
const failure=code=>Object.assign(Error(code),{code});

const bytesToBase64=bytes=>{let out='';for(let i=0;i<bytes.length;i+=0x8000)out+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(out);};
const toBase64=text=>bytesToBase64(new TextEncoder().encode(text));
const fromBase64=data=>new TextDecoder().decode(Uint8Array.from(atob(String(data).replace(/\s/g,'')),c=>c.charCodeAt(0)));

// Files on GitHub, with a fine-grained token limited to this repository (Contents: read and write).
// Reads use the contents API; a save is ONE commit (git data API) holding the edited file and any
// new images, so the site rebuilds once. The file's blob sha is its version, and the branch only
// moves forward from the commit that was read, so two saves can't overwrite each other silently.
export function githubFiles({fetcher=fetch}={}){
 const target=env=>{
  const repo=String(env.GITHUB_CONTENT_REPO||DEFAULT_REPO).trim(),branch=String(env.GITHUB_CONTENT_BRANCH||'main').trim();
  if(!/^[\w.-]+\/[\w.-]+$/.test(repo)||!/^[\w./-]+$/.test(branch))throw failure('not_connected');
  return {repo,branch,api:`https://api.github.com/repos/${repo}`};
 };
 const call=async(env,url,init={})=>{
  let response;
  try{response=await fetcher(url,{...init,headers:{Authorization:'Bearer '+String(env.GITHUB_CONTENT_TOKEN).trim(),Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'site-admin',...(init.body?{'Content-Type':'application/json'}:{})},signal:AbortSignal.timeout(20000)});}
  catch{throw failure('unavailable');}
  if(response.status===401||response.status===403)throw failure('token');
  if(response.status===404)throw failure('missing');
  if(response.status===409||response.status===422)throw failure('conflict');
  if(!response.ok)throw failure('unavailable');
  return response.json();
 };
 const post=(env,url,body,method='POST')=>call(env,url,{method,body:JSON.stringify(body)});
 return {
  source:'github',
  configured:env=>Boolean(String(env.GITHUB_CONTENT_TOKEN||'').trim()),
  async read(env,path){
   const {api,branch}=target(env);
   const data=await call(env,`${api}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`);
   return {text:fromBase64(data.content),version:data.sha};
  },
  // changes: [{path, text} | {path, bytes}]
  async commit(env,changes,message){
   const {api,branch}=target(env);
   const head=(await call(env,`${api}/git/ref/heads/${branch}`)).object.sha;
   const base=(await call(env,`${api}/git/commits/${head}`)).tree.sha;
   const versions={},tree=[];
   for(const change of changes){
    const blob=await post(env,`${api}/git/blobs`,{content:change.bytes?bytesToBase64(change.bytes):toBase64(change.text),encoding:'base64'});
    versions[change.path]=blob.sha;tree.push({path:change.path,mode:'100644',type:'blob',sha:blob.sha});
   }
   const newTree=await post(env,`${api}/git/trees`,{base_tree:base,tree});
   const commit=await post(env,`${api}/git/commits`,{message,tree:newTree.sha,parents:[head]});
   await post(env,`${api}/git/refs/heads/${branch}`,{sha:commit.sha,force:false},'PATCH');
   return {versions,commit:commit.sha};
  }
 };
}

// Uploaded photos: checked by their first bytes, not by what the browser claims.
export const MAX_UPLOAD=5*1024*1024;
export function imageUpload(upload){
 if(!upload||typeof upload.data!=='string')return null;
 let bytes;try{bytes=Uint8Array.from(atob(upload.data),c=>c.charCodeAt(0));}catch{return {error:'That file couldn’t be read. Try a JPG or PNG.'};}
 if(bytes.length>MAX_UPLOAD)return {error:'That photo is too large. Keep it under 5 MB.'};
 const is=(offset,...values)=>values.every((v,i)=>bytes[offset+i]===v);
 const ext=is(0,0xff,0xd8,0xff)?'jpg':is(0,0x89,0x50,0x4e,0x47)?'png':is(0,0x52,0x49,0x46,0x46)&&is(8,0x57,0x45,0x42,0x50)?'webp':'';
 if(!ext)return {error:'Use a JPG, PNG or WebP photo.'};
 return {bytes,ext};
}
const stamp=now=>new Date(now).toISOString().replace(/\D/g,'').slice(0,14);

const files=[...new Set(CONTENT_SECTIONS.map(section=>section.file))];
const MESSAGES={
 not_connected:['not_connected','Saving isn’t connected yet. Add GITHUB_CONTENT_TOKEN in Cloudflare (see GOOGLE-SETUP.md §5).',503],
 token:['token','GitHub refused the content token. It may have expired or lost access to the repository.',503],
 missing:['missing','A content file is missing from the repository.',503],
 conflict:['conflict','This was changed somewhere else since you opened it. Reload to get the latest version, then make your edit again.',409],
 unavailable:['unavailable','GitHub couldn’t be reached. Please try again.',503]
};
const explain=error=>{const [code,message,status]=MESSAGES[error?.code]||MESSAGES.unavailable;return fail(code,message,status);};

export function createContentAdmin({auth=createAdminAuth(),store=githubFiles(),localStore=null,clock=()=>Date.now()}={}){
 const storeFor=who=>who.local&&localStore?localStore:store;
 async function list(env,request){
  const {who,response}=await adminGate(auth,env,request);if(response)return response;
  const files$=storeFor(who);
  if(files$.configured&&!files$.configured(env))return explain(failure('not_connected'));
  try{
   const read=Object.fromEntries(await Promise.all(files.map(async file=>[file,await files$.read(env,file)])));
   const sections=CONTENT_SECTIONS.map(section=>({id:section.id,version:read[section.file].version,values:pick(section,JSON.parse(read[section.file].text))}));
   return json({signedInAs:who.email,source:files$.source,sections});
  }catch(error){return explain(error);}
 }
 async function save(env,request){
  if(request.method!=='POST')return fail('method','Not available.',405);
  if(request.headers.get('origin')!==new URL(request.url).origin)return fail('origin','Please use the admin on this website.',403);
  const {who,response}=await adminGate(auth,env,request);if(response)return response;
  let body;try{body=await request.json();}catch{return fail('invalid','Something was missing. Please try again.',400);}
  const section=sectionById(String(body?.section||''));
  if(!section||typeof body.version!=='string'||!body.values||typeof body.values!=='object')return fail('invalid','Something was missing. Please try again.',400);
  // New images arrive with the save as {token: {data, name}}; the values point at them as
  // "upload:<token>". Each one is checked, given a unique path, and swapped in before the check.
  const uploads=new Map(),errors={};
  const swap=(value,key)=>{
   if(typeof value==='string'&&UPLOAD_TOKEN.test(value)){
    const token=value.slice(7);
    if(!uploads.has(token)){
     const upload=body.uploads?.[token],image=imageUpload(upload);
     if(!image||image.error){errors[key]||=image?.error||'A new image didn’t arrive. Choose it again.';return value;}
     const name=String(upload.name||'image').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'image';
     uploads.set(token,{path:`/assets/uploads/${name}-${stamp(clock())}-${crypto.randomUUID().slice(0,6)}.${image.ext}`,bytes:image.bytes});
    }
    return uploads.get(token).path;
   }
   if(Array.isArray(value))return value.map(item=>swap(item,key));
   if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,swap(v,key)]));
   return value;
  };
  const values=Object.fromEntries(Object.entries(body.values).map(([key,value])=>[key,swap(value,key)]));
  if(uploads.size>40)return fail('invalid','That’s a lot of new images at once. Publish them in smaller batches.',422,{errors:{}});
  if(Object.keys(errors).length)return fail('invalid','Some fields need a look.',422,{errors});
  const checked=checkSection(section,values);
  if(checked.errors)return fail('invalid','Some fields need a look.',422,{errors:checked.errors});
  if(JSON.stringify(checked.values).includes('"upload:'))return fail('invalid','A new image didn’t arrive. Choose it again.',422,{errors:{}});
  const files$=storeFor(who);
  if(files$.configured&&!files$.configured(env))return explain(failure('not_connected'));
  try{
   const current=await files$.read(env,section.file);
   if(current.version!==body.version)throw failure('conflict');
   const data=JSON.parse(current.text),merged={...data,...checked.values};
   if(Array.isArray(checked.values.studies)){
    const ids=list=>(list||[]).map(study=>study.id).sort().join();
    if(ids(checked.values.studies)!==ids(data.studies))return fail('invalid','The list of case studies changed somewhere else. Reload and try again.',409,{errors:{}});
   }
   if(section.file==='content/booking.json'){try{bookingSettings(merged);}catch{return fail('invalid','These meeting settings don’t fit together. Check the hours and call length.',422,{errors:{}});}}
   if(!uploads.size&&JSON.stringify(merged)===JSON.stringify(data))return json({unchanged:true,file:section.file,version:current.version,values:pick(section,merged),source:files$.source});
   const images=[...uploads.values()].map(({path,bytes})=>({path:'public'+path,bytes}));
   const count=images.length?` with ${images.length} new image${images.length>1?'s':''}`:'';
   const saved=await files$.commit(env,[...images,{path:section.file,text:formatJSON(merged)}],`Update ${section.label.toLowerCase()} from the admin${count}`);
   return json({saved:true,file:section.file,version:saved.versions[section.file],commit:saved.commit,values:pick(section,merged),source:files$.source});
  }catch(error){return explain(error);}
 }
 return {list,save};
}

const admin=createContentAdmin();
export const listContent=(env,request)=>admin.list(env,request);
export const saveContent=(env,request)=>admin.save(env,request);
