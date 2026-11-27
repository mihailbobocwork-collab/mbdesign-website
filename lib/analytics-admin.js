// Admin API for visitor numbers (/api/admin/analytics): reads Cloudflare Web Analytics through
// Cloudflare's GraphQL API and returns a small summary for the admin page. Needs three secrets in
// Cloudflare Pages: CF_ANALYTICS_TOKEN (an API token with "Account Analytics: Read"), CF_ACCOUNT_ID
// and CF_WEB_ANALYTICS_SITE_TAG. Signed in through Cloudflare Access like the rest of the admin.
import {createAdminAuth,adminGate} from './admin-auth.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(code,message,status)=>json({error:code,message},status);
export const RANGES=[7,30,90];
export const analyticsConfigured=env=>Boolean(env.CF_ANALYTICS_TOKEN&&env.CF_ACCOUNT_ID&&env.CF_WEB_ANALYTICS_SITE_TAG);

const group=(name,dimension,order,limit=8)=>`${name}: rumPageloadEventsAdaptiveGroups(limit: ${limit}, filter: $filter, orderBy: [${order}]) { count sum { visits } dimensions { key: ${dimension} } }`;
export const QUERY=`query Visits($account: string!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
 viewer { accounts(filter: {accountTag: $account}) {
  total: rumPageloadEventsAdaptiveGroups(limit: 1, filter: $filter) { count sum { visits } }
  ${group('days','date','date_ASC',100)}
  ${group('pages','requestPath','count_DESC')}
  ${group('referrers','refererHost','sum_visits_DESC')}
  ${group('countries','countryName','sum_visits_DESC')}
  ${group('devices','deviceType','sum_visits_DESC',4)}
 } }
}`;

const day=ms=>new Date(ms).toISOString().slice(0,10);
// Every day in the range appears once, so the chart has no gaps on quiet days.
export function summarise(account,{days,now}){
 const byDay=new Map((account.days||[]).map(row=>[row.dimensions.key,row]));
 const series=[];
 for(let i=days-1;i>=0;i--){const date=day(now-i*86400000),row=byDay.get(date);series.push({date,visits:row?.sum?.visits||0,views:row?.count||0});}
 const rows=list=>(list||[]).map(row=>({key:row.dimensions.key||'',visits:row.sum?.visits||0,views:row.count||0}));
 return {
  days,
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
function sample(days,now){
 let seed=7;const rand=()=>(seed=(seed*9301+49297)%233280)/233280;
 const dayRows=[];for(let i=days-1;i>=0;i--){const visits=Math.round(6+rand()*22+(i%7<2?-4:0));dayRows.push({dimensions:{key:day(now-i*86400000)},sum:{visits},count:Math.round(visits*(1.6+rand()))});}
 const visits=dayRows.reduce((sum,row)=>sum+row.sum.visits,0),views=dayRows.reduce((sum,row)=>sum+row.count,0);
 const split=(keys,shares)=>keys.map((key,i)=>({dimensions:{key},sum:{visits:Math.round(visits*shares[i])},count:Math.round(views*shares[i])}));
 return summarise({total:[{count:views,sum:{visits}}],days:dayRows,
  pages:split(['/','/work/lendit/','/work/7code-web/','/work/angen-ai/','/contact/','/work/wholesum/'],[.55,.14,.1,.08,.07,.06]),
  referrers:split(['www.google.com','www.linkedin.com','','www.behance.net','t.co'],[.38,.27,.22,.09,.04]),
  countries:split(['United Kingdom','Moldova','United States','Germany','Romania','Netherlands'],[.3,.22,.18,.1,.08,.05]),
  devices:split(['desktop','mobile','tablet'],[.58,.38,.04])},{days,now});
}

export function createAnalyticsAdmin({fetcher=fetch,clock=()=>Date.now(),auth=createAdminAuth()}={}){
 const cache=new Map();
 return async function analytics(env,request){
  if(request.method!=='GET')return fail('method','Not available.',405);
  const {who,response}=await adminGate(auth,env,request);if(response)return response;
  const url=new URL(request.url),days=RANGES.includes(Number(url.searchParams.get('days')))?Number(url.searchParams.get('days')):30;
  const now=clock();
  if(who.local&&url.searchParams.has('sample'))return json({sample:true,signedInAs:who.email,...sample(days,now)});
  if(!analyticsConfigured(env))return fail('not_connected','Visitor numbers aren’t connected yet.',503);
  // Cloudflare's numbers move slowly; five minutes of caching keeps the page quick.
  const hit=cache.get(days);if(hit&&hit.until>now)return json({signedInAs:who.email,...hit.data});
  const variables={account:String(env.CF_ACCOUNT_ID).trim(),filter:{AND:[{datetime_geq:new Date(now-days*86400000).toISOString(),datetime_leq:new Date(now).toISOString()},{siteTag:String(env.CF_WEB_ANALYTICS_SITE_TAG).trim()}]}};
  try{
   const res=await fetcher('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{'Authorization':`Bearer ${String(env.CF_ANALYTICS_TOKEN).trim()}`,'Content-Type':'application/json'},body:JSON.stringify({query:QUERY,variables}),signal:AbortSignal.timeout(10000)});
   const body=await res.json().catch(()=>null);
   if(res.status===401||res.status===403)return fail('token','Cloudflare didn’t accept the analytics token. Check that it can read Account Analytics.',502);
   if(!res.ok||!body||body.errors?.length)return fail('unavailable','Cloudflare didn’t return the numbers. Please try again in a minute.',502);
   const account=body.data?.viewer?.accounts?.[0];
   if(!account)return fail('account','Cloudflare didn’t find that account. Check CF_ACCOUNT_ID.',502);
   const data=summarise(account,{days,now});
   cache.set(days,{until:now+300000,data});
   return json({signedInAs:who.email,...data});
  }catch{return fail('unavailable','Cloudflare couldn’t be reached. Please try again in a minute.',502);}
 };
}
export const analytics=createAnalyticsAdmin();
