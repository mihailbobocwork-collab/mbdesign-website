// Case studies, About and the work preview shown in the homepage focus view.
// Started as experiments/brand-strip-preview; built into the site by scripts/build.mjs.
// Copy comes from content/projects/*.json and the owner's notes. Anything not confirmed by the owner is
// marked `placeholder: true` (rendered as data-unconfirmed, no visible tag): confirm these before publishing.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {responsiveImage} from './case-study.mjs';

const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// The original cover of each of the first eight case studies (laptop renders, identity marks, a
// project photo), kept in code because some are optically normalised. Everything else about a case
// study (words, order, images, an uploaded cover, hidden or not) lives in content/case-studies.json
// and is edited in the admin. The first four visible studies show as cards; the rest appear with "More".
export const LAYOUT = [
  {id: 'lendit', cover: {homeCover: 'lendit-product'}},
  {id: '7code-web', cover: {laptop: '7code-laptop', width: 976, height: 596, alt: '7code website on a laptop'}},
  {id: 'angen-ai', cover: {laptop: 'angen-ai-laptop', width: 392, height: 226, alt: 'Angen AI development workspace shown on a MacBook'}},
  {id: 'wholesum', cover: {laptop: 'wholesum-laptop', width: 392, height: 226, alt: 'WholeSum research platform landing page shown on a MacBook'}},
  {id: 'lendit-branding', cover: {homeCover: 'lendit-identity'}},
  {id: '7code-branding', cover: {homeCover: '7code-identity'}},
  {id: 'lendit-flyers', cover: {projectImage: true}, project: 'lendit-flyers'},
  {id: 'lendit-gazebo', cover: {projectImage: true}, project: 'lendit-gazebo'}
];

export const VISIBLE = 4;

// Visible case studies in the saved order. A study shows its uploaded cover, or its original one
// from LAYOUT; one with neither is left out rather than shown without a card.
export async function loadStudies(root) {
  const {studies} = JSON.parse(await readFile(path.join(root, 'content/case-studies.json'), 'utf8'));
  const layout = new Map(LAYOUT.map(item => [item.id, item]));
  return studies.filter(study => !study.hidden).map(study => ({cover: {}, ...(study.originalCover ? layout.get(study.id) : {}), ...study}))
    .filter(study => study.thumbnail || study.cover.laptop || study.cover.homeCover || study.cover.projectImage);
}

async function projectImages(root, slug) {
  const project = JSON.parse(await readFile(path.join(root, 'content/projects', slug + '.json'), 'utf8'));
  return project.sections.flatMap(section => (section.columns || []).flatMap(column => column.blocks.filter(block => block.type === 'image')));
}

const img = (block, alt, {eager = false, sizes = '(max-width: 700px) 92vw, 1000px'} = {}) =>
  `<img ${responsiveImage(block).replace(/sizes="[^"]*"/, `sizes="${sizes}"`)} alt="${escape(alt)}" width="${block.width}" height="${block.height}" ${eager ? '' : 'loading="lazy" '}decoding="async">`;

// Laptop covers are normalised optically: every MacBook screen (the lid, which the eye reads first) gets the
// same width, is horizontally centred, and every base rests on the same line. Measured from the artwork
// (fractions of the artwork box): cx = centre of the lid, w = lid width, by = bottom of the base,
// ratio = artwork height / width.
const DEVICES = {
  'lendit-product':   {cx: .4950, w: .8092, by: .827,  ratio: 622 / 912},
  '7code-laptop':     {cx: .4980, w: .8402, by: .9832, ratio: 596 / 976},
  'angen-ai-laptop':  {cx: .4949, w: .8393, by: .9823, ratio: 226 / 392},
  'wholesum-laptop':  {cx: .4949, w: .8393, by: .9823, ratio: 226 / 392}
};
const device = key => {
  const d = DEVICES[key];
  return d ? ` data-device style="--cx:${d.cx};--w:${d.w};--by:${d.by};--ratio:${d.ratio.toFixed(5)}"` : '';
};

// Card artwork: supplied laptop renders, homepage covers, or the project's own first photo.
export async function cardArt(root, study, byId) {
  // A cover uploaded in the admin replaces the one set in code: "fill" crops it to the card like a
  // photo, "fit" shows it whole (logos, mockups with a transparent background).
  if (study.thumbnail) {
    const {src, width, height, fit} = study.thumbnail;
    const tag = `<img src="${escape(src)}" alt="${escape(`${study.name}: ${study.category}`)}" width="${width}" height="${height}" decoding="async">`;
    return fit === 'fill' ? `<span class="work-preview-photo">${tag}</span>` : tag.replace('<img ', '<img class="work-preview-cover" ');
  }
  // Owner-supplied transparent laptop renders (7code, Angen AI, WholeSum).
  if (study.cover.laptop) return `<img class="work-preview-cover" src="/assets/work-preview/${study.cover.laptop}.png" alt="${escape(study.cover.alt)}" width="${study.cover.width}" height="${study.cover.height}"${device(study.cover.laptop)}>`;
  if (study.cover.projectImage) {
    const [first] = await projectImages(root, study.project);
    return `<span class="work-preview-photo">${img(first, `${study.name}: ${study.category}`, {eager: true, sizes: '240px'})}</span>`;
  }
  const cover = byId.get(study.cover.homeCover);
  if (cover.composition) {
    const layers = await readFile(path.join(root, 'scripts/templates/covers', cover.composition + '.html'), 'utf8');
    return `<span class="work-preview-composition" role="img" aria-label="${escape(cover.imageAlt)}"${device(study.cover.homeCover)}>${layers.replaceAll(' loading="lazy"', '')}</span>`;
  }
  return `<img class="work-preview-cover${cover.kind === 'identity' ? ' is-identity' : ''}" src="${escape(cover.image)}" alt="${escape(cover.imageAlt)}" width="${cover.width}" height="${cover.height}"${device(study.cover.homeCover)}>`;
}

// A case study's images, in their saved order. "screen" is a bordered screenshot, "phone" a mobile
// screen (three per row), "photo" a full-width image. Neighbouring screens and phones share one
// block, neighbouring photos another. When the story is a single paragraph, a first photo sits
// beside the facts instead.
const picture = (image, sizes, eager = false) => img({image: image.src, variants: image.variants, width: image.width, height: image.height}, image.alt, {eager, sizes});
function studyImages(study) {
  const images = [...(study.images || [])];
  const lead = study.body.length <= 1 && images[0]?.style === 'photo'
    ? `<div class="case-lead"><figure class="case-figure">${picture(images.shift(), undefined, true)}</figure></div>` : '';
  let html = '', run = [];
  const flush = () => {
    if (!run.length) return;
    if (run[0].style === 'photo') html += `<div class="case-gallery">${run.map(image => `<figure class="case-figure">${picture(image)}</figure>`).join('')}</div>`;
    else {
      let inner = '', phones = [];
      const phonesOut = () => { if (phones.length) inner += `<div class="case-phones">${phones.map(image => `<figure class="case-figure case-phone">${picture(image, '(max-width: 700px) 45vw, 280px')}</figure>`).join('')}</div>`; phones = []; };
      for (const image of run) {
        if (image.style === 'phone') { phones.push(image); continue; }
        phonesOut();
        inner += `<figure class="case-figure case-screen">${picture(image)}</figure>`;
      }
      phonesOut();
      html += `<div class="case-screens">${inner}</div>`;
    }
    run = [];
  };
  for (const image of images) {
    if (run.length && (run[0].style === 'photo') !== (image.style === 'photo')) flush();
    run.push(image);
  }
  flush();
  return {lead, rest: html};
}

// The cover set in code, as one image the admin can preview next to "Use the original cover".
export async function defaultThumbs(root) {
  const {covers} = JSON.parse(await readFile(path.join(root, 'content/home-work.json'), 'utf8'));
  const byId = new Map(covers.map(cover => [cover.id, cover]));
  const thumbs = {};
  for (const study of LAYOUT) {
    if (study.cover.laptop) thumbs[study.id] = {src: `/assets/work-preview/${study.cover.laptop}.png`, fit: 'fit'};
    else if (study.cover.projectImage) { const [first] = await projectImages(root, study.project); thumbs[study.id] = {src: first.variants?.[0]?.image || first.image, fit: 'fill'}; }
    else { const cover = byId.get(study.cover.homeCover); thumbs[study.id] = {src: cover.image, fit: 'fit', identity: cover.kind === 'identity'}; }
  }
  return thumbs;
}

// The story itself, shared by the homepage focus view (an h2 inside the dialog) and the
// study's own page at /work/<id>/ (the page's h1, so search engines read it as the subject).
export async function caseArticle(root, study, index, byId, {heading = 'h2', id = `case-title-${index}`} = {}) {
  const facts = study.facts.map(({label, value, placeholder}) =>
    `<div><dt>${escape(label)}</dt><dd${placeholder ? ' data-unconfirmed' : ''}>${escape(value)}</dd></div>`).join('');
  const {lead, rest} = studyImages(study);
  return `<article class="case">
      <header class="case-head">
        <div class="work-preview-art case-cover" aria-hidden="true">${await cardArt(root, study, byId)}</div>
        <${heading} id="${id}" tabindex="-1">${escape(study.title)}</${heading}>
        <div class="case-intro">
          <div class="case-body">${study.body.map(p => `<p>${escape(p)}</p>`).join('')}${lead}</div>
          <dl class="case-facts">${facts}</dl>
        </div>
      </header>
      ${rest}
      <aside class="case-cta" aria-labelledby="case-cta-${index}">
        <div>
          <h3 id="case-cta-${index}">Want to learn more about this project?</h3>
          <p>Book a meeting and I’ll walk you through it in Figma.</p>
        </div>
        <a class="button contact-gradient case-cta-button" href="/contact/" data-case-contact><span class="contact-fill" aria-hidden="true"><span class="contact-shade"></span></span><span class="button-label">Get in touch</span></a>
      </aside>
    </article>`;
}

export async function renderReader(root, study, index, byId) {
  return `<div class="case-reader" data-study="${index}" hidden>
  <div class="case-reader-content" tabindex="0" aria-label="${escape(study.name)} case study">
    ${await caseArticle(root, study, index, byId)}
  </div>
</div>`;
}

// About, opened from the header in the same focus view as the case studies.
// `id` is "about" on the landing; the full portfolio has its own About section with that id.
export async function renderAbout(root, id = 'about') {
  const site = JSON.parse(await readFile(path.join(root, 'content/site.json'), 'utf8'));
  const body = site.aboutBody.split(/\n\s*\n/).map(p => `<p>${escape(p.trim())}</p>`).join('');
  // Edited in the admin (About). A line break in a detail's value starts a new line.
  const facts = (site.aboutFacts || []).map(({label, value}) => `<div><dt>${escape(label)}</dt><dd>${String(value).split('\n').map(escape).join('<br>')}</dd></div>`).join('');
  const principles = (site.aboutPrinciples || []).map(({title, text}) => `<div><h4>${escape(title)}</h4><p>${escape(text)}</p></div>`).join('');
  const principlesSection = principles ? `
      <section class="case-principles" aria-labelledby="about-principles">
        <h3 id="about-principles">${escape(site.aboutPrinciplesTitle)}</h3>
        <div>${principles}</div>
      </section>` : '';
  return `<div class="case-reader" id="${id}" data-about hidden>
  <div class="case-reader-content" tabindex="0" aria-label="About ${escape(site.name)}">
    <article class="case case-about">
      <header class="case-head about-intro">
        <div class="about-side">
          <figure class="about-photo"><img src="${escape(site.aboutPhoto || '/assets/about/mihail-boboc.jpg')}" alt="${escape(site.name)}" width="1200" height="1200" decoding="async"></figure>
          <dl class="case-facts about-facts">${facts}</dl>
        </div>
        <div class="about-main">
          <h2 id="${id}-title" tabindex="-1">${escape(site.aboutHeading)}</h2>
          <div class="case-body">${body}</div>
        </div>
      </header>${principlesSection}
      <aside class="case-cta" aria-labelledby="about-cta">
        <div>
          <h3 id="about-cta">${escape(site.aboutCtaTitle)}</h3>
          <p>${escape(site.aboutCtaText)}</p>
        </div>
        <a class="button contact-gradient case-cta-button" href="/contact/" data-case-contact><span class="contact-fill" aria-hidden="true"><span class="contact-shade"></span></span><span class="button-label">Get in touch</span></a>
      </aside>
    </article>
  </div>
</div>`;
}


// Markup for the homepage: the work preview overlay, its trigger, the About link and the focus-view dialog.
export async function workPreview(root, {aboutId = 'about', links = []} = {}) {
  const studies = await loadStudies(root);
  const {covers} = JSON.parse(await readFile(path.join(root, 'content/home-work.json'), 'utf8'));
  const byId = new Map(covers.map(cover => [cover.id, cover]));
  const art = await Promise.all(studies.map(study => cardArt(root, study, byId)));
  const cards = studies.map((study, index) => `
    <a class="work-preview-card" href="/work/${escape(study.id)}/" aria-haspopup="dialog"${index >= VISIBLE ? ' data-extra hidden' : ''}>
      <span class="work-preview-art">${art[index]}</span>
      <span class="work-preview-caption">
        <span class="work-preview-label"><strong>${escape(study.name)}</strong><small>${escape(study.category)}</small></span>
        <span class="work-preview-arrow" aria-hidden="true"><img src="/assets/work-preview/maximize-2.svg" alt=""></span>
      </span>
    </a>`).join('');
  const reader = (await Promise.all(studies.map((study, index) => renderReader(root, study, index, byId)))).join('');
  const about = await renderAbout(root, aboutId);
  const more = studies.length > VISIBLE ? '<button class="work-preview-more" type="button" aria-expanded="false" aria-label="Show more work"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 9.5 6 6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' : '';
  const overlay = `
    <div class="work-preview-overlay">
      <div class="work-preview-shade" aria-hidden="true"></div>
      <section class="work-preview-region" id="work-preview" aria-label="Selected work" inert>
        <div class="work-preview-head"><h2 class="work-preview-title">Work</h2><button class="work-preview-close" type="button" aria-label="Close work"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button></div>
        <div class="work-preview-cards">${cards}</div>
        ${more}
      </section>
    </div>
    <div class="mobile-drawer" id="mobile-drawer" hidden>
      <nav class="mobile-drawer-links" aria-label="Menu">
        <button type="button" data-drawer="work">Work</button>${links.map(([label, href]) => `
        <a href="${escape(href)}">${escape(label)}</a>`).join('')}
        <button type="button" data-drawer="about">About</button>
      </nav>
      <div class="mobile-drawer-socials"></div>
    </div>
    <dialog class="work-preview-detail" aria-labelledby="work-preview-detail-name" data-mode="cover">
      <div class="work-project-frame">
        <button class="work-project-close" type="button" aria-label="Close" autofocus>×</button>
        <button class="work-project-top" type="button" aria-label="Back to top"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <div class="work-project-cover">
          <div class="work-preview-detail-art"></div>
          <div class="work-project-caption">
            <div><h2 id="work-preview-detail-name"></h2><p class="work-preview-detail-category"></p></div>
            <button class="work-project-read" type="button" hidden>Read case study <span aria-hidden="true">↗</span></button>
          </div>
        </div>
        ${reader}
        ${about}
      </div>
      <div class="work-project-rail" aria-label="Other work"></div>
    </dialog>
    <details class="work-preview-tuning" hidden>
      <summary>Motion settings</summary>
      <label>Background blur <output for="preview-blur"></output><input type="range" id="preview-blur" min="0" max="12" value="4" step="1" data-unit="px"></label>
      <label>Background scale <output for="preview-scale"></output><input type="range" id="preview-scale" min="80" max="100" value="87" step="1" data-unit="%"></label>
      <label>Transition time <output for="preview-duration"></output><input type="range" id="preview-duration" min="200" max="1000" value="620" step="20" data-unit="ms"></label>
      <button type="button" class="work-preview-reset">Reset</button>
    </details>`;
  const trigger = '<button type="button" class="work-preview-trigger" aria-controls="work-preview" aria-expanded="false">Preview work</button>';
  return {
    head: '<link rel="stylesheet" href="/assets/work-preview/preview.css"><link rel="stylesheet" href="/assets/work-preview/case-reader.css"><link rel="stylesheet" href="/assets/work-preview/compact.css"><script type="module" src="/assets/work-preview/preview.js"></script>',
    menu: '<button class="nav-menu" type="button" aria-expanded="false" aria-controls="mobile-drawer" aria-label="Menu"><span></span><span></span></button>',
    trigger,
    overlay,
    about: '<a class="nav-about" href="#about" aria-haspopup="dialog">About</a>'
  };
}
