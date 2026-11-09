// Pie Chart: intro card, standings, the last slice (intro, pick 3, reveal).
import { h, onTap } from '../../../ui/components.js';
import { ICONS } from '../../../ui/icons.js';
import { pie, disc, easeOut } from './kit.js';

const say = (ctx, lines, o = {}, delay = 700) => {
  const t = setTimeout(() => ctx.say(lines, { hold: 2600, placement: 'side', ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
};

function skipBtn(ctx, show) {
  if (!ctx.isHost) return null;
  const b = h('button.pc-skip', { type: 'button', 'data-e2e': 'skip' }, 'Skip');
  onTap(b, () => ctx.client.skip());
  show.append(b);
  return (c) => b.classList.toggle('on', c.elapsed() > 1500 / (c.phase?.speed || 1));
}

function menuCard({ eyebrow, title, lede, tags, slice = 37 }) {
  const art = pie({ size: 196, ticks: false, number: false });
  art.slice(slice); art.knife(slice);
  return h('div.pc-card',
    h('div.pc-card-eye', eyebrow),
    h('div.pc-card-title', title),
    h('div.pc-card-art', art),
    h('div.pc-card-lede', lede),
    h('div.pc-card-tags', tags));
}

const intro = {
  id: 'percentages-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const card = menuCard({
      eyebrow: ctx.adult ? 'Today’s pie · after dark' : 'Today’s pie',
      title: 'Pie Chart',
      lede: 'Guess the percent. Bet on your mates.',
      tags: '2000 for a clean cut',
    });
    show.append(h('div.pc-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(30px) rotate(-3deg) scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    const sk = skipBtn(ctx, show);
    const cancel = say(ctx, ctx.line(ctx.payload.plays > 1 ? 'pcIntroAgain' : 'pcIntro'), { hold: 2800 }, 800);
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

const PODIUM = ['1st', '2nd', '3rd'];
const scores = {
  id: 'percentages-scores',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const rows = ctx.payload.rows || [];
    const top = rows.slice(0, 3);
    const order = [top[1], top[0], top[2]].filter(Boolean);
    const pod = h('div.pc-pod', order.map((r) => {
      const i = rows.indexOf(r);
      const pl = ctx.player(r.id);
      return h(`div.pc-pod-col.p${i + 1}`, { style: { animationDelay: `${(2 - i) * 140}ms` } },
        disc(pl, { size: i === 0 ? 76 : 58 }),
        h('div.pc-pod-nm', pl?.name || '?'),
        h('div.pc-pod-block', h('div.pc-pod-rank', PODIUM[i]), h('div.pc-pod-sc', String(r.score))));
    }));
    const rest = rows.slice(3).map((r, i) => {
      const pl = ctx.player(r.id);
      return h('div.pc-rest-row', h('span.rk', String(i + 4)), disc(pl, { size: 28 }), h('span.nm', pl?.name || '?'), h('span.sc', String(r.score)));
    });
    show.append(h('div.pc-scores2',
      h('div.pc-scores2-head', h('div.t-eyebrow.on-dark', 'Before the last slice'), h('div.pc-scores2-t', 'Most pie so far')),
      pod,
      rest.length ? h('div.pc-rest', rest) : null));
    if (!ctx.frozen) ctx.audio.sfx('fanfare');
    ctx.cyril.react('delight', { duration: ctx.frozen ? 60000 : 1200 });
    return {};
  },
};

const finalIntro = {
  id: 'percentages-final-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const card = menuCard({
      eyebrow: 'The finale',
      title: 'The Last Slice',
      slice: 88,
      lede: ctx.payload.q,
      tags: 'Pick 3 \u00b7 1000 each',
    });
    card.classList.add('final');
    show.append(h('div.pc-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(30px) rotate(3deg) scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    ctx.audio.sfx('bell');
    const sk = skipBtn(ctx, show);
    const cancel = say(ctx, ctx.line('pcFinalIntro'), {}, 800);
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

const final = {
  id: 'percentages-final',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    let picks = (ctx.mine.game.picks || []).slice();
    let sent = !!ctx.mine.game.sent;
    const btns = new Map();
    const serve = h('button.btn.block', { type: 'button', 'data-e2e': 'pc-serve' }, 'Pick 3');
    const render = () => {
      for (const [id, b] of btns) {
        const i = picks.indexOf(id);
        b.setAttribute('aria-pressed', String(i >= 0));
        b.querySelector('.pc-opt-n').textContent = i >= 0 ? String(i + 1) : '';
        b.disabled = sent || (i < 0 && picks.length >= 3);
      }
      serve.disabled = sent || picks.length !== 3;
      serve.textContent = sent ? 'Served. Fingers crossed.' : picks.length === 3 ? 'Serve my three' : `Pick ${3 - picks.length} more`;
    };
    const list = h('div.pc-opts', p.options.map((o) => {
      const b = h('button.pc-opt', { type: 'button', 'data-e2e': `pc-opt-${o.id}` }, h('span.pc-opt-n'), h('span.pc-opt-t', o.t));
      onTap(b, () => {
        if (sent) return;
        const i = picks.indexOf(o.id);
        if (i >= 0) picks.splice(i, 1); else if (picks.length < 3) picks.push(o.id);
        ctx.client.act('pc-noop', {}, { picks: picks.slice() });
        render();
      }, { sound: 'select', buzz: 'select' });
      btns.set(o.id, b);
      return b;
    }));
    onTap(serve, () => {
      if (sent || picks.length !== 3) return;
      sent = true;
      ctx.client.act('pc-top3', { ids: picks }, { picks: picks.slice(), sent: true });
      ctx.audio.sfx('plated'); ctx.haptic('submit');
      render();
    });
    sheet.append(h('div.pc-sheet.pc-finalsheet.pc-in',
      h('div.pc-ask', h('div.t-eyebrow', 'The last slice · roughly, from surveys'), h('div.pc-ask-q', p.q), h('div.pc-ask-hint', 'Pick the three the most people said. Order doesn’t matter.')),
      list, h('div.pc-serve', serve)));
    render();
    return { update: (c) => { if (c.mine.game.sent && !sent) { sent = true; render(); } } };
  },
};

const finalReveal = {
  id: 'percentages-final-reveal',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const max = Math.max(...p.bars.map((b) => b.pct));
    const pickers = (id) => Object.keys(p.picks).filter((pid) => p.picks[pid].includes(id));
    const rows = p.bars.map((b) => {
      const fill = h('div.pc-bar-fill');
      const num = h('span.pc-bar-n', '');
      const mine = (p.picks[ctx.meId] || []).includes(b.id);
      const el = h(`div.pc-bar${b.place ? `.top.p${b.place}` : ''}${mine ? '.mine' : ''}`,
        h('div.pc-bar-track', fill),
        h('div.pc-bar-row', h('span.pc-bar-t', b.t), h('span.pc-bar-who', pickers(b.id).map((id) => disc(ctx.player(id), { size: 20 }))), num),
        b.place ? h('div.pc-place', ['1st', '2nd', '3rd'][b.place - 1]) : null);
      return { b, el, fill, num };
    });
    const myPts = p.deltas[ctx.meId] || 0;
    const served = !!p.picks[ctx.meId];
    const banner = h('div.pc-final-pts', myPts ? `+${myPts} for you` : served ? 'None in the top three. Oh dear.' : 'You didn\u2019t serve three. Bold.');
    const no1 = p.bars.find((b) => b.place === 1);
    const hero = h('div.pc-hero1',
      h('div.pc-hero1-eye', 'The nation\u2019s No. 1'),
      h('div.pc-hero1-t', no1.t),
      h('div.pc-hero1-row', h('span.pc-hero1-n', `${no1.pct}%`), h('span.pc-bar-who', pickers(no1.id).map((id) => disc(ctx.player(id), { size: 30 })))));
    show.append(h('div.pc-frv',
      h('div.pc-frv-head', h('div.t-eyebrow', 'The last slice \u00b7 roughly, from surveys'), h('div.pc-frv-q', p.q)),
      h('div.pc-bars', rows.filter((r) => r.b.place !== 1).map((r) => r.el)),
      hero,
      banner));
    const quiet = ctx.frozen;
    const fired = new Set();
    const run = (c) => {
      const t = c.elapsed();
      for (const r of rows) {
        const k = easeOut((t - r.b.at) / 450);
        const v = t < r.b.at ? 0 : r.b.pct * k;
        r.fill.style.width = `${(v / max) * 100}%`;
        r.num.textContent = t < r.b.at ? '' : `${Math.round(v)}%`;
        const on = t >= r.b.at + 450;
        if (on && !fired.has(r.b.id)) {
          fired.add(r.b.id);
          r.el.classList.add('in');
          if (!quiet) { if (r.b.place) { ctx.audio.sfx('stamp'); ctx.haptic('stamp'); } else ctx.audio.sfx('pop'); }
          if (r.b.place === 1) { hero.classList.add('in'); ctx.cyril.react('delight', { duration: quiet ? 60000 : 1400 }); if (!quiet) { ctx.audio.sfx('fanfare'); ctx.stage.shake?.(); } }
        }
      }
      if (t >= p.pointsAt && !fired.has('pts')) {
        fired.add('pts');
        banner.classList.add('in');
        if (!quiet && myPts) { ctx.audio.sfx('fanfare'); ctx.haptic('win'); }
      }
    };
    run(ctx);
    return { frame: run };
  },
};

export default [intro, scores, finalIntro, final, finalReveal];
export { ICONS };
