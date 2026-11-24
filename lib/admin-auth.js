// The admin sits behind Cloudflare Access. Access signs every request it lets through with a
// JWT in Cf-Access-Jwt-Assertion; this checks that signature, audience, issuer and expiry so
// the API stays closed even if the Access rule were missing. Local development on loopback is
// allowed through so the admin can be reviewed with `npm run dev`.
const decode=part=>Uint8Array.from(atob(part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=')),c=>c.charCodeAt(0));
const json=part=>JSON.parse(new TextDecoder().decode(decode(part)));
export const isLocal=(env,request)=>env.BOOKING_LOCAL==='true'&&['localhost','127.0.0.1'].includes(new URL(request.url).hostname);
export const accessConfigured=env=>Boolean(env.ACCESS_TEAM_DOMAIN&&env.ACCESS_AUD);
export function createAdminAuth({fetcher=fetch,clock=()=>Date.now()}={}){
 let certs={url:'',until:0,keys:[]};
 async function keysFor(domain){
  const url=`https://${domain}/cdn-cgi/access/certs`;
  if(certs.url===url&&certs.until>clock())return certs.keys;
  const response=await fetcher(url,{signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('certs_unavailable');
  const data=await response.json();certs={url,until:clock()+3600000,keys:Array.isArray(data.keys)?data.keys:[]};return certs.keys;
 }
 return async function identity(env,request){
  if(isLocal(env,request))return {email:'local preview',local:true};
  if(!accessConfigured(env))return null;
  const token=request.headers.get('Cf-Access-Jwt-Assertion')||'';
  const parts=token.split('.');if(parts.length!==3)return null;
  try{
   const header=json(parts[0]),payload=json(parts[1]);
   if(header.alg!=='RS256')return null;
   const domain=String(env.ACCESS_TEAM_DOMAIN).replace(/^https?:\/\//,'').replace(/\/+$/,'');
   const jwk=(await keysFor(domain)).find(key=>key.kid===header.kid);if(!jwk)return null;
   const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
   if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))return null;
   const audiences=Array.isArray(payload.aud)?payload.aud:[payload.aud];
   if(!audiences.includes(env.ACCESS_AUD)||payload.iss!==`https://${domain}`||!(payload.exp*1000>clock()))return null;
   const allowed=String(env.ADMIN_EMAILS||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
   if(allowed.length&&!allowed.includes(String(payload.email||'').toLowerCase()))return null;
   return {email:payload.email||''};
  }catch{return null;}
 };
}
