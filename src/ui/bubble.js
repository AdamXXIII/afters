// Cyril's speech bubbles (DESIGN 1.4 / 3.4): HTML anchored to his projected head, typewriter,
// syllable-driven mouth + babble. Tap the show layer to finish the line instantly.
// Placement is content-aware (stage team): each line is sized for its final text, then placed
// above / beside / across from Cyril wherever it covers the least content (prompts, cards,
// timers, buttons), never his face. Re-checked every 300 ms as the camera and screen move.
import { h } from './components.js';
import { audio } from '../audio/synth.js';
import { contentRects, overlap } from '../stage/framing.js';

const CPS = 38;
const VOWELS = /[aeiouy]/i;
const MARGIN = 8;

const CSS = `
#bubbles .bubble { box-shadow: none; filter: drop-shadow(0 2px 0 rgba(42,26,23,.10)) drop-shadow(0 9px 16px rgba(30,14,10,.34));
  box-sizing: border-box; text-wrap: pretty; overflow: hidden; border: 1px solid rgba(122,74,42,.10); }
#bubbles .bubble::after { border: 0; width: 26px; height: 18px; bottom: -15px; clip-path: path('M0 0 L26 0 C 18 4, 10 10, 4 18 C 6 10, 5 5, 0 0 Z'); }
#bubbles .bubble.side::after { width: 18px; height: 26px; left: -15px; bottom: auto; clip-path: path('M18 0 L18 26 C 14 18, 8 10, 0 4 C 8 6, 13 5, 18 0 Z'); }
#bubbles .bubble.side.side-left::after { left: auto; right: -15px; clip-path: path('M0 0 L0 26 C 4 18, 10 10, 18 4 C 10 6, 5 5, 0 0 Z'); }
#bubbles .bubble.below::after { top: -15px; bottom: auto; clip-path: path('M0 18 L26 18 C 18 14, 10 8, 4 0 C 6 8, 5 13, 0 18 Z'); }
#bubbles .bubble.tail-hidden::after { display: none; }
#bubbles .bubble .k { font-family: var(--f-display); font-style: italic; font-weight: 600; font-variation-settings: "SOFT" 100; color: var(--c-claret); }
#bubbles .bubble.compact { font-size: calc(15px * var(--ts, 1)); line-height: 20px; }
#bubbles .bubble.tiny { font-size: calc(14px * var(--ts, 1)); line-height: 18px; padding: 9px 12px; }
#bubbles .bubble .txt { display: block; }
#bubbles .bubble.detached::before { content: ""; position: absolute; left: -2px; top: -2px; width: 26px; height: 26px;
  border-radius: 0 0 14px 0; background: radial-gradient(circle at 50% 62%, #FFF4D6 0 3px, #FFC86B 4px 6px, #E2553B 7px 8px, transparent 9px), var(--c-claret);
  clip-path: none; }
#bubbles .bubble.detached { padding-left: 30px; }
.bubble-measure { position: absolute !important; visibility: hidden !important; left: -9999px !important; top: 0 !important; animation: none !important; height: auto !important; }
`;

function injectCss() {
  if (document.getElementById('bubble-stage-css')) return;
  const s = document.createElement('style');
  s.id = 'bubble-stage-css';
  s.textContent = CSS;
  document.head.append(s);
}

function renderRich(text) {
  // *word* -> Fraunces italic key word
  return text.split(/(\*[^*]+\*)/g).map((part) => (part.startsWith('*') && part.endsWith('*') ? h('em.k', part.slice(1, -1)) : document.createTextNode(part)));
}

export class Bubbles {
  constructor({ host, stage }) {
    injectCss();
    this.host = host;
    this.stage = stage;
    this.el = null;
    this.queue = null;
    this.token = 0;
    this.compact = false;
    this.offset = { x: 0, y: 0 };
    this.place = null;
    this.sizes = null;
    this._evalAt = 0;
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
    this.placement = placement; // a preference only; obstacles decide
    this.compact = compact ?? layout !== 'show';
    return (async () => {
      for (let i = 0; i < list.length; i++) {
        if (token !== this.token) return;
        await this._type(list[i], token, instant);
        if (token !== this.token) return;
        await this._wait(i === list.length - 1 ? hold : Math.min(hold, 1400), token);
      }
      if (token === this.token && !instant) this.clear(); // bubbles never linger over the show
    })();
  }

  /** Remove the bubble now. */
  clear() {
    this.token++;
    this.stage.cyril.leanTo(0);
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

  /** Final size of a line at a few widths/text sizes, measured once (no growing while typing). */
  _measureSizes(text) {
    const W = window.innerWidth;
    const layout = document.body.dataset.layout;
    const opts = [];
    const widths = layout === 'input' ? [250, 220, 196, 176] : this.compact ? [250, 220, 196, 172] : [280, 248, 216, 188, 168];
    for (const w of widths) {
      if (w > W - MARGIN * 2) continue;
      const cls = layout === 'input' || this.compact || w < 210 ? (w < 190 ? 'tiny' : 'compact') : '';
      const m = h(`div.bubble.bubble-measure${cls ? `.${cls}` : ''}`, h('span.txt', ...renderRich(text)));
      m.style.width = `${w}px`;
      m.style.maxWidth = 'none';
      this.host.append(m);
      opts.push({ w, h: Math.ceil(m.offsetHeight) + 1, cls });
      m.remove();
    }
    return opts.length ? opts : [{ w: W - MARGIN * 2, h: 80, cls: 'tiny' }];
  }

  _type(text, token, instant) {
    if (this.el) this.el.remove();
    this.sizes = this._measureSizes(text);
    this.place = null;
    this._evalAt = 0;
    const txt = h('span.txt');
    const caret = h('span.caret');
    const el = h('div.bubble', { role: 'status', 'aria-live': 'polite', 'aria-label': text.replace(/\*/g, '') }, txt, caret);
    el.style.maxWidth = 'none';
    el.style.visibility = 'hidden';
    this.host.append(el);
    this.el = el;
    this._position();
    el.style.visibility = '';
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

  _safeTop() {
    if (!this._probe) {
      this._probe = document.createElement('div');
      this._probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
      document.body.append(this._probe);
    }
    return this._probe.offsetHeight || 0;
  }

  _obstacles() {
    const layout = document.body.dataset.layout;
    const roots = ['show', 'topbar', 'strip', 'rail'].map((id) => document.getElementById(id));
    if (layout !== 'show') roots.push(document.getElementById('sheet-body'));
    try { return contentRects(roots, { maxFrac: 0.5 }); } catch (e) { return []; }
  }

  /** Every candidate spot for every size, scored; lowest score wins. */
  _candidates(cy) {
    const W = window.innerWidth; const H = window.innerHeight;
    const layout = document.body.dataset.layout;
    const top0 = this._safeTop() + 6;
    const out = [];
    const pref = this.placement;
    for (const [si, s] of this.sizes.entries()) {
      const { w: bw, h: bh } = s;
      const clampX = (x) => Math.max(MARGIN, Math.min(W - bw - MARGIN, x));
      const clampY = (y) => Math.max(top0, Math.min(H - bh - MARGIN, y));
      // above the flame, tail down
      const ay = cy.top.y - bh - 14;
      for (const k of [0.5, 0.28, 0.72, 0.12, 0.88]) {
        const x = clampX(cy.top.x - bw * k);
        for (const dy of [0, 24, 48, 72, -24, -48]) {
          out.push({ id: `a${si}-${k}-${dy}`, kind: 'above', x, y: clampY(ay + dy), bw, bh, si, k, pen: (pref === 'side' ? 40 : 0) + Math.abs(k - 0.5) * 30 + Math.abs(dy) * 0.4 });
        }
      }
      // beside the face, tail sideways; slide outward to dodge timers etc.
      for (const side of ['right', 'left']) {
        const a = side === 'right' ? cy.sideR : cy.sideL;
        const face = cy.face;
        const near = side === 'right' ? Math.max(a.x, face.x + face.w) + 14 : Math.min(a.x, face.x) - 14 - bw;
        for (let step = 0; step < 6; step++) {
          const dx = step * 34 * (side === 'right' ? 1 : -1);
          const x = clampX(near + dx);
          if (side === 'right' ? x < near - 1 : x > near + 1) continue; // would sit on his face
          for (const vy of [0.5, 0.25, 0.75, 0.05]) {
            out.push({ id: `${side}${si}-${step}-${vy}`, kind: side, x, y: clampY(a.y - bh * vy), bw, bh, si, ay: a.y, pen: (pref === 'above' ? 30 : 0) + step * 12 + Math.abs(vy - 0.5) * 20 });
          }
        }
      }
      // last resort for very tight strips: below the head
      if (layout === 'input') {
        out.push({ id: `b${si}`, kind: 'below', x: clampX(cy.sideR.x - 40), y: clampY(cy.body.y + cy.body.h + 12), bw, bh, si, pen: 120 });
      }
    }
    return out;
  }

  _score(c, rects, cy) {
    const r = { x: c.x, y: c.y, w: c.bw, h: c.bh };
    let s = (c.pen + c.si * 25) * 60; // penalties in px² terms; prefer the larger, more readable size
    for (const o of rects) s += overlap(r, o) * o.weight;
    if (cy.subject) s += overlap(r, cy.subject) * 3;
    if (document.body.dataset.layout === 'input') s += c.kind === 'free' ? -4000 : 16000; // the strip is full: prefer free sheet space
    const fc = cy.face; const gw = Math.max(0, 70 - fc.w) / 2; const gh = Math.max(0, 70 - fc.h) / 2;
    const face = { x: fc.x - gw, y: fc.y - gh, w: fc.w + gw * 2, h: fc.h + gh * 2 }; // tiny Cyril still needs his face seen
    s += overlap(r, face) * 6 + overlap(r, cy.flame) * 2.5 + overlap(r, cy.body) * 0.4;
    return s;
  }

  /** Anywhere on screen that is free: used when nothing beside Cyril is clear. */
  _freeCandidates(cy) {
    const W = window.innerWidth; const H = window.innerHeight;
    const top0 = this._safeTop() + 6;
    const fx = cy.face.x + cy.face.w / 2; const fy = cy.face.y + cy.face.h / 2;
    const out = [];
    for (const [si, s] of this.sizes.entries()) {
      const bw = s.w + 22; const bh = s.h; // room for the flame badge
      for (let y = top0; y <= H - bh - MARGIN; y += 22) {
        for (let x = MARGIN; x <= W - bw - MARGIN + 0.5; x += 22) {
          const d = Math.hypot(x + bw / 2 - fx, y + bh / 2 - fy);
          out.push({ id: `f${si}-${x}-${y}`, kind: 'free', x, y, bw, bh, si, pen: 160 + d * 0.5 });
        }
      }
    }
    return out;
  }

  _evaluate(cy) {
    const rects = this._obstacles();
    let best = null; let bestS = Infinity;
    for (const c of [...this._candidates(cy), ...this._freeCandidates(cy)]) {
      const sc = this._score(c, rects, cy);
      if (sc < bestS) { bestS = sc; best = c; }
    }
    if (!best) return;
    let cur = this.place;
    if (cur) {
      // re-score the current spot at its new position (Cyril may have moved)
      const moved = cur.kind === 'free' ? cur : this._candidates(cy).find((c) => c.id === cur.id);
      const curS = moved ? this._score(moved, rects, cy) : Infinity;
      if (bestS < curS * 0.8 - 3000 || !moved) cur = best; else cur = moved;
    } else cur = best;
    this.place = cur;
  }

  _position() {
    const el = this.el;
    if (!el || !this.sizes) return;
    const cy = this.stage.cyrilScreen();
    cy.subject = this.stage.subjectScreen?.() || null;
    const now = performance.now();
    if (!this.place || now > this._evalAt) {
      this._evaluate(cy);
      this._evalAt = now + 300;
    }
    if (!this.place) return;
    const c = this.place.kind === 'free' ? this.place : (this._candidates(cy).find((x) => x.id === this.place.id) || this.place);
    const s = this.sizes[c.si];
    el.classList.remove('compact', 'tiny');
    if (s.cls) el.classList.add(s.cls);
    el.style.width = `${c.bw}px`;
    el.style.height = `${c.bh}px`;
    el.classList.toggle('side', c.kind === 'right' || c.kind === 'left');
    el.classList.toggle('side-left', c.kind === 'left');
    el.classList.toggle('below', c.kind === 'below');
    el.classList.toggle('detached', c.kind === 'free');
    if (c.kind === 'free') {
      el.classList.add('tail-hidden');
      el.style.transformOrigin = '0% 0%';
    } else if (c.kind === 'above' || c.kind === 'below') {
      const tx = Math.max(16, Math.min(c.bw - 40, cy.top.x - c.x - 6));
      el.style.setProperty('--tail-x', `${tx}px`);
      el.style.transformOrigin = `${tx + 11}px ${c.kind === 'above' ? '100%' : '0%'}`;
      // tail only when it can reach the flame (not when the bubble was pushed far away)
      el.classList.toggle('tail-hidden', c.kind === 'above' ? cy.top.y - (c.y + c.bh) > 90 : false);
    } else {
      const a = c.kind === 'right' ? cy.sideR : cy.sideL;
      const ty = Math.max(12, Math.min(c.bh - 30, a.y - c.y - 10));
      el.style.setProperty('--tail-y', `${ty}px`);
      el.style.transformOrigin = `${c.kind === 'right' ? '0%' : '100%'} ${ty + 10}px`;
      const gap = c.kind === 'right' ? c.x - a.x : a.x - (c.x + c.bw);
      el.classList.toggle('tail-hidden', gap > 140);
    }
    this.stage.cyril.leanTo(c.kind === 'right' ? 1 : c.kind === 'left' ? -1 : 0);
    el.style.left = `${Math.round(c.x)}px`;
    el.style.top = `${Math.round(c.y)}px`;
  }
}
