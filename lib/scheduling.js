export const MINUTE=60000,DAY=86400000;
export function bookingSettings(raw){
 const n=(key,min,max)=>{const v=Number(raw[key]);if(!Number.isInteger(v)||v<min||v>max)throw Error('Invalid booking settings');return v;};
 const settings={timeZone:String(raw.timeZone),durationMinutes:n('durationMinutes',15,120),stepMinutes:n('stepMinutes',15,60),bufferMinutes:n('bufferMinutes',0,60),noticeHours:n('noticeHours',1,168),horizonDays:n('horizonDays',1,180)};
 if(![15,30,60].includes(settings.stepMinutes))throw Error('Invalid spacing');new Intl.DateTimeFormat('en-GB',{timeZone:settings.timeZone});settings.weekdays=raw.weekdays.map(Number);if(!settings.weekdays.length||settings.weekdays.some(d=>!Number.isInteger(d)||d<1||d>7))throw Error('Invalid weekdays');
 settings.windows=String(raw.workingHours).split(',').map(range=>{const match=range.trim().match(/^(\d\d):(\d\d)-(\d\d):(\d\d)$/);if(!match)throw Error('Invalid hours');const [a,b,c,d]=match.slice(1).map(Number),start=a*60+b,end=c*60+d;if(a>23||c>23||b>59||d>59||end<=start)throw Error('Invalid hours');return {start,end};});
 settings.blockedDates=Array.isArray(raw.blockedDates)?raw.blockedDates.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)):[];return settings;
}
export function monthRange(month,now=Date.now()){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||''))return null;const [y,m]=month.split('-').map(Number),current=new Date(now),delta=y*12+m-1-(current.getUTCFullYear()*12+current.getUTCMonth());if(delta < -1||delta>6)return null;
 const start=Math.max(now,Date.UTC(y,m-1,1)-DAY),end=Date.UTC(y,m,1)+DAY;return end>start?{start,end}:null;
}
export function overlaps(start,end,busy){return busy.some(b=>start<b.end&&end>b.start);}
export function availableSlots({start,end,settings,busy=[],now=Date.now()}){
 const slots=[],format=new Intl.DateTimeFormat('en-GB',{timeZone:settings.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),step=settings.stepMinutes*MINUTE,duration=settings.durationMinutes*MINUTE,buffer=settings.bufferMinutes*MINUTE;
 const scan=15*MINUTE,first=Math.ceil(Math.max(start,now+settings.noticeHours*60*MINUTE)/scan)*scan,last=Math.min(end,now+settings.horizonDays*DAY);
 for(let stamp=first;stamp+duration<=last;stamp+=scan){
  const p=Object.fromEntries(format.formatToParts(new Date(stamp)).map(v=>[v.type,v.value])),day=`${p.year}-${p.month}-${p.day}`,minute=Number(p.hour)*60+Number(p.minute),weekday=new Date(day+'T12:00:00Z').getUTCDay()||7;
  if(minute%settings.stepMinutes!==0||!settings.weekdays.includes(weekday)||settings.blockedDates.includes(day)||!settings.windows.some(w=>minute>=w.start&&minute+settings.durationMinutes<=w.end))continue;
  if(!overlaps(stamp-buffer,stamp+duration+buffer,busy))slots.push({startTime:new Date(stamp).toISOString(),endTime:new Date(stamp+duration).toISOString()});
 }return slots;
}
