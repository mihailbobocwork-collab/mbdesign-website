// Meeting requests: approve (Google sends the invite with a Meet link) or decline (the slot is
// freed and the guest gets a short note). Data comes from /api/admin/bookings, behind Cloudflare Access.
import {SUBJECTS, ENGAGEMENTS, budgetLabel} from '/assets/components/inquiry-details.js';

const api = '/api/admin/bookings' + (new URLSearchParams(location.search).has('sample') ? '?sample' : '');
const list = document.querySelector('[data-list]');
const status = document.querySelector('[data-status]');
const template = document.querySelector('#request-template');
const ownZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const waitingStates = new Set(['requested', 'approving', 'declining', 'uncertain']);
let meetings = [];
let filter = 'waiting';

const fmt = (iso, options, timeZone = ownZone) => new Intl.DateTimeFormat('en-GB', {timeZone, ...options}).format(new Date(iso));
const ago = iso => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
};
const group = meeting => {
  if (waitingStates.has(meeting.status)) return 'waiting';
  if (meeting.status === 'confirmed' && Date.parse(meeting.endTime) > Date.now()) return 'upcoming';
  return 'past';
};
const stateLabel = meeting => ({
  requested: Date.parse(meeting.startTime) <= Date.now() ? 'Time passed' : 'Waiting',
  approving: 'Sending invite…', declining: 'Declining…', uncertain: 'Check calendar',
  confirmed: Date.parse(meeting.endTime) > Date.now() ? 'Confirmed' : 'Done', declined: 'Declined'
})[meeting.status] || meeting.status;

function render() {
  const groups = {waiting: [], upcoming: [], past: []};
  const byTime = [...meetings].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  for (const meeting of byTime) groups[group(meeting)].push(meeting);
  groups.past.reverse();
  for (const [key, items] of Object.entries(groups)) document.querySelector(`[data-filter-count="${key}"]`).textContent = items.length || '';
  const waiting = document.querySelector('[data-waiting-count]');
  waiting.textContent = groups.waiting.length;
  waiting.hidden = !groups.waiting.length;
  document.title = (groups.waiting.length ? `(${groups.waiting.length}) ` : '') + 'Admin · Mihai Boboc';
  const items = groups[filter];
  list.replaceChildren(...items.map(card));
  status.classList.toggle('is-empty', !items.length);
  status.textContent = items.length ? '' : {
    waiting: 'No requests waiting. New ones appear here, and you’ll get an email too.',
    upcoming: 'No confirmed meetings coming up.',
    past: 'Nothing here yet.'
  }[filter];
}

function card(meeting) {
  const item = template.content.firstElementChild.cloneNode(true);
  const q = selector => item.querySelector(selector);
  const answers = meeting.answers || {};
  item.dataset.status = meeting.status;
  item.dataset.id = meeting.id;
  q('.request-day').textContent = fmt(meeting.startTime, {weekday: 'short', day: 'numeric', month: 'short'});
  q('.request-time').textContent = fmt(meeting.startTime, {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}) + '–' + fmt(meeting.endTime, {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
  const guestZone = meeting.timeZone && meeting.timeZone !== ownZone
    ? `Guest: ${fmt(meeting.startTime, {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}, meeting.timeZone)} ${meeting.timeZone.split('/').pop().replace(/_/g, ' ')}`
    : '';
  q('.request-zone').textContent = [`Requested ${ago(meeting.requestedAt)}`, guestZone].filter(Boolean).join(' · ');
  q('.request-name').textContent = answers.name || answers.email || 'Guest';
  const email = q('.request-email');
  if (answers.email) { email.textContent = answers.email; email.href = 'mailto:' + answers.email; } else email.remove();
  q('.request-company').textContent = answers.company || '';
  q('.request-state').textContent = stateLabel(meeting);

  const facts = [
    ['Topic', SUBJECTS.find(s => s.id === answers.subject)?.label || answers.topic],
    ['Working together', ENGAGEMENTS.find(e => e.id === answers.engagement)?.label],
    ['Budget', budgetLabel(answers)]
  ].filter(([, value]) => value);
  q('.request-facts').replaceChildren(...facts.map(([label, value]) => {
    const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = value; row.append(dt, dd); return row;
  }));
  const message = q('.request-message');
  message.textContent = answers.message || (meeting.answers ? '' : 'Details aren’t available for this booking. Check Google Calendar.');
  if (message.textContent.length > 260) {
    message.classList.add('is-clamped');
    const more = q('.request-more');
    more.hidden = false;
    more.addEventListener('click', () => { const open = message.classList.toggle('is-clamped'); more.textContent = open ? 'Read more' : 'Show less'; });
  }

  const outcome = q('.request-outcome');
  if (meeting.status === 'confirmed') {
    outcome.append('Invite sent' + (meeting.decision?.at ? ' ' + ago(new Date(meeting.decision.at).toISOString()) : '') + '. ');
    if (meeting.meetUrl) { const link = document.createElement('a'); link.href = meeting.meetUrl; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Open Google Meet'; outcome.append(link); }
  } else if (meeting.status === 'declined') {
    outcome.textContent = 'Declined' + (meeting.decision?.note ? `: “${meeting.decision.note}”` : '. The guest was emailed.');
  } else if (meeting.status === 'uncertain') {
    outcome.textContent = 'The calendar hold may not have been created. Check Google Calendar before answering.';
  }

  const actions = q('.request-body > .request-actions');
  const approve = q('[data-action=approve]');
  const decline = q('[data-action=decline]');
  const form = q('.request-decline');
  if (meeting.status !== 'requested') actions.replaceChildren();
  else if (Date.parse(meeting.startTime) <= Date.now()) approve.remove();
  approve?.addEventListener('click', () => act(item, meeting, 'approve', approve));
  decline?.addEventListener('click', () => {
    actions.hidden = true; form.hidden = false; form.querySelector('textarea').focus();
  });
  form.querySelector('[data-cancel]').addEventListener('click', () => { form.hidden = true; actions.hidden = false; decline.focus(); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    act(item, meeting, 'decline', form.querySelector('[type=submit]'), form.querySelector('textarea').value);
  });
  return item;
}

async function act(item, meeting, action, button, note = '') {
  const error = item.querySelector('.request-error');
  const label = button.textContent;
  error.textContent = '';
  for (const control of item.querySelectorAll('button, textarea')) control.disabled = true;
  button.textContent = action === 'approve' ? 'Sending invite…' : 'Declining…';
  try {
    const response = await fetch(api, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: meeting.id, action, note})});
    const result = await response.json().catch(() => ({}));
    if (result.meeting) {
      Object.assign(meeting, result.meeting);
      if (group(meeting) !== filter && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        item.classList.add('is-leaving');
        await new Promise(resolve => item.addEventListener('animationend', resolve, {once: true}));
      }
      render();
      if (!response.ok && result.message) status.textContent = result.message;
      return;
    }
    throw Object.assign(Error(), {message: response.status === 401 ? 'Your sign-in has expired. Reload the page to sign in again.' : result.message});
  } catch (failure) {
    error.textContent = failure.message || 'That couldn’t be completed. Please try again.';
    for (const control of item.querySelectorAll('button, textarea')) control.disabled = false;
    button.textContent = label;
  }
}

for (const tab of document.querySelectorAll('[data-filter]')) {
  tab.addEventListener('click', () => {
    filter = tab.dataset.filter;
    for (const other of document.querySelectorAll('[data-filter]')) other.setAttribute('aria-selected', String(other === tab));
    render();
  });
}

async function load() {
  try {
    const response = await fetch(api, {cache: 'no-store'});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      status.textContent = response.status === 401 && (!result.reason || ['no_token', 'expired'].includes(result.reason))
        ? 'Your sign-in has expired. Reload the page to sign in again.'
        : result.message || 'Requests couldn’t be loaded. Please try again.';
      return;
    }
    meetings = result.meetings || [];
    document.querySelector('[data-sample]').hidden = !result.sample;
    document.querySelector('[data-who]').textContent = result.signedInAs ? 'Signed in as ' + result.signedInAs : '';
    render();
  } catch {
    status.textContent = 'Requests couldn’t be loaded. Check your connection and reload.';
  }
}
load();
// Keep the list current while the tab is open.
document.addEventListener('visibilitychange', () => { if (!document.hidden && !document.querySelector('.request-decline:not([hidden])')) load(); });
