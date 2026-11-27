import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalyticsAdmin,summarise,midnight,windowFor,resolveSite} from '../lib/analytics-admin.js';

const NOW=Date.parse('2026-11-27T12:00:00Z');
const env={BOOKING_LOCAL:'true',CF_ANALYTICS_TOKEN:'tok',CF_ACCOUNT_ID:'acc',CF_WEB_ANALYTICS_SITE_TAG:'site'};
const get=(query='?range=7')=>new Request('http://localhost:4173/api/admin/analytics'+query);
const row=(key,visits,views=visits)=>({dimensions:{key},sum:{visits},count:views});
const account={total:[{count:40,sum:{visits:25}}],series:[row('2026-11-25',10,16),row('2026-11-27',15,24)],pages:[row('/',20,30)],referrers:[row('',12),row('www.google.com',9)],countries:[row('Moldova',9),row('',1)],devices:[row('desktop',15)]};

test('Visitors: Cloudflare numbers become totals, a gap-free daily series and ranked lists',async()=>{
 const calls=[];
 const fetcher=async(url,init)=>{if(url.includes('/rum/'))return Response.json({success:true,result:[{site_tag:'site',site_token:'x',host:'mihaiboboc.com'}]});calls.push({url,init});return Response.json({data:{viewer:{accounts:[account]}}});};
 const admin=createAnalyticsAdmin({fetcher,clock:()=>NOW});
 const res=await admin(env,get());assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.visits,25);assert.equal(data.views,40);
 assert.equal(data.series.length,7);assert.equal(data.series.at(-1).at,'2026-11-27T00:00:00.000Z');assert.equal(data.bucket,'day');
 assert.equal(data.series.find(p=>p.at.startsWith('2026-11-26')).visits,0);assert.equal(data.series.find(p=>p.at.startsWith('2026-11-25')).visits,10);
 assert.equal(data.referrers[0].key,'Direct');assert.deepEqual(data.countries.map(c=>c.key),['Moldova']);
 const sent=JSON.parse(calls[0].init.body);
 assert.equal(calls[0].url,'https://api.cloudflare.com/client/v4/graphql');
 assert.equal(calls[0].init.headers.Authorization,'Bearer tok');
 assert.equal(sent.variables.account,'acc');assert.deepEqual(sent.variables.filter.AND[1],{siteTag:'site'});
 // Cached for five minutes: a second look doesn't call Cloudflare again.
 await admin(env,get());assert.equal(calls.length,1);
});

test('Visitors: not connected, a rejected token and errors are reported plainly',async()=>{
 const ok=createAnalyticsAdmin({fetcher:async()=>{throw Error('should not fetch');},clock:()=>NOW});
 const missing=await ok({BOOKING_LOCAL:'true'},get());assert.equal(missing.status,503);assert.equal((await missing.json()).error,'not_connected');
 const denied=createAnalyticsAdmin({fetcher:async()=>Response.json({errors:[{message:'auth'}]},{status:403}),clock:()=>NOW});
 assert.equal((await (await denied(env,get())).json()).error,'token');
 const broken=createAnalyticsAdmin({fetcher:async()=>Response.json({errors:[{message:'bad field'}]}),clock:()=>NOW});
 assert.equal((await (await broken(env,get())).json()).error,'unavailable');
 const offline=createAnalyticsAdmin({fetcher:async()=>{throw Error('down');},clock:()=>NOW});
 assert.equal((await offline(env,get())).status,502);
});

test('Visitors: sign-in is required outside the local preview, and samples are local only',async()=>{
 const admin=createAnalyticsAdmin({fetcher:async()=>{throw Error('no');},clock:()=>NOW});
 const remote=await admin({CF_ANALYTICS_TOKEN:'t'},new Request('https://mihaiboboc.com/api/admin/analytics'));
 assert.ok([401,503].includes(remote.status));
 const sample=await (await admin({BOOKING_LOCAL:'true'},get('?range=30&sample'))).json();
 assert.equal(sample.sample,true);assert.equal(sample.series.length,30);assert.ok(sample.visits>0);
 // Unknown periods fall back to 30 days.
 assert.equal(summarise({},{range:'30',now:NOW}).series.length,30);
 assert.equal((await (await admin({BOOKING_LOCAL:'true'},get('?range=5&sample'))).json()).range,'30');
});

test('Visitors: live, today and yesterday use minutes and hours in Moldova time',async()=>{
 // 12:00 UTC on 27 Nov is 14:00 in Chisinau (UTC+2), so today started at 22:00 UTC the day before.
 assert.equal(new Date(midnight(NOW)).toISOString(),'2026-11-26T22:00:00.000Z');
 assert.equal(new Date(midnight(NOW,'Europe/Chisinau',1)).toISOString(),'2026-11-25T22:00:00.000Z');
 // Summer time (UTC+3) is handled too.
 assert.equal(new Date(midnight(Date.parse('2026-07-01T12:00:00Z'))).toISOString(),'2026-06-30T21:00:00.000Z');
 const live=windowFor('live',NOW);assert.equal(live.bucket,'minute');assert.equal(NOW-live.from,29*60000);
 const calls=[];
 const fetcher=async(url,init)=>{if(url.includes('/rum/'))return Response.json({success:false},{status:403});calls.push(JSON.parse(init.body));return Response.json({data:{viewer:{accounts:[{total:[{count:3,sum:{visits:2}}],series:[{dimensions:{key:'2026-11-27T09:00:00Z'},sum:{visits:2},count:3}]}]}}});};
 const admin=createAnalyticsAdmin({fetcher,clock:()=>NOW});
 const today=await (await admin(env,get('?range=today'))).json();
 assert.equal(today.bucket,'hour');assert.equal(today.series.length,24);assert.equal(today.series[0].at,'2026-11-26T22:00:00.000Z');
 assert.equal(today.series.find(p=>p.at==='2026-11-27T09:00:00.000Z').visits,2);
 assert.match(calls[0].query,/key: datetimeHour/);assert.equal(calls[0].variables.filter.AND[0].datetime_geq,'2026-11-26T22:00:00.000Z');
 const yesterday=await (await admin(env,get('?range=yesterday'))).json();
 assert.equal(yesterday.series.length,24);assert.equal(calls[1].variables.filter.AND[0].datetime_leq,'2026-11-26T21:59:59.999Z');
 const now=await (await admin(env,get('?range=live'))).json();
 assert.equal(now.bucket,'minute');assert.equal(now.series.length,30);assert.match(calls[2].query,/key: datetimeMinute/);
});

test('Visitors: the site tag is checked against the account, and a pasted snippet token is fixed',async()=>{
 const list={success:true,result:[{site_tag:'realtag123',site_token:'snippettok',host:'mihaiboboc.com'}]};
 const fetchList=async url=>url.includes('/rum/site_info/list')?Response.json(list):Response.json({});
 assert.equal((await resolveSite({...env,CF_WEB_ANALYTICS_SITE_TAG:'snippettok'},fetchList)).siteTag,'realtag123');
 assert.equal((await resolveSite({...env,CF_WEB_ANALYTICS_SITE_TAG:'whatever'},fetchList)).matched,'host');
 const denied=await resolveSite(env,async()=>Response.json({success:false},{status:403}));
 assert.deepEqual([denied.siteTag,denied.lookup],['site','denied']);
 // The numbers are then asked for under the right tag.
 const sent=[];
 const fetcher=async(url,init)=>{if(url.includes('/rum/'))return Response.json(list);sent.push(JSON.parse(init.body));return Response.json({data:{viewer:{accounts:[{}]}}});};
 const data=await (await createAnalyticsAdmin({fetcher,clock:()=>NOW})({...env,CF_WEB_ANALYTICS_SITE_TAG:'snippettok'},get())).json();
 assert.deepEqual(sent[0].variables.filter.AND[1],{siteTag:'realtag123'});assert.equal(data.check.matched,'site_token');assert.equal(data.visits,0);
 // Missing secrets are named.
 assert.deepEqual((await (await createAnalyticsAdmin({fetcher,clock:()=>NOW})({BOOKING_LOCAL:'true',CF_ACCOUNT_ID:'a'},get())).json()).missing,['CF_ANALYTICS_TOKEN','CF_WEB_ANALYTICS_SITE_TAG']);
});
