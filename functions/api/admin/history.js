import {contentHistory,undoChange} from '../../../lib/content-admin.js';
export const onRequest=({env,request})=>request.method==='GET'?contentHistory(env,request):undoChange(env,request);
