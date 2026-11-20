import {submit} from '../../lib/booking-api.js';
export const onRequest=({env,request})=>submit(env,request);
