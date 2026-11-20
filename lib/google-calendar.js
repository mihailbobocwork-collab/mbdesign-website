const CAL='https://www.googleapis.com/calendar/v3';
const base64=value=>btoa(String.fromCharCode(...new TextEncoder().encode(value)));
export function googleConfigured(env){return Boolean(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.GOOGLE_REFRESH_TOKEN&&env.BOOKING_HOST_EMAIL&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.BOOKING_HOST_EMAIL));}
export function createGoogleProvider({fetcher=fetch}={}){
 let cached;
 async function access(env){
  const key=env.GOOGLE_CLIENT_ID+'|'+env.GOOGLE_REFRESH_TOKEN+'|'+env.GOOGLE_CLIENT_SECRET;
  if(cached?.key===key&&cached.until>Date.now())return cached.token;
  const res=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,refresh_token:env.GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'}),signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw Error('google_auth');const data=await res.json();if(typeof data.access_token!=='string')throw Error('google_auth');cached={key,token:data.access_token,until:Date.now()+Math.max(30,Number(data.expires_in||3600)-60)*1000};return cached.token;
 }
 async function request(env,url,options={}){let token;try{token=await access(env);}catch(error){error.definite=true;throw error;}return fetcher(url,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(18000)});}
 const calendar=env=>encodeURIComponent(env.GOOGLE_CALENDAR_ID||env.BOOKING_HOST_EMAIL);
 return {
  async busy(env,start,end){
   const ids=[...new Set([env.GOOGLE_CALENDAR_ID||env.BOOKING_HOST_EMAIL,...String(env.GOOGLE_CHECK_CALENDARS||'').split(',').map(v=>v.trim()).filter(Boolean)])];
   const response=await request(env,CAL+'/freeBusy',{method:'POST',body:JSON.stringify({timeMin:new Date(start).toISOString(),timeMax:new Date(end).toISOString(),items:ids.map(id=>({id}))})});
   if(!response.ok)throw Error('busy_unavailable');const data=await response.json(),busy=[];
   for(const id of ids){const item=data.calendars?.[id];if(!item||item.errors?.length||!Array.isArray(item.busy))throw Error('busy_unavailable');for(const period of item.busy){const a=Date.parse(period.start),b=Date.parse(period.end);if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)throw Error('busy_unavailable');busy.push({start:a,end:b});}}return busy;
  },
  async find(env,id){const response=await request(env,CAL+'/calendars/'+calendar(env)+'/events/'+encodeURIComponent(id));if(response.status===404)return null;if(!response.ok)throw Error('lookup_failed');return response.json();},
  async create(env,{id,startTime,endTime,answers,timeZone}){
   const description=[answers.subject==='hiring'?'Hiring conversation':'Project conversation',`Name: ${answers.name}`,`Email: ${answers.email}`,answers.topic?`Topic: ${answers.topic}`:'',answers.company?`Company: ${answers.company}`:'',answers.offer?`Interested in: ${answers.offer}`:'',answers.message].filter(Boolean).join('\n\n');
   const response=await request(env,CAL+'/calendars/'+calendar(env)+'/events?conferenceDataVersion=1&sendUpdates=all',{method:'POST',body:JSON.stringify({id,summary:(answers.topic?answers.topic+' — ':'Conversation with Mihail — ')+answers.name,description,start:{dateTime:startTime,timeZone},end:{dateTime:endTime,timeZone},attendees:[{email:answers.email,displayName:answers.name}],guestsCanInviteOthers:false,guestsCanModify:false,guestsCanSeeOtherGuests:false,conferenceData:{createRequest:{requestId:id,conferenceSolutionKey:{type:'hangoutsMeet'}}},extendedProperties:{private:{portfolioBooking:id}}})});
   if(response.status===409)return this.find(env,id);
   if(!response.ok){const error=Error('create_failed');error.definite=[400,401,403,404,422].includes(response.status);throw error;}return response.json();
  },
  async message(env,{id,answers}){
   const subject=(answers.subject==='hiring'?'Hiring inquiry':'Project inquiry')+' — '+(answers.topic||answers.name);
   const encodedSubject='=?UTF-8?B?'+base64(subject)+'?=';
   const body=[`Name: ${answers.name}`,`Email: ${answers.email}`,answers.topic?`Topic: ${answers.topic}`:'',`Company: ${answers.company||'Not specified'}`,answers.offer?`Interested in: ${answers.offer}`:'','',answers.message].join('\n');
   const mail=`From: ${env.BOOKING_HOST_EMAIL}\r\nTo: ${env.BOOKING_HOST_EMAIL}\r\nReply-To: ${answers.email}\r\nSubject: ${encodedSubject}\r\nMessage-ID: <${id}@portfolio.local>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64(body)}`;
   const raw=base64(mail).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
   const response=await request(env,'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',body:JSON.stringify({raw})});
   if(!response.ok){const error=Error('message_failed');error.definite=[400,401,403,404,422].includes(response.status);throw error;}const data=await response.json();if(!data.id)throw Error('message_failed');return {id:data.id};
  }
 };
}
export function meetingReceipt(event,startTime,endTime){
 if(!event?.id||event.status!=='confirmed')throw Error('not_confirmed');
 const entry=event.conferenceData?.entryPoints?.find(e=>e.entryPointType==='video')?.uri||event.hangoutLink||'';
 let meetUrl='';try{const url=new URL(entry);if(url.protocol==='https:'&&url.hostname==='meet.google.com'&&!url.username&&!url.password)meetUrl=url.href;}catch{}
 startTime=event.start?.dateTime||startTime;endTime=event.end?.dateTime||endTime;
 startTime=Number.isFinite(Date.parse(event.start?.dateTime))?new Date(event.start.dateTime).toISOString():startTime;endTime=Number.isFinite(Date.parse(event.end?.dateTime))?new Date(event.end.dateTime).toISOString():endTime;
 return {status:'confirmed',startTime,endTime,platform:'Google Meet',meetUrl,videoStatus:meetUrl?'ready':event.conferenceData?.createRequest?.status?.statusCode==='failure'?'unavailable':'pending'};
}
