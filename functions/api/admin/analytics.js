import {analytics} from '../../../lib/analytics-admin.js';
export const onRequest=({env,request})=>analytics(env,request);
