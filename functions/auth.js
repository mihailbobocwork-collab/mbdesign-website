import {authorization,errorResponse} from '../lib/oauth.js';
export async function onRequestGet({env,request}){
  try{return await authorization(env,request);}catch{return errorResponse('CMS sign-in is unavailable. Check the server configuration described in README.md.',503);}
}
