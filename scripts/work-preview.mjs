// Case studies, About and the work preview shown in the homepage focus view.
// Started as experiments/brand-strip-preview; built into the site by scripts/build.mjs.
// Copy comes from content/projects/*.json and the owner's notes. Anything not confirmed by the owner is
// marked `placeholder: true` (rendered as data-unconfirmed, no visible tag): confirm these before publishing.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {responsiveImage} from './case-study.mjs';

const fact = (label, value, placeholder = false) => ({label, value, placeholder});
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// Images and layout of each case study, by id. The words (name, category, title, story, facts) and
// the order live in content/case-studies.json, edited in the admin. The first four are always
// visible; the rest appear with "More".
export const LAYOUT = [
  {
    id: 'lendit', cover: {homeCover: 'lendit-product'},
    // Product screens without device mockups: owner-supplied desktop screens, then the app's mobile screens (project images 14–22).
    screens: {
      desktop: [
        {src: 'lendit-desktop-listing', alt: 'Lendit: item page with photos, price and booking request'},
        {src: 'lendit-desktop-messages', alt: 'Lendit: messages with a booking request to confirm or decline'},
        {src: 'lendit-desktop-listings', alt: 'Lendit: lender dashboard with listings and their status'}
      ],
      mobile: {project: 'lendit', from: 13, to: 22}
    }
  },
  {
    id: '7code-web', cover: {laptop: '7code-laptop', width: 976, height: 596, alt: '7code website on a laptop'},
    // Website screens from Figma (170:14420), without a device mockup.
    screens: {
      desktop: [
        {src: '7code-desktop-home', alt: '7Code: home page hero', height: 900},
        {src: '7code-desktop-case-studies', alt: '7Code: case studies on the home page', height: 900},
        {src: '7code-desktop-why-7code', alt: '7Code: why choose 7Code, with key numbers', height: 900},
        {src: '7code-desktop-service', alt: '7Code: Web & Mobile App Development service page', height: 900},
        {src: '7code-desktop-case-study', alt: '7Code: Daily8 case study page', height: 900},
        {src: '7code-desktop-process', alt: '7Code: Our Process page', height: 900},
        {src: '7code-desktop-contact', alt: '7Code: contact page with form and office details', height: 887}
      ]
    }
  },
  {
    id: 'angen-ai', cover: {laptop: 'angen-ai-laptop', width: 392, height: 226, alt: 'Angen AI development workspace shown on a MacBook'},
    // The final UI screens from the project (images 18–29: workspace, work items, media library, light and dark), no mockup.
    screens: {projectDesktop: {project: 'angen-ai', from: 17, to: 29}}
  },
  {
    id: 'wholesum', cover: {laptop: 'wholesum-laptop', width: 392, height: 226, alt: 'WholeSum research platform landing page shown on a MacBook'},
    // Owner-supplied screens, no device mockup.
    screens: {
      desktop: [
        {src: 'wholesum-how-it-works', alt: 'WholeSum: how it works, from upload to analysis to insights', width: 1922, height: 760},
        {src: 'wholesum-desktop-upload', alt: 'WholeSum: upload step with file validation and a quick guide', width: 2000, height: 1494},
        {src: 'wholesum-desktop-analysis', alt: 'WholeSum: analysis with sentiment, theme distribution and segmentation', width: 2000, height: 1250}
      ]
    }
  },
  {
    id: 'lendit-branding', cover: {homeCover: 'lendit-identity'}, project: 'lendit-branding',
  },
  {
    id: '7code-branding', cover: {homeCover: '7code-identity'}, project: '7code',
  },
  {
    id: 'lendit-flyers', cover: {projectImage: true}, project: 'lendit-flyers',
  },
  {
    id: 'lendit-gazebo', cover: {projectImage: true}, project: 'lendit-gazebo',
  }
];

export const VISIBLE = 4;

// Case studies in the saved order, each with its words and its layout. A study without a layout
// (or a layout without words) is left out rather than half-rendered.
export async function loadStudies(root) {
  const {studies} = JSON.parse(await readFile(path.join(root, 'content/case-studies.json'), 'utf8'));
  const layout = new Map(LAYOUT.map(item => [item.id, item]));
  return studies.filter(study => layout.has(study.id)).map(study => ({...layout.get(study.id), ...study}));
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

async function screensFigure(root, study) {
  if (!study.screens) return '';
  // Desktop screens default to the 2000×1250 exports; Figma exports pass their own size (1440 wide).
  // Saved screens: 2000×1250 by default, 1440 wide when only a height is given (Figma exports), or an explicit size.
  let desktop = (study.screens.desktop || []).map(({src, alt, width, height}) => ({src, alt, width: width || (height ? 1440 : 2000), height: height || 1250})).map(({src, alt, width, height}) =>
    `<figure class="case-figure case-screen"><img src="/assets/work-preview/${src}.jpg" alt="${escape(alt)}" width="${width}" height="${height}" loading="lazy" decoding="async"></figure>`).join('');
  if (study.screens.projectDesktop) {
    const {project, from, to} = study.screens.projectDesktop;
    const shots = (await projectImages(root, project)).slice(from, to);
    desktop += shots.map((block, i) => `<figure class="case-figure case-screen">${img(block, `${study.name}: screen ${i + 1} of ${shots.length}`)}</figure>`).join('');
  }
  let phones = '';
  if (study.screens.mobile) {
    const {project, from, to} = study.screens.mobile;
    const mobile = (await projectImages(root, project)).slice(from, to);
    phones = `<div class="case-phones">${mobile.map((block, i) => `<figure class="case-figure case-phone">${img(block, `${study.name}: mobile screen ${i + 1} of ${mobile.length}`, {sizes: '(max-width: 700px) 45vw, 280px'})}</figure>`).join('')}</div>`;
  }
  return `<div class="case-screens">${desktop}${phones}</div>`;
}

async function heroFigure(root, study, byId) {
  if (!study.hero) return '';
  if (study.hero.image) return `<figure class="case-figure case-hero">${img(study.hero.image, study.hero.alt, {eager: true})}</figure>`;
  if (study.hero.reference) return `<figure class="case-figure case-hero"><span class="work-preview-reference" role="img" aria-label="${escape(study.hero.alt)}"><img alt="" width="2880" height="2174" src="/assets/work-preview/reference.png"></span></figure>`;
  const cover = byId.get(study.hero.homeCover);
  const layers = await readFile(path.join(root, 'scripts/templates/covers', cover.composition + '.html'), 'utf8');
  return `<figure class="case-figure case-hero"><span class="work-preview-composition" role="img" aria-label="${escape(cover.imageAlt)}">${layers}</span></figure>`;
}

// Image-led studies: the card cover is already shown on top, so a project photo used as the cover is not repeated.
// When the overview is short, the next image fills the space beside the facts; the rest follow below.
async function studyImages(root, study) {
  if (!study.project) return {lead: '', rest: ''};
  const images = await projectImages(root, study.project);
  const figure = (block, i) => `<figure class="case-figure">${img(block, `${study.name}: image ${i + 1} of ${images.length}`)}</figure>`;
  const start = study.cover.projectImage && !study.thumbnail ? 1 : 0;
  const useLead = study.body.length <= 1 && images.length > start;
  const lead = useLead ? `<div class="case-lead">${figure(images[start], start).replace('loading="lazy" ', '')}</div>` : '';
  const rest = images.slice(start + (useLead ? 1 : 0)).map((block, i) => figure(block, start + (useLead ? 1 : 0) + i)).join('');
  return {lead, rest: rest ? `<div class="case-gallery">${rest}</div>` : ''};
}

// Photos added in the admin, after the images set in code.
function addedPhotos(study) {
  if (!study.photos?.length) return '';
  return `<div class="case-gallery">${study.photos.map(({src, width, height, alt}, i) =>
    `<figure class="case-figure"><img src="${escape(src)}" alt="${escape(alt || `${study.name}: photo ${i + 1}`)}" width="${width}" height="${height}" loading="lazy" decoding="async"></figure>`).join('')}</div>`;
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

export async function renderReader(root, study, index, byId) {
  const facts = study.facts.map(({label, value, placeholder}) =>
    `<div><dt>${escape(label)}</dt><dd${placeholder ? ' data-unconfirmed' : ''}>${escape(value)}</dd></div>`).join('');
  const {lead, rest} = await studyImages(root, study);
  return `<div class="case-reader" data-study="${index}" hidden>
  <div class="case-reader-content" tabindex="0" aria-label="${escape(study.name)} case study">
    <article class="case">
      <header class="case-head">
        <div class="work-preview-art case-cover" aria-hidden="true">${await cardArt(root, study, byId)}</div>
        <h2 id="case-title-${index}" tabindex="-1">${escape(study.title)}</h2>
        <div class="case-intro">
          <div class="case-body">${study.body.map(p => `<p>${escape(p)}</p>`).join('')}${lead}</div>
          <dl class="case-facts">${facts}</dl>
        </div>
      </header>
      ${await heroFigure(root, study, byId)}${await screensFigure(root, study)}${rest}${addedPhotos(study)}
      <aside class="case-cta" aria-labelledby="case-cta-${index}">
        <div>
          <h3 id="case-cta-${index}">Want to learn more about this project?</h3>
          <p>Book a meeting and I’ll walk you through it in Figma.</p>
        </div>
        <a class="button contact-gradient case-cta-button" href="/contact/" data-case-contact><span class="contact-fill" aria-hidden="true"><span class="contact-shade"></span></span><span class="button-label">Get in touch</span></a>
      </aside>
    </article>
  </div>
</div>`;
}

// About, opened from the header in the same focus view as the case studies.
export async function renderAbout(root) {
  const site = JSON.parse(await readFile(path.join(root, 'content/site.json'), 'utf8'));
  const body = site.aboutBody.split(/\n\s*\n/).map(p => `<p>${escape(p.trim())}</p>`).join('');
  // Owner's details (2026-11-23). A line break in a value starts a new line.
  const facts = [
    fact('Role', 'Design Partner'),
    fact('Location', 'Based in Moldova, Europe\nWorking worldwide'),
    fact('Experience', '10+ years in digital design'),
    fact('Expertise', 'Product Design,\nGraphic Design & Branding'),
    fact('Product Domains', 'AI & Developer Tools, B2B SaaS,\nMarketplaces & Research Platforms')
  ].map(({label, value}) => `<div><dt>${escape(label)}</dt><dd>${value.split('\n').map(escape).join('<br>')}</dd></div>`).join('');
  const principles = [
    ['Start with the real problem.', 'A well-framed question is more useful than a polished answer to the wrong one.'],
    ['Make the work easy to share.', 'Clear reasoning and early conversations help everyone make better decisions.'],
    ['Care about the small things.', 'The empty state, the error message, the space between two elements. They all shape the experience.']
  ].map(([title, text]) => `<div><h4>${escape(title)}</h4><p>${escape(text)}</p></div>`).join('');
  return `<div class="case-reader" id="about" data-about hidden>
  <div class="case-reader-content" tabindex="0" aria-label="About ${escape(site.name)}">
    <article class="case case-about">
      <header class="case-head about-intro">
        <div class="about-side">
          <figure class="about-photo"><img src="${escape(site.aboutPhoto || '/assets/about/mihail-boboc.jpg')}" alt="${escape(site.name)}" width="1200" height="1200" decoding="async"></figure>
          <dl class="case-facts about-facts">${facts}</dl>
        </div>
        <div class="about-main">
          <h2 id="about-title" tabindex="-1">I’m Mihai, good to meet you</h2>
          <div class="case-body">${body}</div>
        </div>
      </header>
      <section class="case-principles" aria-labelledby="about-principles">
        <h3 id="about-principles">Things I come back to.</h3>
        <div>${principles}</div>
      </section>
      <aside class="case-cta" aria-labelledby="about-cta">
        <div>
          <h3 id="about-cta">Have a project in mind?</h3>
          <p>Tell me what you’re working on and I’ll get back to you.</p>
        </div>
        <a class="button contact-gradient case-cta-button" href="/contact/" data-case-contact><span class="contact-fill" aria-hidden="true"><span class="contact-shade"></span></span><span class="button-label">Get in touch</span></a>
      </aside>
    </article>
  </div>
</div>`;
}


// Markup for the homepage: the work preview overlay, its trigger, the About link and the focus-view dialog.
export async function workPreview(root) {
  const studies = await loadStudies(root);
  const {covers} = JSON.parse(await readFile(path.join(root, 'content/home-work.json'), 'utf8'));
  const byId = new Map(covers.map(cover => [cover.id, cover]));
  const art = await Promise.all(studies.map(study => cardArt(root, study, byId)));
  const cards = studies.map((study, index) => `
    <button class="work-preview-card" type="button" aria-haspopup="dialog"${index >= VISIBLE ? ' data-extra hidden' : ''}>
      <span class="work-preview-art">${art[index]}</span>
      <span class="work-preview-caption">
        <span class="work-preview-label"><strong>${escape(study.name)}</strong><small>${escape(study.category)}</small></span>
        <span class="work-preview-arrow" aria-hidden="true"><img src="/assets/work-preview/maximize-2.svg" alt=""></span>
      </span>
    </button>`).join('');
  const reader = (await Promise.all(studies.map((study, index) => renderReader(root, study, index, byId)))).join('');
  const about = await renderAbout(root);
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
        <button type="button" data-drawer="work">Work</button>
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
