// r3-reveal: the top five, counted down 5 -> 1. Each card lands as the hero, glasses clink onto it
// one by one, the author is stamped on, then it steps down onto the ladder. A drumroll, then the
// #1 (or a joint #1) becomes TOAST OF THE TABLE: gold foil, +1000, napkin-and-foil confetti.
import './r3.css';
import { h, chip } from '../ui/components.js';
import { avatarIcon } from '../ui/icons.js';
import { glassSvg, clinkSvg, r3Timeline, sayIfFresh, countTo } from './r3-art.js';

const TOAST_LINE = ['Splendid. Raise them high.'];
const DRY_LINE = ['Not a single glass raised. A dry table. How very sober.'];

export default {
  id: 'r3-reveal',
  layout: 'show',
  shot: 'r3-reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const top = p.top || [];
    const byId = new Map(top.map((c) => [c.id, c]));
    const toastSet = new Set(p.toastIds || []);
    const joint = top.filter((c) => toastSet.has(c.id)).length > 1;
    const frozen = ctx.frozen;
    const reduced = ctx.reduced;
    const juice = (late, max = 500) => !frozen && late < max;
    const sfx = (late, n, o) => { if (juice(late)) ctx.audio.sfx(n, o); };
    const cleanups = [];

    const header = h('div.r3r-head',
      h('div.r3r-eyebrow', h('span', 'Last orders'), h('span.r3r-sep', '·'), h('span', top.length >= 5 ? 'The top five' : `The top ${top.length || ''}`.trim())),
      h(`div.r3r-prompt${p.prompt.length > 48 ? '.long' : ''}`, p.prompt));
    const heroSlot = h('div.r3r-hero');
    const ladder = h('div.r3r-ladder');
    const stage = h('div.r3r-stage', heroSlot, ladder);
    show.append(header, stage);

    if (!top.length) {
      heroSlot.append(h('div.r3r-card.r3r-emptycard', h('div.r3r-text', 'Nobody ordered anything.'), h('div.r3r-sub', 'The bar is closed. Cyril is relieved.')));
      return {};
    }

    const author = (c) => ctx.player(c.authorId);
    // shared ranks for ties ("=1"): rank = 1 + number of cards with strictly more glasses
    const rankOf = (c) => {
      const n = c.glasses.length;
      const r = 1 + top.filter((o) => o.glasses.length > n).length;
      const tied = top.some((o) => o !== c && o.glasses.length === n);
      return { r, label: tied ? `=${r}` : String(r) };
    };
    let hero = null;

    function heroCard(c, late) {
      const n = c.glasses.length;
      const base = 200 * n;
      const glasses = Array.from({ length: Math.max(n, 1) }, () => h('span.r3r-g'));
      const pts = h('span.r3r-pts', '+0');
      const who = author(c);
      const stamp = h('div.r3r-by', who ? chip(who) : h('span.r3r-anon', 'Someone'), h('span.r3r-stamp', pts));
      const el = h(`div.r3r-card.hero${n === 0 ? '.dry' : ''}`, { style: { '--tilt': `${(c.rank % 2 ? -1 : 1) * 1.2}deg` } },
        h('div.r3r-ribbon', h('span.r3r-ribbon-i', { html: clinkSvg() }), h('span', joint ? 'Joint toast of the table' : 'Toast of the table')),
        h(`div.r3r-coin${rankOf(c).label.length > 1 ? '.tied' : ''}`, rankOf(c).label.length > 1 ? null : h('small', 'No.'), rankOf(c).label),
        h(`div.r3r-text${c.text.length > 26 ? '.long' : ''}`, c.text),
        h('div.r3r-glasses', n ? glasses : h('span.r3r-none', 'Not a single glass')),
        stamp,
      );
      el.c = c;
      el.pts = pts;
      el.base = base;
      el.stampEl = stamp;
      // glasses clink in one by one (rising pitch), then the author stamp + points count-up
      const gap = 170;
      const instant = late > 200 + n * gap + 500 || frozen;
      glasses.forEach((g, k) => {
        const fill = () => { g.innerHTML = glassSvg(1); g.classList.add('in'); };
        if (n === 0) { g.innerHTML = ''; return; }
        g.innerHTML = glassSvg(0);
        if (instant) { fill(); g.classList.add('settled'); return; }
        const t = setTimeout(() => { fill(); sfx(0, 'clink', { step: k }); }, Math.max(0, 420 + k * gap - late));
        cleanups.push(() => clearTimeout(t));
      });
      const stampAt = 420 + n * gap + 220;
      const doStamp = (l2) => {
        stamp.classList.add('on');
        if (juice(l2, 300)) {
          ctx.audio.sfx('stamp');
          ctx.haptic('stamp');
          if (!reduced) ctx.stage.shake?.(0.004, 150);
        }
        cleanups.push(countTo(pts, 0, base, 500, { instant: frozen || l2 > 600, prefix: '+' }));
      };
      if (instant) { stamp.classList.add('on', 'settled'); pts.textContent = `+${base}`; } else {
        const t = setTimeout(() => doStamp(0), Math.max(0, stampAt - late));
        cleanups.push(() => clearTimeout(t));
      }
      return el;
    }

    function ladderRow(c) {
      const who = author(c);
      const row = h(`div.r3r-row${toastSet.has(c.id) ? '.tie' : ''}`,
        h('span.r3r-rk', rankOf(c).label),
        h('span.r3r-row-t', c.text),
        h('span.r3r-row-g', { html: glassSvg(1) }, h('b', String(c.glasses.length))),
        h('span.r3r-row-by', h('span.r3r-av', { style: { '--pc': who?.colour || '#7A4A2A' }, html: who ? avatarIcon(who.avatar) : '' }), h('span.r3r-nm', who?.name || '?')),
      );
      row.c = c;
      return row;
    }

    function landCard(c, late) {
      if (hero) {
        const old = hero;
        const row = ladderRow(old.c);
        if (!frozen && late < 400 && !reduced) row.classList.add('drop');
        ladder.prepend(row);
        old.remove();
      }
      hero = heroCard(c, late);
      if (!frozen && late < 400 && !reduced) hero.classList.add('enter');
      heroSlot.replaceChildren(hero);
      ctx.cyril.lookAt?.(null);
      if (juice(late)) {
        ctx.audio.sfx('swipe', { dir: 'right' });
        if (c.rank <= 2) ctx.cyril.react(c.glasses.length ? 'smug' : 'sad');
      }
    }

    const steps = p.steps.map((s) => ({ at: s.at, fn: (late) => { const c = byId.get(s.cardId); if (c) landCard(c, late); } }));

    // drumroll before the toast
    const drumAt = Math.max(0, p.toastAt - 1700);
    steps.push({ at: drumAt, fn: (late) => {
      if (!juice(late, 800)) return;
      if (toastSet.size) {
        ctx.cyril.react('drumroll');
        ctx.audio.sfx('drumroll', { duration: 1.6 });
        hero?.classList.add('tense');
      }
    } });
    cleanups.push(toastSet.size
      ? sayIfFresh(ctx, ctx.line('r3Toast'), { at: drumAt + 100, window: 1400, hold: 900, placement: 'side' })
      : () => {});

    // the toast
    steps.push({ at: p.toastAt, fn: (late) => {
      hero?.classList.remove('tense');
      if (!toastSet.size) {
        stage.classList.add('dry');
        if (juice(late)) ctx.cyril.react('sad');
        cleanups.push(sayIfFresh(ctx, DRY_LINE, { at: p.toastAt + 300, window: 2600, hold: 2200, placement: 'side' }));
        return;
      }
      // the hero is the #1; any tied cards on the ladder get the badge + bonus too
      const goldUp = (el) => {
        el.classList.add('is-toast');
        if (el.pts) cleanups.push(countTo(el.pts, el.base, el.base + 1000, 700, { instant: frozen || late > 900, prefix: '+' }));
      };
      if (hero && toastSet.has(hero.c.id)) goldUp(hero);
      ladder.querySelectorAll('.r3r-row.tie').forEach((r) => r.classList.add('is-toast'));
      stage.classList.add('toasted');
      if (juice(late, 600)) {
        ctx.audio.sfx('fanfare');
        ctx.cyril.react('delight');
        ctx.haptic('win');
        if (!reduced) ctx.stage.shake?.(0.006, 220);
        const meWon = top.some((c) => toastSet.has(c.id) && c.authorId === ctx.meId);
        if (meWon) ctx.haptic('win');
      }
      if (!reduced) show.append(confetti(late));
      cleanups.push(sayIfFresh(ctx, TOAST_LINE, { at: p.toastAt + 700, window: 2600, hold: 1800, placement: 'side' }));
    } });

    const tl = r3Timeline(steps);
    tl(ctx);

    function confetti(late) {
      // tiny folded napkins + gold foil, seeded so every phone throws the same handful
      const bits = Array.from({ length: 40 }, (_, i) => {
        const napkin = i % 3 === 0;
        const x = (i * 37 + 11) % 100;
        const drift = ((i * 53) % 60) - 30;
        const delay = ((i * 7) % 12) * 0.06;
        const dur = 3.2 + ((i * 13) % 10) / 10;
        const spin = (i % 2 ? 1 : -1) * (360 + ((i * 29) % 360));
        return h(`i.${napkin ? 'nap' : 'foil'}`, { style: {
          left: `${x}%`, '--dx': `${drift}px`, '--spin': `${spin}deg`, '--s': `${0.7 + ((i * 17) % 6) / 10}`,
          animationDuration: `${dur}s`, animationDelay: `${delay - late / 1000}s`,
        } });
      });
      const c = h(`div.r3r-confetti${frozen ? '.frozen' : ''}`, bits);
      return c;
    }

    return {
      frame: (c) => tl(c),
      unmount() { cleanups.forEach((f) => { try { f(); } catch { /* */ } }); },
    };
  },
};
