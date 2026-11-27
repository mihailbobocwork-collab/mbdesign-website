import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalyticsAdmin,summarise} from '../lib/analytics-admin.js';

const NOW=Date.parse('2026-11-27T12:00:00Z');
const env={BOOKING_LOCAL:'true',CF_ANALYTICS_TOKEN:'tok',CF_ACCOUNT_ID:'acc',CF_WEB_ANALYTICS_SITE_TAG:'site'};
const get=(query='?days=7')=>new Request('http://localhost:4173/api/admin/analytics'+query);
const row=(key,visits,views=visits)=>({dimensions:{key},sum:{visits},count:views});
const account={total:[{count:40,sum:{visits:25}}],days:[row('2026-11-25',10,16),row('2026-11-27',15,24)],pages:[row('/',20,30)],referrers:[row('',12),row('www.google.com',9)],countries:[row('Moldova',9),row('',1)],devices:[row('desktop',15)]};

test('Visitors: Cloudflare numbers become totals, a gap-free daily series and ranked lists',async()=>{
 const calls=[];
 const fetcher=async(url,init)=>{calls.push({url,init});return Response.json({data:{viewer:{accounts:[account]}}});};
 const admin=createAnalyticsAdmin({fetcher,clock:()=>NOW});
 const res=await admin(env,get());assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.visits,25);assert.equal(data.views,40);
 assert.equal(data.series.length,7);assert.equal(data.series.at(-1).date,'2026-11-27');
 assert.equal(data.series.find(p=>p.date==='2026-11-26').visits,0);
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
 const sample=await (await admin({BOOKING_LOCAL:'true'},get('?days=30&sample'))).json();
 assert.equal(sample.sample,true);assert.equal(sample.series.length,30);assert.ok(sample.visits>0);
 // Unknown periods fall back to 30 days.
 assert.equal(summarise({},{days:30,now:NOW}).series.length,30);
 assert.equal((await (await admin({BOOKING_LOCAL:'true'},get('?days=5&sample'))).json()).days,30);
});
