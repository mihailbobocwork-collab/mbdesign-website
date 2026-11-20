import {callback,errorResponse} from '../lib/oauth.js';
export async function onRequestGet({env,request}){
  try{return await callback(env,request);}catch{return errorResponse('CMS sign-in could not be completed. Check configuration and try again.',503);}
}
