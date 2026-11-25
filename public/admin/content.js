// Content tab: edit the homepage copy, About and meeting availability, then publish.
// Publishing commits the file to GitHub (/api/admin/content); the page then waits for
// Cloudflare's rebuild by comparing /admin/version.json with the saved commit.
import {CONTENT_SECTIONS, WEEKDAYS, STUDY_LIMITS, IMAGE_STYLES, ARTICLE_LIMITS, articleSlug, checkSection} from '/admin/content-schema.js';

const api = '/api/admin/content';
let defaultThumbs = {};
const thumbsReady = fetch('/admin/case-thumbs.json', {cache: 'no-store'}).then(response => response.ok ? response.json() : {}).then(data => { defaultThumbs = data; }).catch(() => {});
const root = document.querySelector('[data-sections]');
const status = document.querySelector('[data-status]');
const title = document.querySelector('[data-title]');
const lede = document.querySelector('[data-lede]');
const idle = () => source === 'local' ? '' : 'Changes go live about a minute after publishing.';
const state = new Map(); // id -> {saved, version, card, read, setErrors, publish}
let source = 'github';

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const dayLabel = iso => new Intl.DateTimeFormat('en-GB', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(iso + 'T00:00:00Z'));
const today = () => new Date().toISOString().slice(0, 10);
let uid = 0;

// New images stay in the browser until Publish. A value of "upload:<token>" points at one of
// them; Publish sends the ones still in use and the server swaps in their final paths.
const pendingImages = new Map();
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join('');
const srcOf = value => String(value || '').startsWith('upload:') ? pendingImages.get(String(value).slice(7))?.url || '' : value || '';

// Resize in the browser before upload: square crops for the About photo, longest side capped
// for everything else. PNGs stay PNG (logos and mockups may be transparent); the rest become JPEG.
// SVGs are drawn into a PNG here, so only plain images ever reach the site's files.
async function svgToPng(file, width = 900) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const ratio = (image.naturalHeight || 1) / (image.naturalWidth || 1);
    const canvas = Object.assign(document.createElement('canvas'), {width, height: Math.max(1, Math.round(width * ratio))});
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return new File([await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))], 'logo.png', {type: 'image/png'});
  } finally { URL.revokeObjectURL(url); }
}

async function prepareImage(file, {square = false, max = 2400, name = 'image'} = {}) {
  if (file.type === 'image/svg+xml') file = await svgToPng(file, Math.min(max, 1200));
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
  const side = Math.min(bitmap.width, bitmap.height);
  const scale = Math.min(1, max / (square ? side : Math.max(bitmap.width, bitmap.height)));
  const width = Math.round((square ? side : bitmap.width) * scale), height = Math.round((square ? side : bitmap.height) * scale);
  const canvas = Object.assign(document.createElement('canvas'), {width, height});
  const context = canvas.getContext('2d');
  const png = file.type === 'image/png';
  if (!png) { context.fillStyle = '#fff'; context.fillRect(0, 0, width, height); }
  context.imageSmoothingQuality = 'high';
  if (square) context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, width, height);
  else context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, png ? 'image/png' : 'image/jpeg', .88));
  const data = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(blob); });
  const token = newToken();
  pendingImages.set(token, {data, name, url: URL.createObjectURL(blob)});
  return {value: 'upload:' + token, width, height, small: (square ? side : Math.max(bitmap.width, bitmap.height)) < 800, url: pendingImages.get(token).url};
}
const fileInput = (multiple = false) => { const input = el('input', 'sr-only'); Object.assign(input, {type: 'file', multiple, accept: 'image/jpeg,image/png,image/webp'}); return input; };
const dropOn = (target, take) => {
  target.addEventListener('dragover', event => { event.preventDefault(); target.classList.add('is-over'); });
  target.addEventListener('dragleave', () => target.classList.remove('is-over'));
  target.addEventListener('drop', event => { event.preventDefault(); target.classList.remove('is-over'); take([...event.dataTransfer.files]); });
};

const icon = path => `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICONS = {left: icon('M12.5 8h-9m4-4-4 4 4 4'), right: icon('M3.5 8h9m-4-4 4 4-4 4'), up: icon('M8 12.5v-9m-4 4 4-4 4 4'), down: icon('M8 3.5v9m-4-4 4 4 4-4'), close: icon('m4.5 4.5 7 7m0-7-7 7'), chevron: icon('m4 6 4 4 4-4')};
const smallButton = (name, label) => { const button = el('button', 'content-remove'); button.type = 'button'; button.setAttribute('aria-label', label); button.innerHTML = ICONS[name]; return button; };
const labelled = (labelText, control, hint) => {
  const wrap = el('div', 'content-field');
  const id = `field-${++uid}`;
  const label = el('label', 'content-label', labelText);
  label.htmlFor = id; control.id = id;
  wrap.append(label, control);
  if (hint) wrap.append(el('p', 'content-hint', hint));
  return wrap;
};

// One case study: name, category, title, story and facts. Its id (which ties it to its images) never changes.
function studyEditor(study, change, move, removeStudy) {
  const L = STUDY_LIMITS;
  const item = el('li', 'study');
  item.dataset.id = study.id;
  const head = el('div', 'study-head');
  const toggle = el('button', 'study-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  const names = el('span', 'study-names');
  const name = el('strong', '', study.name), category = el('span', '', study.category);
  names.append(name, category);
  toggle.innerHTML = ICONS.chevron;
  toggle.prepend(names);
  const unconfirmed = el('span', 'study-flag', 'Unconfirmed facts');
  const up = smallButton('up', `Move ${study.name} up`), down = smallButton('down', `Move ${study.name} down`);
  up.addEventListener('click', () => move(item, -1));
  down.addEventListener('click', () => move(item, 1));
  const hiddenFlag = el('span', 'study-flag is-hidden', 'Hidden');
  head.append(toggle, hiddenFlag, unconfirmed, up, down);

  const body = el('div', 'study-body');
  body.hidden = true;
  const input = (value, max) => { const field = el('input', 'content-input'); Object.assign(field, {value, maxLength: max, autocomplete: 'off'}); field.addEventListener('input', change); return field; };
  const nameInput = input(study.name, L.name), categoryInput = input(study.category, L.category), titleInput = input(study.title, L.title);
  const story = el('textarea', 'content-input');
  story.rows = 10; story.value = study.body.join('\n\n');
  story.addEventListener('input', change);
  nameInput.addEventListener('input', () => { name.textContent = nameInput.value || 'Untitled'; });
  categoryInput.addEventListener('input', () => { category.textContent = categoryInput.value; });

  const facts = el('div', 'study-facts');
  const factRows = el('div', 'study-fact-rows');
  const addFact = el('button', 'admin-button quiet content-add', 'Add a fact');
  addFact.type = 'button';
  const syncFacts = () => {
    const rows = factRows.children.length;
    addFact.hidden = rows >= L.facts;
    unconfirmed.hidden = ![...factRows.querySelectorAll('input[type=checkbox]')].some(box => box.checked);
  };
  const factRow = (fact = {label: '', value: '', placeholder: false}) => {
    const row = el('div', 'study-fact');
    const label = input(fact.label, L.factLabel), value = el('textarea', 'content-input');
    label.placeholder = 'Label'; label.setAttribute('aria-label', 'Fact label');
    value.rows = 1; value.maxLength = L.factValue; value.value = fact.value; value.placeholder = 'Value';
    value.setAttribute('aria-label', 'Fact value');
    value.addEventListener('input', change);
    const check = el('label', 'study-check');
    const box = el('input');
    box.type = 'checkbox'; box.checked = fact.placeholder;
    box.addEventListener('change', () => { syncFacts(); change(); });
    check.append(box, el('span', '', 'Not confirmed yet'));
    const remove = smallButton('close', 'Remove this fact');
    remove.addEventListener('click', () => { row.remove(); syncFacts(); change(); addFact.focus(); });
    row.append(label, value, check, remove);
    factRows.append(row);
    return label;
  };
  study.facts.forEach(factRow);
  addFact.addEventListener('click', () => { factRow().focus(); syncFacts(); change(); });
  facts.append(el('p', 'content-label', 'Facts'), factRows, addFact, el('p', 'content-hint', '“Not confirmed yet” keeps the fact on the site but marks it in the page code, so you can find and check it later.'));
  syncFacts();

  // Cover: the one set in code, or an uploaded one shown filled (photo) or whole (logo, mockup).
  const coverWrap = el('div', 'content-field study-cover');
  const coverRow = el('div', 'study-cover-row');
  const coverFrame = el('div', 'study-cover-frame');
  const coverImg = el('img');
  coverImg.alt = '';
  coverFrame.append(coverImg, el('span', 'study-cover-empty', 'No cover yet'));
  const coverSide = el('div', 'content-photo-side');
  const coverInput = fileInput();
  coverInput.id = `field-${++uid}`;
  const coverPick = el('label', 'admin-button', 'Upload a cover');
  coverPick.htmlFor = coverInput.id;
  const coverReset = el('button', 'admin-button quiet', 'Use the original cover');
  coverReset.type = 'button';
  const fitGroup = el('div', 'study-fit');
  fitGroup.setAttribute('role', 'radiogroup');
  fitGroup.setAttribute('aria-label', 'How the cover sits in the card');
  const fitName = `fit-${uid}`;
  const fits = [['fill', 'Fill the card'], ['fit', 'Show it whole']].map(([value, text]) => {
    const option = el('label', 'study-fit-option');
    const radio = el('input');
    Object.assign(radio, {type: 'radio', name: fitName, value});
    radio.addEventListener('change', () => { thumbnail = {...thumbnail, fit: value}; drawCover(); change(); });
    option.append(radio, el('span', '', text));
    fitGroup.append(option);
    return radio;
  });
  const coverNote = el('p', 'content-photo-note');
  coverSide.append(coverInput, coverPick, coverReset, fitGroup, coverNote);
  coverRow.append(coverFrame, coverSide);
  coverWrap.append(el('p', 'content-label', 'Cover'), coverRow, el('p', 'content-hint', 'The thumbnail on the card and at the top of the open case study. Use “Show it whole” for logos and mockups on a transparent background.'));
  let thumbnail = study.thumbnail || null;
  const drawCover = () => {
    const original = study.originalCover ? defaultThumbs[study.id] : null;
    const shown = thumbnail ? {src: srcOf(thumbnail.src), fit: thumbnail.fit} : original || {src: '', fit: 'fit'};
    coverImg.src = shown.src;
    coverFrame.dataset.fit = shown.fit;
    coverFrame.classList.toggle('is-identity', !thumbnail && Boolean(original?.identity));
    coverFrame.classList.toggle('is-empty', !shown.src);
    coverFrame.classList.toggle('is-new', String(thumbnail?.src || '').startsWith('upload:'));
    coverReset.hidden = !thumbnail || !study.originalCover;
    fitGroup.hidden = !thumbnail;
    fits.forEach(radio => { radio.checked = radio.value === thumbnail?.fit; });
    coverNote.textContent = String(thumbnail?.src || '').startsWith('upload:') ? 'New cover, not published yet.' : '';
  };
  const takeCover = async ([file]) => {
    if (!file) return;
    coverNote.textContent = 'Preparing the image…';
    try {
      const next = await prepareImage(file, {max: 1600, name: `${study.id}-cover`});
      thumbnail = {src: next.value, width: next.width, height: next.height, fit: file.type === 'image/png' ? 'fit' : 'fill'};
    } catch { coverNote.textContent = 'This file couldn’t be read. Try a JPG or PNG.'; return; }
    drawCover(); change();
  };
  coverInput.addEventListener('change', () => { takeCover([...coverInput.files]); coverInput.value = ''; });
  coverReset.addEventListener('click', () => { thumbnail = null; drawCover(); change(); coverPick.focus(); });
  dropOn(coverFrame, takeCover);
  drawCover();

  // Every image of the case study, in order: photos (full width), screens (bordered screenshots)
  // and phones (mobile screens, three per row). New uploads are resized before they're sent.
  const photosWrap = el('div', 'content-field study-photos');
  const photoGrid = el('ul', 'study-photo-grid');
  const photosInput = fileInput(true);
  photosInput.id = `field-${++uid}`;
  const photosPick = el('label', 'admin-button', 'Add images');
  photosPick.htmlFor = photosInput.id;
  const photosNote = el('p', 'content-photo-note');
  const photosCount = el('p', 'content-hint study-photos-count');
  const photosBar = el('div', 'study-photos-bar');
  photosBar.append(photosInput, photosPick, photosNote);
  photosWrap.append(el('p', 'content-label', 'Images'), photosCount, photoGrid, photosBar, el('p', 'content-hint', 'Shown after the story, in this order. Photo is full width, Screen is a screenshot with a thin border, Phone shows mobile screens three to a row. When the story is one paragraph, a first photo sits beside the facts. Drag images here or choose several at once.'));
  const syncPhotos = () => {
    const tiles = [...photoGrid.children];
    tiles.forEach((tile, index) => {
      tile.querySelector('[data-move="-1"]').disabled = index === 0;
      tile.querySelector('[data-move="1"]').disabled = index === tiles.length - 1;
    });
    photoGrid.hidden = !tiles.length;
    photosPick.hidden = tiles.length >= L.images;
    photosCount.textContent = tiles.length ? `${tiles.length} image${tiles.length > 1 ? 's' : ''}` : 'No images yet.';
  };
  const photoTile = photo => {
    const tile = el('li', 'study-photo' + (String(photo.src).startsWith('upload:') ? ' is-new' : ''));
    tile.photo = photo;
    const frame = el('div', 'study-photo-frame');
    frame.dataset.style = photo.style;
    const image = el('img');
    image.src = srcOf(photo.variants?.[0]?.image || photo.src); image.alt = ''; image.loading = 'lazy';
    frame.append(image);
    const style = el('select', 'content-input study-photo-style');
    style.setAttribute('aria-label', 'Show as');
    style.append(...IMAGE_STYLES.map(([value, text]) => { const option = el('option', '', text); option.value = value; return option; }));
    style.value = photo.style;
    style.addEventListener('change', () => { tile.photo = {...tile.photo, style: style.value}; frame.dataset.style = style.value; change(); });
    const alt = el('input', 'content-input');
    Object.assign(alt, {value: photo.alt || '', maxLength: L.alt, placeholder: 'Describe the image', autocomplete: 'off'});
    alt.setAttribute('aria-label', 'Image description');
    alt.addEventListener('input', () => { tile.photo = {...tile.photo, alt: alt.value}; change(); });
    const tools = el('div', 'study-photo-tools');
    const back = smallButton('left', 'Move image earlier'), forward = smallButton('right', 'Move image later'), remove = smallButton('close', 'Remove image');
    back.dataset.move = '-1'; forward.dataset.move = '1';
    for (const button of [back, forward]) button.addEventListener('click', () => {
      const sibling = button.dataset.move === '-1' ? tile.previousElementSibling : tile.nextElementSibling;
      if (!sibling) return;
      button.dataset.move === '-1' ? sibling.before(tile) : sibling.after(tile);
      syncPhotos(); change(); button.disabled ? tile.querySelector('input').focus() : button.focus();
    });
    remove.addEventListener('click', () => { const next = tile.nextElementSibling || tile.previousElementSibling; tile.remove(); syncPhotos(); change(); (next?.querySelector('input') || photosPick).focus(); });
    tools.append(style, back, forward, remove);
    tile.append(frame, alt, tools);
    return tile;
  };
  (study.images || []).forEach(photo => photoGrid.append(photoTile(photo)));
  const takePhotos = async files => {
    const room = L.images - photoGrid.children.length;
    const chosen = files.filter(file => /^image\//.test(file.type)).slice(0, room);
    if (!chosen.length) return;
    let failed = 0;
    for (const [index, file] of chosen.entries()) {
      photosNote.textContent = `Preparing ${index + 1} of ${chosen.length}…`;
      try {
        const next = await prepareImage(file, {max: 2400, name: `${study.id}-image`});
        // Tall images are most likely phone screens.
        photoGrid.append(photoTile({src: next.value, width: next.width, height: next.height, alt: '', style: next.height > next.width * 1.7 ? 'phone' : 'photo'}));
      } catch { failed++; }
    }
    photosNote.textContent = failed ? `${failed} file${failed > 1 ? 's' : ''} couldn’t be read. Try JPG or PNG.` : files.length > room ? `Only ${L.images} images fit; the rest were left out.` : '';
    syncPhotos(); change();
  };
  photosInput.addEventListener('change', () => { takePhotos([...photosInput.files]); photosInput.value = ''; });
  dropOn(photosWrap, takePhotos);
  syncPhotos();

  // Shown or hidden, and deleting the whole case study.
  const footer = el('div', 'study-footer');
  const visible = el('label', 'study-visible');
  const visibleBox = el('input');
  visibleBox.type = 'checkbox'; visibleBox.checked = !study.hidden;
  visible.append(visibleBox, el('span', '', 'Show on the website'));
  const syncVisible = () => { item.dataset.hidden = String(!visibleBox.checked); hiddenFlag.hidden = visibleBox.checked; };
  visibleBox.addEventListener('change', () => { syncVisible(); change(); });
  const removeButton = el('button', 'admin-button quiet study-delete', 'Delete case study');
  removeButton.type = 'button';
  const confirm = el('div', 'inbox-confirm');
  confirm.hidden = true;
  const sure = el('button', 'admin-button danger', 'Delete');
  const keep = el('button', 'admin-button quiet', 'Keep it');
  sure.type = keep.type = 'button';
  confirm.append(el('p', '', 'Delete this case study? It disappears when you publish.'), sure, keep);
  removeButton.addEventListener('click', () => { confirm.hidden = false; removeButton.hidden = true; keep.focus(); });
  keep.addEventListener('click', () => { confirm.hidden = true; removeButton.hidden = false; removeButton.focus(); });
  sure.addEventListener('click', () => removeStudy(item));
  footer.append(visible, removeButton, confirm);
  syncVisible();

  const grid = el('div', 'study-grid');
  grid.append(labelled('Name', nameInput, 'On the card.'), labelled('Category', categoryInput, 'Under the name on the card.'));
  body.append(grid, labelled('Title', titleInput, 'The heading when the case study is open.'), labelled('Story', story, 'Leave an empty line between paragraphs.'), facts, coverWrap, photosWrap, footer);
  toggle.addEventListener('click', () => {
    const open = body.hidden;
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    item.classList.toggle('is-open', open);
  });
  item.append(head, body);
  item.read = () => ({
    id: study.id, name: nameInput.value, category: categoryInput.value, title: titleInput.value,
    body: story.value.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean),
    facts: [...factRows.children].map(row => ({label: row.querySelector('input').value, value: row.querySelector('textarea').value, placeholder: row.querySelector('input[type=checkbox]').checked})),
    hidden: !visibleBox.checked, originalCover: Boolean(study.originalCover),
    thumbnail, images: [...photoGrid.children].map(tile => tile.photo)
  });
  item.open = () => { if (body.hidden) toggle.click(); nameInput.focus(); nameInput.select(); };
  return item;
}

// One article: title, address, Google title and description, date, text, shown or hidden.
// The address follows the title until the article has been shown once, so links never break.
function articleEditor(article, change, removeArticle) {
  const L = ARTICLE_LIMITS;
  const item = el('li', 'study');
  const head = el('div', 'study-head');
  const toggle = el('button', 'study-toggle');
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  const names = el('span', 'study-names');
  const name = el('strong', '', article.title || 'Untitled'), when = el('span', '', article.date ? dayLabel(article.date) : '');
  names.append(name, when);
  toggle.innerHTML = ICONS.chevron;
  toggle.prepend(names);
  const hiddenFlag = el('span', 'study-flag is-hidden', 'Hidden');
  head.append(toggle, hiddenFlag);
  const body = el('div', 'study-body');
  body.hidden = true;
  const input = (value, max, type = 'text') => { const field = el('input', 'content-input'); Object.assign(field, {type, value: value || '', maxLength: max, autocomplete: 'off'}); field.addEventListener('input', change); return field; };
  const titleInput = input(article.title, L.title), slugInput = input(article.slug, 70), seoInput = input(article.seoTitle, L.seoTitle), dateInput = input(article.date || today(), 10, 'date');
  const description = el('textarea', 'content-input');
  description.rows = 3; description.maxLength = L.description; description.value = article.description || '';
  description.addEventListener('input', change);
  const text = el('textarea', 'content-input article-text');
  text.rows = 18; text.maxLength = L.text; text.value = article.text || '';
  text.addEventListener('input', change);
  let slugFollows = Boolean(article.hidden) && (!article.slug || article.slug === articleSlug(article.title));
  titleInput.addEventListener('input', () => {
    name.textContent = titleInput.value || 'Untitled';
    if (slugFollows) slugInput.value = articleSlug(titleInput.value);
  });
  slugInput.addEventListener('input', () => { slugFollows = false; });
  dateInput.addEventListener('input', () => { when.textContent = dateInput.value ? dayLabel(dateInput.value) : ''; });
  const footer = el('div', 'study-footer');
  const visible = el('label', 'study-visible');
  const visibleBox = el('input');
  visibleBox.type = 'checkbox'; visibleBox.checked = !article.hidden;
  visible.append(visibleBox, el('span', '', 'Show on the website'));
  const syncVisible = () => { item.dataset.hidden = String(!visibleBox.checked); hiddenFlag.hidden = visibleBox.checked; };
  visibleBox.addEventListener('change', () => { syncVisible(); change(); });
  const removeButton = el('button', 'admin-button quiet study-delete', 'Delete article');
  removeButton.type = 'button';
  const confirm = el('div', 'inbox-confirm');
  confirm.hidden = true;
  const sure = el('button', 'admin-button danger', 'Delete');
  const keep = el('button', 'admin-button quiet', 'Keep it');
  sure.type = keep.type = 'button';
  confirm.append(el('p', '', 'Delete this article? It disappears when you publish.'), sure, keep);
  removeButton.addEventListener('click', () => { confirm.hidden = false; removeButton.hidden = true; keep.focus(); });
  keep.addEventListener('click', () => { confirm.hidden = true; removeButton.hidden = false; removeButton.focus(); });
  sure.addEventListener('click', () => removeArticle(item));
  footer.append(visible, removeButton, confirm);
  syncVisible();
  const grid = el('div', 'study-grid');
  grid.append(labelled('Address', slugInput, 'mihaiboboc.com/articles/… — lowercase letters, numbers and dashes.'), labelled('Date', dateInput));
  body.append(labelled('Title', titleInput, 'The heading of the article.'), grid,
    labelled('Google title', seoInput, 'Optional. Around 60 characters shows in full; empty uses the title.'),
    labelled('Description', description, 'Under the title in Google and in the list of articles. Around 155 characters.'),
    labelled('Text', text, 'Leave an empty line between paragraphs. Start a line with “## ” for a heading and “- ” for a bullet point.'),
    footer);
  toggle.addEventListener('click', () => {
    const open = body.hidden;
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    item.classList.toggle('is-open', open);
  });
  item.append(head, body);
  item.read = () => ({slug: slugInput.value.trim(), title: titleInput.value, seoTitle: seoInput.value, description: description.value, date: dateInput.value, hidden: !visibleBox.checked, text: text.value});
  item.open = () => { if (body.hidden) toggle.click(); titleInput.focus(); titleInput.select(); };
  return item;
}

// Each control returns {node, get, set} and calls change() when edited.
const controls = {
  // A short list of two-part items (a label and a value, a title and a text), reorderable.
  pairs(field, id, change) {
    const node = el('div', 'pairs');
    const list = el('ol', 'pair-list');
    list.id = id;
    const add = el('button', 'admin-button quiet content-add', field.add);
    add.type = 'button';
    const sync = () => {
      [...list.children].forEach((row, index, rows) => {
        row.querySelector('[data-move="-1"]').disabled = index === 0;
        row.querySelector('[data-move="1"]').disabled = index === rows.length - 1;
      });
      add.hidden = list.children.length >= field.max;
    };
    const pairRow = (item = {}) => {
      const row = el('li', 'pair-row');
      const first = el('input', 'content-input');
      Object.assign(first, {value: item[field.first] || '', maxLength: field.firstMax, placeholder: field.firstName, autocomplete: 'off'});
      first.setAttribute('aria-label', field.firstName);
      const second = el(field.multiline ? 'textarea' : 'input', 'content-input');
      Object.assign(second, {value: item[field.second] || '', maxLength: field.secondMax, placeholder: field.secondName});
      if (field.multiline) second.rows = 2;
      second.setAttribute('aria-label', field.secondName);
      for (const input of [first, second]) input.addEventListener('input', change);
      const tools = el('div', 'study-photo-tools');
      const up = smallButton('up', 'Move up'), down = smallButton('down', 'Move down'), remove = smallButton('close', `Remove this ${field.firstName.toLowerCase()}`);
      up.dataset.move = '-1'; down.dataset.move = '1';
      for (const button of [up, down]) button.addEventListener('click', () => {
        const sibling = button.dataset.move === '-1' ? row.previousElementSibling : row.nextElementSibling;
        if (!sibling) return;
        button.dataset.move === '-1' ? sibling.before(row) : sibling.after(row);
        sync(); change(); button.disabled ? first.focus() : button.focus();
      });
      remove.addEventListener('click', () => { const next = row.nextElementSibling || row.previousElementSibling; row.remove(); sync(); change(); (next?.querySelector('input') || add).focus(); });
      tools.append(up, down, remove);
      row.append(first, second, tools);
      row.read = () => ({[field.first]: first.value, [field.second]: second.value});
      return row;
    };
    add.addEventListener('click', () => { const row = pairRow(); list.append(row); sync(); change(); row.querySelector('input').focus(); });
    node.append(list, add);
    return {node, focus: null,
      get: () => [...list.children].map(row => row.read()),
      set: value => { list.replaceChildren(...(value || []).map(pairRow)); sync(); }};
  },
  // The brand strip: a live preview at the site's proportions, then one row per logo.
  logos(field, id, change) {
    const node = el('div', 'logos');
    const preview = el('div', 'logo-preview');
    preview.setAttribute('aria-hidden', 'true');
    const list = el('ol', 'logo-list');
    list.id = id;
    const input = fileInput(true);
    input.accept = 'image/png,image/webp,image/svg+xml';
    input.id = `field-${++uid}`;
    const add = el('label', 'admin-button', 'Add a logo');
    add.htmlFor = input.id;
    const note = el('p', 'content-photo-note');
    const bar = el('div', 'study-photos-bar');
    bar.append(input, add, note);
    node.append(preview, list, bar, el('p', 'content-hint', 'Use a logo on a transparent background (PNG or SVG; SVGs are turned into a sharp PNG first). Adjust the size until it sits well next to the others in the preview.'));
    const draw = () => {
      preview.replaceChildren(...[...list.children].map(row => {
        const brand = row.brand;
        const item = el('span', 'logo-preview-item');
        item.style.setProperty('--w', brand.width + 'px');
        item.style.setProperty('--h', brand.height + 'px');
        const image = el('img');
        image.src = srcOf(brand.image); image.alt = '';
        if (brand.image.endsWith('.svg')) image.dataset.vector = '';
        item.append(image);
        return item;
      }));
      [...list.children].forEach((row, index, rows) => {
        row.querySelector('[data-move="-1"]').disabled = index === 0;
        row.querySelector('[data-move="1"]').disabled = index === rows.length - 1;
      });
    };
    const logoRow = brand => {
      const row = el('li', 'logo-row' + (String(brand.image).startsWith('upload:') ? ' is-new' : ''));
      row.brand = {...brand};
      const ratio = brand.width / brand.height;
      const frame = el('span', 'logo-thumb');
      const image = el('img');
      image.src = srcOf(brand.image); image.alt = '';
      frame.append(image);
      const name = el('input', 'content-input');
      Object.assign(name, {value: brand.name, maxLength: 40, autocomplete: 'off', placeholder: 'Company name'});
      name.setAttribute('aria-label', 'Company name');
      name.addEventListener('input', () => { row.brand.name = name.value; change(); });
      const sizeWrap = el('label', 'logo-size');
      const size = el('input');
      Object.assign(size, {type: 'range', min: 60, max: 320, step: 1, value: Math.round(brand.width)});
      size.setAttribute('aria-label', `Size of ${brand.name || 'this logo'}`);
      const readout = el('span', '', `${Math.round(brand.width)} px`);
      size.addEventListener('input', () => {
        const width = Number(size.value);
        row.brand.width = width;
        row.brand.height = Math.round(width / ratio * 1000) / 1000;
        readout.textContent = `${width} px`;
        draw(); change();
      });
      sizeWrap.append(size, readout);
      const tools = el('div', 'study-photo-tools');
      const up = smallButton('up', 'Move logo earlier'), down = smallButton('down', 'Move logo later'), remove = smallButton('close', 'Remove logo');
      up.dataset.move = '-1'; down.dataset.move = '1';
      for (const button of [up, down]) button.addEventListener('click', () => {
        const sibling = button.dataset.move === '-1' ? row.previousElementSibling : row.nextElementSibling;
        if (!sibling) return;
        button.dataset.move === '-1' ? sibling.before(row) : sibling.after(row);
        draw(); change(); button.disabled ? name.focus() : button.focus();
      });
      remove.addEventListener('click', () => { const next = row.nextElementSibling || row.previousElementSibling; row.remove(); draw(); change(); (next?.querySelector('input') || add).focus(); });
      tools.append(up, down, remove);
      row.append(frame, name, sizeWrap, tools);
      return row;
    };
    const take = async files => {
      const chosen = files.filter(file => /^image\/(png|webp|svg\+xml)$/.test(file.type)).slice(0, 24 - list.children.length);
      if (!chosen.length) { if (files.length) note.textContent = 'Use a PNG, WebP or SVG logo.'; return; }
      let failed = 0;
      for (const file of chosen) {
        try {
          const next = await prepareImage(file, {max: 1200, name: 'logo'});
          // Start at a size similar to the others: about 44px tall, never wider than 220px.
          const ratio = next.width / next.height;
          const width = Math.round(Math.min(220, Math.max(60, 44 * ratio)));
          const row = logoRow({name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), image: next.value, width, height: Math.round(width / ratio * 1000) / 1000});
          list.append(row);
        } catch { failed++; }
      }
      note.textContent = failed ? 'One of the files couldn’t be read.' : '';
      draw(); change();
      list.lastElementChild?.querySelector('input')?.select();
    };
    input.addEventListener('change', () => { take([...input.files]); input.value = ''; });
    dropOn(node, take);
    return {node, focus: null,
      get: () => [...list.children].map(row => ({...row.brand})),
      set: value => { list.replaceChildren(...(value || []).map(logoRow)); draw(); }};
  },
  studies(field, id, change) {
    const node = el('div', 'studies');
    const list = el('ol', 'study-list');
    list.id = id;
    const divider = el('li', 'study-divider', 'Shown under “Show more work”');
    divider.setAttribute('aria-hidden', 'true');
    const place = () => {
      divider.remove();
      const items = [...list.querySelectorAll('.study')];
      items.forEach((item, index) => {
        item.querySelector('[aria-label^="Move"][aria-label$="up"]').disabled = index === 0;
        item.querySelector('[aria-label^="Move"][aria-label$="down"]').disabled = index === items.length - 1;
      });
      const shown = items.filter(item => item.dataset.hidden !== 'true');
      if (shown.length > 4) shown[4].before(divider);
    };
    const move = (item, step) => {
      const items = [...list.querySelectorAll('.study')];
      const index = items.indexOf(item), target = items[index + step];
      if (!target) return;
      const before = item.getBoundingClientRect().top;
      step < 0 ? target.before(item) : target.after(item);
      place();
      // Glide from the old place instead of jumping.
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) item.animate([{transform: `translateY(${before - item.getBoundingClientRect().top}px)`}, {transform: 'none'}], {duration: 320, easing: 'cubic-bezier(.22, 1, .36, 1)'});
      item.querySelector(`[aria-label$="${step < 0 ? 'up' : 'down'}"]:not(:disabled)`)?.focus() || item.querySelector('.study-toggle').focus();
      change();
    };
    const removeStudy = item => {
      const next = item.nextElementSibling?.classList.contains('study') ? item.nextElementSibling : item.previousElementSibling;
      item.remove(); place(); change();
      (next?.querySelector('.study-toggle') || add).focus();
    };
    const add = el('button', 'admin-button study-add', 'Add a case study');
    add.type = 'button';
    add.addEventListener('click', () => {
      const study = {id: 'study-' + newToken().slice(0, 8), name: 'New case study', category: '', title: '', body: [], facts: [], hidden: true, originalCover: false, thumbnail: null, images: []};
      const item = studyEditor(study, change, move, removeStudy);
      list.append(item); place(); change();
      item.open();
    });
    const note = el('p', 'content-hint', 'New case studies start hidden, so you can publish a draft and switch on “Show on the website” when it’s ready. To be shown, a case study needs a title, a story and a cover.');
    node.append(list, add, note);
    // Re-place the divider when a study is shown or hidden.
    list.addEventListener('change', event => { if (event.target.closest('.study-visible')) place(); });
    return {node, focus: null,
      get: () => [...list.querySelectorAll('.study')].map(item => item.read()),
      set: value => { list.replaceChildren(...(value || []).map(study => studyEditor(study, change, move, removeStudy))); place(); }};
  },
  articles(field, id, change) {
    const node = el('div', 'studies');
    const list = el('ol', 'study-list');
    list.id = id;
    const removeArticle = item => {
      const next = item.nextElementSibling || item.previousElementSibling;
      item.remove(); change();
      (next?.querySelector('.study-toggle') || add).focus();
    };
    const add = el('button', 'admin-button study-add', 'Add an article');
    add.type = 'button';
    add.addEventListener('click', () => {
      const item = articleEditor({slug: 'new-article', title: 'New article', seoTitle: '', description: '', date: today(), hidden: true, text: ''}, change, removeArticle);
      list.prepend(item); change();
      item.open();
    });
    node.append(add, list, el('p', 'content-hint', 'Articles show newest first. Hidden ones stay here as drafts.'));
    return {node, focus: null,
      get: () => [...list.children].map(item => item.read()),
      set: value => { list.replaceChildren(...[...(value || [])].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(article => articleEditor(article, change, removeArticle))); }};
  },
  image(field, id, change) {
    const node = el('div', 'content-photo');
    const frame = el('div', 'content-photo-frame');
    const img = el('img');
    img.alt = '';
    frame.append(img);
    const side = el('div', 'content-photo-side');
    const input = fileInput();
    input.id = id;
    const pick = el('label', 'admin-button', 'Choose a new photo');
    pick.htmlFor = id;
    const undo = el('button', 'admin-button quiet', 'Keep the current photo');
    undo.type = 'button'; undo.hidden = true;
    const note = el('p', 'content-photo-note');
    side.append(input, pick, undo, note);
    node.append(frame, side);
    let saved = '', value = '', small = false;
    const show = () => {
      const fresh = value !== saved;
      img.src = srcOf(value);
      frame.classList.toggle('is-new', fresh);
      undo.hidden = !fresh;
      note.textContent = fresh ? (small ? 'New photo, not published yet. It’s smaller than 800px, so it may look soft.' : 'New photo, not published yet.') : '';
    };
    const take = async ([file]) => {
      if (!file) return;
      note.textContent = 'Preparing the photo…';
      try { const next = await prepareImage(file, {square: true, max: 1200, name: 'about-photo'}); value = next.value; small = next.small; }
      catch { note.textContent = 'This file couldn’t be read. Try a JPG or PNG.'; return; }
      show(); change();
    };
    input.addEventListener('change', () => { take([...input.files]); input.value = ''; });
    undo.addEventListener('click', () => { value = saved; show(); change(); pick.focus(); });
    dropOn(frame, take);
    return {node, focus: input, get: () => value, set: next => { saved = value = next || ''; show(); }};
  },
  text(field, id, change) {
    const input = el('textarea');
    input.id = id; input.rows = field.rows || 3; input.maxLength = field.max;
    const count = el('span', 'content-count');
    const update = () => {
      count.textContent = `${input.value.length}/${field.max}`;
      count.hidden = input.value.length < field.max * .8;
    };
    input.addEventListener('input', () => { update(); change(); });
    const node = el('div', 'content-text');
    node.append(input, count);
    return {node, focus: input, get: () => input.value, set: value => { input.value = value ?? ''; update(); }};
  },
  email(field, id, change) { return controls.line(field, id, change, 'email'); },
  // A single line of text with a character limit.
  short(field, id, change) {
    const input = el('input', 'content-input');
    Object.assign(input, {id, type: 'text', maxLength: field.max, autocomplete: 'off'});
    input.addEventListener('input', change);
    return {node: input, focus: input, get: () => input.value, set: value => { input.value = value ?? ''; }};
  },
  url(field, id, change) { return controls.line(field, id, change, 'url', 'https://'); },
  line(field, id, change, type, placeholder = '') {
    const input = el('input', 'content-input');
    Object.assign(input, {id, type, placeholder, autocomplete: 'off', spellcheck: false});
    input.addEventListener('input', change);
    return {node: input, focus: input, get: () => input.value, set: value => { input.value = value ?? ''; }};
  },
  weekdays(field, id, change) {
    const node = el('div', 'content-days');
    node.setAttribute('role', 'group');
    const boxes = WEEKDAYS.map(([value, label]) => {
      const wrap = el('label', 'content-day');
      const box = el('input');
      box.type = 'checkbox'; box.value = value;
      if (value === 1) box.id = id;
      box.addEventListener('change', change);
      wrap.append(box, el('span', '', label));
      node.append(wrap);
      return box;
    });
    return {node, focus: boxes[0], get: () => boxes.filter(box => box.checked).map(box => Number(box.value)),
      set: value => boxes.forEach(box => { box.checked = (value || []).includes(Number(box.value)); })};
  },
  hours(field, id, change) {
    const node = el('div', 'content-hours');
    const rows = el('div', 'content-hour-rows');
    const add = el('button', 'admin-button quiet content-add', 'Add hours');
    add.type = 'button';
    const row = (start = '14:00', end = '17:00') => {
      const line = el('div', 'content-hour');
      const from = el('input', 'content-input'), to = el('input', 'content-input');
      from.type = to.type = 'time'; from.step = to.step = 900;
      from.value = start; to.value = end;
      from.setAttribute('aria-label', 'From'); to.setAttribute('aria-label', 'Until');
      const remove = el('button', 'content-remove');
      remove.type = 'button'; remove.setAttribute('aria-label', 'Remove these hours');
      remove.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
      remove.addEventListener('click', () => { line.remove(); sync(); change(); add.focus(); });
      for (const input of [from, to]) input.addEventListener('input', change);
      line.append(from, el('span', 'content-dash', '–'), to, remove);
      rows.append(line);
      sync();
      return from;
    };
    const sync = () => {
      const lines = rows.querySelectorAll('.content-hour');
      lines.forEach(line => { line.querySelector('.content-remove').hidden = lines.length < 2; });
      add.hidden = lines.length >= 4;
    };
    add.addEventListener('click', () => { row().focus(); change(); });
    node.append(rows, add);
    return {node, focus: null,
      get: () => [...rows.querySelectorAll('.content-hour')].map(line => [...line.querySelectorAll('input')].map(input => input.value).join('-')).join(', '),
      set: value => {
        rows.replaceChildren();
        const ranges = String(value || '').split(',').map(part => part.trim()).filter(Boolean);
        (ranges.length ? ranges : ['10:00-17:00']).forEach(range => { const [start, end] = range.split('-'); row(start, end); });
        rows.querySelector('input').id = id;
      }};
  },
  timezone(field, id, change) {
    let zones = [];
    try { zones = Intl.supportedValuesOf('timeZone'); } catch {}
    if (!zones.length) return controls.line(field, id, change, 'text');
    const select = el('select', 'content-input');
    select.id = id;
    select.addEventListener('change', change);
    const fill = value => {
      const list = zones.includes(value) || !value ? zones : [value, ...zones];
      select.replaceChildren(...list.map(zone => { const option = el('option', '', zone.replace(/_/g, ' ')); option.value = zone; return option; }));
      select.value = value;
    };
    return {node: select, focus: select, get: () => select.value, set: fill};
  },
  choice(field, id, change) {
    const select = el('select', 'content-input content-short');
    select.id = id;
    select.append(...field.options.map(value => { const option = el('option', '', `${value} ${field.unit}`); option.value = value; return option; }));
    select.addEventListener('change', change);
    return {node: select, focus: select, get: () => Number(select.value), set: value => { select.value = String(value); }};
  },
  number(field, id, change) {
    const node = el('div', 'content-unit');
    const input = el('input', 'content-input content-short');
    Object.assign(input, {id, type: 'number', min: field.min, max: field.max, step: 1, inputMode: 'numeric'});
    input.addEventListener('input', change);
    node.append(input, el('span', '', field.unit));
    return {node, focus: input, get: () => input.value === '' ? '' : Number(input.value), set: value => { input.value = value ?? ''; }};
  },
  dates(field, id, change) {
    const node = el('div', 'content-dates');
    const list = el('ul', 'content-date-list');
    const picker = el('div', 'content-date-add');
    const input = el('input', 'content-input content-short');
    input.type = 'date'; input.id = id; input.min = today();
    input.setAttribute('aria-label', 'Day off to add');
    const add = el('button', 'admin-button', 'Add day');
    add.type = 'button';
    let days = [];
    const draw = () => {
      list.replaceChildren(...days.map(day => {
        const item = el('li', 'content-date' + (day < today() ? ' is-past' : ''));
        const remove = el('button', 'content-remove');
        remove.type = 'button'; remove.setAttribute('aria-label', 'Remove ' + dayLabel(day));
        remove.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
        remove.addEventListener('click', () => { days = days.filter(other => other !== day); draw(); change(); input.focus(); });
        item.append(el('span', '', dayLabel(day)), remove);
        return item;
      }));
      list.hidden = !days.length;
    };
    const commit = () => {
      if (!input.value || days.includes(input.value)) return;
      days = [...days, input.value].sort();
      input.value = ''; draw(); change();
    };
    add.addEventListener('click', commit);
    input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); commit(); } });
    picker.append(input, add);
    node.append(list, picker);
    return {node, focus: input, get: () => [...days], set: value => { days = [...(value || [])].sort(); draw(); }};
  }
};

function summary(values) {
  const days = WEEKDAYS.filter(([day]) => values.weekdays.includes(day)).map(([, label]) => label);
  const run = days.length > 2 && WEEKDAYS.slice(values.weekdays[0] - 1, values.weekdays.at(-1)).every(([day]) => values.weekdays.includes(day))
    ? `${days[0]}–${days.at(-1)}` : days.join(', ');
  const hours = String(values.workingHours).split(',').map(range => range.trim().replace('-', '–')).join(' and ');
  return `Visitors can request ${values.durationMinutes}-minute calls ${run || 'on no days'}, ${hours} (${String(values.timeZone).replace(/_/g, ' ')}), from ${values.noticeHours} hours to ${values.horizonDays} days ahead.`;
}

function section(config, saved, version) {
  // The sections exist in the page so the sidebar's #links always have a target.
  const card = document.getElementById(config.id) || el('section', 'content-card');
  card.id = config.id;
  card.dataset.section = config.id;
  card.setAttribute('aria-label', config.label);
  card.hidden = true;
  const body = el('div', 'content-fields' + (config.id === 'meetings' ? ' is-grid' : ''));
  const fields = new Map();
  const note = config.id === 'meetings' ? el('p', 'content-summary') : null;
  const foot = el('div', 'content-foot');
  const message = el('p', 'content-message');
  message.setAttribute('role', 'status');
  const discard = el('button', 'admin-button quiet', 'Discard');
  const publish = el('button', 'admin-button primary', 'Publish changes');
  discard.type = publish.type = 'button';
  const actions = el('div', 'request-actions');
  actions.append(discard, publish);
  foot.append(message, actions);

  const entry = {saved, version, card};
  const read = () => Object.fromEntries([...fields].map(([key, field]) => [key, field.control.get()]));
  const change = () => {
    const dirty = !same(read(), entry.saved);
    card.classList.toggle('is-dirty', dirty);
    publish.disabled = discard.disabled = !dirty || card.classList.contains('is-busy');
    if (dirty && !card.classList.contains('is-busy')) { message.textContent = 'Unsaved changes'; message.dataset.tone = 'wait'; }
    else if (!dirty && (message.dataset.tone === 'wait' || !message.textContent)) { message.textContent = idle(); delete message.dataset.tone; }
    if (note) { const values = read(); note.textContent = checkSection(config, values).values ? summary(values) : ''; }
    document.querySelector(`[data-nav="${config.id}"]`)?.classList.toggle('is-dirty', dirty);
  };
  const setErrors = (errors = {}) => {
    for (const [key, field] of fields) {
      field.error.textContent = errors[key] || '';
      field.wrap.classList.toggle('has-error', Boolean(errors[key]));
    }
  };
  for (const field of config.fields) {
    const id = `field-${++uid}`;
    const control = controls[field.type](field, id, () => { if (fields.get(field.key).error.textContent) setErrors({}); change(); });
    const wrap = el('div', `content-field is-${field.type}`);
    const label = el(field.type === 'weekdays' ? 'p' : 'label', ['studies', 'logos', 'articles'].includes(field.type) ? 'sr-only' : 'content-label', field.label);
    if (field.type !== 'weekdays') label.htmlFor = id; else { label.id = id + '-label'; control.node.setAttribute('aria-labelledby', label.id); }
    const error = el('p', 'content-error');
    error.id = id + '-error';
    wrap.append(label, control.node);
    if (field.hint) { const hint = el('p', 'content-hint', field.hint); hint.id = id + '-hint'; wrap.append(hint); control.focus?.setAttribute('aria-describedby', hint.id + ' ' + error.id); }
    wrap.append(error);
    if (field.group) body.append(el('h3', 'content-group', field.group));
    body.append(wrap);
    control.set(saved[field.key]);
    fields.set(field.key, {control, wrap, error});
  }
  if (note) body.append(note);

  discard.addEventListener('click', () => {
    for (const [key, field] of fields) field.control.set(entry.saved[key]);
    setErrors({}); change();
  });
  publish.addEventListener('click', async () => {
    const values = read();
    const checked = checkSection(config, values);
    if (checked.errors) { setErrors(checked.errors); message.textContent = 'Some fields need a look.'; message.dataset.tone = 'error'; focusError(); return; }
    card.classList.add('is-busy');
    publish.disabled = discard.disabled = true;
    publish.textContent = 'Publishing…';
    message.textContent = ''; delete message.dataset.tone;
    // Only the new images still in use travel with the save.
    const uploads = {};
    if (checked.values) for (const [, token] of JSON.stringify(checked.values).matchAll(/"upload:([a-z0-9]+)"/g)) {
      const image = pendingImages.get(token);
      if (image) uploads[token] = {data: image.data, name: image.name};
    }
    const sending = Object.keys(uploads).length;
    if (sending) publish.textContent = `Uploading ${sending} image${sending > 1 ? 's' : ''}…`;
    try {
      const response = await fetch(api, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({section: config.id, values: checked.values, uploads, version: entry.version})});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.errors) setErrors(result.errors);
        throw Object.assign(Error(), {message: response.status === 413 ? 'That photo is too large. Try a smaller one.' : response.status === 401 ? 'Your sign-in has expired. Reload the page to sign in again.' : result.message || 'That couldn’t be published. Please try again.'});
      }
      // Sections that share a file share its new version.
      for (const other of CONTENT_SECTIONS) if (other.file === result.file) state.get(other.id).version = result.version;
      for (const token of Object.keys(uploads)) { URL.revokeObjectURL(pendingImages.get(token)?.url); pendingImages.delete(token); }
      entry.saved = result.values;
      for (const [key, field] of fields) field.control.set(result.values[key]);
      card.classList.remove('is-busy');
      publish.textContent = 'Publish changes';
      change();
      if (result.unchanged) { message.textContent = 'Already up to date.'; message.dataset.tone = 'ok'; }
      else if (result.source === 'local') { message.textContent = 'Saved to your local files and rebuilt. Reload the site preview to see it.'; message.dataset.tone = 'ok'; }
      else watchDeploy(result.commit, message);
    } catch (failure) {
      card.classList.remove('is-busy');
      publish.textContent = 'Publish changes';
      message.textContent = failure.message; message.dataset.tone = 'error';
      change();
      message.textContent = failure.message; message.dataset.tone = 'error';
      focusError();
    }
  });
  const focusError = () => card.querySelector('.has-error input, .has-error textarea, .has-error select')?.focus();

  card.append(body, foot);
  Object.assign(entry, {read, setErrors, change});
  state.set(config.id, entry);
  change();
  return card;
}

// Cloudflare rebuilds the site from the new commit; wait until the deployed version matches.
async function watchDeploy(commit, message) {
  message.dataset.tone = 'wait';
  message.textContent = 'Published. The site is rebuilding, usually about a minute…';
  const started = Date.now();
  while (Date.now() - started < 5 * 60000) {
    await new Promise(resolve => setTimeout(resolve, 6000));
    try {
      const live = await (await fetch('/admin/version.json?t=' + Date.now(), {cache: 'no-store'})).json();
      if (live.commit && commit && live.commit === commit) {
        message.dataset.tone = 'ok';
        message.replaceChildren('Live on the site. ');
        const link = el('a', '', 'View it');
        link.href = '/'; link.target = '_blank'; link.rel = 'noopener';
        message.append(link);
        return;
      }
    } catch {}
  }
  message.dataset.tone = 'wait';
  message.textContent = 'Saved to GitHub. The rebuild is taking longer than usual; check Cloudflare Pages if it doesn’t appear soon.';
}

window.addEventListener('beforeunload', event => {
  if (document.querySelector('.content-card.is-dirty, .content-card.is-busy')) { event.preventDefault(); event.returnValue = ''; }
});

async function load() {
  try {
    const response = await fetch(api, {cache: 'no-store'});
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      status.textContent = response.status === 401 && (!result.reason || ['no_token', 'expired'].includes(result.reason))
        ? 'Your sign-in has expired. Reload the page to sign in again.'
        : result.message || 'Content couldn’t be loaded. Please try again.';
      return;
    }
    await thumbsReady;
    source = result.source;
    status.textContent = '';
    document.querySelector('[data-who]').textContent = result.signedInAs ? 'Signed in as ' + result.signedInAs : '';
    document.querySelector('[data-local]').hidden = source !== 'local';
    const byId = new Map(result.sections.map(item => [item.id, item]));
    root.replaceChildren(...CONTENT_SECTIONS.filter(config => byId.has(config.id)).map(config => section(config, byId.get(config.id).values, byId.get(config.id).version)));
    show();
  } catch {
    status.textContent = 'Content couldn’t be loaded. Check your connection and reload.';
  }
}
// One section at a time, chosen in the sidebar (#home, #about, #meetings). Edits in other
// sections stay in place while you switch.
function show() {
  const config = CONTENT_SECTIONS.find(item => item.id === location.hash.slice(1)) || CONTENT_SECTIONS[0];
  title.textContent = config.label;
  lede.textContent = config.lede;
  document.title = `${config.label} · Admin · Mihai Boboc`;
  for (const card of root.children) {
    const visible = card.dataset.section === config.id;
    if (visible && card.hidden) { card.hidden = false; card.style.animation = 'none'; card.offsetWidth; card.style.animation = ''; }
    else if (!visible) card.hidden = true;
  }
}
window.addEventListener('hashchange', () => { show(); document.querySelector('#main').focus({preventScroll: true}); scrollTo({top: 0}); });
title.textContent = (CONTENT_SECTIONS.find(item => item.id === location.hash.slice(1)) || CONTENT_SECTIONS[0]).label;
load();
