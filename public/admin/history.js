// History: recent content changes from GitHub. A change made in the admin can be undone, which
// publishes the affected files as they were just before it (a new commit, so it can be undone too).
const api = '/api/admin/history';
const list = document.querySelector('[data-list]');
const status = document.querySelector('[data-status]');
let changes = [];

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const fullDate = iso => new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(iso));
const describe = change => {
  const undo = change.message.match(/^Undo “(.+)”$/);
  const from = change.message.match(/^Update (.+) from the admin/);
  if (undo) return {title: `Undid: ${describe({...change, message: undo[1]}).title}`, by: 'Admin'};
  if (from) return {title: `Updated ${change.sections.join(', ') || from[1]}`, by: 'Admin'};
  return {title: change.message, by: 'Site update'};
};

// Wait for Cloudflare to publish the new commit.
async function watch(commit, message) {
  message.dataset.tone = 'wait';
  message.textContent = 'Undone. The site is rebuilding, usually about a minute…';
  const started = Date.now();
  while (Date.now() - started < 5 * 60000) {
    await new Promise(resolve => setTimeout(resolve, 6000));
    try {
      const live = await (await fetch('/admin/version.json?t=' + Date.now(), {cache: 'no-store'})).json();
      if (live.commit && live.commit === commit) {
        message.dataset.tone = 'ok';
        message.replaceChildren('Undone and live on the site. ');
        const link = el('a', '', 'View it'); link.href = '/'; link.target = '_blank'; link.rel = 'noopener';
        message.append(link);
        return;
      }
    } catch {}
  }
  message.textContent = 'Undone on GitHub. The rebuild is taking longer than usual; check Cloudflare Pages if it doesn’t appear soon.';
}

function render() {
  list.replaceChildren(...changes.map((change, index) => {
    const item = el('li', 'history-item' + (change.undoable ? '' : ' is-code'));
    const {title, by} = describe(change);
    const top = el('div', 'history-top');
    const text = el('div');
    text.append(el('p', 'history-title', title));
    const meta = [fullDate(change.date), by, change.images ? `${change.images} new image${change.images > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
    text.append(el('p', 'history-meta', meta));
    top.append(text);
    const message = el('p', 'content-message history-message');
    message.setAttribute('role', 'status');
    if (change.undoable) {
      const button = el('button', 'admin-button', 'Undo');
      button.type = 'button';
      const confirm = el('div', 'inbox-confirm');
      confirm.hidden = true;
      // Later changes to the same files are rolled back with it; say so.
      const later = changes.slice(0, index).filter(other => other.files.some(file => change.files.includes(file)));
      const what = change.sections.join(', ');
      confirm.append(el('p', '', later.length ? `Put ${what} back as it was before this? The ${later.length} later change${later.length > 1 ? 's' : ''} to it will be undone too.` : `Put ${what} back as it was before this change?`));
      const sure = el('button', 'admin-button danger', 'Undo change');
      const keep = el('button', 'admin-button quiet', 'Cancel');
      sure.type = keep.type = 'button';
      confirm.append(sure, keep);
      button.addEventListener('click', () => { confirm.hidden = false; button.hidden = true; keep.focus(); });
      keep.addEventListener('click', () => { confirm.hidden = true; button.hidden = false; button.focus(); });
      sure.addEventListener('click', async () => {
        sure.disabled = keep.disabled = true;
        sure.textContent = 'Undoing…';
        try {
          const response = await fetch(api, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({sha: change.sha})});
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw Object.assign(Error(), {message: response.status === 401 ? 'Your sign-in has expired. Reload the page to sign in again.' : result.message || 'That couldn’t be undone. Please try again.'});
          confirm.hidden = true;
          await watch(result.commit, message);
          load();
        } catch (failure) {
          message.dataset.tone = 'error';
          message.textContent = failure.message;
          sure.disabled = keep.disabled = false;
          sure.textContent = 'Undo change';
        }
      });
      top.append(button);
      item.append(top, confirm, message);
    } else item.append(top, message);
    return item;
  }));
}

async function load() {
  try {
    const response = await fetch(api, {cache: 'no-store'});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      status.textContent = response.status === 401 && (!result.reason || ['no_token', 'expired'].includes(result.reason))
        ? 'Your sign-in has expired. Reload the page to sign in again.'
        : result.message || 'History couldn’t be loaded. Please try again.';
      return;
    }
    if (result.unavailable) { status.classList.add('is-empty'); status.textContent = result.message; return; }
    changes = result.changes || [];
    status.textContent = changes.length ? '' : 'No changes yet.';
    render();
  } catch {
    status.textContent = 'History couldn’t be loaded. Check your connection and reload.';
  }
}
load();
