const strip = document.querySelector('brand-marquee');
const trigger = document.querySelector('.work-preview-trigger');
const region = document.querySelector('.work-preview-region');
const cards = [...region.querySelectorAll('.work-preview-card')];
const moreButton = region.querySelector('.work-preview-more');
const shade = document.querySelector('.work-preview-shade');
const dialog = document.querySelector('.work-preview-detail');
const tuning = document.querySelector('.work-preview-tuning');
const scenes = [...document.querySelectorAll('body > .site-header, body > main')];
const hero = document.querySelector('interactive-typewriter');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
if (hero) hero.listenOnScroll = () => {}; // Scroll now belongs to the work preview in this experiment.
let pinned = false;
let closeTimer;
let lastViewport;

const isOpen = () => document.body.dataset.workPreview === 'open';
const inInquiry = () => document.body.dataset.inquiryActive === 'true';

function open({pin = false, focus = false} = {}) {
  if (inInquiry()) return;
  clearTimeout(closeTimer);
  pinned ||= pin;
  if (!isOpen()) {
    const viewport = `${innerWidth}x${innerHeight}:${scrollY}`;
    if (viewport !== lastViewport) {
      for (const scene of scenes) {
        const bounds = scene.getBoundingClientRect();
        scene.style.setProperty('--preview-origin', `${innerWidth / 2 - bounds.left}px ${innerHeight / 2 - bounds.top}px`);
      }
      lastViewport = viewport;
    }
    hero?.finishTyping?.();
    document.body.dataset.workPreview = 'open';
    trigger.setAttribute('aria-expanded', 'true');
    region.inert = false;
  }
  if (focus) cards[0].focus({preventScroll:true});
}

function close({restoreFocus = false} = {}) {
  if (!isOpen()) return;
  clearTimeout(closeTimer);
  pinned = false;
  delete document.body.dataset.workPreview;
  trigger.setAttribute('aria-expanded', 'false');
  region.inert = true;
  if (restoreFocus) trigger.focus({preventScroll:true});
}

function settlePointer() {
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    const keyboardFocus = region.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    if (!pinned && !region.matches(':hover') && !keyboardFocus && !dialog.open) close();
  }, 140);
}

strip.addEventListener('pointerenter', event => {
  if (finePointer.matches && event.pointerType === 'mouse') open();
});
strip.addEventListener('pointerleave', settlePointer);
region.addEventListener('pointerenter', () => clearTimeout(closeTimer));
region.addEventListener('pointerleave', settlePointer);
region.addEventListener('focusout', settlePointer);
trigger.addEventListener('click', event => {
  if (isOpen() && pinned) close({restoreFocus:true});
  else open({pin:true, focus:event.detail === 0});
});
shade.addEventListener('click', () => close({restoreFocus:region.contains(document.activeElement)}));
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || dialog.open || !isOpen()) return;
  event.preventDefault();
  close({restoreFocus:region.contains(document.activeElement)});
});

const frame = dialog.querySelector('.work-project-frame');
const cover = dialog.querySelector('.work-project-cover');
const readers = [...dialog.querySelectorAll('.case-reader')];
const aboutReader = dialog.querySelector('.case-reader[data-about]');
const aboutLink = document.querySelector('.site-header .nav-about');
const ABOUT = -1; // `selected` value while About is open: the rail then shows every case study.
let reader = readers[0];
let readerContent = reader.querySelector('.case-reader-content');
const rail = dialog.querySelector('.work-project-rail');
const readButton = dialog.querySelector('.work-project-read');
const closeButton = dialog.querySelector('.work-project-close');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let selected;

const MORPH_EASE = 'cubic-bezier(.22,1,.36,1)';
const header = document.querySelector('body > .site-header');

// Morph-extend: the frame grows out of the source card's footprint (position, size and radius)
// instead of scaling the finished layout, so text and artwork never stretch.
function morphFrame(from, {reverse = false} = {}) {
  const parts = [frame, ...frame.children, rail];
  for (const element of parts) for (const animation of element.getAnimations()) animation.cancel();
  if (reduceMotion.matches || !frame.animate || !from?.width) return Promise.resolve();
  const to = frame.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const ix = Math.max(0, (to.width - from.width) / 2);
  const iy = Math.max(0, (to.height - from.height) / 2);
  // With corner smoothing the CSS radius is twice the Figma radius; the clip uses the round equivalent.
  const smoothing = CSS.supports('corner-shape', 'superellipse(2)') ? 2 : 1;
  const cardRadius = (parseFloat(getComputedStyle(cards[0]).borderTopLeftRadius) || 32) / smoothing;
  const frameRadius = (parseFloat(getComputedStyle(frame).borderTopLeftRadius) || 120) / smoothing;
  const small = {transform:`translate(${dx}px,${dy}px)`, clipPath:`inset(${iy}px ${ix}px round ${cardRadius}px)`};
  const large = {transform:'none', clipPath:`inset(0px 0px round ${frameRadius}px)`};
  const shape = frame.animate(reverse ? [large, small] : [small, large], {duration:reverse ? 560 : 700, easing:MORPH_EASE, fill:reverse ? 'forwards' : 'none'});
  for (const child of frame.children) {
    child.animate(reverse ? [{opacity:1}, {opacity:0}] : [{opacity:0}, {opacity:1}],
      reverse ? {duration:180, easing:'ease-in', fill:'forwards'} : {duration:380, delay:300, easing:'ease-out', fill:'backwards'});
  }
  rail.animate(reverse ? [{opacity:1}, {opacity:0}] : [{opacity:0, transform:'translateY(14px)'}, {opacity:1, transform:'none'}],
    reverse ? {duration:200, fill:'forwards'} : {duration:460, delay:360, easing:MORPH_EASE, fill:'backwards'});
  if (reverse) frame.animate([{opacity:1}, {opacity:0}], {duration:220, delay:340, fill:'forwards'});
  return shape.finished.catch(() => {});
}

// Reading view lines up with the header (logo to Get in touch) and sits, with the other work, in the space below it.
function placeReader() {
  dialog.style.removeProperty('margin');
  dialog.style.removeProperty('width');
  dialog.style.removeProperty('--reader-height');
  if (dialog.dataset.mode !== 'reader' || innerWidth <= 700 || !header) return;
  // The homepage behind is scaled around the viewport centre, so align with where its header edges end up.
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--preview-scale')) || .87;
  const cx = innerWidth / 2, cy = innerHeight / 2;
  const styles = getComputedStyle(header);
  const rawLeft = header.offsetLeft + parseFloat(styles.paddingLeft);
  const rawWidth = header.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const rawBottom = header.offsetTop + header.offsetHeight - scrollY;
  const left = cx + (rawLeft - cx) * scale;
  const width = rawWidth * scale;
  const headerBottom = Math.max(0, cy + (rawBottom - cy) * scale);
  const railSpace = rail.offsetHeight + parseFloat(getComputedStyle(rail).marginTop || 0);
  const height = Math.max(360, Math.min(width / 1.74, innerHeight - headerBottom - railSpace - 40));
  const top = headerBottom + Math.max(16, (innerHeight - headerBottom - height - railSpace) / 2 - 8);
  dialog.style.margin = `${Math.round(top)}px 0 0 ${Math.round(left)}px`;
  dialog.style.width = `${Math.round(width)}px`;
  dialog.style.setProperty('--reader-height', `${Math.round(height)}px`);
}
addEventListener('resize', () => { if (dialog.open) placeReader(); });

function setMode(mode) {
  dialog.dataset.mode = mode;
  const reading = mode === 'reader';
  cover.hidden = reading;
  for (const item of readers) item.hidden = !reading || item !== reader;
  dialog.setAttribute('aria-labelledby', reading ? reader.querySelector('h2').id : 'work-preview-detail-name');
}

// Rail as a carousel: it opens with the studies that follow the selected one (wrapping round).
// Switching runs in two calm, non-overlapping steps that match the story crossfade above:
//   1. the picked thumbnail fades out where it is (as the old story fades),
//   2. the rest glide left together and the study you just left eases in at the right-hand end.
// Thumbnails are kept and moved, never rebuilt, so their images never reload or flash.
let railOrder = [];
const railNodes = new Map();
const GLIDE = 'cubic-bezier(.65,0,.35,1)'; // ease-in-out
const SETTLE = 'cubic-bezier(.22,1,.36,1)'; // ease-out
function thumbnail(i) {
  if (!railNodes.has(i)) {
    const node = cards[i].cloneNode(true);
    node.dataset.project = i;
    node.hidden = false;
    delete node.dataset.extra;
    railNodes.set(i, node);
  }
  return railNodes.get(i);
}
function settleRail(order) {
  railOrder = order;
  for (const node of railNodes.values()) for (const animation of node.getAnimations()) animation.cancel();
  rail.replaceChildren(...order.map(thumbnail));
}
function buildRail(index, previous) {
  // About has no rail: it is about the person, not the work.
  rail.hidden = index === ABOUT;
  if (rail.hidden) { railOrder = []; return rail.replaceChildren(); }
  rail.inert = false;
  if (previous === undefined || previous === ABOUT || !railOrder.length) {
    return settleRail(cards.map((_, i) => (index + 1 + i) % cards.length).filter(i => i !== index));
  }
  const next = [...railOrder.filter(i => i !== index), ...(railOrder.includes(previous) || previous === index ? [] : [previous])];
  if (reduceMotion.matches || !railOrder.includes(index)) return settleRail(next);
  rail.inert = true; // no hover lifts or double clicks while it moves
  const fade = thumbnail(index).animate([{opacity:1, transform:'none'}, {opacity:0, transform:'scale(.97)'}],
    {duration:240, easing:'cubic-bezier(.4,0,1,1)', fill:'forwards'});
  fade.finished.catch(() => {}).then(() => {
    const before = new Map(next.map(i => [i, rail.contains(thumbnail(i)) ? thumbnail(i).getBoundingClientRect().left : null]));
    settleRail(next);
    const moves = next.map(i => {
      const node = thumbnail(i);
      if (before.get(i) === null) {
        return node.animate([{opacity:0, transform:'translateX(20px)'}, {opacity:1, transform:'none'}], {duration:520, delay:160, easing:SETTLE, fill:'backwards'});
      }
      const dx = before.get(i) - node.getBoundingClientRect().left;
      return dx ? node.animate([{transform:`translateX(${dx}px)`}, {transform:'none'}], {duration:560, easing:GLIDE}) : null;
    }).filter(Boolean);
    Promise.all(moves.map(move => move.finished.catch(() => {}))).then(() => { rail.inert = false; });
  });
}

function showStudy(study) {
  reader = study;
  readerContent = reader.querySelector('.case-reader-content');
  readerContent.scrollTop = 0;
  setMode('reader');
  updateTopButton();
}

// Back to top: shows once the story has scrolled past roughly half the frame.
const topButton = dialog.querySelector('.work-project-top');
function updateTopButton() {
  topButton.classList.toggle('is-shown', dialog.dataset.mode === 'reader' && readerContent.scrollTop > readerContent.clientHeight * .5);
}
dialog.addEventListener('scroll', event => { if (event.target === readerContent) updateTopButton(); }, true);
topButton.addEventListener('click', () => {
  readerContent.scrollTo({top:0, behavior:reduceMotion.matches ? 'auto' : 'smooth'});
  reader.querySelector('h2').focus({preventScroll:true});
});

// Switching case studies keeps the frame still: the current story drifts up and dissolves,
// the next one settles in from just below.
let switching = null;
function switchStudy(index, study) {
  const outgoing = reader;
  const previous = selected;
  selected = index;
  buildRail(index, previous);
  if (reduceMotion.matches || outgoing === study) {
    showStudy(study);
    study.querySelector('h2').focus({preventScroll:true});
    return;
  }
  switching?.cancel();
  const out = outgoing.animate([
    {opacity:1, transform:'none', filter:'blur(0)'},
    {opacity:0, transform:'translateY(-14px)', filter:'blur(6px)'}
  ], {duration:240, easing:'cubic-bezier(.4,0,1,1)', fill:'forwards'});
  switching = out;
  out.finished.then(() => {
    out.cancel();
    showStudy(study);
    study.querySelector('h2').focus({preventScroll:true});
    study.animate([
      {opacity:0, transform:'translateY(18px)', filter:'blur(6px)'},
      {opacity:1, transform:'none', filter:'blur(0)'}
    ], {duration:520, easing:MORPH_EASE});
  }).catch(() => {});
}

function selectProject(index, source) {
  const study = readers.find(item => Number(item.dataset.study) === index);
  if (dialog.open && dialog.dataset.mode === 'reader' && study) return switchStudy(index, study);
  const from = source.getBoundingClientRect();
  selected = index;
  const card = cards[index];
  setMode('cover');
  dialog.querySelector('#work-preview-detail-name').textContent = card.querySelector('strong').textContent;
  dialog.querySelector('.work-preview-detail-category').textContent = card.querySelector('small').textContent;
  dialog.querySelector('.work-preview-detail-art').replaceChildren(card.querySelector('.work-preview-art').cloneNode(true));
  readButton.hidden = true;
  rail.replaceChildren();
  buildRail(index);
  document.body.dataset.selectedWork = '';
  if (!dialog.open) dialog.showModal();
  else closeButton.focus({preventScroll:true});
  if (study) {
    showStudy(study);
    reader.querySelector('h2').focus({preventScroll:true});
  }
  placeReader();
  morphFrame(from);
}

// About opens in the same focus view: it grows out of the header link and the homepage blurs behind it.
// It has no rail of work beneath it.
function openAbout() {
  if (!aboutReader || leaving) return;
  if (dialog.open && dialog.dataset.mode === 'reader') return switchStudy(ABOUT, aboutReader);
  const from = aboutLink.getBoundingClientRect();
  open({pin:true});
  selected = ABOUT;
  rail.replaceChildren();
  buildRail(ABOUT);
  document.body.dataset.selectedWork = '';
  if (!dialog.open) dialog.showModal();
  showStudy(aboutReader);
  aboutReader.querySelector('h2').focus({preventScroll:true});
  placeReader();
  morphFrame(from);
}
aboutLink?.addEventListener('click', event => {
  event.preventDefault();
  openAbout();
});

function leaveReader() {
  const from = frame.getBoundingClientRect();
  setMode('cover');
  placeReader();
  morphFrame(from);
  readButton.focus({preventScroll:true});
}

cards.forEach((card, index) => card.addEventListener('click', () => selectProject(index, card)));
rail.addEventListener('click', event => {
  const card = event.target.closest('[data-project]');
  if (card) selectProject(Number(card.dataset.project), card);
});
readButton.addEventListener('click', () => {
  const from = frame.getBoundingClientRect();
  setMode('reader');
  readerContent.scrollTop = 0;
  placeReader();
  morphFrame(from);
  reader.querySelector('h2').focus({preventScroll:true});
});
// × (and Escape) leave the case study the same way as the blur: it shrinks back into its card on the home screen.
closeButton.addEventListener('click', () => leaveToHome());
dialog.addEventListener('cancel', event => {
  event.preventDefault();
  leaveToHome();
});
dialog.addEventListener('close', () => {
  delete document.body.dataset.selectedWork;
  for (const property of ['margin', 'width', '--reader-height']) dialog.style.removeProperty(property);
  if (selected === ABOUT) aboutLink?.focus({preventScroll:true});
  else if (isOpen()) cards[selected]?.focus({preventScroll:true});
});

// Leaving through the blur: the case study shrinks back into its card while the homepage comes back into focus.
let leaving = false;
function leaveToHome() {
  if (leaving) return;
  leaving = true;
  // A case study opened from the rail may belong to the folded second row; unfold it so the morph has a card to land in.
  if (cards[selected]?.hidden) toggleMore(true);
  const target = selected === ABOUT ? aboutLink?.getBoundingClientRect() : cards[selected]?.getBoundingClientRect();
  close();
  morphFrame(target, {reverse:true}).then(() => {
    dialog.close();
    for (const element of [frame, ...frame.children, rail]) for (const animation of element.getAnimations()) animation.cancel();
    leaving = false;
  });
}

// Closing call to action: leave the case study and start the same inquiry as the header's Get in touch.
dialog.addEventListener('click', event => {
  if (!event.target.closest('[data-case-contact]')) return;
  event.preventDefault();
  dialog.close();
  close();
  document.querySelector('.site-header .nav-contact')?.click();
});

dialog.addEventListener('click', event => {
  if (event.target === dialog) leaveToHome();
});
if (new URLSearchParams(location.search).has('tune')) {
  tuning.hidden = false;
  const ranges = [...tuning.querySelectorAll('input[type=range]')];
  function applySettings() {
    for (const range of ranges) {
      range.previousElementSibling.value = range.value + range.dataset.unit;
      const value = range.id === 'preview-scale' ? String(Number(range.value) / 100) : range.value + range.dataset.unit;
      document.documentElement.style.setProperty('--' + range.id, value);
    }
  }
  tuning.addEventListener('input', () => { applySettings(); open({pin:true}); });
  tuning.querySelector('.work-preview-reset').addEventListener('click', () => {
    for (const range of ranges) range.value = range.defaultValue;
    applySettings();
  });
  applySettings();
}

// Scroll down (wheel or swipe up) opens the work preview; scrolling back up closes it.
let wheelDistance = 0, wheelAt = 0, touchY = null;
function scrollIntent(delta) {
  if (dialog.open || inInquiry() || document.activeElement?.matches('textarea, input')) return;
  if (delta > 0 && !isOpen()) open({pin:true});
  else if (delta < 0 && isOpen() && pinned) close();
}
addEventListener('wheel', event => {
  if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  if (event.timeStamp - wheelAt > 200) wheelDistance = 0;
  wheelAt = event.timeStamp;
  wheelDistance += event.deltaY * (event.deltaMode === 0 ? 1 : 16);
  if (Math.abs(wheelDistance) >= 24) { scrollIntent(wheelDistance); wheelDistance = 0; }
}, {passive:true});
addEventListener('touchstart', event => { touchY = event.touches[0]?.clientY ?? null; }, {passive:true});
addEventListener('touchmove', event => {
  if (touchY === null) return;
  const delta = touchY - event.touches[0].clientY;
  if (Math.abs(delta) >= 36) { scrollIntent(delta); touchY = null; }
}, {passive:true});

// "More": the visible row eases up while the next four rise in beneath it (FLIP, so it stays smooth).
const extras = cards.filter(card => card.hasAttribute('data-extra'));
function toggleMore(expand = moreButton.getAttribute('aria-expanded') !== 'true') {
  const base = cards.filter(card => !card.hasAttribute('data-extra'));
  const before = base.map(card => card.getBoundingClientRect().top);
  const animate = !reduceMotion.matches && document.body.dataset.workPreview === 'open';
  const finish = () => {
    for (const card of extras) card.hidden = !expand;
    moreButton.setAttribute('aria-expanded', String(expand));
    moreButton.setAttribute('aria-label', expand ? 'Show less work' : 'Show more work');
    if (!animate) return;
    base.forEach((card, i) => {
      const shift = before[i] - card.getBoundingClientRect().top;
      if (shift) card.animate([{transform:`translateY(${shift}px)`}, {transform:'none'}], {duration:620, easing:MORPH_EASE});
    });
    if (expand) extras.forEach((card, i) => card.animate(
      [{opacity:0, transform:'translateY(24px) scale(.97)'}, {opacity:1, transform:'none'}],
      {duration:620, delay:120 + i * 60, easing:MORPH_EASE, fill:'backwards'}));
  };
  if (!expand && animate) {
    Promise.all(extras.map((card, i) => card.animate([{opacity:1}, {opacity:0, transform:'translateY(16px)'}],
      {duration:240, delay:(extras.length - 1 - i) * 30, easing:'ease-in', fill:'forwards'}).finished))
      .then(() => { finish(); for (const card of extras) for (const a of card.getAnimations()) a.cancel(); });
  } else finish();
}
moreButton?.addEventListener('click', () => { pinned = true; toggleMore(); });
