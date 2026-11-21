export const SUBJECTS = [
  {id:'product',label:'Product Design',prompt:'I’d like to discuss a product design project.'},
  {id:'graphic',label:'Graphic Design',prompt:'I’d like to discuss a graphic design project.'},
  {id:'brand',label:'Brand Identity',prompt:'I’d like to discuss a brand identity project.'}
];

export const ENGAGEMENTS = [
  {id:'partnership',label:'Long-term partnership'},
  {id:'project',label:'Project-based'}
];

export const BUDGET_RANGES = [
  {id:'under-1000',label:'Under €1,000'},
  {id:'1000-2999',label:'€1,000–€2,999'},
  {id:'3000-4999',label:'€3,000–€4,999'},
  {id:'5000-9999',label:'€5,000–€9,999'},
  {id:'10000-plus',label:'€10,000+'},
  {id:'unsure',label:'Not sure yet'}
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
