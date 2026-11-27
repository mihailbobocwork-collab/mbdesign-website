// Visitors page: numbers from Cloudflare Web Analytics (through /api/admin/analytics).
// Three totals, visits per day as bars, then top pages, sources, countries and devices.
const sampleQuery = new URLSearchParams(location.search).has('sample');
const status = document.querySelector('[data-status]');
const stats = document.querySelector('[data-stats]');
const tabs = [...document.querySelectorAll('[data-days]')];
const cache = new Map();
let days = 30;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const number = value => new Intl.NumberFormat('en-GB').format(value);
const shortDay = iso => new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', timeZone: 'UTC'}).format(new Date(iso + 'T00:00:00Z'));
const longDay = iso => new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'}).format(new Date(iso + 'T00:00:00Z'));
const PAGE_NAMES = {'/': 'Homepage', '/contact/': 'Contact'};
const pageName = path => PAGE_NAMES[path] || path;
const sourceName = host => host === 'Direct' ? 'Direct or bookmark' : host.replace(/^www\./, '');
const deviceName = type => ({desktop: 'Desktop', mobile: 'Phone', tablet: 'Tablet'}[type] || type);

function tile(label, value, note) {
  const box = el('div', 'stat-tile');
  box.append(el('p', 'stat-label', label), el('p', 'stat-value', value));
  if (note) box.append(el('p', 'stat-note', note));
  return box;
}

// Visits per day. Each bar is a focusable element with its date and numbers, so the
// chart can be read with a keyboard or screen reader, not only by hovering.
function chart(series) {
  const box = el('section', 'stat-card stat-chart');
  const head = el('div', 'stat-card-head');
  const readout = el('p', 'stat-readout');
  head.append(el('h2', '', 'Visitors per day'), readout);
  const max = Math.max(1, ...series.map(point => point.visits));
  const bars = el('div', 'chart-bars');
  bars.setAttribute('role', 'list');
  bars.style.setProperty('--count', series.length);
  const show = point => { readout.textContent = point ? `${longDay(point.date)} · ${number(point.visits)} visitor${point.visits === 1 ? '' : 's'} · ${number(point.views)} page view${point.views === 1 ? '' : 's'}` : `Busiest day: ${number(max)} visitor${max === 1 ? '' : 's'}`; };
  for (const point of series) {
    const bar = el('div', 'chart-bar');
    bar.setAttribute('role', 'listitem');
    bar.tabIndex = 0;
    bar.setAttribute('aria-label', `${longDay(point.date)}: ${point.visits} visitors, ${point.views} page views`);
    const fill = el('span');
    fill.style.height = `${Math.max(point.visits ? 3 : 0, point.visits / max * 100)}%`;
    bar.append(fill);
    for (const type of ['pointerenter', 'focus']) bar.addEventListener(type, () => show(point));
    for (const type of ['pointerleave', 'blur']) bar.addEventListener(type, () => show(null));
    bars.append(bar);
  }
  const axis = el('div', 'chart-axis');
  axis.append(el('span', '', shortDay(series[0].date)), el('span', '', shortDay(series.at(-1).date)));
  show(null);
  box.append(head, bars, axis);
  return box;
}

// A ranked list with a soft bar behind each row showing its share.
function ranking(title, rows, name, empty) {
  const box = el('section', 'stat-card');
  box.append(el('h2', '', title));
  if (!rows.length) { box.append(el('p', 'stat-empty', empty)); return box; }
  const total = rows.reduce((sum, row) => sum + row.visits, 0) || 1;
  const top = Math.max(...rows.map(row => row.visits)) || 1;
  const list = el('ol', 'stat-list');
  for (const row of rows) {
    const item = el('li');
    item.style.setProperty('--share', `${row.visits / top * 100}%`);
    item.append(el('span', 'stat-list-name', name(row.key)), el('span', 'stat-list-value', `${number(row.visits)} · ${Math.round(row.visits / total * 100)}%`));
    list.append(item);
  }
  box.append(list);
  return box;
}
function pagesRanking(rows) {
  // Page views are the natural count for pages (one visit can open several).
  return ranking('Most viewed pages', rows.map(row => ({...row, visits: row.views})), pageName, 'No page views yet.');
}

function setup(message) {
  status.className = 'admin-status is-empty stats-setup';
  status.replaceChildren(
    el('strong', '', message),
    el('span', '', 'Turn on Web Analytics in Cloudflare (Workers & Pages → mbdesign-website → Metrics), then add CF_ANALYTICS_TOKEN, CF_ACCOUNT_ID and CF_WEB_ANALYTICS_SITE_TAG to the project’s secrets. The steps are in ANALYTICS.md.')
  );
  status.hidden = false;
}

function render(data) {
  document.querySelector('[data-sample]').hidden = !data.sample;
  if (data.signedInAs) document.querySelector('[data-who]').textContent ||= 'Signed in as ' + data.signedInAs;
  const perVisit = data.visits ? (data.views / data.visits).toFixed(1) : '0';
  const totals = el('div', 'stat-tiles');
  totals.append(tile('Visitors', number(data.visits), `Last ${data.days} days`), tile('Page views', number(data.views)), tile('Pages per visit', perVisit));
  const grid = el('div', 'stat-grid');
  grid.append(
    pagesRanking(data.pages),
    ranking('Where visitors came from', data.referrers, sourceName, 'No visits yet.'),
    ranking('Countries', data.countries, key => key, 'No visits yet.'),
    ranking('Devices', data.devices, deviceName, 'No visits yet.')
  );
  stats.replaceChildren(totals, chart(data.series), grid);
  status.hidden = true;
  stats.hidden = false;
}

async function load() {
  for (const tab of tabs) tab.setAttribute('aria-selected', String(Number(tab.dataset.days) === days));
  if (cache.has(days)) { render(cache.get(days)); return; }
  status.className = 'admin-status';
  status.textContent = 'Loading visitors…';
  status.hidden = false;
  stats.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(`/api/admin/analytics?days=${days}${sampleQuery ? '&sample' : ''}`, {cache: 'no-store'});
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) { stats.hidden = true; status.textContent = 'Your sign-in has expired. Reload the page to sign in again.'; return; }
    if (result.error === 'not_connected') { stats.hidden = true; setup(result.message); return; }
    if (!response.ok) { stats.hidden = true; status.textContent = result.message || 'The numbers couldn’t be loaded. Please try again.'; return; }
    cache.set(days, result);
    render(result);
  } catch {
    stats.hidden = true;
    status.textContent = 'The numbers couldn’t be loaded. Check your connection and try again.';
  } finally {
    stats.removeAttribute('aria-busy');
  }
}

for (const tab of tabs) tab.addEventListener('click', () => { days = Number(tab.dataset.days); load(); });
load();
