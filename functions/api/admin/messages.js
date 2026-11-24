import {listMessages,actOnMessage} from '../../../lib/message-admin.js';
export const onRequest=({env,request})=>request.method==='GET'?listMessages(env,request):actOnMessage(env,request);
