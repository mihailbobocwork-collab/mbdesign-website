// Messages inbox: a list on the left, the open message on the right (one at a time on phones).
// Opening a message marks it read; replies are emailed to the sender from the public address.
import {SUBJECTS, ENGAGEMENTS, budgetLabel} from '/assets/components/inquiry-details.js';
import {setUnread} from '/admin/shell.js';

const api = '/api/admin/messages' + (new URLSearchParams(location.search).has('sample') ? '?sample' : '');
const inbox = document.querySelector('[data-inbox]');
const list = document.querySelector('[data-list]');
const reader = document.querySelector('[data-reader]');
const status = document.querySelector('[data-status]');
const drafts = new Map();
let messages = [];
let filter = 'all';
let openId = '';
let replyFrom = '';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const who = message => message.answers?.name || message.answers?.company || message.answers?.email || 'Unknown sender';
const firstName = message => (message.answers?.name || '').split(/\s+/)[0] || message.answers?.email || 'them';
const topicOf = message => SUBJECTS.find(s => s.id === message.answers?.subject)?.label || message.answers?.topic || '';
const when = iso => {
  const date = new Date(iso), now = new Date();
  const minutes = Math.round((now - date) / 60000);
  if (minutes < 60) return minutes <= 1 ? 'Just now' : `${minutes} min ago`;
  if (date.toDateString() === now.toDateString()) return new Intl.DateTimeFormat('en-GB', {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(date);
  const days = Math.round((now - date) / 86400000);
  return new Intl.DateTimeFormat('en-GB', days < 7 ? {weekday: 'short'} : {day: 'numeric', month: 'short'}).format(date);
};
const fullDate = iso => new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(iso));
const replyId = () => crypto.randomUUID();

async function send(payload) {
  const response = await fetch(api, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(Error(), {message: response.status === 401 ? 'Your sign-in has expired. Reload the page to sign in again.' : result.message || 'That couldn’t be completed. Please try again.'});
  return result;
}
const replace = next => { messages = messages.map(message => message.id === next.id ? next : message); };

function renderList() {
  const unread = messages.filter(message => !message.read).length;
  setUnread(unread);
  document.querySelector('[data-filter-count="all"]').textContent = messages.length || '';
  document.querySelector('[data-filter-count="unread"]').textContent = unread || '';
  document.title = (unread ? `(${unread}) ` : '') + 'Messages · Admin · Mihai Boboc';
  const shown = messages.filter(message => filter === 'all' || !message.read || message.id === openId);
  list.replaceChildren(...shown.map(message => {
    const item = el('li');
    const button = el('button', 'inbox-item' + (message.read ? '' : ' is-unread'));
    button.type = 'button';
    if (message.id === openId) button.setAttribute('aria-current', 'true');
    const top = el('span', 'inbox-item-top');
    top.append(el('strong', '', who(message)), el('time', '', when(message.receivedAt)));
    const topic = el('span', 'inbox-item-topic', [topicOf(message), message.replies.length ? `Replied${message.replies.length > 1 ? ` ×${message.replies.length}` : ''}` : ''].filter(Boolean).join(' · '));
    const snippet = el('span', 'inbox-item-snippet', message.answers?.message || 'Details aren’t available for this message.');
    button.append(top, topic, snippet);
    if (!message.read) button.prepend(Object.assign(el('span', 'inbox-dot'), {ariaLabel: 'Unread'}));
    button.addEventListener('click', () => open(message.id));
    item.append(button);
    return item;
  }));
  status.classList.toggle('is-empty', !shown.length && !openId);
  status.textContent = shown.length ? '' : filter === 'unread' ? 'You’re all caught up.' : 'No messages yet. Messages sent from the website appear here, and you’ll get an email too.';
  inbox.hidden = !messages.length;
}

function renderReader() {
  const message = messages.find(item => item.id === openId);
  inbox.classList.toggle('is-reading', Boolean(message));
  if (!message) { reader.replaceChildren(el('p', 'inbox-empty', messages.length ? 'Choose a message to read it.' : '')); return; }
  const answers = message.answers || {};
  const back = el('button', 'inbox-back', '← All messages');
  back.type = 'button';
  back.addEventListener('click', () => { history.replaceState(null, '', location.pathname + location.search); openId = ''; renderList(); renderReader(); list.querySelector('button')?.focus(); });

  const head = el('header', 'inbox-head');
  const title = el('div');
  title.append(el('h2', '', who(message)));
  const contact = el('p', 'request-contact');
  if (answers.email) { const link = el('a', 'request-email', answers.email); link.href = 'mailto:' + answers.email; contact.append(link); }
  if (answers.company && answers.name) contact.append(el('span', 'request-company', answers.company));
  title.append(contact);
  head.append(title, el('time', 'inbox-date', fullDate(message.receivedAt)));

  const facts = [
    ['Topic', topicOf(message)],
    ['Working together', ENGAGEMENTS.find(e => e.id === answers.engagement)?.label],
    ['Budget', budgetLabel(answers)]
  ].filter(([, value]) => value);
  const factList = el('dl', 'request-facts');
  factList.append(...facts.map(([label, value]) => { const row = el('div'); row.append(el('dt', '', label), el('dd', '', value)); return row; }));

  const body = el('p', 'inbox-body', answers.message || 'Details aren’t available for this message. It was received before the inbox was added; check your email.');
  const thread = el('ol', 'inbox-thread');
  thread.append(...message.replies.map(reply => {
    const item = el('li', 'inbox-reply');
    item.append(el('p', 'inbox-reply-meta', `You replied · ${fullDate(reply.at)}`), el('p', 'inbox-reply-body', reply.body));
    return item;
  }));

  const tools = el('div', 'inbox-tools');
  const toggleRead = el('button', 'admin-button quiet', message.read ? 'Mark as unread' : 'Mark as read');
  const remove = el('button', 'admin-button quiet', 'Delete');
  toggleRead.type = remove.type = 'button';
  toggleRead.addEventListener('click', async () => {
    toggleRead.disabled = true;
    try { replace((await send({id: message.id, action: message.read ? 'unread' : 'read'})).message); renderList(); renderReader(); }
    catch (failure) { error.textContent = failure.message; toggleRead.disabled = false; }
  });
  const confirm = el('div', 'inbox-confirm');
  confirm.hidden = true;
  const sure = el('button', 'admin-button danger', 'Delete message');
  const keep = el('button', 'admin-button quiet', 'Keep it');
  sure.type = keep.type = 'button';
  confirm.append(el('p', '', 'Delete this message? This can’t be undone.'), sure, keep);
  remove.addEventListener('click', () => { confirm.hidden = false; tools.hidden = true; keep.focus(); });
  keep.addEventListener('click', () => { confirm.hidden = true; tools.hidden = false; remove.focus(); });
  sure.addEventListener('click', async () => {
    sure.disabled = keep.disabled = true;
    try {
      await send({id: message.id, action: 'delete'});
      const index = messages.findIndex(item => item.id === message.id);
      messages.splice(index, 1);
      drafts.delete(message.id);
      openId = '';
      history.replaceState(null, '', location.pathname + location.search);
      renderList(); renderReader();
      status.textContent = messages.length ? '' : status.textContent;
      list.querySelectorAll('button')[Math.min(index, messages.length - 1)]?.focus();
    } catch (failure) { error.textContent = failure.message; sure.disabled = keep.disabled = false; }
  });
  tools.append(toggleRead, remove);

  const form = el('form', 'inbox-compose');
  const label = el('label', 'content-label', answers.email ? `Reply to ${firstName(message)}` : 'No email address to reply to');
  const text = el('textarea', 'content-input');
  text.id = 'reply-text'; label.htmlFor = text.id;
  text.rows = 6; text.maxLength = 5000; text.disabled = !answers.email;
  text.placeholder = answers.name ? `Hi ${firstName(message)},` : 'Hi,';
  text.value = drafts.get(message.id)?.text || '';
  const hint = el('p', 'content-hint', answers.email ? `Sent by email from ${replyFrom || 'your public address'} to ${answers.email}, with their message quoted below yours.` : '');
  const error = el('p', 'request-error');
  error.setAttribute('role', 'alert');
  const submit = el('button', 'admin-button primary', 'Send reply');
  submit.type = 'submit';
  submit.disabled = !text.value.trim();
  text.addEventListener('input', () => {
    const draft = drafts.get(message.id) || {id: replyId()};
    drafts.set(message.id, {...draft, text: text.value});
    submit.disabled = !text.value.trim();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!text.value.trim()) return;
    // The same id for every retry of this draft, so a double click can't send twice.
    const draft = drafts.get(message.id) || {id: replyId(), text: text.value};
    drafts.set(message.id, draft);
    submit.disabled = text.disabled = true;
    submit.textContent = 'Sending…';
    error.textContent = '';
    try {
      replace((await send({id: message.id, action: 'reply', body: text.value, replyId: draft.id})).message);
      drafts.delete(message.id);
      renderList(); renderReader();
      reader.querySelector('.inbox-reply:last-child')?.classList.add('is-new');
      reader.querySelector('.inbox-sent').textContent = `Reply sent to ${answers.email}.`;
    } catch (failure) {
      error.textContent = failure.message;
      submit.disabled = text.disabled = false;
      submit.textContent = 'Send reply';
    }
  });
  const actions = el('div', 'inbox-compose-actions');
  actions.append(el('p', 'inbox-sent'), submit);
  form.append(label, text, hint, error, actions);
  if (!answers.email) form.hidden = true;

  const top = el('div', 'inbox-reader-top');
  top.append(back, tools, confirm);
  reader.replaceChildren(top, head, factList, body, thread, form);
}

async function open(id) {
  openId = id;
  history.replaceState(null, '', location.pathname + location.search + '#' + id);
  renderList(); renderReader();
  reader.focus({preventScroll: true});
  if (matchMedia('(max-width: 900px)').matches) scrollTo({top: 0});
  const message = messages.find(item => item.id === id);
  if (message && !message.read) {
    replace({...message, read: true}); renderList();
    try { replace((await send({id, action: 'read'})).message); } catch { replace(message); }
    renderList();
  }
}

for (const tab of document.querySelectorAll('[data-filter]')) {
  tab.addEventListener('click', () => {
    filter = tab.dataset.filter;
    for (const other of document.querySelectorAll('[data-filter]')) other.setAttribute('aria-selected', String(other === tab));
    renderList();
  });
}

window.addEventListener('beforeunload', event => {
  if ([...drafts.values()].some(draft => draft.text?.trim())) { event.preventDefault(); event.returnValue = ''; }
});

async function load() {
  try {
    const response = await fetch(api, {cache: 'no-store'});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      status.textContent = response.status === 401 && (!result.reason || ['no_token', 'expired'].includes(result.reason))
        ? 'Your sign-in has expired. Reload the page to sign in again.'
        : result.message || 'Messages couldn’t be loaded. Please try again.';
      return;
    }
    messages = result.messages || [];
    replyFrom = result.replyFrom || '';
    document.querySelector('[data-sample]').hidden = !result.sample;
    if (result.signedInAs) document.querySelector('[data-who]').textContent = 'Signed in as ' + result.signedInAs;
    // Keep the open message (if it still exists); nothing is opened, or marked read, by itself.
    const wanted = openId || location.hash.slice(1);
    openId = messages.some(message => message.id === wanted) ? wanted : '';
    renderList(); renderReader();
    if (openId && !messages.find(message => message.id === openId).read) open(openId);
  } catch {
    status.textContent = 'Messages couldn’t be loaded. Check your connection and reload.';
  }
}
load();
// Pick up new messages when coming back to the tab (unless a reply is being written).
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ![...drafts.values()].some(draft => draft.text?.trim())) load();
});
