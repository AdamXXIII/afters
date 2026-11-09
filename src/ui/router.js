// Screen router. One module per screen id (src/screens/<id>.js) registers a definition:
//
//   export default {
//     id: 'r1-vote',
//     layout: 'split',          // 'show' | 'split' | 'input'  (or (ctx) => layout)
//     shot: 'vote',             // Stage camera shot (or (ctx) => shot), optional
//     rail: true,               // reaction rail in show layout (default true for 'show')
//     strip: true,              // auto show-strip in input layout (default true)
//     mount({ show, sheet }, ctx) {   // build DOM into the two fresh containers
//       return { update(ctx) {}, frame(ctx, dt) {}, unmount() {} };   // all optional
//     },
//   };
//
// The router owns: body[data-layout], body[data-rail], the stage framing + shot, enter/exit
// choreography (show first, sheet 240 ms later), per-frame callbacks and the input strip.
import { h } from './components.js';
import { mountStrip } from './strip.js';
import { audio } from '../audio/synth.js';

// Motion language (DESIGN 3.7): show layer first, sheet 240 ms later, then its children stagger
// 50 ms each; exits are the reverse at 70% with ease-in-quint. Never more than 3 groups at once.
const EASE_OUT = 'cubic-bezier(.22,1,.36,1)';
const EASE_IN = 'cubic-bezier(.64,0,.78,0)';
const reducedMotion = () => document.documentElement.dataset.reducedMotion === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches;
// Course changes get the "lights dip" and a soft swell; everything else a paper swish.
const COURSE = /(^|-)intro$|^podium$/;

// Shared elements: a prompt/fact that is on both screens glides from its old spot to its new one
// instead of cross-fading into a double exposure.
const SHARED = '[class*="prompt"], [class*="fact"], .t-prompt, h1, h2';
function sharedFrom(oldRoot) {
  const m = new Map();
  for (const el of oldRoot.querySelectorAll(SHARED)) {
    const t = el.textContent.trim();
    if (t.length < 12 || m.has(t) || el.querySelector(SHARED)) continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.height && r.bottom > 0) m.set(t, { el, r });
  }
  return m;
}
function sharedTo(oldMap, newRoot) {
  if (!oldMap.size || reducedMotion()) return;
  const done = new Set();
  for (const el of newRoot.querySelectorAll(SHARED)) {
    const t = el.textContent.trim();
    const from = oldMap.get(t);
    if (!from || done.has(t) || el.querySelector(SHARED)) continue;
    const to = el.getBoundingClientRect();
    if (!to.width) continue;
    done.add(t);
    const ghost = from.el.cloneNode(true);
    const cs = getComputedStyle(from.el);
    ghost.classList.add('shared-ghost');
    Object.assign(ghost.style, { left: `${from.r.left}px`, top: `${from.r.top}px`, width: `${from.r.width}px`, color: cs.color, font: cs.font, textShadow: cs.textShadow, fontVariationSettings: cs.fontVariationSettings, textAlign: cs.textAlign });
    document.body.append(ghost);
    from.el.style.visibility = 'hidden';
    el.style.visibility = 'hidden';
    const k = to.width / from.r.width;
    const a = ghost.animate(
      [{ transform: 'none', opacity: 1 }, { transform: `translate(${to.left - from.r.left}px, ${to.top - from.r.top}px) scale(${k})`, opacity: 1 }],
      { duration: 420, easing: 'cubic-bezier(.83,0,.17,1)', fill: 'forwards' },
    );
    a.finished.catch(() => {}).finally(() => { el.style.visibility = ''; ghost.remove(); });
  }
}

function staggerIn(container, baseDelay) {
  if (reducedMotion()) return;
  const kids = [...container.children].slice(0, 7);
  kids.forEach((el, i) => {
    el.animate(
      [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
      { duration: 340, delay: baseDelay + i * 45, easing: EASE_OUT, fill: 'backwards' },
    );
  });
}

export class Router {
  constructor({ stage, showEl, sheetEl, stripEl }) {
    this.stage = stage;
    this.showEl = showEl;
    this.sheetEl = sheetEl;
    this.stripEl = stripEl;
    this.defs = new Map();
    this.current = null; // { id, key, def, inst, show, sheet, ctx, strip }
    stage.onFrame((dt) => {
      const c = this.current;
      if (!c) return;
      c.ctx.dt = dt;
      try { c.inst?.frame?.(c.ctx, dt); } catch (e) { console.error(`[screen ${c.id}] frame`, e); }
      c.strip?.frame(c.ctx);
    });
  }

  register(def) { this.defs.set(def.id, def); }

  has(id) { return this.defs.has(id); }

  /** Show screen `id`. Remounts when `key` changes (e.g. a new phase seq). */
  go(id, ctx, key = id) {
    const def = this.defs.get(id);
    if (!def) { console.error('[router] unknown screen', id); return; }
    if (this.current && this.current.key === key) { this.update(ctx); return; }
    const prev = this.current;
    const layout = typeof def.layout === 'function' ? def.layout(ctx) : def.layout || 'show';
    const sameLayout = prev && prev.layout === layout;

    // tear down the old screen (exit is the reverse at 70% duration)
    if (prev) {
      try { prev.inst?.unmount?.(); } catch (e) { console.error(`[screen ${prev.id}] unmount`, e); }
      const s1 = prev.show; const s2 = prev.sheet;
      this._shared = sharedFrom(s1);
      const rm = reducedMotion();
      const a1 = s1.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px) scale(.985)' }],
        { duration: rm ? 120 : 180, easing: EASE_IN, fill: 'forwards' },
      );
      // Sheet leaving the screen (-> show): its content rides down with it instead of vanishing.
      // Same layout: quick fade + settle. Split <-> input: fade while the sheet resizes.
      const sheetLeaving = layout === 'show' && prev.layout !== 'show';
      const a2 = sheetLeaving
        ? s2.animate([{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: rm ? 120 : 460, fill: 'forwards' })
        : s2.animate(
          [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(${sameLayout ? 8 : 16}px)` }],
          { duration: rm ? 100 : sameLayout ? 180 : 240, easing: EASE_IN, fill: 'forwards' },
        );
      // remove when the exits really finish (not on a wall-clock timer), so slow frames never cut them short
      Promise.allSettled([a1.finished, a2.finished]).then(() => { s1.remove(); s2.remove(); });
      // the old strip lingers a beat so the clock doesn't blink out mid-move
      prev.strip?.unmount();
      s1.style.pointerEvents = 'none';
      s2.style.pointerEvents = 'none';
    }

    // layout + stage
    document.body.dataset.layout = layout;
    document.body.dataset.screen = id;
    const rail = def.rail ?? layout === 'show';
    document.body.dataset.rail = rail ? '1' : '0';
    this.stage.setLayout(layout, { instant: !prev || ctx.instant });
    const shot = typeof def.shot === 'function' ? def.shot(ctx) : def.shot;
    if (shot) this.stage.setShot(shot, { instant: !prev || ctx.instant, duration: def.shotDuration || 800 });

    const show = h('div.screen-show', { dataset: { screen: id } });
    const sheet = h('div.sheet-page', { dataset: { screen: id } });
    this.showEl.append(show);
    this.sheetEl.append(sheet);
    const sheetDelay = sameLayout ? 120 : 240;
    if (prev) {
      show.animate([{ opacity: 0, transform: 'translateY(14px) scale(.99)' }, { opacity: 1, transform: 'none' }], { duration: reducedMotion() ? 160 : 380, easing: EASE_OUT, fill: 'backwards', delay: 130 });
      sheet.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: Math.round(sheetDelay * 0.4), easing: EASE_OUT, fill: 'backwards' });
    }
    if (prev && !ctx.frozen) {
      if (COURSE.test(id)) {
        document.body.classList.remove('dip'); void document.body.offsetWidth; document.body.classList.add('dip');
        clearTimeout(this._dipT); this._dipT = setTimeout(() => document.body.classList.remove('dip'), 950);
        audio.sfx('curtain');
        // the course card lands like a menu slapped on the table
        setTimeout(() => { try { this.stage.shake?.(); } catch { /* optional */ } }, 520);
      } else if (prev.layout !== layout || id !== prev.id) {
        audio.sfx('page', { up: layout !== 'show' });
      }
    }

    const cur = { id, key, def, layout, show, sheet, ctx, inst: null, strip: null };
    this.current = cur;
    if (layout === 'input' && def.strip !== false) cur.strip = mountStrip(this.stripEl, ctx);
    try {
      cur.inst = def.mount({ show, sheet }, ctx) || null;
    } catch (e) {
      console.error(`[screen ${id}] mount`, e);
      sheet.append(h('p.t-body', 'Something went wrong drawing this screen.'));
    }
    // new sheet content waits until the old content has mostly gone (no layer soup)
    if (layout !== 'show' && prev) staggerIn(sheet, sameLayout ? 150 : prev.layout === 'show' ? 100 : 200);
    if (prev && this._shared) { sharedTo(this._shared, show); this._shared = null; }
  }

  update(ctx) {
    const c = this.current;
    if (!c) return;
    c.ctx = ctx;
    try { c.inst?.update?.(ctx); } catch (e) { console.error(`[screen ${c.id}] update`, e); }
    c.strip?.update(ctx);
  }
}
