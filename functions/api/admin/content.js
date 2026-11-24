import {listContent,saveContent} from '../../../lib/content-admin.js';
export const onRequest=({env,request})=>request.method==='GET'?listContent(env,request):saveContent(env,request);
