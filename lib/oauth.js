const cookieName='__Host-mb-oauth';
export function config(env,request){
  const required=['SITE_URL','GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','GITHUB_REPO','GITHUB_ALLOWED_USERS'];
  if(required.some(key=>!env[key]))throw Error('CMS authentication is not configured. Follow README.md.');
  const site=new URL(env.SITE_URL);
  if(site.protocol!=='https:'||site.pathname!=='/'||site.search||site.hash)throw Error('SITE_URL must be an HTTPS origin.');
  if(new URL(request.url).origin!==site.origin)throw Error('Sign in through the configured site domain.');
  if(!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPO))throw Error('Invalid repository configuration.');
  if(env.GITHUB_SCOPE&&!['repo','public_repo'].includes(env.GITHUB_SCOPE))throw Error('Invalid scope configuration.');
  return {origin:site.origin,scope:env.GITHUB_SCOPE||'public_repo',users:env.GITHUB_ALLOWED_USERS.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)};
}
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
export async function authorization(env,request){
  const settings=config(env,request),state=random(),verifier=random();
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const params=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:settings.origin+'/callback',scope:settings.scope,state,code_challenge:challenge,code_challenge_method:'S256',allow_signup:'false'});
  const cookie=encodeURIComponent(JSON.stringify({state,verifier,expires:Date.now()+600000}));
  return new Response(null,{status:302,headers:{Location:'https://github.com/login/oauth/authorize?'+params,'Set-Cookie':`${cookieName}=${cookie}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
export const clearCookie=`${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
export function errorResponse(message,status=400){return new Response(message,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Set-Cookie':clearCookie,'Referrer-Policy':'no-referrer'}});}
export async function callback(env,request,fetcher=fetch){
  const settings=config(env,request),url=new URL(request.url);
  const raw=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  let session;try{session=JSON.parse(decodeURIComponent(raw||''));}catch{return errorResponse('Sign-in session missing. Close this window and try again.');}
  const state=url.searchParams.get('state'),code=url.searchParams.get('code');
  if(!state||!session.state||state!==session.state||!session.verifier||!Number.isFinite(session.expires)||session.expires<Date.now())return errorResponse('Sign-in session invalid or expired. Close this window and try again.');
  if(url.searchParams.has('error')||!code)return errorResponse('GitHub sign-in was not completed. Close this window and try again.');
  const tokenResponse=await fetcher('https://github.com/login/oauth/access_token',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:settings.origin+'/callback',code_verifier:session.verifier})});
  if(!tokenResponse.ok)return errorResponse('GitHub authentication is temporarily unavailable.',502);
  const token=await tokenResponse.json();if(!token.access_token)return errorResponse('GitHub could not authorize this sign-in. Try again.',401);
  const headers={Accept:'application/vnd.github+json',Authorization:'Bearer '+token.access_token,'User-Agent':'Mihai-Boboc-CMS'};
  const userResponse=await fetcher('https://api.github.com/user',{headers});
  if(!userResponse.ok)return errorResponse('Could not verify your GitHub account.',401);
  const user=await userResponse.json();if(typeof user.login!=='string'||!settings.users.includes(user.login.toLowerCase()))return errorResponse('This GitHub account is not authorized to edit this website.',403);
  const repoResponse=await fetcher('https://api.github.com/repos/'+env.GITHUB_REPO,{headers});
  if(!repoResponse.ok||(await repoResponse.json()).permissions?.push!==true)return errorResponse('Your account needs write access to the configured repository.',403);
  const nonce=random();
  const payload=JSON.stringify('authorization:github:success:'+JSON.stringify({token:token.access_token,provider:'github'})).replaceAll('<','\\u003c');
  const origin=JSON.stringify(settings.origin);
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>CMS sign-in</title><body><p id="status">Finishing sign-in. Keep this window open.</p><script nonce="${nonce}">const origin=${origin};if(!window.opener){document.getElementById('status').textContent='Open sign-in from the website content manager.';}else{const receive=(event)=>{if(event.origin!==origin||event.source!==window.opener||event.data!=='authorizing:github')return;window.removeEventListener('message',receive);window.opener.postMessage(${payload},origin);document.getElementById('status').textContent='Signed in. You can close this window.';};window.addEventListener('message',receive);window.opener.postMessage('authorizing:github',origin);}</script></body></html>`;
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Set-Cookie':clearCookie,'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`}});
}
