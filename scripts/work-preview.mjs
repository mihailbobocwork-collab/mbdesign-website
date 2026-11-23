// Case studies, About and the work preview shown in the homepage focus view.
// Started as experiments/brand-strip-preview; built into the site by scripts/build.mjs.
// Copy comes from content/projects/*.json and the owner's notes. Anything not confirmed by the owner is
// marked `placeholder: true` (rendered as data-unconfirmed, no visible tag): confirm these before publishing.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {responsiveImage} from './case-study.mjs';

const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fact = (label, value, placeholder = false) => ({label, value, placeholder});

// The first four are always visible; the rest appear with "More".
export const studies = [
  {
    id: 'lendit', name: 'Lendit', category: 'Product design · Marketplace', cover: {homeCover: 'lendit-product'},
    title: 'A rental marketplace for neighbours.',
    body: [
      'People already borrow from friends, put projects off, or buy a tool they’ll use once. Lendit set out to let neighbours rent everyday things to each other: drills, ladders, cameras. A stranger lending to a stranger only works if both sides trust what they see.',
      'I was the only designer, working with four developers from August 2025. I took Lendit from research and user flows to wireframes and the web and mobile UI. Then I built the design system the team ships from, with 100+ components and 500+ variables.',
      'Every screen puts trust before money. Cards lead with the lender’s face, name and distance. A booking starts as a request, and nothing is charged until the lender accepts. AI Quick Listing drafts a listing from photos, but the lender approves it before it goes live. Lendit is live and has passed 500 users.',
      'Testing hasn’t stopped. An early review of the item card picked the version that leads with the person and rounds ratings to whole stars. That hierarchy now anchors every listing.'
    ],
    facts: [fact('Sector', 'Peer-to-peer rental marketplace'), fact('Result', '500+ users'), fact('Year', '2025–present'), fact('The work', 'Product design, UX research, Design system'), fact('Related', 'Product Design')],
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
    id: '7code-web', name: '7code', category: 'Web design', cover: {laptop: '7code-laptop', width: 976, height: 596, alt: '7code website on a laptop'},
    title: 'A new brand and website for 7Code.',
    body: [
      '7Code designs and builds AI-native products, LLM features and the cloud behind them, but its website read like any other software agency. Its three service lines looked the same, the client work was buried, and there was no brand system behind any of it.',
      'I was the only designer, working directly with the 7Code founders from February 2026. I took 7Code from discovery meetings and a sitemap to low-fidelity wireframes, a new brand identity and the full UI for desktop, tablet and mobile. Then I built the design system the site ships from, with 281 components and 523 variables, and turned the design into a working site with a Git-based CMS.',
      'Every page shows the engineering instead of describing it. The services became three distinct lines in a mega menu, and every case study follows the same Problem, Solution and Outcome structure. The stats count up on screen instead of hiding behind adjectives. In the hero, a soft cyan form follows the cursor on a spring, capped so it never pulls focus from the headline. 7Code launched the new site in September 2026.',
      'All content runs through seven CMS collections. Six case studies, 25 articles and six expertise pages are already in it, so 7Code adds new work as an entry, not a redesign.'
    ],
    facts: [fact('Sector', 'AI-native software engineering'), fact('Result', 'Launched September 2026', true), fact('Year', '2026'), fact('The work', 'Brand identity, Product design, Design system, Design engineering'), fact('Related', 'Brand Design, Product Design')],
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
    id: 'angen-ai', name: 'Angen AI', category: 'Product design · Developer tools', cover: {laptop: 'angen-ai-laptop', width: 392, height: 226, alt: 'Angen AI development workspace shown on a MacBook'},
    title: 'A developer workspace for Angen AI.',
    body: [
      'Angen AI turns natural-language tasks into production-ready code. The product worked, but it felt like a generic chat app. Navigation mixed tools, resources and settings, switching tasks broke focus, and context like files and knowledge sat apart from the work.',
      'I was the UI/UX designer, working with three developers for 16 weeks, from April to July 2025. I reviewed tools like GitHub Copilot and Cursor and gathered developer feedback. Then I explored wireframes, redesigned the layout, sidebar, workbench and context panel, and built the design system with light and dark themes.',
      'The idea was structure over novelty, turning an AI coding prototype into a workspace built for developers. A three-panel layout mirrors modern IDEs. The workbench is task-first, with separate Plan and Code modes, and tabs keep several tasks open at once. Angen AI went from a functional prototype to a tool that feels made for engineers.'
    ],
    facts: [fact('Sector', 'AI developer tools'), fact('Result', 'Redesign shipped to early teams', true), fact('Year', '2025'), fact('The work', 'Product design, UX research, Design system'), fact('Related', 'Product Design')],
    // The final UI screens from the project (images 18–29: workspace, work items, media library, light and dark), no mockup.
    screens: {projectDesktop: {project: 'angen-ai', from: 17, to: 29}}
  },
  {
    id: 'wholesum', name: 'WholeSum', category: 'Product design · Research SaaS', cover: {laptop: 'wholesum-laptop', width: 392, height: 226, alt: 'WholeSum research platform landing page shown on a MacBook'},
    title: 'An AI workspace for qualitative research.',
    body: [
      'Researchers working with interviews, surveys and open-ended responses struggle to organise unstructured text. Existing tools were too manual, too complex, or produced shallow AI summaries that were hard to trust in a client report. WholeSum set out to turn raw interviews into client-ready research.',
      'I was the UI/UX designer, working with two developers for 10 weeks, from August to October 2025. We started from the founders’ direction, user interviews and real analysis artefacts. Then we moved through user stories, personas and flows into high-fidelity design, a style guide and a detailed developer handoff.',
      'Everything follows how analysts already work: upload, process, explore, refine, export. AI suggests themes, matrices and summaries, and the researcher can edit, merge and reorganise every one of them, so speed never costs rigour.'
    ],
    facts: [fact('Sector', 'Qualitative research SaaS'), fact('Result', 'Handed off for pilot launch', true), fact('Year', '2025'), fact('The work', 'Product design, Style guide, Developer handoff'), fact('Related', 'Product Design')],
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
    id: 'lendit-branding', name: 'Lendit', category: 'Brand identity', cover: {homeCover: 'lendit-identity'}, project: 'lendit-branding',
    title: 'A visual identity for Lendit.',
    body: ['A complete visual identity system for Lendit, the UK app that helps neighbours borrow and lend everyday things. The work runs from the logo to the brand guidelines.'],
    facts: [fact('Sector', 'Peer-to-peer rental marketplace'), fact('Result', 'Rolled out across app, web and print', true), fact('Year', '2025', true), fact('The work', 'Logo design, Brand guidelines'), fact('Related', 'Brand Design')]
  },
  {
    id: '7code-branding', name: '7code', category: 'Brand identity', cover: {homeCover: '7code-identity'}, project: '7code',
    title: 'A brand identity for 7code.',
    body: ['A complete brand identity for 7code, covering logo design, colour system, typography and overall visual language.'],
    facts: [fact('Sector', 'Software development studio'), fact('Result', 'Adopted across 7code’s website and materials', true), fact('Year', '2025', true), fact('The work', 'Logo design, Brand guidelines'), fact('Related', 'Brand Design')]
  },
  {
    id: 'lendit-flyers', name: 'A5 Flyers', category: 'Lendit · Print design', cover: {projectImage: true}, project: 'lendit-flyers',
    title: 'A5 leaflets for Lendit.',
    body: ['A set of A5 leaflets that get neighbours borrowing and lending with Lendit. Each leaflet has one clear job: get people borrowing, get people lending what’s already in their shed, or show existing lenders why they’d keep more on Lendit. We kept the copy short, used real app screens and photos of real handovers, and added local QR codes so every leaflet feels like it’s from the neighbourhood.'],
    facts: [fact('Sector', 'Peer-to-peer rental marketplace'), fact('Result', 'Distributed in Lendit’s launch neighbourhoods', true), fact('Year', '2025', true), fact('The work', 'Print design'), fact('Related', 'Graphic Design')]
  },
  {
    id: 'lendit-gazebo', name: 'Event Gazebo', category: 'Lendit · Branding', cover: {projectImage: true}, project: 'lendit-gazebo',
    title: 'An event gazebo for Lendit.',
    body: ['From the print template to the street. I designed the full 3×3m gazebo for Lendit, the app for borrowing anything from your neighbours: the roof, back wall and half walls, all in the bold pink-to-orange style and built so people get the idea at a glance.'],
    facts: [fact('Sector', 'Peer-to-peer rental marketplace'), fact('Result', 'Used at local community street festivals'), fact('Year', '2025', true), fact('The work', 'Creative design, Print design'), fact('Related', 'Graphic Design')]
  }
];

export const VISIBLE = 4;

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
  const start = study.cover.projectImage ? 1 : 0;
  const useLead = study.body.length <= 1 && images.length > start;
  const lead = useLead ? `<div class="case-lead">${figure(images[start], start).replace('loading="lazy" ', '')}</div>` : '';
  const rest = images.slice(start + (useLead ? 1 : 0)).map((block, i) => figure(block, start + (useLead ? 1 : 0) + i)).join('');
  return {lead, rest: rest ? `<div class="case-gallery">${rest}</div>` : ''};
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
      ${await heroFigure(root, study, byId)}${await screensFigure(root, study)}${rest}
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
          <figure class="about-photo"><img src="/assets/about/mihail-boboc.jpg" alt="${escape(site.name)}" width="1200" height="1200" decoding="async"></figure>
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
        <div class="work-preview-cards">${cards}</div>
        ${more}
      </section>
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
    head: '<link rel="stylesheet" href="/assets/work-preview/preview.css"><link rel="stylesheet" href="/assets/work-preview/case-reader.css"><script type="module" src="/assets/work-preview/preview.js"></script>',
    trigger,
    overlay,
    about: '<a class="nav-about" href="#about" aria-haspopup="dialog">About</a>'
  };
}
