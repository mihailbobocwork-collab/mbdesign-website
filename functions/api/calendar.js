import {availability} from '../../lib/booking-api.js';
export const onRequest=({env,request})=>availability(env,request);
