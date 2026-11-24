// Admin sidebar: marks the current item, opens as a drawer on small screens, and keeps the
// "waiting requests" count visible on every admin page.
const side = document.querySelector('[data-side]');
const menu = side.querySelector('[data-menu]');
const small = matchMedia('(max-width: 900px)');

export function markCurrent() {
  const page = document.body.dataset.page;
  const current = page === 'content' ? (location.hash.slice(1) || 'home') : page;
  for (const link of side.querySelectorAll('[data-nav]')) {
    if (link.dataset.nav === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

export function setUnread(count) {
  const badge = side.querySelector('[data-unread-count]');
  badge.textContent = count;
  badge.hidden = !count;
}

export function setWaiting(count) {
  const badge = side.querySelector('[data-waiting-count]');
  badge.textContent = count;
  badge.hidden = !count;
}

const setOpen = open => {
  side.classList.toggle('is-open', open);
  menu.setAttribute('aria-expanded', String(open));
};
menu.addEventListener('click', () => setOpen(!side.classList.contains('is-open')));
side.addEventListener('click', event => { if (event.target.closest('[data-nav]') && small.matches) setOpen(false); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && side.classList.contains('is-open')) { setOpen(false); menu.focus(); }
});
document.addEventListener('pointerdown', event => { if (!side.contains(event.target)) setOpen(false); });
small.addEventListener('change', () => setOpen(false));
window.addEventListener('hashchange', markCurrent);
markCurrent();

// Each page counts its own list; the other badge is asked for quietly.
const sample = new URLSearchParams(location.search).has('sample') ? '?sample' : '';
if (document.body.dataset.page !== 'messages') {
  fetch('/api/admin/messages' + sample, {cache: 'no-store'})
    .then(response => response.ok ? response.json() : null)
    .then(result => { if (result?.messages) setUnread(result.messages.filter(m => !m.read).length); })
    .catch(() => {});
}
if (document.body.dataset.page !== 'requests') {
  fetch('/api/admin/bookings' + sample, {cache: 'no-store'})
    .then(response => response.ok ? response.json() : null)
    .then(result => {
      if (!result?.meetings) return;
      setWaiting(result.meetings.filter(m => ['requested', 'approving', 'declining', 'uncertain'].includes(m.status)).length);
      if (result.signedInAs) document.querySelector('[data-who]').textContent ||= 'Signed in as ' + result.signedInAs;
    })
    .catch(() => {});
}
