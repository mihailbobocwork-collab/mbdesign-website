# Project context — Mihai Boboc portfolio

Shared memory for every AI agent (Claude Code in T3 Code, OpenAI Codex) and human working on this site.
**Read this first. Update it before finishing any meaningful task.** Keep it short, factual and current; move detail to the topic docs listed in §4.

Legend used throughout: ✅ implemented and verified in code · 🟡 implemented but hidden, paused or unverified · 💭 vision / planned, not built.

_Last updated: 2026-11-23 by Claude Code (Opus 5.5)._

---

## 1. Project overview and objectives

- Personal-name-first portfolio for **Mihai Boboc**, independent product designer (Product, Graphic and Brand Design).
- Goals: impress recruiters and clients, convert visitors into **meetings** (the hero inquiry + own booking calendar is the core conversion path), and keep running costs near zero.
- Owner constraints: custom code (no site builder, no framework), Cloudflare Pages hosting, free Git-backed CMS, no paid booking service.
- Source repo: https://github.com/mihailbobocwork-collab/mbdesign-website (`main`). Staging deploy: https://mbdesign-website.pages.dev (draft/noindex). Existing public site: https://mihailboboc.com (not yet replaced).

## 2. Design vision and UX principles

- **Editorial, restrained, calm.** Large work imagery and a quiet personal introduction, inspired by (not copied from) stefanh.co, including its scroll-aware sticky header.
- **Motion must feel like animation, not state switches**: eased, soft, slightly delayed returns (blur + opacity + small settle), never abrupt. Always respect `prefers-reduced-motion`.
- **Hero is the product demo**: typewriter intro → becomes an editable field on hover → morphs in place into a one-question-at-a-time (Typeform-style) inquiry. Only the logo stays; there is no modal and no redirect.
- **Honest UI**: never fake delivery or success; previews and samples are visibly labelled.
- Typography: **Excon Variable** for all text (local font, `public/assets/fonts.css`, `--font-sans`).
- Monochrome featured-in logos; white square work covers; neutral blue-gray interaction colours (the old green was removed).
- Buttons: Continue = dark primary capsule. **Get in touch** = animated multicolour fill at rest; on hover/focus the fill recedes to an animated outline (latest direction — supersedes earlier outline-at-rest versions).
- Accessibility is non-negotiable: native controls, visible focus, skip link, keyboard paths, 16px+ inputs on mobile.

## 3. Website structure and pages

Intended (vision): Home · Work · Services · Pricing · Playground · About · Get in touch.

Actual **current build** (`scripts/build.mjs` has `const limitedPortfolio = true;`, a temporary "landing only" mode):

| Route | State |
| --- | --- |
| `/` | ✅ Built and live on staging. Hero + inquiry + brand marquee + header About/socials/Get in touch, plus the work preview (8 cards), focus-view case studies and About (`scripts/work-preview.mjs`, assets in `public/assets/work-preview/`). The old Work/About sections stay hidden in limited mode. |
| `/contact/` | ✅ Built. Same inquiry and calendar flow. |
| `/admin/` | ✅ Built. Decap CMS shell (sign-in needs OAuth setup). |
| `/404.html` | ✅ Copy of home in limited mode. |
| `/work/*` (8 case studies) | 🟡 Templates and content exist; removed from the build and 302 → `/`. |
| `/about/` | 🟡 About moved onto the homepage below Work (hidden in limited mode); `/about` → `/`. |
| `/services/` | 🟡 Paused; redirects home. |
| `/pricing/` | 🟡 Paused; `offers.json` is published empty. |
| `/playground/*` (incl. calendar and inquiry studies) | 🟡 Paused; redirects home. |
| `/privacy/` | 🟡 Removed; redirects home. |

Work section intent: **Work in the nav scrolls to `/#work`** on the homepage (single-page style); Pricing, Playground, About and Get in touch are separate destinations.

## 4. Technology stack and architecture

- **No dependencies.** Node ≥ 22.13 (24.13 pinned in `.node-version`). The static generator is `scripts/build.mjs`, which reads `content/*.json` and writes `dist/`.
- `npm run dev` → `scripts/serve.mjs`: builds, then serves `dist/` on `127.0.0.1:${PORT:-4173}`. It doesn't watch files (restart or rebuild after edits), uses local SQLite for bookings and shows labelled sample availability while Google is unconnected.
- `npm test` → `node --test tests/*.test.mjs`. `npm run connect:google` → private OAuth helper that writes `.dev.vars`.
- Front end: vanilla JS native custom elements in `public/assets/components/` (`interactive-typewriter`, `brand-marquee`, hero-inquiry, meeting-calendar, portrait-motion, transition-motion, brand-loader, message-editor…). Global helpers are in `public/assets/app.js` (magnetic buttons, menu, back-to-top).
- Back end: Cloudflare Pages Functions in `functions/` (`/auth`, `/callback`, `/api/calendar`, `/api/bookings`) with logic in `lib/` (Google Calendar/Meet/Gmail, scheduling, D1 booking store, GitHub OAuth for Decap). D1 schema in `migrations/`. Turnstile anti-spam.
- CMS: Decap 3.9.0 (pinned, unpkg), GitHub backend. Collections are defined in `cms.config.json`; content is edited in `content/`.
- Analytics: **Cloudflare Web Analytics**, cookieless, no consent banner (owner, 2026-11-24). Enabled in the Cloudflare dashboard, not in code; `public/assets/analytics.js` is a no-op `track()`. Google Analytics 4 and its banner were removed. See `ANALYTICS.md`.
- Secrets: `.dev.vars` and `.local/` are private and gitignored. Never commit or print them.
- Topic docs (detail lives there, not here): `README.md` (full chronological implementation log, partly superseded), `LAUNCH.md` (launch checklist), `GOOGLE-SETUP.md`, `ANALYTICS.md`, `PROJECT-PAGES.md`, `WORK-COVERS.md`, `PORTRAIT-NOTES.md`, `QA.md`, `MOBILE-QA.md`.

## 5. Implemented features (verified in code)

- ✅ Centred logo **draw-on loader** with blur dissolve: first visit per tab session and after a completed inquiry.
- ✅ **Typewriter hero** (`hero-typewriter.js`). Hover/pen focuses a native textarea without a click. Suggestion subjects: Product Design, Graphic Design, Brand Identity. Reset icon above the send arrow. 3,000-character limit with adaptive font size and scrolling. Slow eased hover-out (850ms grace, about 1450ms return).
- ✅ **Three-state portrait** (idle → listening → writing) with canvas mesh + 61-frame optical-flow WebP atlas (`portrait-motion.js`). The alternate portraits are AI-edited (`PORTRAIT-NOTES.md`).
- ✅ **Hero → inquiry morph** (`hero-inquiry.js`). Current step order: topic → engagement type → EUR budget → meeting/message preference → calendar (if meeting) → email → final review → complete. "Back to website" replays the loader. Answers persist in sessionStorage. ⚠ `LAUNCH.md` lists an older step order (with name/company).
  - First step (owner, 2026-11-23): "What can I help you with?" has no helper line; the prompt lives in the field. With no suggestion the placeholder is "Tell me about your project…" (shortened by the owner, 2026-11-24); with a suggestion (e.g. Graphic Design) the subject shows as a removable tag above the field and the placeholder is "Tell me more…". Removing the tag switches back to "Tell me about your project…". The empty-field error still reads "Tell me a little about what you’re working on." Clicking a highlighted suggestion on the hero deselects it instead of opening the flow. Typing a message on the hero with no suggestion skips that step and opens "How would you like to work together?" (Question 2 of 4); Back returns to the first step with the typed text kept.
- ✅ **Own booking system**: custom calendar UI with Google Calendar busy times, D1 atomic reservation, Google Meet event + invite, Gmail delivery, idempotent retries. Rules in `content/booking.json` (30 min, Mon–Fri 10–17 Europe/Chisinau, 24h notice, 15 min buffers, 60 days).
- ✅ Monochrome **brand marquee** (9 logos, 110s loop, edge fades, pause control).
- ✅ Custom arrow/I-beam **cursor** (`cursor.css`, native pointer hand on links). **Magnetic buttons** (`[data-magnetic]`, ≤5px, off for touch/reduced motion).
- ✅ Page entrance + same-origin view transitions (`page-motion.*`). Floating circular back-to-top.
- 🟡 Homepage Work grid (5 supplied Figma covers + 1 placeholder, CMS "Homepage work covers"). Hidden by limited mode.
- 🟡 Eight imported case studies (96 local images, vertical layout with process timeline and CSS iPhone mockups). 7code Tech is a "Request this case study" page. Hidden by limited mode.
- 🟡 Decap CMS + GitHub OAuth functions. Code exists; live sign-in is not verified.
- 🟡 Google connection. Code exists; **no account connected**, so no real booking or email has been sent.

## 6. Planned features (vision, not built)

- 💭 Bring back Work, About, Services, Pricing and Playground publicly (turn off `limitedPortfolio`).
- 💭 Prototype animations inside case studies (owner will supply).
- 💭 Stronger, rethought Lendit case study (owner exploring ideas; the horizontal-scroll version was tried and archived).
- 💭 Private inquiry inbox inside the CMS (explicitly not implemented; Gmail and Calendar are used instead).
- 💭 Custom domain cutover from mihailboboc.com, only after approval and a DNS/email check.

## 7. Important design and technical decisions

- 2026-11-18: Custom static generator, no framework, Cloudflare Pages + Decap CMS (free, Git-backed).
- 2026-11-19: The hero morphs in place into the inquiry (no modal, no contact-page redirect).
- 2026-11-19/20: **Own calendar + Google Meet instead of Calendly** (brand fit, no subscription). Meeting path order: choose time → final look → Confirm → back to website.
- 2026-11-20: Site-wide Excon Variable; Outfit removed.
- 2026-11-20: Case studies restored to the original vertical layout; the horizontal Lendit chapters are archived in `experiments/lendit-horizontal/`.
- 2026-11-20: Pricing, Playground, Services and Privacy paused. The `/work/` collection page was removed (old URLs → `/#work`).
- 2026-11-24: Google Analytics + consent banner removed; Cloudflare Web Analytics (cookieless) instead, so visitors are never asked about analytics. Funnel events are no longer measured.
- 2026-11-20/21: `limitedPortfolio = true` temporarily publishes only the hero landing + contact.
- No delivery is ever faked. Local preview uses labelled samples only. Production fails closed without Google, D1 or Turnstile.
- Generated `dist/`, `.dev.vars`, `.local/`, `preview/` and `experiments/` stay out of Git.

## 8. Current development status (2026-11-22)

- **Staging is live** at mbdesign-website.pages.dev (limited landing, draft/noindex). GitHub `main` @ `213de32` (2026-11-21).
- **Local folder ≠ Git repo.** `mihail-boboc/` has no `.git` of its own; the parent `Product Designer/` has an empty repo with no remote. The local copy is **ahead of GitHub** in:
  - `public/assets/components/hero-typewriter.js` + `tests/hero-typewriter.test.mjs`: the scroll-reveal Listening state now auto-returns after 2.5s idle.
  - `public/assets/about/mihail-boboc.png` (new file).
  - Name: **Mihai** everywhere (owner, 2026-11-23). Display text was changed from "Mihail" in content, templates, lib, admin, tests and docs; asset file names (`mihail-boboc.jpg`), the repo folder and email addresses were left unchanged.
  - `.gitignore`: GitHub also ignores `preview/` and `experiments/`.
- **Unpublished experiment:** `experiments/brand-strip-preview/`. Run it with `PORT=4178 node experiments/brand-strip-preview/serve.mjs`. Not for publishing yet.
  - "Preview work" on the brand strip opens a work-preview overlay. Clicking a card enlarges it into a focused view, and clicking the blur leaves it. There's a `?tune` motion panel.
  - **Eight case studies in the focused view** (2026-11-23). The data and copy live in `case-studies.mjs`. `serve.mjs` renders the cards and readers from it, with styles in `case-reader.css`.
    - Always visible: Lendit marketplace, 7code web design (the website; shown on request), Angen AI, WholeSum.
    - Behind a **soft chevron button** below the cards (a 44px translucent circle; it nudges gently and flips up when open; labelled "Show more work" / "Show less work"). The first row eases up and the next four rise in: Lendit brand identity, 7code brand identity, A5 Flyers – Lendit, Event Gazebo – Lendit.
    - Product studies: H1, a short story, facts (Sector / Result / Year / The work / Related), one hero, then the CTA. Heroes: Lendit's web + mobile image; 7code's website reference image; the homepage laptop cover compositions for Angen AI and WholeSum.
    - Image-led studies: H1, a short paragraph and facts, then **every original project image stacked for scrolling**, then the CTA.
    - The CTA reads "Want to learn more about this project? Book a meeting and I'll walk you through it in Figma." The **Get in touch** button starts the homepage inquiry.
    - **7code web copy is the owner's own** (2026-11-23). I filled its gaps with realistic wording: 'the only designer', 'working directly with the 7Code founders', 'from February 2026', and 'Launched September 2026' as the result.
    - **Unconfirmed values** (owner asked for realistic text, no visible tags): the results for every study except Lendit (500+ users) and Gazebo, the 7code launch month, and the years of the brand/print studies. They are flagged `placeholder: true` in `case-studies.mjs` and render as `<dd data-unconfirmed>` with no visible marker. **Confirm them before publishing.**
    - Opening and closing behaviour: the focused view opens with a morph-extend out of the clicked card and closes back into it; clicking the blur returns home; × and Escape now also return home with the same shrink-into-card morph (2026-11-23).
    - Layout: a landscape card aligned with the blurred header, no breadcrumb, with the title near the top.
    - **The rail shows all seven other case studies in one row.** The chevron is hidden while a case study is open. Below 700px the rail scrolls sideways.
    - Reader scrollbar: slim (12px with a 4px inset), soft grey and darker on hover. Its track stops `frame radius + 6px` before the top and bottom, so it never runs into the rounded corners. Firefox uses a thin scrollbar instead.
    - **Switching case studies keeps the frame still.** The current story drifts up and dissolves (240ms), the next settles in from below (520ms, blur → sharp) and scrolls back to the top. The morph-extend only plays when the view first opens from the cards.
    - **Phones and iPads in portrait (≤1024px)** (owner, 2026-11-23; `public/assets/work-preview/compact.css` + `preview.js`; desktop and iPad landscape unchanged):
      - Header: logo · Get in touch · round menu button. About and the social icons move into a **menu drawer** that drops under the header (Work, About, LinkedIn, Instagram); Work and About are 16px like Get in touch, and the links and social icons are centred (owner, 2026-11-24); closes on outside tap, Escape or a choice.
      - **Scroll vs Work** (owner, 2026-11-24): on phones and iPads, scrolling/swiping down opens the hero's own Listening state (as before the work preview existed), not Work. Tapping the brand strip opens the work page. Desktop is unchanged (scroll down opens the work preview).
      - **Work page**: Work in the drawer or tapping the brand strip opens every card (no chevron) in a scrollable grid over the blurred homepage, fading in like desktop: 2 columns on phones, 3 on iPads, with a "Work" title and a close button. Scrolling back up inside the grid only closes it once the grid is at the top.
      - Case studies and About open as a near full-screen frame; the rail of other work swipes sideways underneath. About grows out of the menu button.
      - Hero: unchanged on mobile. A "Tap to tell me what you’re working on" field was tried on 2026-11-24 and removed at the owner's request.
    - The "Preview work" pill on the brand strip is hidden everywhere (owner, 2026-11-24); it only appears for keyboard focus, so keyboard users can still open the work preview.
    - **Clicking anywhere on the blur leaves** (owner, 2026-11-23): only the frame and the rail's thumbnails keep the focus view open; the backdrop, the space around the frame and the gaps in the rail all close it (`public/assets/work-preview/preview.js`).
    - **Back to top** (owner, 2026-11-23): a 44px round arrow button in the frame's bottom-right corner, on the same right edge and inset (16px) as ×. It fades in once the story is scrolled past half the frame height and smooth-scrolls the reader back to the top (`.work-project-top`, `updateTopButton()` in `preview.js`). Works for case studies and About.
    - **The rail works like a carousel queue** (owner, 2026-11-23): it opens with the studies after the selected one, wrapping round. Switching runs in two calm, non-overlapping steps timed with the story crossfade: the picked thumbnail fades out in place (240ms), then the rest glide left together (560ms ease-in-out) and the study you left eases in at the right end (520ms ease-out, 160ms delay). Thumbnails are kept and moved, never rebuilt, so images never reload; the rail is inert while it moves (`buildRail(index, previous)`, `thumbnail()`, `settleRail()` in `preview.js`).
    - Removed earlier at the owner's request: the Lendit chapters, the phone reel and "Next case study".
  - **Corner smoothing 100% (Figma squircle)**, from tokens in `preview.css :root`:
    - Radii: `--card-radius` 24px (owner changed it from the Figma 16px; clamp 16–24), `--frame-radius` 60px (clamp 28–60). The rail thumbnails inside the focus view keep their original plain radius, clamp(14px, 2.2vw, 25px), with no smoothing (owner's request). Exact zoomed-down copies of the home cards were tried on 2026-11-23 and reverted at the owner's request.
    - Uses native CSS `corner-shape: superellipse(2.1)` with `border-radius: 2 × radius`. Figma's 100% smoothing spans twice the radius along each edge with its corner midpoint matching a plain circle; this reproduces both.
    - Browsers without `corner-shape` fall back to plain radii.
    - The morph clip uses the round-equivalent radius, and the scrollbar track insets past the 2× curve.
  - **Laptop covers are normalised optically** (Lendit, 7code, Angen AI, WholeSum): every MacBook screen (lid) is 78% of the artwork width and horizontally centred, and every base rests at 85% height. Sizing by the screen rather than the base, since the screen is what the eye compares (owner, 2026-11-23).
    - Each cover's lid centre, lid width and base bottom were measured from the artwork and stored as `DEVICES` in `case-studies.mjs`. The transform in `preview.css` (`.work-preview-art > [data-device]`) uses container units, so it applies to the cards and the rail thumbnails alike.
    - The 7code, Angen AI and WholeSum cards use owner-supplied transparent laptop renders (`cover.laptop` in `case-studies.mjs`): `7code-laptop.png` (976×596), `angen-ai-laptop.png` and `wholesum-laptop.png` (392×226) in `experiments/brand-strip-preview/`, served under `/__experiment/`. Case-study heroes are unchanged (7code hero still uses `reference.png`; Angen AI and WholeSum have no hero image: the owner removed the large laptop mockups on 2026-11-23, so those studies show only the card cover above the title until new visuals are supplied).
    - The open case study starts with its own card cover (same artwork and laptop normalisation as the card), left-aligned above the title, so it is clear which work is open (owner, 2026-11-23). Logo covers show just the logo (no tile or background), left-aligned with the title (owner).
    - Focus-view titles are short (one line at desktop; WholeSum wraps to two at 1440) and the details they used to carry live in the overview text (owner, 2026-11-23): e.g. "A rental marketplace for neighbours.", "A visual identity for Lendit.". Angen AI's "16 weeks", WholeSum's "10 weeks" and "raw interviews into client-ready research", and the Lendit identity's "from the logo to the brand guidelines" moved into the body.
    - Lendit shows product screens without device mockups under the overview (`screens` in `case-studies.mjs`, `screensFigure()`): three owner-supplied desktop screens (`experiments/brand-strip-preview/lendit-desktop-{listing,messages,listings}.jpg`, 2000×1250, served under `/__experiment/`), then the app's nine mobile screens (project images 14–22) three across. The old laptop + phone mockup hero was removed (owner, 2026-11-23).
    - 7code (web) shows seven website screens from Figma `170:14420` under the overview, no device mockup (home hero, case studies, why 7Code, Web & Mobile App Development, Daily8 case study, Our Process, Contact): `experiments/brand-strip-preview/7code-desktop-*.jpg`, 1440 wide. The laptop-mockup hero (`reference.png`) is no longer used in the reader. `serve.mjs` now serves any `[a-z0-9-].jpg|png` in the experiment folder under `/__experiment/`.
    - WholeSum shows three owner-supplied screens under the overview, no mockup (`wholesum-how-it-works.jpg` 1922×760, `wholesum-desktop-upload.jpg` 2000×1494, `wholesum-desktop-analysis.jpg` 2000×1250). Angen AI shows its 12 final UI screens from `content/projects/angen-ai.json` (images 18–29, light and dark, not the wireframes) via `screens.projectDesktop`.
    - **About opens in the focus view** (owner, 2026-11-23). The experiment injects an "About" link into the header before the socials (`serve.mjs`); clicking it blurs the homepage and morphs the same frame out of the link (`openAbout()` in `preview.js`). Content comes from `content/site.json` (`renderAbout()` in `case-studies.mjs`). Layout (owner, 2026-11-23): a large portrait on the left (`/assets/about/mihail-boboc.jpg`, smoothed corners) with the facts in two columns beneath it (Role, Location, Experience, The work, Industries); "I’m Mihai, good to meet you" and the three about paragraphs on the right; then "Things I come back to." principles and a "Have a project in mind?" Get in touch CTA. About has no work rail. × / Escape / blur shrink it back into the link.
    - Image-led studies with a one-paragraph overview place their next image in the space under the overview, beside the facts (`studyImages()` in `case-studies.mjs`); the rest of the gallery follows. A photo already used as the card cover is not repeated in the gallery.
    - Rail thumbnails follow Figma `172:3028`: artwork 107×67 and title stacked at the bottom with 14px gaps and 14px padding, title Regular 12px.
  - Card icon follows Figma `145:7552` (`maximize-2.svg`, mirrored ↖↘, sized to the title). Identity covers sit at 70% width. Flyer and gazebo cards use their first project photo, as no Figma covers were supplied.
  - Scrolling down (wheel or swipe) opens the work preview and scrolling up closes it. In this experiment that replaces the hero's scroll-to-Listening.
  - Cards without a case study (7code, Angen AI, WholeSum) still show the enlarged cover.
  - The previous reader is kept as `lendit-reader.v1.html`, `lendit-reader.v1.css` and `preview.v1.js`.
  - Still to do: the owner confirms the unconfirmed results and years (search `placeholder: true`) and signs off on the image-led covers.
- Tests: 94 total, **90 pass, 4 fail**. The failures expect Work, About and case-study pages, which limited mode removes (`site.test.mjs`).

## 9. Known issues and limitations

- 4 failing tests (above) until limited mode is turned off or the tests are made mode-aware.
- Contact email inconsistency: `site.json` `hello@mihaiboboc.com` vs `LAUNCH.md` `mihailboboc.work@gmail.com`. Analytics domain is `mihaiboboc.com` vs the existing site `mihailboboc.com`. Confirm the intended domain.
- `README.md` is a long append-only log; several sections are superseded (it says so at the end). `LAUNCH.md` step order is outdated.
- Google, D1 production binding and the CMS OAuth app are not configured. No real end-to-end booking test yet.
- No physical iPhone keyboard test yet (simulation only).
- Node is not on the default shell PATH on the owner's Mac; use `~/.nvm/versions/node/v24.13.0/bin`.

- **Published 2026-11-23** (owner approved): the brand-strip experiment is now part of the build (`scripts/work-preview.mjs` + `public/assets/work-preview/`, injected into `/` and `/404.html` by `scripts/build.mjs`). Pushed to GitHub `main` as `7ae6522` (on top of `213de32`), then `7b2595e` on 2026-11-24 (mobile/iPad) `7f0a3a0` (Preview work pill hidden) and `183c3f2` (GA removed, shorter placeholder) and the hero motion/hover batch; Cloudflare redeployed https://mbdesign-website.pages.dev within ~1 min. Draft/noindex unchanged; no domain change. Unconfirmed case-study facts were published as written at the owner's request.
- Sync method used: this local folder is still **not** linked to GitHub (its `.git` has no commits). The push was made from a fresh clone with the local files copied in (excluding `experiments/`, `preview/`, `dist/`, `.local/`, `.dev.vars`, `bookings.sqlite*`, root `preview-*.jpg/gif`, `.DS_Store`; the unused 4 MB `public/assets/about/mihail-boboc.png` was left out). Edit `scripts/work-preview.mjs` / `public/assets/work-preview/` from now on; `experiments/brand-strip-preview/` is the superseded prototype (its server skips injection when the build already includes the preview).

## 10. Next priorities

1. Make this folder a proper clone of GitHub `main` (now at `183c3f2`) so future pushes don't need the copy-into-clone step.
2. Make the tests pass (mode-aware tests or re-enable pages).
3. ✅ Work preview shipped to staging. Next: owner review on the live staging URL.
4. Confirm email, domain and meeting rules. Connect Google + D1 + Turnstile. Run a real acceptance test (`LAUNCH.md` §8).
5. Re-enable the full portfolio when the content is approved; set `draft: false` only at launch.

## 11. Change log

| Date | Agent | Change |
| --- | --- | --- |
| 2026-11-18 | Codex | First draft: static generator, pages, Decap CMS, OAuth functions. |
| 2026-11-19 | Codex | Figma hero, typewriter editor, hero→inquiry morph, recruiter path, reset, long-message handling, portrait states. |
| 2026-11-19/20 | Codex | Portrait motion atlas, custom cursor, transitions, brand marquee, logo loader, own calendar + Google Meet booking, Get in touch fill. |
| 2026-11-20 | Codex | Excon site-wide, original case studies imported, timelines + iPhone mockups, GA4 consent, repo created and pushed, staging on Pages, pages paused. |
| 2026-11-21 | Codex | Limited landing layout, shorter inquiry with EUR budget, Get in touch redesign, hero hover/scroll fixes (last push `213de32`). Brand-strip preview experiment (local only). |
| 2026-11-22 | Claude Code | Added `PROJECT_CONTEXT.md`, `CLAUDE.md`, `AGENTS.md`. No functional changes. |
| 2026-11-23 | Claude Code | Laptop covers centred and aligned (same base width and baseline). |
| 2026-11-23 | Claude Code | 100% corner smoothing on cards (24px, owner's choice) and the focus frame (60px) via CSS corner-shape. |
| 2026-11-23 | Claude Code | × and Escape in the focused view return to the home screen (same morph as the blur). |
| 2026-11-23 | Claude Code | 7code web case study uses the owner's copy; visible placeholder tags removed (values still flagged in data). |
| 2026-11-24 | Claude Code | Removed Google Analytics and its consent banner; privacy copy and ANALYTICS.md now describe cookieless Cloudflare Web Analytics (to be enabled in the dashboard). Tests 87/91 (same 4 known). Pushed in `183c3f2` with the shorter placeholder, live on staging. |
| 2026-11-24 | Claude Code | "Preview work" pill hidden (keyboard focus only); the brand strip itself opens Work on touch. Pushed in `7f0a3a0`, live on staging. |
| 2026-11-24 | Claude Code | Published to staging: mobile/iPad drawer + work grid, inquiry placeholder, deselectable suggestions, click-anywhere exit. GitHub main `7b2595e`; live on mbdesign-website.pages.dev (draft/noindex kept). |
| 2026-11-24 | Claude Code | Phones/iPads: scroll down opens the hero Listening state again; tapping the brand strip opens Work. Desktop unchanged. Pushed in `7b2595e`. |
| 2026-11-23 | Claude Code | Phones/iPads: menu drawer (Work, About, socials), full work grid page, near full-screen case studies (the tried "Tap to tell me…" hero field was removed; hero unchanged). Pushed in `7b2595e`. |
| 2026-11-23 | Claude Code | Inquiry first step: placeholder replaces the helper line; hero suggestions can be deselected; focus view closes on any click outside the frame and thumbnails. Pushed in `7b2595e`. |
| 2026-11-23 | Claude Code | Published to staging: work preview + focus-view case studies + About built into the site, pushed `7ae6522` to GitHub main; live on mbdesign-website.pages.dev (draft/noindex kept). |
| 2026-11-23 | Claude Code | Inquiry: chosen suggestion shown as removable tag with "Tell me more…"; typed hero message without a suggestion skips to the engagement step. Tests 90/94 (same 4 known). |
| 2026-11-23 | Claude Code | Name changed to Mihai across content, build templates, lib, admin, tests and docs; About details updated to the owner's text (Design Partner, Moldova, 10+ years, Expertise, Product Domains). |
| 2026-11-23 | Claude Code | Rail transitions reworked: fade-out, then one glide left and a soft entry at the end; persistent thumbnails, no overlap or image reloads. |
| 2026-11-23 | Claude Code | WholeSum: 3 supplied screens; Angen AI: 12 final UI screens from the project (no wireframes, no mockups). |
| 2026-11-23 | Claude Code | Back-to-top button in the focus view, bottom-right, aligned with ×. |
| 2026-11-23 | Claude Code | Rail below the focus view is now a carousel queue: picked card lifts out, others slide left, the closed study enters at the right. |
| 2026-11-23 | Claude Code | 7code case study: laptop mockup replaced by 7 website screens exported from Figma 170:14420. |
| 2026-11-23 | Claude Code | About: big portrait left with details beneath, story right; work rail removed from About. |
| 2026-11-23 | Claude Code | Header About link opens About in the focus view (portrait, story, facts, principles, CTA, rail of all work). Experiment only. |
| 2026-11-23 | Claude Code | Lendit case study: mockup hero replaced by 3 desktop screens and 9 mobile screens, no device frames. |
| 2026-11-23 | Claude Code | Removed the large laptop-mockup hero images from the Angen AI and WholeSum case studies (owner request). |
| 2026-11-23 | Claude Code | Shorter one-line titles with details moved into the overview; short overviews get a lead image beside the facts; cover photo no longer repeated in galleries. |
| 2026-11-23 | Claude Code | Focus view shows the selected card cover above the title; titles shortened to two lines max. |
| 2026-11-23 | Claude Code | Angen AI and WholeSum cards use the supplied laptop renders; rail thumbnails match Figma 172:3028 (bottom-aligned, Regular 12px title). |
| 2026-11-23 | Claude Code | Lendit focus view captured into Figma (file 3chviwyGZ43nLoMaufQbhl, UI Design page, node 172:2893): editable layers, MB colour variables bound, frame radius 60 @ 100% smoothing. Text uses family "Excon" and needs Replace fonts → Excon Variable. |
| 2026-11-23 | Claude Code | 7code card uses the supplied transparent laptop image; all laptop covers now sized and centred by their screen width for optical alignment. |
| 2026-11-23 | Claude Code | Tried rail thumbnails as zoomed copies of the homepage cards; reverted to the previous compact thumbnails at the owner's request. |
| 2026-11-23 | Claude Code | Focus view: one-row rail of all other studies, chevron hidden while open, in-place content crossfade when switching studies. |
| 2026-11-23 | Claude Code | All 8 case studies (4 product + 4 image-led) data-driven from `case-studies.mjs`; More/Less reveal; breadcrumb removed; placeholders tagged. |
| 2026-11-23 | Claude Code | Lendit: morph-extend open/close, header-aligned landscape card, closing CTA to the inquiry, chapters removed, Figma card icon. |
| 2026-11-23 | Claude Code | Lendit reading view: smaller centred landscape card, hero image spacing fixed, blur click morphs back to the homepage. |
| 2026-11-23 | Claude Code | Lendit case study restructured: white, numbered chapters, rail of other works kept, blur exits to home, reel and next link removed. |
| 2026-11-22 | Claude Code | Local-only Lendit short case study with an animated screen reel inside the focused work card (`experiments/brand-strip-preview/`). Published site untouched. |
| 2026-11-24 | Claude Code | Hero → inquiry open/close transition: the intro heading ("Hey there…") and the first question no longer share one view-transition slot (it made the text slide up and stretch into the question). Now the old screen dissolves in place (340ms), then the new one eases in (480ms, small 6px rise on the heading) with no overlap. The portrait is part of that hero block: it dissolves in place with the heading instead of gliding up (and down on the way back). Steps inside the flow keep their existing transition. `hero-inquiry.css` only. Tests 87/91 (same 4 known). Pushed 2026-11-24. |
| 2026-11-24 | Claude Code | "Back to website" after a finished inquiry now replays the animated logo (`brandEntrance.play({restore})` restores the homepage behind it) and the "Hey there…" introduction types itself again (`replayIntroduction()` in hero-typewriter.js). Leaving mid-form still uses the fade. Reduced motion skips the logo. Tests 87/91 (same 4 known). Pushed 2026-11-24. |
| 2026-11-24 | Claude Code | Hero placeholder now breaks as "What are you / working on?" (`&#10;` in the textarea placeholder in `scripts/build.mjs`; the footer prompt is unchanged). Tests 87/91 (same 4 known). Pushed 2026-11-24. |
| 2026-11-24 | Claude Code | Hovering the hero portrait (mouse/pen) now switches to listening mode like hovering the heading: placeholder, suggestions, listening portrait; it restores after the same hover-out delay (`portraitHovered` in hero-typewriter.js). Tests 87/91 (same 4 known). Pushed 2026-11-24. |
| 2026-11-24 | Claude Code | Hero swap ("Hey there…" ⇄ "What are you working on?", bio ⇄ suggestions) on hover and mobile scroll: outgoing text fades in place (280ms), incoming eases in just after (460ms, 220ms delay, 6px rise) instead of sliding into each other. Selected suggestion no longer persists: cleared on reload, bfcache return and Back out of the form (`clearSubject()` in hero-inquiry.js). Tests 87/91 (same 4 known). Pushed 2026-11-24. |
| 2026-11-24 | Claude Code | Mobile hero → inquiry: the logo no longer slides up 10px during the transition (≤820px it dissolves with the screen); the keyboard is closed and allowed to settle before the transition so the viewport resize can't cancel it (`settleKeyboard()`); browsers without view transitions now fade the screen out, swap, and fade in, instead of sliding the new step up. Checked at iPhone 12 Pro size in Chrome (both paths). Tests 87/91 (same 4 known). Pushed 2026-11-24. |
| 2026-11-24 | Claude Code | Owner's iPhone recording showed iOS Safari playing the hero ⇄ inquiry view transition as a simultaneous crossfade (portrait over the question, texts overlapping) plus a jump when the keyboard closed. Opening/closing the inquiry no longer uses a view transition: `fadeSwap()` fades header (logo kept on desktop) + main + footer out (320ms), closes the keyboard and swaps while invisible with the hero's own CSS transitions suspended (`html[data-hero-swapping]`), then fades in (480ms). Step changes inside the form still use the view transition. Checked in Chrome at iPhone 12 Pro and desktop: content only changes while opacity is ~0, nothing moves while visible, logo static on desktop. Not yet confirmed on a real iPhone. Tests 87/91 (same 4 known). Pushed 2026-11-24. |
| 2026-11-24 | Claude Code | Mobile hero tap: a finger tap on the heading now focuses the field from `touchend` (preventScroll, so iOS opens the keyboard without the page jumping) and sets `touchListening`, which keeps Listening open until a tap outside the hero (no more 2.5s timeout back to "Hey there"). Step changes inside the form use the same scripted fade (260ms out / 420ms in, panel only) on ≤1024px and WebKit/Safari; desktop Chrome/Edge keep the view transition. Checked in Chrome at iPhone 12 Pro with synthetic touch: listening persists 4s+, tap outside restores; steps only change while panel opacity ≈0. Not yet confirmed on a real iPhone. Tests 87/91 (same 4 known). Pushed 2026-11-24. |
