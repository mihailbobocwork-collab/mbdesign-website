export const MESSAGE_LIMIT = 3000;
export const characterCount = value => Array.from(value).length;
export function messageLimitError(value) {
  const excess = characterCount(value) - MESSAGE_LIMIT;
  return excess > 0 ? `Remove ${excess.toLocaleString('en-US')} character${excess === 1 ? '' : 's'} to continue (3,000 maximum).` : '';
}

// Fit on substantial edits; small edits keep the settled size until they become much longer.
export function fittedMessageSize({base, minimum, previous, substantial, measure, cap}) {
  minimum = Math.min(base, minimum);
  if (!substantial && previous < base) return measure(previous) > cap * 1.5 ? minimum : previous;
  for (const size of [...new Set([base, base * .82, base * .66, base * .5, minimum].map(n => Math.max(minimum, n)))]) {
    if (measure(size) <= cap) return size;
  }
  return minimum;
}

/** Native editing, with an independent hidden measuring element and no text replacement. */
export class MessageEditor {
  constructor(input, {mirror, counter, status, button} = {}) {
    Object.assign(this, {input, mirror, counter, status, button});
    this.previousValue = ''; this.previousWidth = 0; this.notice = ''; this.destroyed = false;
    this.measurement = document.createElement('span');
    this.measurement.className = 'message-measure';
    this.measurement.setAttribute('aria-hidden', 'true');
    input.parentElement.append(this.measurement);
    input.dataset.adaptiveMessage = 'true';
    input.removeAttribute('maxlength');
    this.observer = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (Math.abs(width - this.previousWidth) > 1) { this.previousWidth = width; this.update(true); }
    });
    this.observer.observe(input);
    this.viewport=globalThis.window?.visualViewport;this.viewportResize=()=>{if(!this.destroyed)this.update(true);};this.viewport?.addEventListener('resize',this.viewportResize);
    document.fonts?.ready.then(() => { if (!this.destroyed) this.update(true); });
  }
  readBaseStyle() {
    const {style} = this.input, size = style.fontSize, leading = style.lineHeight, transition = style.transition;
    style.transition = 'none'; style.removeProperty('font-size'); style.removeProperty('line-height');
    const computed = getComputedStyle(this.input);
    const result = {
      base: parseFloat(computed.fontSize), baseLine: parseFloat(computed.lineHeight),
      minimum: parseFloat(computed.getPropertyValue('--message-min-size')) || 32,
      cap: parseFloat(computed.getPropertyValue('--message-height-cap')) || 260,
      padding: parseFloat(computed.paddingTop) + parseFloat(computed.paddingBottom) + parseFloat(computed.borderTopWidth) + parseFloat(computed.borderBottomWidth),
      inset: parseFloat(computed.paddingLeft) + parseFloat(computed.paddingRight),
      fontFamily: computed.fontFamily, fontWeight: computed.fontWeight,
      fontStyle: computed.fontStyle, letterSpacing: computed.letterSpacing
    };
    style.fontSize = size; style.lineHeight = leading; style.transition = transition;
    return result;
  }
  update(force = false) {
    if (this.destroyed || !this.input.clientWidth) return;
    const value = this.input.value, count = characterCount(value), over = count > MESSAGE_LIMIT;
    const substantial = force || Math.abs(value.length - this.previousValue.length) > 32 || !this.previousValue;
    if (force || !this.baseStyle) this.baseStyle = this.readBaseStyle();
    const settings = this.baseStyle;
    const line = size => size === settings.base ? settings.baseLine : size * 1.45;
    Object.assign(this.measurement.style, {
      width: Math.max(1, this.input.clientWidth - settings.inset) + 'px',
      fontFamily: settings.fontFamily, fontWeight: settings.fontWeight,
      fontStyle: settings.fontStyle, letterSpacing: settings.letterSpacing
    });
    this.measurement.textContent = (value || this.input.placeholder || '') + '\u200b';
    const measure = size => {
      this.measurement.style.fontSize = size + 'px';
      this.measurement.style.lineHeight = line(size) + 'px';
      return this.measurement.getBoundingClientRect().height + settings.padding;
    };
    this.size = value ? fittedMessageSize({base: settings.base, minimum: settings.minimum, previous: this.size ?? settings.base, substantial, measure, cap: settings.cap}) : settings.base;
    for (const el of [this.input, this.mirror].filter(Boolean)) {
      el.style.fontSize = this.size + 'px'; el.style.lineHeight = line(this.size) + 'px';
    }
    if (!this.mirror) this.input.style.height = Math.min(settings.cap, Math.max(65, measure(this.size))) + 'px';
    const show = count >= 300 || this.size < settings.base;
    if (this.counter) {
      this.counter.hidden = !show;
      this.counter.dataset.limit = over ? 'over' : count >= 2700 ? 'near' : 'normal';
      this.counter.textContent = `${count.toLocaleString('en-US')} / 3,000${over ? ` · ${(count - MESSAGE_LIMIT).toLocaleString('en-US')} over` : count >= 2700 ? ' · near limit' : ''}`;
    }
    if (this.button) this.button.disabled = over;
    if (over) this.input.setAttribute('aria-invalid', 'true'); else this.input.removeAttribute('aria-invalid');
    const notice = over ? 'over' : count >= 2700 ? 'near' : '';
    if (notice !== this.notice && this.status) this.status.textContent = over ? messageLimitError(value) : notice === 'near' ? 'You’re nearing the 3,000-character limit.' : this.notice ? 'Your message is within the character limit.' : '';
    this.notice = notice; this.previousValue = value;
  }
  announceLimit() {
    const error = messageLimitError(this.input.value);
    if (this.status) this.status.textContent = error;
    return error;
  }
  destroy() { this.destroyed = true; this.observer.disconnect(); this.viewport?.removeEventListener('resize',this.viewportResize); this.measurement.remove(); }
}
