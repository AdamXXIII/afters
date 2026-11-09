// Cyril's speech bubbles (DESIGN 1.4 / 3.4): HTML anchored to his projected head, typewriter,
// syllable-driven mouth + babble. Tap the show layer to finish the line instantly.
import { h } from './components.js';
import { audio } from '../audio/synth.js';

const CPS = 38;
const VOWELS = /[aeiouy]/i;

function renderRich(text) {
  // *word* -> Fraunces italic key word
  return text.split(/(\*[^*]+\*)/g).map((part) => (part.startsWith('*') && part.endsWith('*') ? h('em.k', part.slice(1, -1)) : document.createTextNode(part)));
}

export class Bubbles {
  constructor({ host, stage }) {
    this.host = host;
    this.stage = stage;
    this.el = null;
    this.queue = null;
    this.token = 0;
    this.compact = false;
    this.offset = { x: 0, y: 0 };
    stage.onFrame(() => this._position());
    document.getElementById('show')?.addEventListener('pointerdown', () => this.finishLine());
  }

  /**
   * Say one or more lines. Resolves when every line has typed and held.
   * @param {string|string[]} lines
   * @param {{hold?:number, compact?:boolean, instant?:boolean}} o
   */
  say(lines, { hold = 1800, compact, instant = false, placement = null } = {}) {
    const list = (Array.isArray(lines) ? lines : [lines]).filter(Boolean).slice(0, 2);
    const token = ++this.token;
    const layout = document.body.dataset.layout;
    this.placement = placement || (layout === 'show' ? 'above' : 'side');
    this.compact = compact ?? this.placement !== 'above';
    return (async () => {
      for (let i = 0; i < list.length; i++) {
        if (token !== this.token) return;
        await this._type(list[i], token, instant);
        if (token !== this.token) return;
        await this._wait(i === list.length - 1 ? hold : Math.min(hold, 1400), token);
      }
    })();
  }

  /** Remove the bubble now. */
  clear() {
    this.token++;
    this.stage.cyril.setTalking(false);
    if (this.el) {
      const old = this.el;
      old.classList.add('out');
      setTimeout(() => old.remove(), 200);
      this.el = null;
    }
  }

  finishLine() { if (this._finish) this._finish(); }

  _wait(ms, token) {
    return new Promise((r) => {
      const t = setTimeout(r, ms);
      this._skipWait = () => { clearTimeout(t); r(); };
      if (token !== this.token) { clearTimeout(t); r(); }
    });
  }

  _type(text, token, instant) {
    if (this.el) this.el.remove();
    const txt = h('span.txt');
    const caret = h('span.caret');
    const el = h(`div.bubble${this.compact ? '.compact' : ''}`, { role: 'status', 'aria-live': 'polite', 'aria-label': text.replace(/\*/g, '') }, txt, caret);
    this.host.append(el);
    this.el = el;
    this._position();
    const cyril = this.stage.cyril;
    const plain = text;
    return new Promise((resolve) => {
      let i = 0;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        txt.replaceChildren(...renderRich(plain));
        caret.remove();
        cyril.setTalking(false);
        this._finish = null;
        resolve();
      };
      this._finish = finish;
      if (instant) { finish(); return; }
      cyril.setTalking(true);
      const step = () => {
        if (done) return;
        if (token !== this.token) { finish(); return; }
        if (i >= plain.length) { finish(); return; }
        const ch = plain[i++];
        txt.textContent = plain.slice(0, i).replace(/\*/g, '');
        if (VOWELS.test(ch) && !VOWELS.test(plain[i - 2] || '')) {
          cyril.pulse(70 + Math.random() * 40);
          audio.babble({ question: plain.trim().endsWith('?') && i > plain.length - 6 });
        }
        let delay = 1000 / CPS;
        if (ch === ',') delay += 120;
        if (ch === '.' || ch === '!' || ch === '?') delay += 260;
        setTimeout(step, delay);
      };
      step();
    });
  }

  _position() {
    const el = this.el;
    if (!el) return;
    const p = this.stage.cyrilHeadScreen();
    const W = window.innerWidth;
    const bw = el.offsetWidth;
    const bh = el.offsetHeight;
    const layout = document.body.dataset.layout;
    let left; let top; const below = false;
    const side = layout === 'input' || this.placement === 'side';
    el.classList.toggle('side', side);
    if (side) {
      const onRight = p.x < W * 0.6;
      const gap = layout === 'input' ? 46 : 38;
      left = onRight ? Math.min(W - bw - 10, p.x + gap) : Math.max(10, p.x - gap - bw);
      top = Math.max(8, p.y - bh / 2);
      el.classList.toggle('side-left', !onRight);
      el.style.setProperty('--tail-y', `${Math.round(Math.max(14, Math.min(bh - 30, p.y - top - 8)))}px`);
    } else {
      left = Math.max(12, Math.min(W - bw - 12, p.x - 46 + this.offset.x));
      top = p.y - bh - 26 + this.offset.y;
      const minTop = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-t')) || 0) + 64;
      if (top < minTop) top = minTop;
      el.style.setProperty('--tail-x', `${Math.max(16, Math.min(bw - 36, p.x - left - 11))}px`);
    }
    el.classList.toggle('below', below);
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }
}
