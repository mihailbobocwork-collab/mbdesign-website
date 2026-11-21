/** A native, progressively enhanced textarea inside the existing hero type scale. */
import {MessageEditor, messageLimitError} from './message-editor.js';
import {PortraitMotion} from './portrait-motion.js';
import {topicFromMessage} from './inquiry-details.js';
export const DRAFT_KEY = 'mihail:hero-inquiry:v1';
export const hasMessage = value => value.trim().length > 0;
export function typingDelay(character, random = Math.random) {
  return 50 + random() * 30 + (/[.!?]/.test(character) ? 260 : /[,;:]/.test(character) ? 140 : 0);
}
export function readDraft(storage, key = DRAFT_KEY) {
  try { return storage.getItem(key) || ''; } catch { return ''; }
}
export function saveDraft(storage, message, key = DRAFT_KEY) {
  try {
    if (message) storage.setItem(key, message);
    else storage.removeItem(key);
  } catch { /* Editing and the URL-fragment handoff still work with storage blocked. */ }
}
// A fragment is not included in the HTTP request or a server request log.
export function inquiryURL(message) {
  return '/contact/#message=' + encodeURIComponent(message);
}
export function messageFromFragment(hash) {
  if (!hash.startsWith('#message=')) return null;
  try { return decodeURIComponent(hash.slice(9)).slice(0, 5000); } catch { return null; }
}
export function readContactEntry(storage, location, history) {
  const fragment = messageFromFragment(location.hash);
  const params = new URLSearchParams(location.search);
  const request = params.get('case-study');
  const caseSlug = /^[a-z0-9-]{1,80}$/.test(request || '') ? request : '';
  const draftKey = caseSlug ? DRAFT_KEY + ':case:' + caseSlug : DRAFT_KEY;
  const saved = readDraft(storage, draftKey);
  const project = caseSlug && topicFromMessage(params.get('project') || caseSlug.replaceAll('-', ' ')).slice(0,100);
  const topic = project ? project + ' case study request' : topicFromMessage(params.get('topic') || '');
  const message = saved || fragment || topic;
  if (fragment !== null) {
    try { history.replaceState(history.state, '', location.pathname + location.search); } catch { /* The fragment stays local to the browser. */ }
  }
  return {caseSlug,draftKey,message,topic};
}

const BaseElement = globalThis.HTMLElement || class {};
export class InteractiveTypewriter extends BaseElement {
  connectedCallback() {
    if (this.ready) return;
    this.ready = true;
    this.input = this.querySelector('textarea');
    this.intro = this.querySelector('.hero-typed');
    this.visual = this.querySelector('.hero-visual');
    this.mirror = this.querySelector('.hero-input-size');
    this.send = this.querySelector('.hero-send');
    this.reset = this.querySelector('.hero-reset');
    this.fullText = this.getAttribute('text') || '';
    this.characters = Array.from(this.fullText);
    this.index = 0;
    this.hovered = false;
    this.hoverFocus = false;
    this.composing = false;
    this.events = new AbortController();
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    let storage; try { storage = sessionStorage; } catch { /* Optional. */ }
    this.storage = storage;
    this.idle = this.closest('.hero-idle');
    this.engagement = this.idle?.querySelector('.hero-engagement');
    this.suggestions = this.idle?.querySelector('.hero-suggestions');
    this.portrait = this.closest('.figma-hero')?.querySelector('.hero-portrait');
    this.input.value = readDraft(storage);
    this.classList.add('is-enhanced');
    this.messageEditor = new MessageEditor(this.input, {mirror: this.mirror, counter: this.querySelector('.hero-message-count'), status: this.querySelector('.hero-limit-status'), button: this.send});
    this.syncInput();
    const on = (target, event, fn) => target.addEventListener(event, fn, { signal: this.events.signal });
    for (const [selector, key] of [['.hero-portrait-listening', 'cameraReady'], ['.hero-portrait-notes', 'notesReady']]) {
      const image = this.portrait?.querySelector(selector);
      if (!image) continue;
      const ready = () => { this.portrait.dataset[key] = String(image.naturalWidth > 0); };
      on(image, 'load', ready);
      on(image, 'error', () => { this.portrait.dataset[key] = 'false'; });
      if (image.complete) ready();
    }
    if (this.portrait) this.portraitMotion = new PortraitMotion(this.portrait, this.motion);
    on(this, 'pointerenter', event => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        this.hovered = true;
        this.reveal();
        this.focusFromHover();
      }
    });
    on(this, 'pointerleave', event => { this.hovered = false; this.scheduleRestore(event); });
    if (this.engagement) {
      on(this.engagement, 'pointerenter', () => { this.engagementHovered = true; clearTimeout(this.restoreTimer); if(this.dataset.editing === 'true')this.focusFromHover(); });
      on(this.engagement, 'pointerleave', event => { this.engagementHovered = false; this.scheduleRestore(event); });
      on(this.engagement, 'focusout', () => this.scheduleRestore());
    }
    // The temporary homepage can fit in one viewport, so a downward gesture
    // also counts when there is no remaining page to scroll. Keep it passive.
    let wheelDistance = 0, wheelAt = 0, touch = null, lastY = window.scrollY;
    const overHomepage = target => target instanceof Element && !target.closest('input, textarea, button, a, select, .hero-flow-panel') &&
      this.closest('main')?.getBoundingClientRect().bottom > 0;
    window.addEventListener('wheel', event => {
      if (event.ctrlKey || !overHomepage(event.target) || event.deltaY <= Math.abs(event.deltaX)) { wheelDistance = 0; return; }
      if (event.timeStamp - wheelAt > 200) wheelDistance = 0;
      wheelAt = event.timeStamp;
      wheelDistance += event.deltaY * (event.deltaMode === 0 ? 1 : 16);
      if (wheelDistance >= 24) this.listenOnScroll();
    }, {passive:true,signal:this.events.signal});
    window.addEventListener('touchstart', event => {
      touch = event.touches.length === 1 && overHomepage(event.target) ? event.touches[0] : null;
    }, {passive:true,signal:this.events.signal});
    window.addEventListener('touchmove', event => {
      if (!touch || event.touches.length !== 1) { touch = null; return; }
      const finger = event.touches[0];
      if (touch.clientY-finger.clientY > Math.max(32,Math.abs(touch.clientX-finger.clientX))) {
        touch = null;this.listenOnScroll();
      }
    }, {passive:true,signal:this.events.signal});
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > lastY && document.activeElement?.tagName !== 'TEXTAREA' &&
          this.closest('.figma-hero')?.getBoundingClientRect().bottom > 0) this.listenOnScroll();
      lastY = y;
    }, {passive:true,signal:this.events.signal});
    on(document,'keydown',event=>{
      if(!event.defaultPrevented&&['ArrowDown','PageDown',' '].includes(event.key)&&
        overHomepage(event.target)) this.listenOnScroll();
    });
    on(this.input, 'pointerdown', () => { this.hoverFocus = false; this.reveal(); });
    on(this.input, 'focus', () => { this.reveal(); this.dataset.focused = 'true'; });
    on(this, 'focusout', () => queueMicrotask(() => {
      this.dataset.focused = String(document.activeElement === this.input);
      this.scheduleRestore();
    }));
    on(this.input, 'input', () => {
      this.syncInput();
      saveDraft(this.storage, this.input.value);
      if (!this.input.value.length && !this.hovered && !this.engagementHovered) this.scheduleRestore();
    });
    on(this.input, 'compositionstart', () => { this.composing = true; });
    on(this.input, 'compositionend', () => { this.composing = false; this.syncInput(); });
    on(this.input, 'keydown', event => {
      // IME confirmation is not a Send action. Shift+Enter stays native.
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !this.composing && event.keyCode !== 229) {
        event.preventDefault();
        this.submit();
      }
    });
    on(this.send, 'click', () => this.submit());
    if (this.reset) on(this.reset, 'click', event => this.resetMessage({keyboard: event.detail === 0}));
    on(this.motion, 'change', () => { if (this.motion.matches) this.finishTyping(); });
    on(window, 'pageshow', event => {
      if (!event.persisted || !this.storage) return;
      try {
        const saved = this.storage.getItem(DRAFT_KEY) || '';
        if (saved !== this.input.value) { this.input.value = saved; this.syncInput(); }
      } catch { /* Keep the in-memory draft when storage is unavailable. */ }
    });
    on(document,'brand-entrance-reveal',()=>this.beginTyping());
    if(document.documentElement.dataset.brandBoot==='pending'){
      this.intro.textContent='';this.dataset.typing='waiting';
    }else this.beginTyping();
  }
  beginTyping(){
    if(this.typeStarted)return;this.typeStarted=true;
    if(this.motion.matches||this.input.value)this.finishTyping();
    else{this.intro.textContent='';this.dataset.typing='true';this.timer=setTimeout(()=>this.typeCharacter(),180);}
  }
  typeCharacter() {
    if (!this.isConnected || this.dataset.typing !== 'true') return;
    this.intro.textContent = this.characters.slice(0, ++this.index).join('');
    if (this.index < this.characters.length) {
      this.timer = setTimeout(() => this.typeCharacter(), typingDelay(this.characters[this.index - 1]));
    } else this.dataset.typing = 'false';
  }
  finishTyping() {
    clearTimeout(this.timer);
    this.index = this.characters.length;
    this.intro.textContent = this.fullText;
    this.dataset.typing = 'false';
  }
  reveal() {
    // Complete behind the fade so leaving never resumes or replays the introduction.
    clearTimeout(this.restoreTimer);
    this.dataset.editing = 'true';
    this.updateEngagement();
    clearTimeout(this.timer);
    if (this.dataset.typing === 'true') {
      this.finishTimer = setTimeout(() => this.finishTyping(), this.motion.matches ? 0 : 560);
      this.dataset.typing = 'false';
    }
  }
  focusFromHover() {
    const active = document.activeElement;
    if (active === this.input) return;
    // Keep focus on a control the visitor is already using.
    if (active?.matches?.('input, textarea, select, button, a[href], [contenteditable="true"]')) return;
    this.hoverFocus = true;
    this.input.focus({preventScroll: true});
  }
  listenOnScroll() {
    if (this.scrolledToListen || hasMessage(this.input.value) ||
        document.body.dataset.inquiryActive === 'true' || this.closest('[inert]') ||
        !this.closest('[data-hero-flow]')) return;
    this.scrolledToListen = true;
    this.reveal();
  }
  updateEngagement() {
    if (this.idle) this.idle.dataset.engaged = this.dataset.editing;
    if (this.portrait) {
      this.portrait.dataset.engaged = this.dataset.editing;
      this.portrait.dataset.writing = String(hasMessage(this.input?.value || ''));
      this.portraitMotion?.setIntent(this.dataset.editing === 'true', hasMessage(this.input?.value || ''));
    }
    if (this.suggestions) this.suggestions.inert = this.dataset.editing !== 'true';
    this.engagement?.querySelector('.hero-bio')?.setAttribute('aria-hidden', String(this.dataset.editing === 'true'));
  }
  scheduleRestore(event) {
    // A scroll can reveal Listening without a pointer over the editor. A later
    // mouse or pen exit releases it, while lifting a finger after a swipe keeps it open.
    if (event?.pointerType === 'mouse' || event?.pointerType === 'pen') this.scrolledToListen = false;
    clearTimeout(this.restoreTimer);
    // Let a brief pointer excursion settle before blending back into the introduction.
    this.restoreTimer = setTimeout(() => this.restore(), this.motion.matches ? 0 : 850);
  }
  restore() {
    if (!this.hovered && !this.engagementHovered && !this.input.value.length && this.hoverFocus) {
      this.hoverFocus = false;
      if (document.activeElement === this.input) this.input.blur();
      this.dataset.focused = 'false';
    }
    const active = document.activeElement;
    const editingFocus = this.contains(active) && active !== this.visual;
    if (this.scrolledToListen || this.hovered || this.engagementHovered || editingFocus || this.engagement?.contains(active) || this.input.value.length) return;
    clearTimeout(this.finishTimer);
    this.finishTyping();
    this.dataset.editing = 'false';
    this.updateEngagement();
  }
  syncInput() {
    // A grid mirror grows in normal flow; switching to the placeholder never shrinks the original slot.
    this.mirror.textContent = this.input.value + '\u200b';
    const ready = hasMessage(this.input.value);
    this.send.hidden = !ready;
    if (this.reset) this.reset.hidden = !this.input.value.length && !this.dataset.subject;
    this.dataset.hasMessage = String(ready);
    if (this.input.value.length) this.dataset.editing = 'true';
    this.updateEngagement();
    this.messageEditor?.update();
  }
  resetMessage({keyboard = false} = {}) {
    clearTimeout(this.restoreTimer);
    clearTimeout(this.finishTimer);
    this.composing = false;
    this.finishTyping();
    this.input.value = '';
    // Keep the blank editor ready; pointer exit releases hover-owned focus and restores the intro.
    this.hoverFocus = !keyboard && Boolean(this.hovered || this.engagementHovered);
    this.dataset.editing = 'true';
    saveDraft(this.storage, '');
    this.dispatchEvent(new CustomEvent('hero-inquiry-reset', {bubbles: true}));
    this.syncInput();
    this.input.focus({preventScroll: true});
    this.dataset.focused = 'true';
  }
  returnToIntroduction() {
    this.scrolledToListen=false;
    clearTimeout(this.restoreTimer);clearTimeout(this.finishTimer);
    this.finishTyping();this.composing=false;this.hovered=false;this.engagementHovered=false;this.hoverFocus=false;
    if(document.activeElement===this.input)this.input.blur();
    this.input.value='';saveDraft(this.storage,'');
    this.dataset.editing='false';this.dataset.focused='false';this.syncInput();
  }
  submit() {
    if (this.composing || !hasMessage(this.input.value)) return;
    if (messageLimitError(this.input.value)) { this.messageEditor?.announceLimit(); this.input.focus({preventScroll: true}); return; }
    saveDraft(this.storage, this.input.value);
    const proceed = this.dispatchEvent(new CustomEvent('hero-inquiry-start', {bubbles: true, cancelable: true, detail: {message: this.input.value}}));
    if (proceed) window.location.assign(inquiryURL(this.input.value));
  }
  disconnectedCallback() {
    clearTimeout(this.timer);
    clearTimeout(this.finishTimer);
    clearTimeout(this.restoreTimer);
    this.events?.abort();
    this.messageEditor?.destroy();
    this.portraitMotion?.destroy();
    this.ready = false;
  }
}
if (globalThis.customElements && !customElements.get('interactive-typewriter')) {
  customElements.define('interactive-typewriter', InteractiveTypewriter);
}
