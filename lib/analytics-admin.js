// Admin API for visitor numbers (/api/admin/analytics): reads Cloudflare Web Analytics through
// Cloudflare's GraphQL API and returns a small summary for the admin page. Needs three secrets in
// Cloudflare Pages: CF_ANALYTICS_TOKEN (an API token with "Account Analytics: Read"), CF_ACCOUNT_ID
// and CF_WEB_ANALYTICS_SITE_TAG. Signed in through Cloudflare Access like the rest of the admin.
//
// Periods (?range=): live (last 30 minutes, per minute), today and yesterday (per hour, midnight
// to midnight in the owner's time zone), 7 / 30 / 90 (days, per day).
import {createAdminAuth,adminGate} from './admin-auth.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(code,message,status)=>json({error:code,message},status);
export const RANGES=['live','today','yesterday','7','30','90'];
export const TIME_ZONE='Europe/Chisinau';
export const analyticsConfigured=env=>Boolean(env.CF_ANALYTICS_TOKEN&&env.CF_ACCOUNT_ID&&env.CF_WEB_ANALYTICS_SITE_TAG);
const MINUTE=60000,HOUR=3600000,DAY=86400000;
const BUCKETS={minute:{dimension:'datetimeMinute',step:MINUTE},hour:{dimension:'datetimeHour',step:HOUR},day:{dimension:'date',step:DAY}};

const group=(name,dimension,order,limit=8)=>`${name}: rumPageloadEventsAdaptiveGroups(limit: ${limit}, filter: $filter, orderBy: [${order}]) { count sum { visits } dimensions { key: ${dimension} } }`;
export const query=bucket=>`query Visits($account: string!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
 viewer { accounts(filter: {accountTag: $account}) {
  total: rumPageloadEventsAdaptiveGroups(limit: 1, filter: $filter) { count sum { visits } }
  ${group('series',BUCKETS[bucket].dimension,BUCKETS[bucket].dimension+'_ASC',100)}
  ${group('pages','requestPath','count_DESC')}
  ${group('referrers','refererHost','sum_visits_DESC')}
  ${group('countries','countryName','sum_visits_DESC')}
  ${group('devices','deviceType','sum_visits_DESC',4)}
 } }
}`;

// Midnight in a time zone, as a UTC timestamp. `back` days before today.
export function midnight(now,timeZone=TIME_ZONE,back=0){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));
 const guess=Date.UTC(+parts.year,+parts.month-1,+parts.day-back);
 // The zone's offset at that moment (wall clock minus UTC), applied twice to settle DST edges.
 const offset=at=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric'}).formatToParts(new Date(at)).map(x=>[x.type,x.value]));return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute)-Math.floor(at/MINUTE)*MINUTE;};
 let at=guess-offset(guess);at=guess-offset(at);return at;
}

// The window and bucket size for a period.
export function windowFor(range,now,timeZone=TIME_ZONE){
 if(range==='live')return {bucket:'minute',from:Math.floor(now/MINUTE)*MINUTE-29*MINUTE,to:now};
 if(range==='today')return {bucket:'hour',from:midnight(now,timeZone),to:now};
 if(range==='yesterday'){const to=midnight(now,timeZone);return {bucket:'hour',from:midnight(now,timeZone,1),to:to-1};}
 const days=Number(range);return {bucket:'day',from:Date.UTC(...new Date(now-(days-1)*DAY).toISOString().slice(0,10).split('-').map((v,i)=>i===1?v-1:+v)),to:now,days};
}

// Every bucket in the window appears once, so the chart has no gaps in quiet times.
export function summarise(account,{range,now,timeZone=TIME_ZONE}){
 const win=windowFor(range,now,timeZone),step=BUCKETS[win.bucket].step;
 const keyOf=key=>win.bucket==='day'?Date.parse(key+'T00:00:00Z'):Date.parse(key);
 const found=new Map((account.series||[]).map(row=>[keyOf(row.dimensions.key),row]));
 const series=[];
 const start=win.bucket==='hour'?Math.floor(win.from/HOUR)*HOUR:win.from;
 // Today always shows the whole day; the hours still to come stay empty.
 const end=range==='today'?win.from+DAY-1:win.to;
 for(let at=start;at<=end;at+=step){const row=found.get(at);series.push({at:new Date(at).toISOString(),visits:row?.sum?.visits||0,views:row?.count||0});}
 const rows=list=>(list||[]).map(row=>({key:row.dimensions.key||'',visits:row.sum?.visits||0,views:row.count||0}));
 return {
  range,bucket:win.bucket,from:new Date(win.from).toISOString(),to:new Date(win.to).toISOString(),timeZone,
  visits:account.total?.[0]?.sum?.visits||0,
  views:account.total?.[0]?.count||0,
  series,
  pages:rows(account.pages),
  // An empty referrer means the visitor typed the address or used a bookmark.
  referrers:rows(account.referrers).map(row=>({...row,key:row.key||'Direct'})),
  countries:rows(account.countries).filter(row=>row.key),
  devices:rows(account.devices).filter(row=>row.key)
 };
}

// Made-up numbers for reviewing the page on a local preview (`?sample`). Nothing is fetched.
function sample(range,now){
 const win=windowFor(range,now),step=BUCKETS[win.bucket].step;
 let seed=7;const rand=()=>(seed=(seed*9301+49297)%233280)/233280;
 const scale={minute:.6,hour:2.2,day:18}[win.bucket];
 const seriesRows=[];
 for(let at=win.bucket==='hour'?Math.floor(win.from/HOUR)*HOUR:win.from;at<=win.to;at+=step){
  const visits=Math.max(0,Math.round(scale*(.3+rand()*1.4)));
  const key=win.bucket==='day'?new Date(at).toISOString().slice(0,10):new Date(at).toISOString();
  seriesRows.push({dimensions:{key},sum:{visits},count:Math.round(visits*(1.6+rand()))});
 }
 const visits=seriesRows.reduce((sum,row)=>sum+row.sum.visits,0),views=seriesRows.reduce((sum,row)=>sum+row.count,0);
 const split=(keys,shares)=>keys.map((key,i)=>({dimensions:{key},sum:{visits:Math.round(visits*shares[i])},count:Math.round(views*shares[i])})).filter(row=>row.sum.visits);
 return summarise({total:[{count:views,sum:{visits}}],series:seriesRows,
  pages:split(['/','/work/lendit/','/work/7code-web/','/work/angen-ai/','/contact/','/work/wholesum/'],[.55,.14,.1,.08,.07,.06]),
  referrers:split(['www.google.com','www.linkedin.com','','www.behance.net','t.co'],[.38,.27,.22,.09,.04]),
  countries:split(['United Kingdom','Moldova','United States','Germany','Romania','Netherlands'],[.3,.22,.18,.1,.08,.05]),
  devices:split(['desktop','mobile','tablet'],[.58,.38,.04])},{range,now});
}

// Web Analytics has two similar codes: the site tag (what the numbers are filed under) and the
// site token (in the tracking snippet). Owners easily paste the wrong one, so the configured value
// is checked against the account's site list: a token or the site's address is turned into the
// right site tag. If the list can't be read (token without that permission) the value is used as is.
export const SITE_HOST='mihaiboboc.com';
const mask=value=>value.length>8?`…${value.slice(-6)}`:value;
export async function resolveSite(env,fetcher){
 const given=String(env.CF_WEB_ANALYTICS_SITE_TAG).trim(),account=String(env.CF_ACCOUNT_ID).trim();
 try{
  const res=await fetcher(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/rum/site_info/list?per_page=100`,{headers:{'Authorization':`Bearer ${String(env.CF_ANALYTICS_TOKEN).trim()}`},signal:AbortSignal.timeout(8000)});
  const body=await res.json().catch(()=>null);
  if(!res.ok||!body?.success||!Array.isArray(body.result))return {siteTag:given,lookup:res.status===401||res.status===403?'denied':'failed',matched:'as_given'};
  const sites=body.result.map(site=>({tag:String(site.site_tag||''),token:String(site.site_token||''),host:String(site.host||site.ruleset?.zone_name||'').toLowerCase()}));
  const byTag=sites.find(site=>site.tag===given),byToken=sites.find(site=>site.token===given);
  const byHost=sites.find(site=>site.host===SITE_HOST||site.host.endsWith('.'+SITE_HOST))||sites.find(site=>site.host.includes('mbdesign-website'));
  const site=byTag||byToken||byHost;
  return {siteTag:site?.tag||given,host:site?.host||'',lookup:'ok',matched:byTag?'site_tag':byToken?'site_token':byHost?'host':'none',sites:sites.length};
 }catch{return {siteTag:given,lookup:'failed',matched:'as_given'};}
}

export function createAnalyticsAdmin({fetcher=fetch,clock=()=>Date.now(),auth=createAdminAuth()}={}){
 const cache=new Map();let site=null;
 return async function analytics(env,request){
  if(request.method!=='GET')return fail('method','Not available.',405);
  const {who,response}=await adminGate(auth,env,request);if(response)return response;
  const url=new URL(request.url);
  const asked=url.searchParams.get('range')||url.searchParams.get('days')||'30';
  const range=RANGES.includes(asked)?asked:'30';
  const now=clock();
  if(who.local&&url.searchParams.has('sample'))return json({sample:true,signedInAs:who.email,...sample(range,now)});
  if(!analyticsConfigured(env)){
   const missing=['CF_ANALYTICS_TOKEN','CF_ACCOUNT_ID','CF_WEB_ANALYTICS_SITE_TAG'].filter(name=>!env[name]);
   return json({error:'not_connected',message:'Visitor numbers aren’t connected yet.',missing},503);
  }
  // Live numbers are cached for 30 seconds, the rest for five minutes.
  const hit=cache.get(range);if(hit&&hit.until>now)return json({signedInAs:who.email,...hit.data});
  // The site lookup is remembered for an hour (and retried sooner if it failed).
  if(!site||site.until<=now){const found=await resolveSite(env,fetcher);site={...found,until:now+(found.lookup==='ok'?3600000:300000)};}
  const check={siteTag:mask(site.siteTag),host:site.host||'',lookup:site.lookup,matched:site.matched};
  if(site.lookup==='ok'&&site.matched==='none')return json({error:'site',message:`Cloudflare has no Web Analytics site for ${SITE_HOST} in this account. Turn on Web Analytics for the website in Cloudflare, or check CF_ACCOUNT_ID.`,check},502);
  const win=windowFor(range,now);
  const variables={account:String(env.CF_ACCOUNT_ID).trim(),filter:{AND:[{datetime_geq:new Date(win.from).toISOString(),datetime_leq:new Date(win.to).toISOString()},{siteTag:site.siteTag}]}};
  try{
   const res=await fetcher('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{'Authorization':`Bearer ${String(env.CF_ANALYTICS_TOKEN).trim()}`,'Content-Type':'application/json'},body:JSON.stringify({query:query(win.bucket),variables}),signal:AbortSignal.timeout(10000)});
   const body=await res.json().catch(()=>null);
   const cfError=String(body?.errors?.[0]?.message||'').slice(0,300);
   if(res.status===401||res.status===403||/authori[sz]|permission|access|token/i.test(cfError))return json({error:'token',message:'Cloudflare didn’t accept the analytics token. It needs the permission Account Analytics: Read.',detail:cfError,check},502);
   if(!res.ok||!body||body.errors?.length)return json({error:'unavailable',message:'Cloudflare didn’t return the numbers.',detail:cfError||`HTTP ${res.status}`,check},502);
   const account=body.data?.viewer?.accounts?.[0];
   if(!account)return json({error:'account',message:'Cloudflare didn’t find that account. Check CF_ACCOUNT_ID.',check},502);
   const data={...summarise(account,{range,now}),check};
   cache.set(range,{until:now+(range==='live'?30000:300000),data});
   return json({signedInAs:who.email,...data});
  }catch{return json({error:'unavailable',message:'Cloudflare couldn’t be reached. Please try again in a minute.',check},502);}
 };
}
export const analytics=createAnalyticsAdmin();
