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
 // Returns {email} when signed in, otherwise {reason} (a short code safe to show the owner).
 async function verify(env,request){
  if(isLocal(env,request))return {email:'local preview',local:true};
  if(!accessConfigured(env))return {reason:'not_configured'};
  const cookie=(request.headers.get('Cookie')||'').split(/;\s*/).find(part=>part.startsWith('CF_Authorization='))?.slice(17)||'';
  const token=(request.headers.get('Cf-Access-Jwt-Assertion')||cookie).trim();
  const parts=token.split('.');if(parts.length!==3)return {reason:'no_token'};
  try{
   const header=json(parts[0]),payload=json(parts[1]);
   if(header.alg!=='RS256')return {reason:'algorithm'};
   const domain=String(env.ACCESS_TEAM_DOMAIN).trim().replace(/^https?:\/\//,'').replace(/\/+$/,'');
   const jwk=(await keysFor(domain)).find(key=>key.kid===header.kid);if(!jwk)return {reason:'key'};
   const key=await crypto.subtle.importKey('jwk',{kty:jwk.kty,n:jwk.n,e:jwk.e},{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
   if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))return {reason:'signature'};
   const audiences=Array.isArray(payload.aud)?payload.aud:[payload.aud];
   if(!audiences.includes(String(env.ACCESS_AUD).trim()))return {reason:'audience'};
   if(payload.iss!==`https://${domain}`)return {reason:'team_domain'};
   if(!(payload.exp*1000>clock()))return {reason:'expired'};
   const allowed=String(env.ADMIN_EMAILS||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
   if(allowed.length&&!allowed.includes(String(payload.email||'').toLowerCase()))return {reason:'email'};
   return {email:payload.email||''};
  }catch{return {reason:'unreadable'};}
 }
 const identity=async(env,request)=>{const result=await verify(env,request);return result.reason?null:result;};
 identity.verify=verify;
 return identity;
}
