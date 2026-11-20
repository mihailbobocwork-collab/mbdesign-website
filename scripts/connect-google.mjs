import http from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile,chmod} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),secretFile=path.join(root,'.dev.vars');
try{process.loadEnvFile(secretFile);}catch(error){if(error.code!=='ENOENT')throw error;}
const client=process.env.GOOGLE_CLIENT_ID,secret=process.env.GOOGLE_CLIENT_SECRET;
if(!client||!secret)throw Error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET privately in .dev.vars first.');
const port=4180,redirect=`http://localhost:${port}/google/callback`,state=randomBytes(32).toString('hex'),verifier=randomBytes(48).toString('base64url');
const scope=['openid','email','https://www.googleapis.com/auth/calendar.events.owned','https://www.googleapis.com/auth/calendar.freebusy','https://www.googleapis.com/auth/gmail.send'].join(' ');
const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
for(const [k,v] of Object.entries({client_id:client,redirect_uri:redirect,response_type:'code',scope,access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}))url.searchParams.set(k,v);
if(process.env.BOOKING_HOST_EMAIL)url.searchParams.set('login_hint',process.env.BOOKING_HOST_EMAIL);
const server=http.createServer(async(req,res)=>{
 const input=new URL(req.url,redirect);if(input.pathname!=='/google/callback'){res.writeHead(404).end();return;}
 if(input.searchParams.get('state')!==state){res.writeHead(400).end('The connection could not be verified. Return to the setup window.');return;}
 try{
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:client,client_secret:secret,redirect_uri:redirect,code:input.searchParams.get('code')||'',code_verifier:verifier,grant_type:'authorization_code'})});
  if(!response.ok)throw Error('Google connection failed.');const tokens=await response.json();if(!tokens.refresh_token)throw Error('No offline connection was returned.');
  const identity=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+tokens.access_token}});if(!identity.ok)throw Error('Account identity could not be checked.');const user=await identity.json();if(!user.email_verified||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email))throw Error('A verified Google email is required.');
  if(process.env.BOOKING_HOST_EMAIL&&user.email.toLowerCase()!==process.env.BOOKING_HOST_EMAIL.toLowerCase())throw Error('Use the configured owner account.');
  let contents='';try{contents=await readFile(secretFile,'utf8');}catch{}
  for(const [key,value] of Object.entries({GOOGLE_REFRESH_TOKEN:tokens.refresh_token,BOOKING_HOST_EMAIL:user.email,GOOGLE_CALENDAR_ID:user.email})){const line=key+'='+JSON.stringify(value);const pattern=new RegExp('^'+key+'=.*$','m');contents=pattern.test(contents)?contents.replace(pattern,()=>line):contents+'\n'+line;}
  await writeFile(secretFile,contents.trim()+'\n',{mode:0o600});await chmod(secretFile,0o600);
  res.writeHead(200,{'Content-Type':'text/plain','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}).end('Google Calendar, Google Meet, and inquiry delivery are connected. You can close this tab and restart the local website preview.');
  console.log('Google connection saved privately. No token was printed. Restart the local preview.');server.close();
 }catch{res.writeHead(400,{'Content-Type':'text/plain'}).end('The Google connection could not be completed. Return to setup and check the account configuration.');server.close();}
});
server.listen(port,'127.0.0.1',()=>{console.log('Open this Google consent link in your own browser to connect the account:');console.log(url.href);});
setTimeout(()=>server.close(),10*60*1000).unref();
