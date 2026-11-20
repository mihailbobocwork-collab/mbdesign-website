## Mobile interaction polish — 20 November 2026
- Mobile hero form no longer preserves the idle portrait or large top margin. Keyboard-sized visual viewports compact the question and helper and scroll an obscured active field into view without smooth-scroll competition.
- VisualViewport resize updates long-message fitting; keyboard detection tolerates focus transfer, browser chrome and pinch zoom. Tablet/desktop form positioning is preserved.
- Contact controls use at least 16px type on mobile to avoid iOS input zoom. Larger edit targets, wrapping email links, and keyboard-safe floating controls.
- Turnstile load/time-out failures show recovery text; missing verification reveals the challenge rather than leaving a silent click. Optional Analytics cannot throw through the submission handler.
- Old green selection, hover, focus, border and contact-result surfaces replaced with neutral blue-gray styling. Original project imagery unchanged.
- Browser checks: menu open/Escape; topic/name/email progression; invalid email; back preserves answers; 3,306-character paste retained and blocked with count; 2,280-character message reaches review. No real submission or meeting created during this pass.
- Layout overflow checked on home, About, Services, Contact and Lendit at 320px, 768px and 1280px: none. Contact controls checked at 390px: none below 16px.
- Keyboard viewport simulation at 390×400 kept email input at y=210–260 and Continue visible. This is a browser viewport simulation, not a physical iPhone/Safari keyboard test. A final device check remains necessary.
