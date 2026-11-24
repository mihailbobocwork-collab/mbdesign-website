import {track} from '../analytics.js';
let challengeScript;
const utf8=value=>new TextEncoder().encode(value);
async function keyFor(body){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',utf8(JSON.stringify(body))))].map(b=>b.toString(16).padStart(2,'0')).join(''),key='mihail:submission:'+hash;let id;try{id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id);}}catch{id=crypto.randomUUID();}return {id,key};}
function loadChallenge(){
 if(globalThis.turnstile)return Promise.resolve(globalThis.turnstile);if(challengeScript)return challengeScript;
 challengeScript=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;const timeout=setTimeout(()=>{script.remove();challengeScript=null;reject(Error('verification'));},12000);script.onload=()=>{clearTimeout(timeout);if(globalThis.turnstile)resolve(globalThis.turnstile);else{challengeScript=null;reject(Error('verification'));}};script.onerror=()=>{clearTimeout(timeout);challengeScript=null;reject(Error('verification'));};document.head.append(script);});return challengeScript;
}
export class BookingAction{
 constructor({button,status,challenge,siteKey='',body,onSuccess,preview=false}){
  Object.assign(this,{button,status,challenge,siteKey,body,onSuccess,preview});this.original=button.textContent;this.busy=false;this.disposed=false;this.listener=()=>this.send();button.addEventListener('click',this.listener);if(siteKey&&!preview)this.initChallenge();
 }
 async initChallenge(){try{const api=await loadChallenge();if(this.disposed)return;this.widget=api.render(this.challenge,{sitekey:this.siteKey,action:'inquiry',appearance:'interaction-only',callback:()=>{this.status.textContent='';},'error-callback':()=>{if(!this.disposed)this.status.textContent='Verification couldn’t start. Please refresh this page or try another browser.';return true;},'timeout-callback':()=>{if(!this.disposed)this.status.textContent='Verification timed out. Please try again.';},'expired-callback':()=>{this.status.textContent='Please verify once more before confirming.';}});}catch{if(!this.disposed)this.status.textContent='Verification couldn’t load. Please try again.';}}
 async send(){
  if(this.busy||this.disposed)return;
  if(this.preview){this.onSuccess({preview:true,status:this.body.kind==='meeting'?'requested':'confirmed',kind:this.body.kind,startTime:this.body.startTime,platform:'Google Meet'});return;}
  let challengeToken='';
  try{challengeToken=this.siteKey&&this.widget!==undefined?globalThis.turnstile?.getResponse(this.widget)||'':'';}catch{this.status.textContent='Verification isn’t ready. Please refresh this page and try again.';return;}
  if(this.siteKey&&!challengeToken){this.status.textContent='Please complete the quick verification below before sending.';this.challenge?.scrollIntoView?.({block:'nearest',behavior:'instant'});return;}
  this.busy=true;this.button.disabled=true;this.button.textContent=this.pending?'Checking…':'Confirming…';this.status.textContent='';this.button.dispatchEvent(new CustomEvent('meeting-busy',{bubbles:true,detail:true}));
  try{
   this.keyInfo ||=await keyFor(this.body);
   const response=await fetch('/api/bookings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...this.body,id:this.keyInfo.id,challengeToken}),signal:AbortSignal.timeout(30000)});
   const result=await response.json();
   if(this.disposed)return;
   if(response.ok&&['confirmed','requested'].includes(result.status)){
    track('generate_lead',{lead_type:this.body.kind},'lead:'+this.keyInfo.id);
    try{sessionStorage.setItem('mihail:last-confirmation',JSON.stringify(result));}catch{}
    this.button.dispatchEvent(new CustomEvent('meeting-busy',{bubbles:true,detail:false}));
    this.onSuccess(result);
   }else if(response.status===202){this.pending=true;this.status.textContent=result.message||'Still confirming. Check again before making another request.';}
   else{
    this.status.textContent=result.message||'That couldn’t be completed. Your answers are safe here.';
    if(['failed','slot_gone','changed'].includes(result.error)){try{sessionStorage.removeItem(this.keyInfo.key);}catch{}this.keyInfo=null;}
    if(this.siteKey)globalThis.turnstile?.reset(this.widget);
   }
  }catch{if(!this.disposed){this.pending=true;this.status.textContent='The response is taking longer than expected. Check the status before making another request.';}}
  finally{this.busy=false;if(!this.disposed){this.button.disabled=false;this.button.textContent=this.pending?'Check status':this.original;}this.button.dispatchEvent(new CustomEvent('meeting-busy',{bubbles:true,detail:false}));}
 }
 destroy(){this.disposed=true;this.button.removeEventListener('click',this.listener);if(this.widget!==undefined)globalThis.turnstile?.remove(this.widget);}
}
