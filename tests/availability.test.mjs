import test from 'node:test';
import assert from 'node:assert/strict';
import {zonedDay,groupSlots,monthGrid,slotTimeLabel,MeetingCalendar} from '../public/assets/components/meeting-calendar.js';
test('The calendar groups UTC slots in the visitor time zone and disambiguates repeated daylight-saving times',()=>{
 assert.equal(zonedDay('2026-11-19T23:30:00Z','Europe/Chisinau'),'2026-11-20');
 const values=[{startTime:'2026-11-19T23:30:00Z'},{startTime:'2026-11-20T10:00:00Z'}];assert.equal(groupSlots(values,'Europe/Chisinau','2026-11').get('2026-11-20').length,2);
 assert.deepEqual(monthGrid('2028-02'),{year:2028,month:1,offset:1,days:29});
 const repeated=[{startTime:'2026-11-01T05:30:00Z'},{startTime:'2026-11-01T06:30:00Z'}];
 assert.notEqual(slotTimeLabel(repeated[0].startTime,'America/New_York',repeated),slotTimeLabel(repeated[1].startTime,'America/New_York',repeated));
});
test('Failed live loading shows no sample availability; stale month responses cannot overwrite newer choices',async()=>{
 const instance=new MeetingCalendar({element:{},fetcher:async()=>new Response('',{status:503})});instance.render=()=>{};
 await instance.mount();assert.equal(instance.state,'unavailable');assert.deepEqual(instance.slots,[]);
 const pending=[];instance.fetcher=()=>new Promise(resolve=>pending.push(resolve));const first=instance.load();instance.month='2026-12';const second=instance.load();
 pending[1](Response.json({slots:[]}));await second;pending[0](Response.json({slots:[{startTime:new Date(Date.now()+86400000).toISOString(),endTime:new Date(Date.now()+88200000).toISOString()}]}));await first;
 assert.equal(instance.month,'2026-12');assert.deepEqual(instance.slots,[]);instance.destroy();
});

test('A calendar selection hands details to the final review without booking or rendering another confirmation',()=>{let selected,calls=0;const slot={startTime:'2026-12-02T08:00:00.000Z',endTime:'2026-12-02T08:30:00.000Z'};const calendar=new MeetingCalendar({element:{replaceChildren(){throw Error('No intermediate review');}},onSelect:value=>selected=value,onBooked:()=>calls++});calendar.slots=[slot];calendar.selectedTime=slot.startTime;calendar.timeZone='Europe/Chisinau';calendar.duration=30;calendar.selectTime();assert.deepEqual(selected,{...slot,timeZone:'Europe/Chisinau',durationMinutes:30});assert.equal(calls,0);});
test('Returning from final review restores the selected day, time and time zone only if still available',async()=>{const startTime=new Date(Date.now()+3*86400000).toISOString(),endTime=new Date(Date.parse(startTime)+1800000).toISOString(),selection={startTime,endTime,timeZone:'America/New_York'};const calendar=new MeetingCalendar({element:{},selection,fetcher:async()=>Response.json({slots:[{startTime,endTime}]})});calendar.render=()=>{};await calendar.mount();assert.equal(calendar.timeZone,selection.timeZone);assert.equal(calendar.selectedTime,startTime);assert.equal(calendar.selectedDay,zonedDay(startTime,selection.timeZone));calendar.fetcher=async()=>Response.json({slots:[]});await calendar.load();assert.equal(calendar.selectedTime,'');});

test('A previous selection from an adjacent month cannot appear as the current month’s chosen time',async()=>{const year=new Date().getUTCFullYear()+1,startTime=`${year}-01-31T23:30:00.000Z`,endTime=`${year}-02-01T00:00:00.000Z`,selection={startTime,endTime,timeZone:'UTC'};const calendar=new MeetingCalendar({element:{},selection,fetcher:async()=>Response.json({slots:[{startTime,endTime}]})});calendar.timeZone='UTC';calendar.month=`${year}-02`;calendar.render=()=>{};await calendar.load();assert.equal(calendar.selectedTime,'');});
