import {BookingAction} from './booking-action.js';
import {MeetingCalendar} from './meeting-calendar.js';
import {emailError, formatMeeting, topicFromMessage} from './inquiry-details.js';
import {messageLimitError} from './message-editor.js';

const form = document.querySelector('#inquiry-form');
const modes = [...document.querySelectorAll('[data-contact-mode]')];
const panels = Object.fromEntries([...form.querySelectorAll('[data-contact-panel]')]
  .map(panel => [panel.dataset.contactPanel, panel]));
const {message, email} = form.elements;
const calendarSlot = form.querySelector('#contact-booking');
const review = form.querySelector('#inquiry-preview');
const status = form.querySelector('#contact-send-status');
const confirm = form.querySelector('#inquiry-send');
const preview = document.body.dataset.localBookingPreview === 'true';
const safeTopic = value => topicFromMessage(value || '');
const params = new URLSearchParams(location.search);
const caseSlug = params.get('case-study');
const caseRequest = /^[a-z0-9-]{1,80}$/.test(caseSlug || '');
const caseName = caseRequest ? safeTopic(params.get('project') || caseSlug.replaceAll('-', ' ')).slice(0, 100) : '';
const initialTopic = caseName ? caseName + ' case study request' : safeTopic(params.get('topic'));
let offer = '';
let mode = 'message', screen = 'message', calendar, selection, action, downloadUrl;

if (caseName) {
  const note = form.querySelector('.case-request-context');
  note.hidden = false;
  note.textContent = `You’re asking about the ${caseName} case study.`;
}
if (params.has('offer')) {
  fetch('/assets/offers.json').then(response => response.json()).then(offers => {
    offer = offers.find(option => option.id === params.get('offer'))?.name || '';
  }).catch(() => {});
}

function show(panel, focus = true) {
  calendar?.destroy();
  calendar = null;
  action?.destroy();
  action = null;
  screen = panel;
  for (const [name, element] of Object.entries(panels)) element.hidden = name !== screen;
  if (!focus) return;
  const heading = panels[screen].querySelector('h2') || panels[screen].querySelector('label');
  heading.tabIndex = -1;
  heading.focus({preventScroll: true});
  heading.scrollIntoView({block: 'nearest'});
}

function chooseTime(focus = true) {
  show('calendar', focus);
  calendar = new MeetingCalendar({
    element: calendarSlot, selection, preview,
    onSelect: time => { selection = time; askEmail(); }
  });
  calendar.mount();
}

function askEmail() {
  form.querySelector('#contact-email-help').textContent = mode === 'meeting'
    ? 'I’ll send your Google Meet invitation to this address.'
    : 'I’ll use this address to reply to your message.';
  show('email');
}

function showError(field, error = '') {
  const note = form.querySelector('#' + field.id + '-error');
  note.textContent = error;
  note.hidden = !error;
  field.setAttribute('aria-invalid', String(Boolean(error)));
  if (error) field.focus();
}

function confirmed(receipt) {
  modes[0].closest('.contact-modes').hidden = true;
  const meeting = receipt.kind === 'meeting';
  panels.complete.querySelector('h2').textContent = receipt.preview
    ? 'Preview complete.' : meeting ? 'You’re booked.' : 'Thanks for reaching out.';
  const receiptText = receipt.preview ? 'No message, event or invitation was created.' : meeting
    ? receipt.emailStatus === 'accepted' ? 'Your Google Meet invitation and confirmation are on their way.' : 'Your meeting is saved. Keep the details below for reference.'
    : 'Your message has been delivered.';
  form.querySelector('#contact-receipt').textContent = receipt.startTime && selection
    ? receiptText + ' ' + formatMeeting({...selection, startTime: receipt.startTime}) : receiptText;
  const link = form.querySelector('#contact-meet-link');
  if (receipt.meetUrl) { link.href = receipt.meetUrl; link.hidden = false; }
  show('complete');
}

function showReview() {
  const meeting = mode === 'meeting';
  const context = meeting ? '' : message.value.trim();
  const answers = {
    name: '', company: '', subject: '', email: email.value.trim(),
    topic: initialTopic || offer || topicFromMessage(context) || (meeting ? 'Discovery call with Mihail' : 'Design inquiry'),
    offer, message: context
  };

  show('review');
  const details = [['Email', answers.email]];
  if (meeting) details.push(['When', formatMeeting(selection)]);
  if (initialTopic || offer) details.push(['Topic', answers.topic]);
  if (context) details.push(['Your message', context]);
  review.replaceChildren();
  for (const [label, value] of details) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    review.append(row);
  }
  form.querySelector('#delivery-note').textContent = meeting
    ? 'Confirm to book this time and receive your invitation.'
    : 'Check your details before sending.';
  form.querySelector('#inquiry-book').hidden = !meeting;
  form.querySelector('#inquiry-edit').hidden = meeting;
  confirm.textContent = preview ? 'Confirm preview' : meeting ? 'Confirm meeting' : 'Send message';
  status.textContent = '';
  action = new BookingAction({
    button: confirm, status, challenge: form.querySelector('#contact-verification'),
    siteKey: form.dataset.turnstileSiteKey, preview,
    body: {kind: mode, answers, timeZone: meeting ? selection.timeZone : Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(meeting ? {startTime: selection.startTime} : {})},
    onSuccess: confirmed
  });
}

for (const button of modes) button.addEventListener('click', () => {
  if (button.dataset.contactMode === mode) return;
  mode = button.dataset.contactMode;
  for (const item of modes) item.setAttribute('aria-pressed', String(item === button));
  if (mode === 'meeting') chooseTime(false);
  else show('message', false);
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (screen === 'message') {
    const error = messageLimitError(message.value) || (message.value.trim().length < 20 ? 'Write a message of at least 20 characters.' : '');
    if (error) showError(message, error);
    else askEmail();
  } else if (screen === 'email') {
    const error = emailError(email.value);
    if (error) showError(email, error);
    else showReview();
  }
});
for (const field of [message, email]) field.addEventListener('input', () => showError(field));
panels.email.querySelector('[data-contact-back]').addEventListener('click', () => {
  if (mode === 'meeting') chooseTime();
  else show('message');
});
panels.review.querySelector('[data-contact-back]').addEventListener('click', askEmail);
form.querySelector('#inquiry-book').addEventListener('click', () => chooseTime());
form.querySelector('#inquiry-edit').addEventListener('click', () => show('message'));
form.querySelector('#inquiry-download').addEventListener('click', () => {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  const details = [...review.children].map(row => row.firstChild.textContent + ': ' + row.lastChild.textContent).join('\n\n');
  downloadUrl = URL.createObjectURL(new Blob([details], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = 'project-inquiry.txt';
  link.click();
});
form.addEventListener('meeting-busy', event => {
  for (const button of [...modes, ...panels.review.querySelectorAll('button:not(#inquiry-send)')]) {
    button.disabled = event.detail;
  }
});
window.addEventListener('pagehide', event => {
  if (!event.persisted) { calendar?.destroy(); action?.destroy(); }
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
});
