# Mihai Boboc — portfolio website

A custom-coded, dependency-free static portfolio for Cloudflare Pages, with Decap CMS and a small GitHub OAuth handler. Source repository: https://github.com/mihailbobocwork-collab/mbdesign-website. Website deployment and the private Google connection are pending.

## Preview on your computer

Requires Node.js 24 (recommended), or 22.13 or newer. No package installation is needed.

```sh
npm run dev
```

Open http://127.0.0.1:4173. Stop with Ctrl+C. After editing source or content, run `npm run build` and refresh the browser (the local server serves `dist/`; it does not watch files).

```sh
npm run build
npm test
```

The build creates real HTML pages in `dist/`, so navigation and project content work without JavaScript. JavaScript adds the menu, filters, inquiry preparation, and playground controls. The development server is local only and does not run Cloudflare authentication functions.

## Included

- Home with a Work section, Services, About, Get in touch, seven original public case studies, one private-project request page, Privacy, and a real 404 page. Pricing and Playground are paused.
- The supplied SVG logo, preserved from the original attachment.
- Original portfolio stories and 96 original project artworks, with responsive previews and iPhone framing for mobile screens.
- Gentle button attraction, capped at 5px, independent of the custom arrow cursor. Attraction is disabled for reduced motion and touch/coarse pointers; keyboard interaction remains native.
- Responsive navigation, visible keyboard focus, skip link, labeled inputs, native validation, semantic headings, and live status updates.
- Separate topic and detailed message fields, explicit review/confirmation, and a custom Google Calendar/Meet booking flow.
- Decap collections for site and page introductions, biography, projects and images, services, and pricing.
- GitHub OAuth endpoints with state, PKCE, secure session cookie, exact-origin popup messages, account allowlist, and repository write-access verification.

## Edit content

| Location | What it controls |
| --- | --- |
| `content/site.json` | Name, introduction, bio, location, page introductions, contact email, site URL, GitHub repository, draft mode |
| `content/projects/*.json` | Work cards and case-study text, ordering, categories, image and accessible description |
| `content/offers.json` | Four pricing offers, scope, delivery time, terms |
| `content/services.json` | Three service descriptions and deliverables |
| `public/assets/` | Logo, styles, interactions, images and future CMS uploads |
| `scripts/build.mjs` | Page layouts and supporting fixed copy |
| `cms.config.json` | CMS field definitions; final backend settings are filled in during the build |
| `functions/` + `lib/oauth.js` | Cloudflare-only CMS authentication |

To replace project artwork, upload the image to `public/assets/uploads/` (or use the CMS), then change the project's `image` and `imageAlt`. Paths must begin with `/assets/`. Text fields are rendered as escaped plain text; blank lines create paragraphs. `scope` and service `details` use one item per line.

The portfolio uses static pages and a small Cloudflare D1 database for booking safeguards. It has no visitor tracking, paid font, or booking-service subscription. Decap is open source. Cloudflare static hosting, builds and function requests remain subject to its current free-tier allowances. Domain registration and any email provider are separate costs. Functions run only for `/auth`, `/callback`, `/api/calendar`, and `/api/bookings`.

## Contact and meeting behavior

The hero becomes a one-question-at-a-time inquiry. After the project or hiring details, visitors choose a Google Meet conversation or a message. The meeting path opens the calendar directly, then one final review of the details and selected time before **Confirm meeting**. Back and Change time restore the calendar selection. The message path uses **Send message**. Both wait for a real server confirmation before showing success. Until Google is connected privately, neither path pretends to deliver.

The connected Google account receives message-only inquiries too. Its email is discovered during owner sign-in; it is not guessed or included in public source. `contactEmail` remains an optional public direct-email link, separate from private delivery settings. Drafts stay in browser-tab storage, and the contact page also supports a local text download.

See [GOOGLE-SETUP.md](GOOGLE-SETUP.md) for the one-time connection and Cloudflare database setup. No account has been connected, real booking made, or message sent during implementation.

## Cloudflare Pages deployment — do this only after approving publication

1. Create a GitHub repository and add the contents of **this folder** at its root. Keep `.dev.vars`, `.env` files and credentials out of Git. The repository can be public or private.
2. In `content/site.json`, set:
   - `githubRepo`: `YOUR_USERNAME/YOUR_REPOSITORY`
   - `githubBranch`: your production branch, normally `main`
   - `siteUrl`: the final HTTPS origin, such as `https://YOUR_PROJECT.pages.dev` (or the custom domain you intend to use)
   - `contactEmail`: the confirmed inbox, when available
3. In Cloudflare, create a **Pages** project using **Connect to Git**, select that repository, and configure:
   - Framework preset: **None**
   - Root directory: repository root (blank). If importing the whole workspace, use `mihail-boboc` instead.
   - Build command: **`npm run build`**
   - Build output directory: **`dist`**
   - Production branch: **`main`**, or the branch set above
   - Node version: the included `.node-version` requests Node 24.13.0; Node 22+ also works.
4. When you choose to deploy, Cloudflare builds the site and compiles `functions/`. Use the Git integration, not dashboard drag-and-drop: uploading only `dist/` will not include the OAuth functions.
5. Add your custom domain in Pages if desired. Update `siteUrl` and the OAuth URLs below to that exact origin. Use that same domain for `/admin/`; the auth handler intentionally rejects other origins, including preview domains.

**Publishing creates a reachable website.** `draft: true` adds noindex and disallows crawling; it is not access control. Keep the draft local until you are ready, or configure Cloudflare Access separately for a private staging environment. This task has not deployed anything.

## CMS authentication — GitHub + Cloudflare, no paid CMS service

The local `/admin/` route currently shows an honest setup screen. It cannot sign you in until the following configuration exists.

1. In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Use these values, replacing the domain with the exact origin from `siteUrl`:
   - Application name: `Mihai Boboc CMS`
   - Homepage URL: `https://YOUR_SITE/admin/`
   - Authorization callback URL: **`https://YOUR_SITE/callback`**
3. Generate the client secret. Enter it directly into Cloudflare's secret settings; never put it in the source, public CMS configuration, or chat.
4. In the Pages project's **Settings → Variables and Secrets**, configure production runtime values:

| Variable | Value |
| --- | --- |
| `SITE_URL` | Exact HTTPS origin, e.g. `https://YOUR_SITE.pages.dev` |
| `GITHUB_CLIENT_ID` | OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | OAuth App secret; store as a secret |
| `GITHUB_REPO` | Same `owner/repository` as `githubRepo` |
| `GITHUB_ALLOWED_USERS` | Comma-separated GitHub logins allowed to edit |
| `GITHUB_SCOPE` | `public_repo` for a public repo; `repo` for a private repo |

5. Redeploy after adding runtime settings. Visit **`https://YOUR_SITE/admin/` → Open content manager → Login with GitHub**. Use an allowlisted account with push access to the repository. OAuth app authorization grants the selected scope; `repo` is broad, so review GitHub's permission screen. No token or client secret belongs in `content/site.json` or `cms.config.json`.
6. Change a small piece of copy and publish it in Decap. This commits JSON to the configured Git branch; Cloudflare then rebuilds the site. Confirm the deployment succeeds and the edited content appears.
7. To revoke access, remove the login from `GITHUB_ALLOWED_USERS` and redeploy, remove repository write permission, and revoke the OAuth authorization in GitHub. Removing only the allowlist blocks future sign-ins; it does not revoke a token already issued by GitHub.

The admin uses the pinned `decap-cms@3.9.0` bundle from unpkg, loaded only when the configured editor is opened. GitHub access tokens are handed to Decap in the browser as required by its GitHub backend; log out on shared computers. GitHub's OAuth App flow here does not implement refresh-token renewal; if enabling GitHub token expiration, reauthenticate when a token expires. Live sign-in and a real CMS commit must be verified after credentials and a repository are configured.

## Before the public launch

- Replace the marked mock screens and case-study copy with approved project material.
- Confirm biography, location, role, career history, email, pricing scopes and delivery commitments.
- Review the supplied portrait and its AI-edited note-taking variations before launch; provenance is recorded in `PORTRAIT-NOTES.md`.
- Review the draft privacy text against the final hosting and contact setup.
- Set `draft` to `false` only when the approved public copy is ready. This removes noindex and generates normal crawl directives. `siteUrl` enables canonical links and a sitemap.
- Verify GitHub sign-in, a CMS save → Git commit → Cloudflare rebuild, and the email flow with the real inbox.

## Verification

Automated tests cover generated page structure, all local links/assets/fragments, duplicate IDs, supplied-logo preservation, CMS field mapping, content-edit-to-build behavior, and OAuth state/PKCE/origin/allowlist/repository-permission handling. OAuth network calls in tests are mocked; no real credentials or external writes are used. Browser checks and any remaining limitations are recorded in `QA.md`.

## Official setup references

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Cloudflare build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Decap GitHub backend](https://decapcms.org/docs/github-backend/)
- [Decap external OAuth clients](https://decapcms.org/docs/external-oauth-clients/)
- [GitHub OAuth authorization flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)

## Interactive typewriter hero experiment

The original right-hand hero headline is now an `<interactive-typewriter>` native custom element. The existing static HTML / vanilla JavaScript setup is preserved, with no new framework or package dependency. The existing hero typography and composition remain; magnetic-button behavior is independent. The later in-place inquiry flow is described below.

- Component: `public/assets/components/hero-typewriter.js`
- Scoped styling: `public/assets/components/hero-typewriter.css`
- Markup: the homepage template in `scripts/build.mjs`
- Reuse: provide the same heading/textarea/mirror markup and a `text` attribute on another instance. Instance listeners and timers are cleaned up on disconnect.
- The introduction types once per page load, at 50–80ms per ordinary character with punctuation pauses. Hovering during typing completes it behind the fade; leaving does not replay it.
- Hover reveals and focuses a native textarea on mouse/pen devices, so typing works without a click. Tab and direct click/tap also activate it. Empty hover-owned focus is released after pointer exit; intentional keyboard/touch focus and entered text remain editable.
- Enter and the small send arrow morph the homepage hero into an inquiry, carrying the exact project text into the first answer and beginning with the name question. Shift+Enter inserts a line; IME composition does not advance. No message is sent. Instances without a hero-flow controller retain the contact-page fallback.
- Drafts survive same-tab page navigation and reloads using session storage. The hero-flow controller also stores the inquiry’s identity answers in that tab; there is no server storage. Clearing an answer updates its stored value. The contact fallback strips its transfer fragment after prefilling.
- Reduced motion skips the typing and opacity animation; the decorative caret stays steady. The actual editor always uses the browser’s native caret.

## Figma hero update — 19 November 2026

The homepage hero now follows Figma node `4:8` in `3chviwyGZ43nLoMaufQbhl`. This supersedes the earlier two-column name/introduction composition. The large two-line introduction is the same reusable editable typewriter element, now promoted to the page’s main heading.

- `public/assets/figma-hero.css` scopes the Figma layout to the homepage hero and header. The portfolio sections retain their original content-width wrapper.
- The original portrait, vector mark, and client-logo strip were downloaded from the Figma design into `public/assets/hero/`. The portrait keeps its original source bytes; the `.jpg` extension reflects the actual JPEG format returned by Figma.
- Excon is served from the user’s installed Excon variable font; Outfit is served locally from Google Fonts with its OFL license included.
- `content/site.json` controls the two-line headline (`intro`) and supporting paragraph (`heroBio`). Both are exposed through the existing CMS settings collection.
- The homepage navigation matches the supplied frame; Playground remains reachable in the homepage footer and existing internal-page navigation.
- Figma assets are local files. No temporary Figma URLs are used by the deployed pages.

## Hero-to-inquiry morph — 19 November 2026

The hero itself becomes a staged inquiry on the same URL. There is no modal or contact-page redirect.

- `public/assets/components/hero-inquiry.js` controls the flow; `hero-inquiry.css` scopes its appearance.
- Hover/focus blends the headline and native editor with a subtle blur and a 4px settling motion. The 850ms exit hold lets the pointer move to the suggestions; the introduction returns over 1450ms. The description blends into three subject buttons from Figma node 40:410: A new product, A Design System, and Brand Identity. Suggestions seed an empty/preset message while preserving visitor-written text.
- Enter or the existing arrow saves the project as answer 1. Navigation, portrait, client logos and portfolio fade away; the logo and form remain. The portrait’s invisible layout slot keeps the form anchored during the morph.
- Steps are project → name → email → optional company → editable review → prepared inquiry. The initial project answer is already supplied, so the morph opens on name. Back revisits answers; logo or Escape returns to the portfolio. Browser Back exits the flow.
- Required answers and email are validated inline. Fields receive focus after transitions. Hidden surroundings are inert; reduced motion skips animations. Native text selection, multiline editing, and the magnetic buttons remain independent.
- Nothing is automatically sent. With the current blank inbox, completion offers a text download. A configured `contactEmail` adds an explicit Open email app action.

## Hero refinements — Figma section 40:410

The desktop suggestions use the reference’s 65px pill height, 16px Outfit labels, 24px horizontal padding and 25px gaps. They wrap at mobile widths with 50px touch targets. The subtitle retains its 576px slot and uses the supplied #a2a2a2 color. Existing hero typography, portrait, mark, navigation, logo strip and the staged inquiry remain in place.

The empty, unfocused editor waits 850ms after pointer exit, then blends back with opacity, 3px blur and 4px settling movement. Re-entry cancels the pending return. Focus and visitor-written text prevent restoration; reduced motion removes the delay and effects.

## Recruiter option and quick reset

The hero now offers a fourth subject, **Hiring a designer**. It switches the native editor to **Tell me about the role**, with a short hint about the team and opportunity. It does not invent role details. The same four answers are reused: message, name, email and optional company/team. The staged review uses recruiter-friendly labels, with no extra questions.

A circular reset icon sits on the send arrow’s right edge, above it. It is available when the hero contains text or a selected subject. **Reset message and subject** clears those two values in memory and session storage and focuses the empty **What are you working on?** editor. Mouse reset remains open while the pointer is within the headline/suggestions; leaving starts the delayed return to the introduction. Keyboard/touch reset preserves intentional focus. Previously entered name, email and company answers remain available. Reset does not replay the typewriter introduction.

The current blank contact inbox still means the final action prepares a downloadable message. A configured inbox exposes the explicit email-app handoff. Nothing is automatically sent or presented as delivered. The final prepared-message state includes **Back to website**.

## Longer messages and pasted role descriptions

`public/assets/components/message-editor.js` provides adaptive native-textarea sizing and the shared 3,000-character submission limit. This applies to the homepage editor and the inline form’s message-edit step.

- The introduction keeps its original typography. Longer visitor text fits down to 32px on desktop and 22px on mobile. Font sizing settles after substantial edits; small edits retain the settled size, with a further reduction only if the text grows much longer. Reset restores the original size.
- The hero’s invisible mirror is capped at 260px on desktop or 220px on mobile (180px for short viewports). The real textarea scrolls vertically. Reset/send occupy a separate gutter and remain stationary.
- A discreet counter appears for longer or reduced-size messages, warns from 2,700 characters, and shows the excess over 3,000. Unicode code points are counted, so an ordinary emoji counts as one character.
- The submission limit is validated rather than enforced through native `maxlength`: oversized pastes remain editable in full. Enter and Continue are blocked until the message fits. Both draft stores preserve over-limit text through reloads.
- The same sizing and validation apply when returning to edit the message within the inline form. Native selection, scrolling, editing, Shift+Enter and composition behavior are retained. Reduced motion disables font and opacity transitions.

`message-editor.css` contains scoped editor/counter styling. No new dependency or external service is used.

## Listening portrait and hiring suggestion

The existing portrait circle now crossfades to an AI-edited, note-taking variation when the editor is engaged by hover, focus, or a retained message. The source photo is the default; the variation is stored locally at `public/assets/hero/mihail-taking-notes.png`. Image-source details and the exact generation prompt are in `PORTRAIT-NOTES.md`.

Both layers share the existing portrait slot. Only opacity changes, with the editor’s slower return timing. A load-ready guard keeps the source photo visible until the alternate image has loaded; an error leaves the source photo in place. The alternate is decorative for screen readers. Reduced motion disables the crossfade.

**Hiring a designer** now seeds an empty/preset editor with: “Hi Mihai, we’re looking for a product designer to join our team. I’d love to tell you more about the role.” It remains editable and never replaces visitor-written text. This supersedes the earlier blank hiring suggestion.

## Portrait follows the message

The hero now has three portrait states in the same circular slot:

- Idle introduction: original profile photograph.
- Engaged editor with no message: the camera-facing note-taking variation (`mihail-taking-notes.png`).
- Engaged editor with text: the downward-looking writing variation (`mihail-taking-notes-v2.png`).

Typing, pasting, restoring a draft or selecting a suggested message selects the writing pose. Clearing text restores the attentive camera-facing pose while the editor remains open. Reset clears to the empty camera-facing editor; leaving the hover area returns to the original photograph. Whitespace alone uses the empty state. Each alternate has its own load-ready guard; the original or camera-facing photograph remains a fallback if an image is unavailable. The existing fades and reduced-motion behavior apply to all three layers.

## Responsive portrait motion and matching cursor

`public/assets/components/portrait-motion.js` renders intermediate frames across all three existing photographs: original → camera-facing notes → downward writing. A shared facial mesh aligns features; a critically damped response retains velocity during interrupted transitions. A 65ms reaction pause toward engagement/writing and 120ms return pause avoid flicker. Further keystrokes do not restart movement. Rendering stops after settling; hidden tabs and reduced motion snap to the destination. The fixed portrait slot and original opaque underlay remain intact. Native image layers provide a fallback if canvas or an image is unavailable.

The local renderer uses existing photographs, without a service, library, or new image-generation cost. The result is photo interpolation, not recorded video.

The notebook glance now uses 61 detailed optical-flow frames, prepared locally and packed in a 504 KiB WebP atlas. This replaces the coarse mesh for camera-facing ↔ writing movement. The browser draws adjacent frames from the existing continuous motion position, including reversals, without replaying an animation from the beginning. There is no runtime model or external service. The original mesh remains for idle ↔ engaged and as an atlas-load fallback; generation details are in `PORTRAIT-NOTES.md`.

`public/assets/cursor.css` applies the reference-inspired black arrow, rounded white outline, and blue halo through a normal OS-positioned SVG cursor. Links, buttons, and their inner labels/icons use the native pointing hand. Text fields use a matching I-beam for selection. There is no following overlay or tracking loop, and magnetic buttons remain independent. Coarse-pointer and forced-color environments retain native cursors.

## Current reset and hover behavior

Reset from any suggestion or manual message returns to the empty **What are you working on?** editor with typing focus. The selected subject and message draft clear together. While the pointer stays in the engagement area, the editor stays ready; after exit, a 850ms grace period precedes the eased return. Keyboard/touch reset keeps intentional focus rather than dismissing the editor.

Mouse/pen hover focuses the revealed editor without a click, unless another text-editing field already owns focus. Empty focus acquired by hover is released on exit. Explicit clicks and keyboard focus retain normal editing behavior. The typewriter introduction never replays during these transitions.


## Navigation and inquiry transition refinements

`public/assets/components/transition-motion.js` retains a transition’s final visual state before releasing its animation. Outgoing questions remain invisible while their replacement is rendered and measured. Continue and Back use the same eased timing, with a subtle direction-aware vertical movement. The inquiry column holds its height during each change, then returns to natural layout. Escape and browser Back can interrupt a transition from its current frame without a stale animation overwriting the returning hero.

Removed an unnecessary body minimum height that produced a 41px document overflow and scroll jump in the active desktop form. Mobile keeps the portrait’s original layout slot and hero spacing throughout the morph. Message text is measured synchronously before the next form height is animated.

`public/assets/page-motion.css` and the small early `page-motion.js` add a restrained entrance on first load/reload and native same-origin view transitions for page links and browser Back. The entrance is suppressed when a browser transition is already running, avoiding two overlapping fades. Unsupported browsers retain normal navigation with the entrance fallback. Reduced motion disables both effects. Homepage Excon and Outfit fonts are preloaded. Routing, content, cursor motion, and magnetic button behavior remain independent.


## Featured logos and completed-inquiry return

The static logo-strip bitmap is replaced by the nine supplied full-color assets from Figma section `40:411`: Fusion Works, Makita, Midnight Works, Bosch, Capsys, Volta, Lendit, WholeSum, and 7code. All nine logos are displayed in monochrome with a scoped grayscale filter; source asset files are preserved. The original downloaded SVG/PNG assets are kept in `public/assets/hero/featured/`; their order, design-slot dimensions, and Figma node IDs are recorded in `content/featured.json`. SVG root dimensions are unchanged. Raster object-fit and presentation-wrapper scaling follow the reference. No temporary Figma URLs are used at runtime.

The reusable `<brand-marquee>` uses two identical groups and a 110-second linear loop, with a soft transparent mask at both edges. The duplicate group is hidden from assistive technology. A discreet pause/resume control appears on hover or keyboard focus and stays visible on touch-oriented devices. Offscreen/hidden-tab motion pauses. Reduced-motion preferences and the no-JavaScript fallback show a static wrapping layout containing all nine brands. No library or external service is needed.

The final **Back to website** action now clears the completed message and selected subject, then blends back to the full **Hey there…** introduction and default portrait. It focuses the home mark instead of reopening the editor. The typewriter does not replay. Previously entered name/email/company values remain available, and a fresh hover works normally. Back or Escape during an unfinished inquiry still retains the draft.


The featured-logo strip now stays inside the hero/header content margins, matching the supplied alignment guides. Its edge masks and pause control are aligned to those inner boundaries at desktop, tablet, and mobile widths.


## Centred signature entrance

The supplied MB mark now draws itself alone in the centre of the viewport, then dissolves in place through a soft blur as the homepage comes into focus. The original logo SVG is preserved: two animated mask strokes reveal its existing ink texture, followed by a short blend to the complete original asset. The sequence is approximately 2.4 seconds, without a progress percentage or additional visible UI.

It plays on the first homepage visit in a browser-tab session, and on the final **Back to website** action after completing the inquiry. Normal in-form Back/Escape retains its earlier draft-preserving behavior. The final return still clears the completed message/subject and restores the full introduction; it does not replay the typewriter. On a first visit, headline typing begins as the homepage reveal starts. Same-session reloads and normal page navigation retain the existing lighter entrance.

- `scripts/templates/brand-loader.html`: isolated SVG-mask overlay using the original mark.
- `public/assets/components/brand-loader-boot.js`: first-paint flag and session/reduced-motion gate, with a bounded fail-open timer.
- `brand-loader.js` and `brand-loader.css` in the same directory: drawing, a stationary blur dissolve, homepage reveal and cleanup.
- Reduced motion skips the drawing/blur. Escape or a pointer press can skip it. Resize, page hiding and the safety timeout release the loading state; background content is inert only for the bounded sequence.
- The drawing is decorative and runs locally. No video service, animation package or backend is required.

The local browser recording `preview-logo-entrance.gif` shows an excerpt of the actual completed-inquiry return. `preview-logo-centre.jpg` shows the original mark alone before the handoff.


## Softer hover exit and stationary logo dissolve

The empty hover-owned editor now waits 850ms after pointer exit before returning. The placeholder fades out over 1250ms while the introduction and description return over 1450ms with a quiet eased start and end. Suggestion visibility stays enabled through its fade instead of switching off early. The adaptive-message stylesheet uses the same exit timing, so it no longer overrides the slower hero fade. Re-entry still cancels the pending restoration; intentional focus and visitor-written text remain preserved.

The loading logo remains in the exact viewport centre at its original loading size throughout its drawing and dissolve. It blurs to 9px while fading out over 1000ms; the homepage reveals from a 6px blur over 980ms with a 160ms overlap delay. There is no position or scale animation. Inline blur/opacity and inert states are restored at the end or on interruption. The completed inquiry returns to scroll position zero while the backdrop is opaque. Reduced motion still skips the decorative sequence.

`preview-logo-blur.gif` and `preview-soft-hover.gif` are recordings of the actual revised preview. The existing `preview-logo-entrance.gif` now contains the current stationary dissolve as well.


## Homepage work and navigation update

Homepage work follows Figma frame `4:8`: two columns of square cards, 40px desktop gaps, 60px rounded corners, and the Work heading with a link to the complete collection. Four CMS-backed projects retain their full mock artwork without cropping; two remaining slots are explicitly labeled placeholders. Mobile uses one column. The existing hero, editor, portrait motion, and inquiry behavior remain in place.

Work navigation points to the homepage `#work` section from every page; Pricing, Playground, About, and Get in touch remain separate destinations. A sticky header preserves the original page spacing and reveals a soft blurred backdrop after scrolling, with an active Work indicator while the section is visible. The inquiry Continue button is a dark primary capsule. Get in touch is outlined by default and shares the primary button’s hover color. Magnetic movement and native pointing cursors remain independent.

Verified in the local browser at 1440px and 390px: homepage and cross-page Work links, sticky header, active indicator, mobile menu closing after selection, square card layout without horizontal overflow, Get in touch hover, and inquiry Continue/Back with draft preservation. All 45 automated checks pass. This remains a local preview; no public deployment or delivery connection was made.


## Custom calendar and Google Meet

The custom calendar uses Excon and Outfit, restrained colours, outlined day circles, dark selections and a visitor time-zone selector. It stacks on mobile, supports keyboard navigation, distinguishes repeated daylight-saving clock times, and respects reduced motion. `/playground/calendar/` is an explicitly labelled sample-only study and cannot book an appointment.

Live availability comes from Google Calendar busy periods and the owner's rules in `content/booking.json`: 30 minutes, weekdays 10:00–17:00 Europe/Chisinau, 15-minute buffers, 24-hour notice and a 60-day horizon. These are editable draft defaults. Confirmation rechecks availability and atomically reserves the slot in D1 before creating the Google event, invitation and unique Meet link. There is no Calendly dependency.

Request identifiers prevent duplicate events on retries. Unknown outcomes retain their reservation and can recover through Google's deterministic event ID. Unknown email delivery is held for owner review without automatically sending again. Google Calendar changes made outside the website can still race a booking; no cross-service transaction is possible. Cancellation/rescheduling is managed in Google Calendar for now; there is no custom management dashboard.

The local preview uses Node 24's built-in SQLite for the same database queries. `.local/` and `.dev.vars` are private runtime files, excluded from source archives. Production uses Cloudflare D1 and Turnstile. See [GOOGLE-SETUP.md](GOOGLE-SETUP.md).

## Get in touch hover fill

Only Get in touch has the multicolour animated treatment: a thin moving gradient outline at rest, with colour spreading inward from the whole perimeter on hover or visible keyboard focus. Independent pink, cyan, orange and lime pools drift across a dark background, matching the supplied screen recording more closely than a rotating colour wheel. The pale centre gives way smoothly to the fill and white label. Leaving reverses the same transition. Continue remains dark. Magnetic movement, pointing cursors and existing page composition are preserved; reduced motion removes decorative movement.

The explicitly labelled `/playground/inquiry/` interaction preview reuses the hero and complete inquiry flow with sample times. Confirm preview never contacts Google or sends a message. The normal homepage keeps real availability and real confirmation only.


## Revised meeting flow and full interaction preview

“Let’s have a meeting” now opens the calendar directly. Once a time is chosen, **A final look** combines the project/hiring context, contact details and chosen meeting time. **Confirm meeting** is the only booking action. Back and Change time preserve the selection while refreshing availability; message-only inquiries still review once before Send message. The separate contact form follows the same order.

Try `/playground/inquiry/` for a clearly labelled full-flow simulation while Google is unconnected. This dedicated page uses sample times and Confirm preview; it cannot send an inquiry, event or invitation. It preserves the homepage composition, keeps a visible preview notice, and is excluded from the sitemap. The published homepage never substitutes sample times. The local development server now enables the same labelled simulation on the ordinary homepage while Google credentials are missing; connecting Google and restarting restores live mode.

The revised Get in touch fill follows the supplied recording’s brighter, independently drifting colour pools and dark gaps. Default remains an animated outline; hover/focus fills inward. Reduced motion disables decorative movement. All 67 automated checks pass, with desktop and phone browser verification recorded in QA.md.


## Selectable dates in the ordinary local preview

The local server now adds a runtime-only preview flag while Google is unconnected, so `/` and `/contact/` can be tested through sample date/time selection, final review, Confirm preview and Back to website. Calendar and review visibly identify the simulation; confirmation explicitly states that nothing was sent or booked. The flag is not written into `dist/` or published pages. Connecting Google and restarting the preview restores live operation. Month arrows use centered SVG chevrons rather than font characters. All 69 tests pass; the ordinary homepage journey and desktop/mobile arrow alignment were browser-verified.


## Supplied homepage covers and reversed Get in touch

The homepage now uses all five supplied visuals from Figma frame `46:4947`: Lendit product, 7code identity, Lendit identity, WholeSum and Angen AI. White square backgrounds and the existing responsive grid are preserved. All five link to their existing project routes; case-study copy remains a draft. Covers and their order are editable in **Homepage work covers** in the Git-backed CMS. Source layers, dimensions and implementation notes are in [WORK-COVERS.md](WORK-COVERS.md).

The latest Get in touch direction supersedes the earlier outline-at-rest experiments: flowing colour fill and a white label by default; hover or visible keyboard focus expands the pale centre to leave an animated outline with a dark label. Leave restores the fill. The same treatment applies to header and footer Get in touch links; other buttons and magnetic behavior are unchanged. Reduced motion freezes the decorative colour movement.


## Site-wide Excon Variable typography

All website text now shares the locally hosted Excon Variable font, including navigation, headings, body copy, work captions, prices, buttons, suggestions, inquiry fields, counters, calendar controls and the admin setup screen. `public/assets/fonts.css` owns the single variable font-face declaration and `--font-sans` token. Every public page preloads the same Excon file; former Outfit preloads and component font-face duplicates are removed. Native controls inherit the family, and textual code/preformatted elements use it too. Existing sizes, weights, line heights, spacing, colours and interactions are retained. Supplied artwork assets remain original.

## Original portfolio case studies

The illustrative project copy has now been replaced with seven original public case studies from Mihai’s current website, including the full product stories, brand guidelines and print projects. Their 96 original images are local, with smaller responsive previews and access to the original artwork. 7code Tech has a friendly “Request this case study” page that prefills the existing contact form and preserves any separate inquiry draft. Homepage covers remain as supplied; the Lendit identity cover now links to the correct branding page.

Services and Work categories now use Product Design, Graphic Design and Brand Design. Source mapping, project routes, CMS editing notes and media details are in [PROJECT-PAGES.md](PROJECT-PAGES.md). The downloadable source excludes generated `dist/`; `npm run build` recreates the Cloudflare Pages output. Existing CMS authentication and Google connection instructions above still apply.

## Focused Lendit story and homepage Work navigation

Lendit is now presented in seven horizontally moving chapters, driven by ordinary downward/upward scrolling. Buttons, chapter navigation, keyboard arrows and touch support remain available; original notes and all 24 project artworks are preserved. Prototype animations can be added when supplied. The new narrative is editable in the CMS under **Lendit chapter story**. See PROJECT-PAGES.md for implementation and content details.

The separate Work collection page and its homepage subtitle are removed; old collection URLs redirect temporarily to the homepage Work section. Case-study Back links return there. A circular floating Back to top shortcut replaces the footer text link.


## Restored original vertical case studies

At Mihai’s request, Lendit again uses the original imported story, artwork sequence and vertical case-study layout, with shared navigation and footer. The horizontal chapter experiment is archived under experiments/lendit-horizontal and is not loaded or shown in the CMS. Other project pages retain their original imported layouts. The floating circular Back to top button, removed homepage subtitle, and homepage Work destination remain in place.


## Process timelines and iPhone mockups

The vertical case studies now group their process chapters along a connected timeline rail, with a bottom process dock that highlights the stage being read. Lendit’s ten mobile screens use CSS-built iPhone mockups around the original artwork. Mobile layouts introduce the experience text before the screen. Original source content and enlargement links are preserved.

## Current launch preparation

See [LAUNCH.md](LAUNCH.md) for current behavior, the confirmed contact address, account connections and pre-launch acceptance checks. Hero text is now an editable topic and both message/meeting branches collect a separate description before review. Pricing and Playground are paused and excluded from the public build; their source remains available. The original chronological implementation notes above describe earlier versions and are superseded by this launch handoff.
