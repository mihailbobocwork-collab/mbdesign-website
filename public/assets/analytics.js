// Basic consent mode: no Google tag or queued events before permission.
export const ANALYTICS_ID='G-MJ6TYXCYLQ';
export const TAG_MANAGER_ID='GTM-PM9CSLRQ';
// Activate after automatic form and user-provided-data collection are disabled in Google.
export const TAG_MANAGER_READY=false;
const choiceKey='mb:analytics-consent:v1';
const steps=new Set(['email','engagement','meeting_preference','message','calendar','review','complete']);
const projects=new Set(['lendit','7code','lendit-branding','wholesum','angen-ai','lendit-flyers','lendit-gazebo','7code-tech']);
export function safeEvent(name,params={}){
 if(name==='inquiry_step'&&steps.has(params.step))return {name,params:{step:params.step,form:'hero'}};
 if(name==='generate_lead'&&['message','meeting'].includes(params.lead_type))return {name,params:{lead_type:params.lead_type}};
 if(name==='view_case_study'&&projects.has(params.project))return {name,params:{project:params.project}};
 return null;
}
export function createAnalytics({win,doc,storage,id=ANALYTICS_ID,tagManager=TAG_MANAGER_READY}){
 let allowed=false,loaded=false;const seen=new Set();
 function command(){win.dataLayer.push(arguments);}
 const location=()=>win.location.origin+win.location.pathname;
 function enable(){
  allowed=true;win['ga-disable-'+id]=false;if(loaded)return;loaded=true;
  win.dataLayer=win.dataLayer||[];
  command('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  command('js',new Date());
  let referrer='';try{referrer=new URL(doc.referrer).origin;}catch{}
  command('config',id,{send_page_view:false,page_location:location(),page_referrer:referrer,page_title:doc.title,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:7776000});
  const script=doc.createElement('script');script.async=true;
  if(tagManager){win.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});script.src='https://www.googletagmanager.com/gtm.js?id='+TAG_MANAGER_ID;}
  else script.src='https://www.googletagmanager.com/gtag/js?id='+id;
  doc.head.append(script);
  command('event','page_view',{page_location:location(),page_referrer:referrer,page_title:doc.title});
  const match=win.location.pathname.match(/^\/work\/([^/]+)\/$/);if(match)track('view_case_study',{project:match[1]});
 }
 function track(name,params={},dedupe=''){
  const event=safeEvent(name,params);if(!allowed||!event||dedupe&&seen.has(dedupe))return;
  if(dedupe)seen.add(dedupe);command('event',event.name,{...event.params,page_location:location()});
 }
 function choose(value){
  if(!['granted','denied'].includes(value))return;
  try{storage.setItem(choiceKey,JSON.stringify({value,at:Date.now()}));}catch{}
  if(value==='granted')enable();else{
   allowed=false;win['ga-disable-'+id]=true;
   // Remove Analytics cookies on the current host and parent domain.
   for(const part of doc.cookie.split(';')){const name=part.trim().split('=')[0];if(!/^_ga(?:_|$)/.test(name))continue;
    doc.cookie=name+'=; Max-Age=0; Path=/';
    const host=win.location.hostname.split('.');for(let i=0;i<host.length-1;i++)doc.cookie=name+'=; Max-Age=0; Path=/; Domain=.'+host.slice(i).join('.');
   }
  }
 }
 function restore(){try{const saved=JSON.parse(storage.getItem(choiceKey));if(['granted','denied'].includes(saved?.value)&&Date.now()-saved.at<180*86400000){if(saved.value==='granted')enable();return saved.value;}}catch{}return '';}
 return {track,choose,restore};
}
let tracker;
export function track(name,params,key){try{tracker?.track(name,params,key);}catch{/* Measurement must never interrupt an inquiry. */}}
if(typeof document!=='undefined'&&['mihaiboboc.com','www.mihaiboboc.com'].includes(window.location.hostname)&&!location.pathname.startsWith('/admin')){
 let storage;try{storage=localStorage;}catch{}
 tracker=createAnalytics({win:window,doc:document,storage});
 const panel=document.createElement('section');panel.className='analytics-choice';panel.setAttribute('aria-label','Analytics preferences');panel.hidden=true;
 const text=document.createElement('p');text.textContent='May I use Google Analytics to understand visits and improve this website? Your inquiry text and contact details aren’t included.';
 const actions=document.createElement('div');const reject=document.createElement('button'),accept=document.createElement('button');
 reject.type=accept.type='button';reject.textContent='No thanks';accept.textContent='Allow analytics';
 reject.addEventListener('click',()=>{tracker.choose('denied');panel.hidden=true;});accept.addEventListener('click',()=>{tracker.choose('granted');panel.hidden=true;});
 actions.append(reject,accept);panel.append(text,actions);document.body.append(panel);
 if(!tracker.restore())panel.hidden=false;
 document.querySelectorAll('[data-analytics-preferences]').forEach(button=>{button.hidden=false;button.addEventListener('click',()=>{panel.hidden=false;reject.focus();});});
}
