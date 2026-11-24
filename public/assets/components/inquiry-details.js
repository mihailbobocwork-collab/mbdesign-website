import COPY from './inquiry-copy.js';
// The ids are fixed (stored with every request); the labels come from content/inquiry.json.
export {COPY};
const subject=(id,label)=>({id,label,prompt:`I’d like to discuss a ${label.toLowerCase()} project.`});
export const SUBJECTS = [
  subject('product',COPY.subjectProduct),
  subject('graphic',COPY.subjectGraphic),
  subject('brand',COPY.subjectBrand)
];

export const ENGAGEMENTS = [
  {id:'partnership',label:COPY.engagementPartnership},
  {id:'project',label:COPY.engagementProject}
];

export const BUDGET_RANGES = [
  {id:'under-1000',label:COPY.budgetUnder1000},
  {id:'1000-2999',label:COPY.budget1000},
  {id:'3000-4999',label:COPY.budget3000},
  {id:'5000-9999',label:COPY.budget5000},
  {id:'10000-plus',label:COPY.budget10000},
  {id:'unsure',label:COPY.budgetUnsure}
];

export function budgetLabel({budget,engagement}) {
  const option=BUDGET_RANGES.find(range=>range.id===budget);
  if(!option)return '';
  return engagement==='partnership'&&budget!=='unsure'?option.label+' per month':option.label;
}

export function emailError(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? '' : 'Enter a valid email address.';
}

export function topicFromMessage(message) {
  return Array.from(message.trim().split(/[\r\n]/,1)[0].replace(/[\u0000-\u001f]/g,' ').trim()).slice(0,200).join('');
}

export function formatMeeting(selection) {
  const when=new Intl.DateTimeFormat('en-GB',{
    dateStyle:'full',timeStyle:'short',timeZone:selection.timeZone
  }).format(new Date(selection.startTime));
  return `${when} · ${selection.timeZone} · Google Meet`;
}
