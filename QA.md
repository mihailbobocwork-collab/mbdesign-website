# First-draft verification

Verified locally on 18 November 2026. No public deployment, GitHub repository creation, real OAuth authorization, or external message sending took place.

## Automated checks

`node --test tests/site.test.mjs`: 8 tests passed.

- Generated HTML titles, language, viewport and one primary heading per page.
- Local links, images, styles, scripts and anchor targets; duplicate IDs.
- Draft indexing restrictions and original SVG preservation.
- CMS content-field mapping and an actual content change rebuilt into escaped HTML.
- OAuth state, PKCE, secure cookie, exact callback and domain enforcement.
- Rejection of missing, incorrect or expired state before network access.
- Rejection of accounts outside the allowlist and accounts without repository write access.
- Successful mocked OAuth response uses exact-origin popup messaging, restricted script policy and cookie deletion.

## Browser checks

- Desktop homepage rendered with the supplied mark and project artwork.
- Work filter switched to Web & Brand and showed only 7code.
- Pricing → Design Partner preselected that offer in the inquiry form.
- Submitting an empty form kept the inquiry review hidden.
- A valid test inquiry showed the correct selected offer and explicit “Not sent” status.
- Edit details returned focus to the message field.
- Product Audit inquiry prepared correctly and downloaded a real `project-inquiry.txt` file using test data.
- Playground magnetic-demo button displayed its activation status; Lilac selection changed the selected palette; keyboard input changed the tracking output from −0.03em to −0.02em.
- At 390px, mobile navigation opened and Escape closed it with `aria-expanded` updated.
- At 320px, Home, Work, Services, Pricing, Playground, About, Contact and Lendit each had content width equal to viewport width (no horizontal overflow) and zero reported broken images.
- `/admin/` displayed the intended missing-configuration explanation.
- No console warnings or errors were reported in the checked inquiry flow.
- The pinned Decap bundle URL returned HTTP 200.
- Final desktop screenshot: `preview-desktop.jpg`.

## Remaining checks after configuration

- Actual GitHub OAuth and Cloudflare Functions behavior with real settings.
- CMS edit → GitHub commit → successful Cloudflare build → updated live content.
- Email preparation with Mihai’s confirmed inbox and the visitor's email application.
- Final content, project evidence, portrait, career dates, location, pricing commitments and privacy copy.
- Physical touch-device and screen-reader review. Keyboard and responsive behavior were checked, but this is not a full accessibility audit.
- Reduced-motion and coarse-pointer fallbacks are implemented in CSS/JS; operating-system preference emulation was not performed in the connected browser.

The contact flow prepares and downloads an inquiry; it does not deliver email from a server. The CMS setup is prepared and its auth logic has mocked tests, but live authentication is not verified without credentials. `draft: true` controls indexing, not access.

## Interactive hero experiment — 19 November 2026

All 14 automated tests passed, including message encoding, session persistence and blocked-storage fallback, contact-prefill preservation, typing rhythm, and hover/focus state restoration.

Browser checks confirmed:

- The full introduction types to completion once. No console errors were reported.
- Pointer entry reveals the placeholder without focusing the editor. Pointer exit while empty restores the complete introduction. Desktop headline height stayed exactly 71.8125px in both states.
- Tab from the navigation reaches the real textarea and reveals it.
- Editing, Shift+Enter, and Enter work. The exact multiline message arrived on Get in touch; no form submission happened.
- Contact-page edits survive refresh and a return to the homepage. Clicking the send arrow also carries the message.
- Blurring a nonempty headline preserves both the text and editable state.
- At 390px, clicking the empty headline focuses it and displays the native caret, with the same reserved headline slot. At 320px, the long-message test grew vertically without horizontal page overflow.

Physical touch hardware, an IME session, and operating-system reduced-motion emulation were not available. Their pointer/composition/motion handling is implemented; the connected browser checks used normal mouse and keyboard input at desktop and mobile widths.

## Figma hero — 19 November 2026

Implemented from the high-fidelity context and screenshot of node `4:8`, using the supplied static assets in their corresponding slots. Desktop verification at 1440px confirmed the 102.084px portrait circle, 881.558px headline slot, 76.996px Excon type with 86.512px line height, 576px biography, and cropped full-width logo strip. The portrait source, header SVG, and logo strip all loaded from nonempty local files. No temporary Figma asset URLs remain in runtime markup.

Browser checks reconfirmed hover reveal without height change (173.03125px), native focus/editing, multiline Enter handoff, and mobile send-arrow handoff to the contact form. At 320px and 390px, document content width matched the viewport. Final preview test drafts were cleared. The original 14 automated tests pass.

The rest of the portfolio content and internal-page layouts were outside this Figma hero task; their earlier placeholder content remains marked. The homepage hero is wrapped separately so its full-width composition does not change the existing work-grid width.

## In-place hero inquiry — 19 November 2026

All 18 automated tests pass. New coverage checks safe storage restoration, malformed/blocked storage, answer validation, subject suggestions preserving custom text, and exact multiline inquiry preparation. This flow supersedes the earlier homepage-to-contact handoff described above.

Browser checks confirmed:

- Enter and the existing arrow morph the hero on the same homepage URL; only the logo and form remain visible. Desktop form x-position remains 220.43px, matching the original headline.
- A subject seeds the project; switching subjects preserves custom text.
- Required-name and malformed-email errors prevent progression. Back restores the exact name and email with focus.
- Optional company can be skipped. The review contains all saved answers and individual edit actions; editing the project preserves multiline text.
- Logo, Escape and Back to website return to the portfolio with the project intact. Reload restores the draft.
- A portrait-slot layout shift found during verification was corrected. The project textarea now keeps the full 882px desktop width and grows naturally.
- At 320px, both the edited hero and inquiry have page width 320px, with a 276px field and no horizontal overflow.
- Completion clearly states that no message has been sent and offers Download inquiry while no inbox is configured. The download text is unit-tested; the shared browser’s download UI was not repeated.
- No browser console warnings or errors appeared in the tested flow.

Physical touch hardware, IME input and operating-system reduced-motion preference remain unverified; their event and motion fallbacks are implemented.

The final empty editor restored the introduction at the same 173.03px desktop height. Test name, email and project text were cleared through the form. Screenshot of the morphed name step: `preview-morphing-hero.jpg`. The preview was left on the restored homepage.

The morph also returns a scrolled page to the top smoothly so the logo stays visible with a long draft. The final screenshot confirms logo visibility at scroll position zero.

## Suggestion chips and hover return — Figma section 40:410

All 19 automated tests pass. The added timer regression check covers the 520ms hold, cancellation on re-entry and immediate restoration for reduced motion. Subject tests now cover Brand Identity and preservation of custom text.

Browser verification at 1440px confirmed three chips on one row at the original description position, each 65px high with 25px column gaps. The subtitle is 576px wide with the reference #a2a2a2 color. The original mark, 102px portrait and client strip remain loaded in their established slots. The headline slot remains 173.03px high through reveal and restoration. CSS inspection confirmed the 900ms eased return with opacity, blur and settling movement; the empty, unfocused editor restored the full headline.

At 320px the chips stack with no horizontal overflow; at 390px they wrap across two rows. Keyboard Tab reaches the suggestions. Brand Identity seeds the editor and carries the exact message into the staged inquiry; selecting another chip preserves visitor-written text. Test messages were cleared. Screenshot: `preview-hero-refinement.jpg`.

The Figma placeholder tint and narrower headline width were outside the requested chip/subtitle refinements and retain the existing implementation. Physical touch and operating-system reduced-motion emulation were not performed.

The browser connection stalled during final screenshot cleanup after the functional checks. The previously saved refinement screenshot is retained; temporary viewport sizing was reset. A fresh final console-log read was unavailable.

## Recruiter flow and reset action

All 22 automated tests passed after the build. New coverage verifies that hiring reuses the same four fields, role-specific validation and export copy, reset clears persisted message/subject while retaining separate contact answers, and the editor resets and receives focus without replaying typing.

Browser checks confirmed:

- Four chips share one row at 1440px, with the original subtitle width retained.
- Hiring switches the placeholder and accessible name to **Tell me about the role**, reveals the supporting hint, and leaves the role details blank.
- The reset and send buttons share the same horizontal position (1061.98px at 1440px). Reset sits above the arrow.
- Enter carries the exact role message into the existing staged form; the review labels it **About the role**, with **Company or team** optional. The draft completion clearly offers a download without claiming delivery.
- Clicking reset clears text and selected subject and returns focus. At 320px, Tab reaches reset and Enter activates it; both controls remain vertically aligned without overlap.
- Reset stays cleared after reload. At 320px and 390px, document width equals viewport width; four chips wrap at narrow widths.
- Existing contact answers were restored after temporary browser test values. The preview was left with an empty message and no selected subject; temporary viewport sizing was reset.

Screenshot: `preview-recruiter-reset.jpg`. Physical touch hardware, an IME session and operating-system reduced-motion emulation were not tested. No public deployment or email transmission occurred.

## Long messages and the 3,000-character limit

All 25 automated tests passed. New coverage checks Unicode counting at exactly 3,000 and 3,001 characters, non-truncating persistence, minimum fitting sizes, settled sizing during small edits, and prevention of form handoff for an oversized draft.

Browser checks confirmed:

- A 2,140-character example role brief settled at 32px with a 260px desktop editor. Native wheel scrolling changed the textarea’s scroll position while the document stayed at zero and reset/send retained their positions. A native ArrowLeft operation also brought the caret into view.
- A 3,590-character message retained its final END-MARKER, showed “590 over,” disabled Continue, and could not enter the form via Enter. Reload retained all 3,590 characters.
- Shortening to 2,800 characters changed the warning to “near limit” and enabled Continue. A one-character edit retained the 32px settled size. The valid message entered the same form.
- Returning to edit the role used the same 260px scrolling editor and counter. An oversized replacement also blocked that step with the shared error.
- At 320px and 390px, text settled at 22px in a 220px editor, with document width equal to viewport width. Reset/send remained aligned in their separate gutter.
- Reset restored the original mobile type size and hid the counter. The final restored desktop introduction remained 76.996px. Original hero text/subject state was restored and temporary viewport sizing was reset; contact identity fields were not edited in this task.

Screenshot: `preview-long-message.jpg`, showing clearly marked example content. The connected browser’s Control+Home and one later ArrowLeft automation call timed out; native wheel scrolling, a successful ArrowLeft action, text editing, and Enter validation were verified. Physical touch, IME and operating-system reduced-motion preference were not emulated. No public deployment or message delivery occurred.

## Listening portrait and hiring suggestion

All 27 automated checks passed. New coverage verifies that the hiring subject seeds an empty or preset message and preserves custom text; portrait engagement follows the same state as editor reveal/restoration.

Desktop browser checks confirmed the alternate image loaded, the portrait stayed 102.08 × 102.08px, and its opacity changed from source=1/notes=0 to source=0/notes=1 on editor focus. Leaving a nonempty message retained the notes pose. Resetting and leaving the empty, unfocused editor restored the original photo at the same dimensions. The exact hiring suggestion appeared with focus in the editor. Selecting Hiring again after a custom edit preserved that edit.

The final mobile screenshot request stalled the browser connection after these desktop checks, so the mobile portrait’s final rendered crop was not verified. The existing 72px responsive portrait slot and clipping rules remain in place. Temporary viewport sizing was reset, and the preview tab retained. Contact identity fields were not edited.

Screenshot saved before the mobile capture: `preview-listening-portrait.jpg`. The original source portrait was preserved, and the alternate PNG is a nonempty local file. No public deployment or message transmission occurred.

## Reset closure and downward writing gaze

All 28 automated tests passed. The reset regression now checks empty text/storage, hidden controls, inactive editor and portrait, released hover/focus flags, no typing replay, and successful fresh reveal. A keyboard-specific case checks focus on the introduction and ensures heading focus does not pin the editor open after hover.

Browser checks confirmed:

- Mouse reset immediately set editing=false, focused=false and portrait engaged=false, with an empty message and no subject.
- A fresh pointer entry into the visible headline revealed the editor and note-taking pose again.
- Keyboard activation of reset focused the introduction while keeping editing=false. Tab then focused and reopened the native editor.
- The new downward-looking asset loaded from the versioned local path, with the existing 102.08px desktop circle unchanged. Its generated output was visually inspected: eyes and head point into the notebook and the pen is on the page.
- At 390px, reset closed the editor and page width stayed 390px. A fresh click reopened it, then leaving the empty unfocused editor restored the idle state.
- Final idle verification: empty message, editing=false, focused=false, source-photo opacity=1 and notes-photo opacity=0. Viewport sizing was reset and the preview tab retained. Contact identity answers were not edited.

Screenshot: `preview-writing-portrait.jpg`. No public deployment or message transmission. Physical touch, IME and operating-system reduced-motion preference remain outside these browser checks.

## Empty editor listens; text switches to writing

All 28 automated checks passed. The portrait state regression now verifies engaged-empty → camera-facing, entered text → writing, clearing → camera-facing, whitespace → empty, and idle restoration.

Desktop browser observations confirmed opacity states across the three images (original, camera-facing, writing): idle [1,0,0], focused-empty [0,1,0], native typing [0,0,1], and clearing [0,1,0]. The 102.08px portrait slot did not change dimensions. A hiring suggestion selected the writing pose and retained it after pointer/focus left the editor.

At 390px, the circle remained 72px, the empty state used the camera-facing pose, and choosing Hiring switched to writing. Document width matched viewport width. Reset restored idle [1,0,0], cleared text/subject, and released focus. Temporary viewport sizing was reset and the preview tab retained.

Screenshots: `preview-portrait-listening-state.jpg` and `preview-portrait-writing-state.jpg`. Existing image files were reused; no new image generation was needed. Physical touch/IME/reduced-motion hardware checks were not repeated. No public deployment or message delivery.

## Smooth responsive gaze motion

All 31 automated checks passed. Added geometry tests ensure the shared mesh has no inverted triangles through both poses, affine transforms align corresponding points, the motion settles without overshooting, and reversals begin from the current position.

Browser verification confirmed the local canvas renderer became ready and rendered intermediate poses. A screenshot captured an intermediate downward glance. Typing settled at progress 1; clearing returned to 0. A rapid clear/retype during the reaction pause stayed at the writing pose without flashing. The circle remained 102.08px on desktop and 72px at 390px, with page width matching the mobile viewport.

Reset retained the introduction behavior: editor closed, renderer progress 0, canvas opacity 0, and original portrait opacity 1. Temporary viewport sizing was reset and the preview tab retained. Screenshot: `preview-portrait-morph.jpg`. Existing bitmap assets were reused.

Physical-device frame-rate profiling and an operating-system reduced-motion toggle were not performed. Reduced motion/hidden-tab handling is implemented; visible desktop and responsive-width browser checks used normal mouse/keyboard input. No public deployment or message delivery.


## Current hover focus, reset, cursor and full portrait morph

This supersedes earlier reset-closure and two-pose motion observations above. All 34 automated tests pass. Coverage includes hover-owned focus and release, protection of another active text field, reset remaining empty/focused, keyboard reset, three-pose mesh orientation, and convergence/reversal across the full pose range.

Browser checks confirmed:

- Mouse entry reveals and focuses the editor. A native `h` keystroke delivered to the current focus, without a locator focus or additional click, appeared in the message.
- All four suggestions and a manually typed message reset to an empty focused editor with no selected subject. Moving out of the engagement area then restored the introduction, released hover-owned focus, and settled the original portrait at pose 0.
- The ready-empty editor settled at camera-facing pose 1. Existing text uses downward-writing pose 2. All three photographs participate in the same renderer, with intermediate frames observed and facial alignment visually tuned.
- The custom arrow and text SVG cursors loaded and were accepted by computed styles. The arrow artwork was inspected against the supplied reference; browser screenshots omit the actual OS pointer. Magnetic button behavior is unchanged.
- At 390px, the portrait remained 72px, document width stayed 390px, Hiring seeded the role message, and reset returned to the empty focused prompt. Responsive-width tests are not physical touch-hardware tests.
- The preview was left on the empty default introduction with no selected subject, pose 0, and temporary viewport sizing reset. No message was sent and no public deployment was performed.

Proof: `preview-hover-ready.jpg`, `preview-mobile-reset.jpg`, `preview-custom-cursor.jpg`, and `preview-reset-default.jpg`. Physical-device frame-rate profiling, screen-reader review, IME sessions and an operating-system reduced-motion toggle remain unverified. Reduced-motion, coarse-pointer, forced-colors and native editing fallbacks are implemented.


## Detailed notebook-glance animation

All 36 automated checks pass. New tests verify exact sequence endpoints, adjacent-frame interpolation, bounds, and continuity when the motion reverses during a glance. The build still produces 13 pages.

Replaced the coarse mesh for camera-facing ↔ writing with 61 optical-flow frames computed locally from the existing photographs. The 2048px WebP atlas is approximately 504 KiB and decodes to 16 MiB. Runtime work is one or two clipped image draws per frame rather than hundreds of triangle transforms. Load/size validation retains the mesh fallback if the atlas fails; reduced-motion and hidden-tab snapping are retained. Idle ↔ engaged continues to use the earlier mesh.

Browser checks confirmed renderer=optical-flow, the settled camera-facing endpoint at progress 1, typed example text reaching writing at progress 2, and clearing text returning to progress 1. Portrait size stayed 102.08px at desktop width, and 72px at 390px; document width remained 390px. No console warnings/errors appeared. Reset returned to an empty focused editor, and the final preview contained no example message. Temporary viewport sizing was reset and the preview tab retained.

Proof: `preview-fluid-gaze.jpg` shows the writing endpoint in the real page, and `preview-fluid-gaze-ready.jpg` shows the empty editor. `preview-gaze-animation.gif` is a standalone forward/reverse study of the same interpolated frames, not a browser recording. Physical-device frame-rate profiling, an OS reduced-motion toggle, and a screen-reader session were not performed. Photo interpolation can still contain small synthesized-frame artifacts; it is not a filmed performance. No public deployment or transmission occurred.


## Pointing-hand cursors and stable action transitions

All 39 automated checks pass and all 13 pages build. Added regressions verify the outgoing question stays hidden between animations, cancellation preserves the current visual state even when a completion promise has already resolved, and reduced-motion/missing-animation fallbacks reach the same final state.

Browser verification confirmed:

- Navigation links and the nested label inside Get in Touch compute to `cursor: pointer`; the page background retains the custom arrow and editors retain their text cursor. Screenshots omit the OS cursor.
- Native Enter and the send arrow morph the hero into the inquiry. Continue and Back fade the outgoing question to zero before the new title appears; sampled replacement frames begin near zero opacity and ease in.
- The earlier document overflow was reproduced and corrected. At 1440×1000, Continue/Back samples kept the form at x=220.43px, y=247px with scrollY=0. The document height remained 1000px. Temporary height locks were released after each transition.
- Back preserved the exact project message. Escape and browser Back during an active morph returned to a usable hero with no stale panel or pinned height.
- At 390×844, the hero and form shared the same x=22px, y=242px origin, scrollY remained zero, and document width stayed 390px. Back returned to the message.
- The optional-company, review, preparation, and Back to website actions completed successfully. The draft still states nothing was sent. Existing contact identity answers were reused without editing them.
- Work navigation and browser Back both reported a native incoming view transition, with the separate entrance animation suppressed. A direct reload used the entrance animation instead. No console warnings/errors appeared.
- The temporary example message was cleared and remained empty after Work → browser Back. The preview tab was retained and temporary viewport sizing was reset.

Screenshots: `preview-smooth-inquiry.jpg`, `preview-mobile-transition.jpg`, and `preview-smooth-transitions.jpg`. Physical-device frame-rate profiling, screen-reader review, IME sessions, and OS reduced-motion preference changes were not performed. Cross-document fades depend on browser support; normal navigation remains available. No public deployment or message delivery occurred.


## Figma featured logos and completed return

All 41 automated checks pass; the build produces 13 pages. Added regression coverage verifies completed-return cleanup without typing replay, fresh hover after completion, deliberate marquee pause retention, offscreen/hidden-tab pause, and reduced-motion state handling.

Implementation source: Figma `3chviwyGZ43nLoMaufQbhl`, frame `40:411`. Inspected its screenshot and high-fidelity design context. Downloaded all nine individual assets, mapped their original nodes/dimensions in `content/featured.json`, and verified nonempty files plus local callsites. The runtime uses original vector/raster assets, not the design screenshot or previous combined bitmap.

Browser observations:

- All nine primary images loaded. Desktop rendered rectangles matched the supplied proportions at 0.72 wrapper scale; mobile used 0.62. All SVG root dimensions remain unchanged. The two groups each contain nine logos and have matching 1908.4px desktop widths, so the -50% track translation ends at the duplicate group's identical start.
- The 110-second linear animation advanced between observations. Both edge masks were present (86.4px edges at 1440px, 24px at 390px). Pause set the actual computed animation state to paused; Resume returned it to running.
- The complete local inquiry flow reached its final draft-preparation screen. Back to website then showed the full introduction at opacity 1, editing/focus/message/subject all cleared, the original portrait disengaged, the form hidden, and focus on the home mark. The existing contact identity answers were reused without editing them.
- A subsequent fresh pointer entry focused an empty editor normally. Reload retained an empty message. At 390px, all nine local assets loaded, document width equaled 390px, and the strip stayed inside the page width.
- Final preview state: complete introduction, empty message/subject, logos running; temporary viewport sizing reset and preview tab retained. No console warnings/errors appeared.

Proof: `preview-featured-logos.jpg`, `preview-featured-return.jpg`, and `preview-featured-mobile.jpg`. Reduced-motion behavior is implemented and its controller state is unit-tested; physical touch, OS preference toggling, screen-reader interaction, and a real email-send workflow were not tested. The current contact draft still prepares a message rather than delivering it. No public deployment occurred.


## Monochrome brand-logo presentation

Applied a scoped grayscale filter to every image in the featured-logo groups, preserving source assets, transparency, dimensions, and existing motion. Rebuilt all 13 pages. Browser verification confirmed grayscale(1) on all nine original logos, the same 110-second linear animation, both edge masks, and active playback. Visually checked the result in `preview-monochrome-logos.jpg`. This is a presentation-only refinement; no additional automated tests were added. The preview remains available with the completed introduction and running logo strip.


## Logo-strip width from the supplied alignment guides

Constrained the marquee to the hero's inner content width and aligned its pause control to the same right boundary. Monochrome presentation, logo sizing, 110-second animation, and soft edge fades are retained. Built all 13 pages. Browser measurements confirmed exact matching strip/hero boundaries at 1440px (95–1345), 1000px (66–934), and 390px (22–368), with document width equal to viewport width in every case. Playback stayed active. Final screenshot: `preview-aligned-logos.jpg`. Temporary viewport sizing was reset; the preview tab remains available. No new tests were added for this CSS-only alignment refinement.


## Centred logo drawing and homepage handoff

All 45 automated checks pass; 13 pages build. New checks cover the first-visit/session/history/reduced-motion gate, fail-open behavior with blocked storage or a missing animation module, geometric landing at desktop/mobile header bounds, and starting headline typing once after reveal. A floating-point equality in the geometry test was corrected to use a small tolerance.

Browser verification:

- A fresh homepage visit showed only the original MB mark in the viewport centre. Header and main content had opacity 0 while the two mask strokes drew. Captured intermediate M/B drawing frames and the subsequent movement toward the header. The complete original SVG is reused at the handoff.
- Reload after the completed first visit skipped the logo sequence. The headline starts during the first reveal, and completed-inquiry returns retain the finished introduction without replay.
- Completed the local inquiry using an example message and existing identity answers without editing those identity answers. The final Back to website action replayed the centred drawing, restored the homepage behind it, and landed the mark in the header. Header/main/footer inert attributes were absent afterward; focus returned to the home mark. The message and subject were cleared and the editor was inactive.
- At 390×844, the mark was 96×105.79px centred at (195,422), then travelled to the mobile header's 41.02×45.20px mark. The final homepage remained 390px wide, with the original completed headline and no example message.
- A fresh-visit Escape check ended with phase=done, visible header, and no inert attribute on the header or main. Temporary tabs were closed, viewport sizing reset, and the main preview retained. No console warnings or errors appeared.

Proof: `preview-logo-entrance.gif` is a timestamped, resized recording assembled from actual browser screenshots of the desktop return; `preview-logo-centre.jpg`, `preview-logo-home.jpg` and `preview-logo-mobile-home.jpg` show the standalone and finished states. Physical-device frame-rate profiling, OS reduced-motion preference toggling and a screen-reader session were not performed. Reduced-motion gating and failure cleanup are implemented and unit-tested. Nothing was transmitted or publicly deployed.


## Centred logo drawing entrance

All 45 automated checks pass and all 13 pages build. New coverage verifies first-visit/session/history/reduced-motion gating, the bounded fail-open path when storage or the animation module is unavailable, exact landing geometry, and headline typing starting once after reveal.

Browser verification captured the original mark drawing alone in the viewport centre, followed by its travel into the header and the homepage fade. The final ink uses the unchanged original SVG; the animated centreline masks only reveal it. The centre stage contains no visible caption, progress indicator, navigation or form. The main content appears later in the travel to avoid intersecting the moving mark with the headline.

A subsequent same-tab reload skipped the signature sequence. Completed an example inquiry using existing identity answers without editing those answers. Its final Back to website action replayed the centred signature sequence. Afterward, the loader was hidden, header/main/footer inert attributes were absent, focus was on the home mark, the completed message was cleared, and the full introduction was visible with editing=false. No message was transmitted.

At 390×844, the return sequence used a 96×105.79px centred mark (centre 195,422) and targeted the original 41.02×45.20px header mark. The completed mobile homepage remained 390px wide and usable. Escape during a fresh entrance left the page visible and released the inert state. No console warnings/errors appeared in the final preview. Temporary study tabs were closed, the viewport override reset, and the main preview retained.

Proof: `preview-logo-centre.jpg` (logo alone), `preview-logo-entrance.gif` (actual browser-recorded return excerpt), `preview-logo-home.jpg`, and `preview-logo-mobile-home.jpg`. Physical touch hardware, frame-rate profiling and an OS reduced-motion toggle were not tested. Reduced-motion and safety logic have automated coverage. The animation is local and adds no service or API cost; no public deployment occurred.


## Softer hover exit and stationary logo blur

All 44 current automated checks pass, including the updated 850ms restoration timer, focus/draft preservation, first-visit gating, fail-open handling and interruption state capture including blur. Removed the superseded logo-flight geometry test because the logo no longer moves. All 13 pages build.

Browser checks found and corrected a later adaptive-message CSS rule that was overriding the intended slower editor fade. Final computed styles are 1250ms editor opacity, 1450ms editor blur/settling, and 1450ms introduction/description with a 160ms overlap delay. Recorded exit frames show the placeholder and introduction blending gradually while the headline slot stays exactly 173.03125px high.

A fresh visit completed the new dissolve. Replaying it through a completed inquiry verified the loading mark resets to opacity 1 and blur 0 before drawing again. Across every visible morph frame the logo's position and dimensions stayed constant; opacity and blur changed instead. The homepage returned to filter:none and had no lingering inert attributes.

At 390×844, the mark stayed 96×105.79px at left 147/top 369.10 through drawing and morphing. It dissolved with blur up to 9px as the page came into focus from 6px. Scroll position stayed zero, content width remained 390px, the completed message cleared, and the default introduction returned. The final existing preview tab was refreshed to current source and retained with empty text, editing=false, filter:none, and no console warnings/errors. Temporary test tabs were closed and viewport sizing reset.

Proof: `preview-logo-blur.gif`, `preview-soft-hover.gif`, `preview-blur-mobile-home.jpg`, and `preview-soft-motion-home.jpg`. Reduced-motion state handling is covered in code/tests; an OS preference toggle, physical touch hardware and frame-rate profiling were not performed. No message delivery or public deployment occurred.


## Custom Google Meet booking — current implementation

Replaced the active Calendly integration with the website's own calendar and confirmation flow. The meeting preference appears before final review, with a project/role-aware question and a message-only option. The connected Google account's verified email is used as the private receiving inbox. No real account has been connected.

All 62 automated checks pass; 14 pages build. Coverage includes scheduling rules, notice/buffers/blocked dates, quarter-hour time zones, seasonal DST, database reservations under simultaneous requests, idempotent retries, uncertain-write recovery, request limits, production verification, Google API payloads and unsafe-link rejection. Client tests verify double-click blocking, retained retry IDs and honest unavailable states. Deployment routing includes both booking endpoints. Google/Gmail calls in these tests are mocked.

Browser checks: completed the sample meeting picker through explicit preview confirmation on desktop and 390px mobile; verified it states no event/invitation was created. Exercised hero details → meeting preference → review, message-only unavailable feedback, preference editing, integrated unavailable calendar, and Back with answer preservation. Checked the separate contact page's review and time-zone interaction without dismissing the calendar. Both mobile calendar layouts fit without horizontal overflow. Get in touch is transparent at rest with a moving colour outline; hover reaches a full perimeter fill, a white label, and an invisible centre mask. Existing user's draft was preserved, temporary QA tab closed, viewport reset, and homepage/study preview tabs retained.

Proof images are in preview/mb-*.jpg. Setup instructions are in GOOGLE-SETUP.md. Actual Google consent, event creation, invitation arrival, email delivery, production D1/Turnstile and Cloudflare deployment remain unverified until owner credentials/configuration are provided. No meeting/email was sent and nothing was publicly deployed.


## Time selection before one final review — current flow

Implemented the requested order: meeting choice → calendar → one final review of contact/project details and chosen date/time → explicit confirmation → Back to website. The message-only route skips the calendar. Back/Change time preserve the selected slot and visitor zone, with fresh availability loaded; stale or out-of-month selections do not remain selected. No intermediate review appears before the calendar. The same order applies to the separate contact form. A shorter confirmation step scrolls softly back to the top when necessary.

Inspected the supplied 17.83-second screen recording locally. Get in touch now uses independently moving soft magenta, cyan, orange and lime colour pools against darker gaps, keeping its thin animated outline and transparent centre at rest. Hover and keyboard focus contract the centre mask inward, revealing the flowing fill; leave reverses it. The label remains white with local contrast shading. Other buttons, native pointer behavior, existing typography and magnetic movement remain independent. Reduced motion freezes the decorative colour animation and removes the fill transition.

All 67 automated checks pass; 15 pages build. New tests cover the branch order, Back destinations, controlled calendar handoff without booking, retained time/zone after review, adjacent-month invalidation, and sample-preview isolation. Browser checks completed the full meeting journey on desktop and at 390px, edited the selected time from the final review, confirmed only a labelled sample, and verified the final return clears the draft and restores the introduction. On phone confirmation the scroll position returns to zero and no horizontal overflow appears. The separate contact form opens its calendar directly and message-only submissions show one review. The current preview has no captured console errors.

The dedicated /playground/inquiry/ route is clearly labelled as an interaction preview, uses sample availability, and cannot send or book. Its confirmation explicitly states that no message, event or invitation was created. The ordinary homepage continues to require the private Google connection. Kept the updated homepage and full preview tabs; closed the temporary contact QA tab and reset viewport sizing. Proof images are in preview/mb-final-review-*.jpg, preview/mb-time-first-mobile.jpg and preview/mb-fluid-button-*.jpg. No public deployment, real meeting or email occurred.


## Ordinary homepage dates and centered arrows

Fixed the mismatch between the separate full-flow sample page and the homepage the user was testing. When Google is unconnected, the local server adds a runtime-only simulation flag to HTML responses. The ordinary hero and contact form now use labelled sample availability and preview confirmation. Published HTML does not contain the flag, and an authenticated local Google configuration leaves live mode in place. No silent fallback is added to the production availability API.

Replaced the month arrow characters with symmetric 20px SVG chevrons, zero button padding, and grid centering. Browser measurements show precisely zero horizontal/vertical offset for both icons at desktop and 390px widths. The phone layout has no horizontal overflow.

All 69 automated checks pass, including unconnected-versus-connected local rendering and credential non-disclosure. In a fresh tab on the ordinary `/` route: entered an example inquiry, reached the calendar directly, switched to December and back, selected Wednesday 25 November, chose 11:00, reached the final review containing that exact date/time, confirmed the sample and returned to the empty introduction. Only the preview receipt appeared; no API booking, event, email or invitation was created. Temporary QA tab closed and viewport reset. Refreshed and retained the user's existing homepage tab with local simulation enabled. Proof: preview/mb-selectable-home-calendar.jpg, preview/mb-home-calendar-final-review.jpg and preview/mb-centered-calendar-mobile.jpg.


## Figma covers on white and inverse contact-button effect

Implemented all five visuals from frame 46:4947 in source order. Original transparent logos are used directly, and the device covers preserve their actual supplied screen artwork. Rebuilt WholeSum/Angen AI from their original layered assets to avoid the baked dark backdrop in the first composite exports. Every source image is downloaded locally; all SVG root dimensions remain unchanged. There are no temporary Figma URLs in the runtime source. Homepage covers are CMS-managed separately from project text; one sixth-slot placeholder remains.

The 11 applicable site/build checks pass, including all local image/style/script/fragment references, the six-card grid, CMS-content propagation and the existing route checks. No new tests were added for these reversible visual changes. Browser checks at 1440 × 1000 and 390 × 844 verified all five covers and links, every supplied layer loading, exact white card backgrounds, full artwork containment, square responsive cards, and no horizontal overflow. Checked each desktop row visually against the supplied assets.

Also implemented the latest button request: Get in touch is filled at rest and outlined on hover/focus. Verified settled default centre-mask opacity 0 with white label, then hover centre-mask opacity 1, inset 1px and dark label. Continuous mesh colour, smooth reversal, keyboard focus style and reduced-motion rules are retained. Refreshed and retained the existing homepage preview, reset temporary viewport sizing and closed the cover QA tab. Proof: preview/mb-white-work-covers-*.jpg and preview/mb-contact-outlined-hover.jpg. No public deployment occurred.


## Excon Variable throughout the website

Centralized the Excon Variable face (weights 100–900) and family token in fonts.css, loaded by every page. Replaced former Outfit and Arial-only UI declarations throughout the shared and component CSS, including calendar, headline editor, suggestions, inquiry, counters, nav, footer and work captions. Removed the unused Outfit preload and duplicate component font faces. The owner-facing admin setup also uses the shared font. No new dependency, external font request or layout redesign was introduced.

All 11 applicable build/site checks pass. Browser computed-font audit covered every one of the 15 generated public pages plus the admin setup screen: every visible textual element resolved to Excon as the primary family, the Excon face was loaded, and there was no horizontal overflow. A 390 × 844 audit covered Home, Work, Services, Pricing, Playground, Calendar, About, Contact, Privacy and a case study with the same result. Visually reviewed pricing on desktop and phone. Existing sizes and line-height/weight values are retained. No additional unit tests were added for this reversible presentation change.

Proof: preview/mb-excon-home.jpg, preview/mb-excon-pricing-desktop.jpg and preview/mb-excon-pricing-mobile.jpg. Reset the viewport, closed the typography QA tab and refreshed the retained homepage preview. No public deployment occurred.

## Original project pages and friendly private-project requests

Imported seven public projects from the current portfolio, preserving every text-container paragraph and all 96 original image occurrences in their original section sequence. A comparison against the observed source DOM found no missing story text. The manifest in content/project-sources.json records provenance and dimensions. Original files are retained locally and responsive WebP previews are used for display; originals open through keyboard-accessible enlargement links. Two original Angen AI prototype URLs are retained in expandable sections. Their disclosure controls were exercised; external prototype access still depends on Figma sharing.

7code Tech’s original page is password-protected. Per the user’s response, its new page offers a friendly request invitation, with an editable contact-form prefill and project context. Browser-verified the prefill, context, message-only branch and final review without sending. The case draft uses a separate session key, with an automated check confirming a previous general inquiry is preserved. No password or private project content was imported.

Desktop visual checks covered original product and brand imagery, chapter navigation, prototype disclosure and Work category filters. All eight project pages, Work and Services were checked at 390 × 844: Excon is the computed family, no horizontal overflow occurs, and no loaded image is broken. The original homepage artwork files and cover ordering were preserved; only the Lendit identity destination changed to its own branding page. Services and filters now reflect Product, Graphic and Brand Design. All generated links, images, scripts, styles and chapter targets resolve. Existing inquiry, booking, motion and authentication tests pass; no meeting or email was sent and no public deployment occurred.

Final automated result: **75 tests pass**, 19 pages build. Proof: preview/mb-original-project-lendit.jpg and preview/mb-private-case-request.jpg.

## Horizontal Lendit story and floating Back to top

Built a seven-chapter presentation around the original Lendit research and design decisions. All 24 original artworks remain available through curated media choices, alongside original notes. The story uses native vertical document scrolling, mapped to horizontal presentation movement with CSS scroll snapping. No wheel listener prevents default scrolling. Larger chapter content retains its own ordinary reading scroll. Navigation buttons, chapter progress links, direct chapter URLs, keyboard arrow support, touch, reduced-motion handling, and a vertical fallback are included. Image details use a modal dialog with native Escape handling, a Close button, original artwork, background-scroll locking and focus return.

Removed the collection route and homepage subtitle. Preview and Cloudflare redirect old collection URLs to /#work. Project return links target the homepage, and additional imported projects remain reachable below the existing covers. Replaced the footer’s text shortcut with a floating circular Back to top control.

The 79 automated checks pass, covering original media references, invalid chapter content, native scroll progress bounds, navigation bounds, reduced-motion actions, collection removal/redirect configuration, local references, CMS propagation and the earlier inquiry/booking/motion/authentication behavior. Browser checks exercised native down-scrolling into subsequent chapters, Continue navigation, direct #experience loading, media switching, original-art detail opening/closing and phone layouts at 390 × 844. Phone native scrolling first moved the reading area, then advanced to the following chapter. Back to top returned the story to #overview. No public deployment, email or meeting was created.

Final proof: preview/mb-lendit-horizontal-story.jpg. The ending chapter was observed in the refreshed user preview, with no horizontal page overflow. Temporary QA tabs were closed and viewport overrides reset. The local server remains available for testing.


## Restored original vertical case studies

At Mihai’s request, Lendit again uses the original imported story, artwork sequence and vertical case-study layout, with shared navigation and footer. The horizontal chapter experiment is archived under experiments/lendit-horizontal and is not loaded or shown in the CMS. Other project pages retain their original imported layouts. The floating circular Back to top button, removed homepage subtitle, and homepage Work destination remain in place.

Restoration verification: 17 applicable site/case-study checks pass. The browser shows the original Lendit title, 24 original images, shared navigation and footer, no horizontal-story element and no horizontal overflow. Proof: preview/mb-restored-vertical-lendit.jpg.

## iPhone framing and connected process structure

Added iPhone hardware around the ten original Lendit mobile screenshots, without editing the image files. Added connected process navigation, vertical phase rails and clearer chapter headings to the shared case-study renderer. The original section IDs, story ordering and all 96 source artworks remain intact; all 17 applicable site/content/authentication checks pass. Case navigation links still resolve to their original sections.

Desktop browser review verified six Lendit phase groups, ten phone mockups, active Prototype highlighting and a correctly positioned anchor below the sticky header/overview. At 390 × 844, all mockups measure 275–277px, text precedes the first phone, the overview stays within its own horizontal scroll area, and the page has no horizontal overflow. Original enlargement links are retained. No public deployment occurred.

Proof: preview/mb-iphone-timeline-desktop.jpg and preview/mb-iphone-timeline-mobile.jpg. Refreshed the user preview to verify Prototype is highlighted at its anchor; reset viewport sizing and closed the temporary QA tab.


## Roomier sections and bottom process timeline

Increased desktop/phone section and stage spacing and moved the timeline to a bottom dock. The dock is mounted outside the transformed page entrance container so fixed placement follows the viewport. Browser measurements verified an 18px desktop and 10px phone bottom gap, zero strip borders, no horizontal page overflow and no overlap with Back to top. At the phone footer the final phase bottom was 57px, footer began at 420px, and the dock was hidden and inert. All 17 applicable site/case-study checks pass. No public deployment occurred.


## Topic, separate description and launch preparation

Hero text becomes an editable topic. Both message and meeting branches require a separate 20–3,000-character description after meeting preference, then reach a single review (through calendar selection for meetings). Switching preference preserves topic/description, and edit/back paths revisit the correct fields. New topics are limited to 200 characters; long/multiline hero input is retained as description rather than silently truncated. Backend validation requires both fields, and Google event/email payloads include both. The separate contact page has the same fields and private-case context uses a valid category plus its descriptive topic.

Pricing and all Playground pages are excluded from the public build, navigation and offers data; their source is preserved. Old URLs temporarily redirect home. Public contact and intended Google owner are mihailboboc.work@gmail.com. A private .dev.vars Google connection and production database configuration were not present.

All 80 automated checks pass, including new one-word-topic handling, message-before-calendar/review validation, missing/oversized/header-injected topics, Google payload contents, paused-page absence and prior booking/motion/authentication behavior. Local HTTP checks returned the homepage/contact successfully, redirected paused URLs home, and returned not_connected from the unconfigured calendar API. No real email, meeting, public deployment or domain change occurred. Browser-control tools were unavailable, so this update has not received a new interactive visual browser check. See LAUNCH.md for the remaining setup and acceptance checks.


## GitHub source handoff

Verified the connected owner mihailbobocwork-collab and used the existing public repository mbdesign-website. A clean temporary upload copy excluded credentials, local booking data, generated output, preview captures and archived experiments. All 13 site/build checks passed in that copy. Uploaded 394 unique binary assets, verifying every GitHub blob SHA against the local file. The completed 566-file source tree matched local tree 2f0270e52e1c0263655a2727920d08f3fd499a70 exactly and was committed as e065e9ebbdc749c5ac107f658b44f4a25dd710a9 using an expected-head check. Remote site/package files verified the correct repository, owner email and build command. No Cloudflare deployment or domain change occurred; Google/CMS production authentication remains pending.

## Mobile interaction polish — 20 November 2026
- Mobile hero form no longer preserves the idle portrait or large top margin. Keyboard-sized visual viewports compact the question and helper and scroll an obscured active field into view without smooth-scroll competition.
- VisualViewport resize updates long-message fitting; keyboard detection tolerates focus transfer, browser chrome and pinch zoom. Tablet/desktop form positioning is preserved.
- Contact controls use at least 16px type on mobile to avoid iOS input zoom. Larger edit targets, wrapping email links, and keyboard-safe floating controls.
- Turnstile load/time-out failures show recovery text; missing verification reveals the challenge rather than leaving a silent click. Optional Analytics cannot throw through the submission handler.
- Old green selection, hover, focus, border and contact-result surfaces replaced with neutral blue-gray styling. Original project imagery unchanged.
- Browser checks: menu open/Escape; topic/name/email progression; invalid email; back preserves answers; 3,306-character paste retained and blocked with count; 2,280-character message reaches review. No real submission or meeting created during this pass.
- Layout overflow checked on home, About, Services, Contact and Lendit at 320px, 768px and 1280px: none. Contact controls checked at 390px: none below 16px.
- Keyboard viewport simulation at 390×400 kept email input at y=210–260 and Continue visible. This is a browser viewport simulation, not a physical iPhone/Safari keyboard test. A final device check remains necessary.
