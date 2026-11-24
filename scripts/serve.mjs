import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {availability,submit} from '../lib/booking-api.js';
import {listMeetings,decideMeeting} from '../lib/booking-admin.js';
import {listMessages,actOnMessage} from '../lib/message-admin.js';
import {localBookingDB} from './local-booking-db.mjs';
import {localPreviewHTML} from '../lib/local-preview.js';
import {createContentAdmin} from '../lib/content-admin.js';
import {localContentFiles} from './local-content-files.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const build=()=>spawnSync(process.execPath,[path.join(root,'scripts/build.mjs')],{stdio:'inherit'});const built=build();if(built.status!==0)process.exit(built.status||1);
// The local admin saves content into this folder and rebuilds, instead of committing to GitHub.
const content=createContentAdmin({localStore:localContentFiles(root,{afterWrite:()=>{if(build().status!==0)throw Object.assign(Error('build'),{code:'unavailable'});}})});
try{process.loadEnvFile(path.join(root,'.dev.vars'));}catch(error){if(error.code!=='ENOENT')throw error;}
const bookingEnv={...process.env,BOOKING_LOCAL:'true',BOOKING_DB:localBookingDB(root)};
const dist=path.join(root,'dist');const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.yml':'text/yaml','.xml':'application/xml','.txt':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://'+(req.headers.host||'127.0.0.1:'+port));if(['/pricing','/pricing/','/playground','/playground/'].includes(url.pathname)||url.pathname.startsWith('/playground/')){res.writeHead(302,{Location:'/'}).end();return;}if(url.pathname==='/work'||url.pathname==='/work/'){res.writeHead(302,{Location:'/#work'}).end();return;}if(['/api/calendar','/api/bookings','/api/admin/bookings','/api/admin/messages','/api/admin/content','/api/admin/history'].includes(url.pathname)){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>(url.pathname==='/api/admin/content'?40e6:16000)){res.writeHead(413).end();return;}chunks.push(chunk);}const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);const request=new Request(url,{method:req.method,headers,...(req.method==='GET'?{}:{body:Buffer.concat(chunks)})});const handler=url.pathname==='/api/admin/history'?(req.method==='GET'?content.history:content.undo):url.pathname==='/api/admin/messages'?(req.method==='GET'?listMessages:actOnMessage):url.pathname==='/api/admin/content'?(req.method==='GET'?content.list:content.save):url.pathname==='/api/calendar'?availability:url.pathname==='/api/admin/bookings'?(req.method==='GET'?listMeetings:decideMeeting):submit;const response=await handler(bookingEnv,request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;}let pathname=decodeURIComponent(url.pathname);let file=path.resolve(dist,'.'+pathname);if(!file.startsWith(dist+path.sep)&&file!==dist){res.writeHead(403).end();return;}let info;try{info=await stat(file);}catch{}if(info?.isDirectory())file=path.join(file,'index.html');let data;try{data=await readFile(file);}catch{data=await readFile(path.join(dist,'404.html'));res.statusCode=404;}if(path.extname(file)==='.html')data=localPreviewHTML(data.toString('utf8'),bookingEnv);res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);}catch{res.writeHead(400).end('Bad request');}});
server.listen(port,'127.0.0.1',()=>console.log(`Local preview: http://127.0.0.1:${port}`));
