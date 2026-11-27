// Visitors page: numbers from Cloudflare Web Analytics (through /api/admin/analytics).
// Three totals, visits per day as bars, then top pages, sources, countries and devices.
const sampleQuery = new URLSearchParams(location.search).has('sample');
const status = document.querySelector('[data-status]');
const stats = document.querySelector('[data-stats]');
const tabs = [...document.querySelectorAll('[data-range]')];
const cache = new Map();
// ?range=live|today|yesterday|7|30|90 opens that period directly.
let range = ['live', 'today', 'yesterday', '7', '30', '90'].find(r => r === new URLSearchParams(location.search).get('range')) || '30';
let refresh = 0;
const LIVE_EVERY = 30000;

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const number = value => new Intl.NumberFormat('en-GB').format(value);
// Times show in Moldova time (the owner's), days as Cloudflare counts them (UTC dates).
let zone = 'Europe/Chisinau';
const format = (iso, options) => new Intl.DateTimeFormat('en-GB', {hourCycle: 'h23', ...options}).format(new Date(iso));
const axisLabel = (iso, bucket) => bucket === 'day' ? format(iso, {day: 'numeric', month: 'short', timeZone: 'UTC'}) : format(iso, {hour: '2-digit', minute: '2-digit', timeZone: zone});
const pointLabel = (iso, bucket) => bucket === 'day' ? format(iso, {weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC'})
  : bucket === 'hour' ? `${format(iso, {hour: '2-digit', minute: '2-digit', timeZone: zone})}–${format(new Date(Date.parse(iso) + 3600000).toISOString(), {hour: '2-digit', minute: '2-digit', timeZone: zone})}`
  : format(iso, {hour: '2-digit', minute: '2-digit', timeZone: zone});
const CHART_TITLE = {minute: 'Visitors per minute', hour: 'Visitors per hour', day: 'Visitors per day'};
const PERIOD = {live: 'Last 30 minutes', today: 'Today so far', yesterday: 'Yesterday', 7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days'};
const BUSIEST = {minute: 'Busiest minute', hour: 'Busiest hour', day: 'Busiest day'};
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
function chart(series, bucket) {
  const box = el('section', 'stat-card stat-chart');
  const head = el('div', 'stat-card-head');
  const readout = el('p', 'stat-readout');
  head.append(el('h2', '', CHART_TITLE[bucket]), readout);
  const max = Math.max(1, ...series.map(point => point.visits));
  const bars = el('div', 'chart-bars');
  bars.setAttribute('role', 'list');
  bars.style.setProperty('--count', series.length);
  const show = point => { readout.textContent = point ? `${pointLabel(point.at, bucket)} · ${number(point.visits)} visitor${point.visits === 1 ? '' : 's'} · ${number(point.views)} page view${point.views === 1 ? '' : 's'}` : series.some(p => p.visits) ? `${BUSIEST[bucket]}: ${number(max)} visitor${max === 1 ? '' : 's'}` : 'No visits in this period yet'; };
  for (const point of series) {
    const bar = el('div', 'chart-bar');
    bar.setAttribute('role', 'listitem');
    bar.tabIndex = 0;
    bar.setAttribute('aria-label', `${pointLabel(point.at, bucket)}: ${point.visits} visitors, ${point.views} page views`);
    const fill = el('span');
    fill.style.height = `${Math.max(point.visits ? 3 : 0, point.visits / max * 100)}%`;
    bar.append(fill);
    for (const type of ['pointerenter', 'focus']) bar.addEventListener(type, () => show(point));
    for (const type of ['pointerleave', 'blur']) bar.addEventListener(type, () => show(null));
    bars.append(bar);
  }
  const axis = el('div', 'chart-axis');
  const middle = series[Math.floor((series.length - 1) / 2)];
  axis.append(el('span', '', axisLabel(series[0].at, bucket)), el('span', '', axisLabel(middle.at, bucket)), el('span', '', bucket === 'minute' ? 'Now' : axisLabel(series.at(-1).at, bucket)));
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

function setup(message, missing = []) {
  status.className = 'admin-status is-empty stats-setup';
  status.replaceChildren(
    el('strong', '', message),
    ...(missing.length ? [el('span', '', `Missing in Cloudflare (Settings → Variables and Secrets → Production): ${missing.join(', ')}. After adding, retry the latest deployment.`)] : []),
    el('span', '', 'Turn on Web Analytics in Cloudflare (Workers & Pages → mbdesign-website → Metrics), then add CF_ANALYTICS_TOKEN, CF_ACCOUNT_ID and CF_WEB_ANALYTICS_SITE_TAG to the project’s secrets. The steps are in ANALYTICS.md.')
  );
  status.hidden = false;
}

// A problem from Cloudflare: the plain message, plus Cloudflare's own words for reference.
function problem(result) {
  status.className = 'admin-status is-empty stats-setup';
  const parts = [el('strong', '', result.message || 'The numbers couldn’t be loaded. Please try again.')];
  if (result.detail) parts.push(el('span', 'stats-detail', `Cloudflare said: ${result.detail}`));
  status.replaceChildren(...parts);
  status.hidden = false;
}

// When everything is zero, say why that may be, so an empty page is never a mystery.
function zeroNote(data) {
  if (data.visits || data.sample) return null;
  const check = data.check || {};
  const text = check.lookup === 'ok'
    ? `Cloudflare has no visits for ${check.host || 'the website'} in this period yet. Visits are counted from the moment Web Analytics was turned on; ad blockers and some privacy settings also stop a visit being counted.`
    : 'Cloudflare returned no visits. If Cloudflare’s own Web Analytics screen does show visits, CF_WEB_ANALYTICS_SITE_TAG holds the wrong code: copy the Site tag from Web Analytics → mihaiboboc.com → Manage site.';
  return el('p', 'admin-sample stats-zero', text);
}

function render(data) {
  document.querySelector('[data-sample]').hidden = !data.sample;
  if (data.signedInAs) document.querySelector('[data-who]').textContent ||= 'Signed in as ' + data.signedInAs;
  const perVisit = data.visits ? (data.views / data.visits).toFixed(1) : '0';
  const totals = el('div', 'stat-tiles');
  if (data.timeZone) zone = data.timeZone;
  const note = data.range === 'live' ? `Last 30 minutes · updated ${format(new Date().toISOString(), {hour: '2-digit', minute: '2-digit', second: '2-digit'})}` : PERIOD[data.range];
  totals.append(tile(data.range === 'live' ? 'Visitors right now' : 'Visitors', number(data.visits), note), tile('Page views', number(data.views)), tile('Pages per visit', perVisit));
  const grid = el('div', 'stat-grid');
  grid.append(
    pagesRanking(data.pages),
    ranking('Where visitors came from', data.referrers, sourceName, 'No visits yet.'),
    ranking('Countries', data.countries, key => key, 'No visits yet.'),
    ranking('Devices', data.devices, deviceName, 'No visits yet.')
  );
  stats.replaceChildren(...[zeroNote(data), totals, chart(data.series, data.bucket), grid].filter(Boolean));
  status.hidden = true;
  stats.hidden = false;
}

async function load({quiet = false} = {}) {
  clearTimeout(refresh);
  for (const tab of tabs) tab.setAttribute('aria-selected', String(tab.dataset.range === range));
  const asked = range;
  // Live refreshes itself every 30 seconds while the tab is open and visible.
  const again = () => { if (asked === 'live' && range === 'live') refresh = setTimeout(() => { if (!document.hidden) load({quiet: true}); else again(); }, LIVE_EVERY); };
  const kept = cache.get(range);
  if (kept && (range !== 'live' || Date.now() - kept.at < LIVE_EVERY)) { render(kept.data); again(); return; }
  if (!quiet) {
    status.className = 'admin-status';
    status.textContent = 'Loading visitors…';
    status.hidden = false;
  }
  stats.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(`/api/admin/analytics?range=${asked}${sampleQuery ? '&sample' : ''}`, {cache: 'no-store'});
    if (asked !== range) return;
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) { stats.hidden = true; status.textContent = 'Your sign-in has expired. Reload the page to sign in again.'; return; }
    if (result.error === 'not_connected') { stats.hidden = true; setup(result.message, result.missing); return; }
    if (!response.ok) { if (quiet && !stats.hidden) { again(); return; } stats.hidden = true; problem(result); return; }
    cache.set(asked, {at: Date.now(), data: result});
    render(result);
    again();
  } catch {
    stats.hidden = true;
    status.textContent = 'The numbers couldn’t be loaded. Check your connection and try again.';
  } finally {
    stats.removeAttribute('aria-busy');
  }
}

for (const tab of tabs) tab.addEventListener('click', () => { range = tab.dataset.range; load(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && range === 'live') load({quiet: true}); });
load();
