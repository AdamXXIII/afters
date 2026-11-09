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
      prev.strip?.unmount();
      prev.show.classList.add('fade-out');
      prev.sheet.classList.add(sameLayout ? 'fade-out' : 'exit-down');
      const s1 = prev.show; const s2 = prev.sheet;
      setTimeout(() => { s1.remove(); s2.remove(); }, 300);
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
    show.classList.add('fade-in');
    sheet.classList.add('enter-up');
    sheet.style.animationDelay = sameLayout ? '120ms' : '240ms';

    const cur = { id, key, def, layout, show, sheet, ctx, inst: null, strip: null };
    this.current = cur;
    if (layout === 'input' && def.strip !== false) cur.strip = mountStrip(this.stripEl, ctx);
    try {
      cur.inst = def.mount({ show, sheet }, ctx) || null;
    } catch (e) {
      console.error(`[screen ${id}] mount`, e);
      sheet.append(h('p.t-body', 'Something went wrong drawing this screen.'));
    }
  }

  update(ctx) {
    const c = this.current;
    if (!c) return;
    c.ctx = ctx;
    try { c.inst?.update?.(ctx); } catch (e) { console.error(`[screen ${c.id}] update`, e); }
    c.strip?.update(ctx);
  }
}
