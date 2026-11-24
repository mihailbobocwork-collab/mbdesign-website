import {listMeetings,decideMeeting} from '../../../lib/booking-admin.js';
export const onRequest=({env,request})=>request.method==='GET'?listMeetings(env,request):decideMeeting(env,request);
