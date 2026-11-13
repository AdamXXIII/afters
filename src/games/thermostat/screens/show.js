// Thermostat show screens: how it plays, the reveal, the standings, the hot-seat card.
import { h } from '../../../ui/components.js';
import { dial, ends, disc, clueCard, sayLater, skipBtn, countTo, nameOf } from './kit.js';

function howCard({ title, art, rules, foot, cls = '' }) {
  return h(`div.th-how${cls}`,
    h('div.th-how-title', title),
    art ? h('div.th-how-art', art) : null,
    h('ol.th-rules', rules.map((r, i) => h('li', h('span.n', String(i + 1)), h('span.t', r)))),
    foot ? h('div.th-how-foot', foot) : null);
}

function miniDial(final) {
  const d = dial({ cls: '.mini' });
  d.bands(final ? 63 : 64, final);
  d.heat(1);
  d.set(final ? 58 : 59);
  return h('div.th-how-dial', d, ends({ l: 'Cold', r: 'Hot' }, { cls: '.mini' }));
}

const intro = {
  id: 'thermostat-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const card = howCard({
      title: 'Thermostat',
      art: miniDial(false),
      rules: [
        'One of you secretly sees a spot on a scale, like Cold to Hot.',
        'They say one clue out loud. Everyone else drags the same dial to it.',
        'Closer scores more. The Clue-giver scores double.',
      ],
      foot: 'Everyone gives a clue. Last place takes the hot seat at the end.',
    });
    show.append(h('div.th-dim'), h('div.th-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(28px) rotate(-2deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    const sk = skipBtn(ctx, show);
    const cancel = sayLater(ctx, ctx.line(ctx.payload.plays > 1 ? 'thIntroAgain' : 'thIntro'), { delay: 900, hold: 3000 });
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1200 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

const VERDICT = { spot: 'Spot on', warm: 'Warm', luke: 'Lukewarm', cold: 'Stone cold' };
const LINE = { spot: 'thSpot', warm: 'thWarm', luke: 'thLuke', cold: 'thCold' };

const reveal = {
  id: 'thermostat-reveal',
  layout: 'show',
  shot: 'reveal',
  rail: true,
  mount({ show }, ctx) {
    const p = ctx.payload;
    const quiet = ctx.frozen;
    const m = p.mult || 1;
    const sfx = (n, o) => { if (!quiet) ctx.audio.sfx(n, o); };
    const card = clueCard(ctx, p, { timer: false, compact: true });
    const d = dial({ cls: '.reveal' });
    d.bands(p.target, p.final);
    d.set(p.dial);
    const stamp = h(`div.th-verdict.${p.band}`, h('b', VERDICT[p.band]), h('span.pts'));
    const pts = h('div.th-pts');
    const you = h('div.th-you');
    const panel = h(`div.th-rv${p.final ? '.final' : ''}`,
      card,
      h('div.th-rv-dial', h('div.th-dialwrap', d, ends(p.scale))),
      stamp, pts, you);
    show.append(panel);

    // points rows
    const giverPts = p.deltas[p.giver] || 0;
    const tablePts = p.base * m;
    const rows = [];
    if (p.base) {
      rows.push(h('div.th-prow', h('span.lbl', 'Everyone'), h('span.v', `+${tablePts}`)));
      rows.push(h('div.th-prow.giver', disc(ctx.player(p.giver), { size: 26 }), h('span.lbl', `${nameOf(ctx, p.giver)} (clue, double)`), h('span.v', `+${giverPts}`)));
      if (p.hand) rows.push(h('div.th-prow.hand', disc(ctx.player(p.hand), { size: 26 }), h('span.lbl', `${nameOf(ctx, p.hand)} (last hand)`), h('span.v', `+${100 * m} more`)));
    } else {
      rows.push(h('div.th-prow.none', h('span.lbl', 'Nobody scores this round')));
    }
    pts.append(...rows);
    const mine = p.deltas[ctx.meId] || 0;
    you.textContent = p.base ? `You: +${mine}` : p.giver === ctx.meId ? 'Your clue. Their dial. Nobody’s fault. Probably.' : 'Not even close. Next one.';

    let stage = -1;
    const render = (k) => {
      if (k === stage) return;
      stage = k;
      if (k >= 1) d.classList.add('open');
      if (k >= 2) {
        stamp.classList.add('on');
        countTo(stamp.querySelector('.pts'), tablePts, { frozen: quiet });
        if (p.band === 'spot') { sfx('fanfare'); ctx.cyril.react('delight', { duration: quiet ? 60000 : 1400 }); if (!quiet) { ctx.haptic('win'); ctx.stage.shake?.(); } }
        else if (p.band === 'cold') { sfx('groan'); ctx.cyril.react('sad', { duration: quiet ? 60000 : 1400 }); }
        else { sfx('stamp'); ctx.cyril.react(p.band === 'warm' ? 'delight' : 'smug', { duration: quiet ? 60000 : 1200 }); if (!quiet) ctx.haptic('stamp'); }
        ctx.say(ctx.line(LINE[p.band]), { hold: 2200, placement: 'side' });
      }
      if (k >= 3) { pts.classList.add('on'); you.classList.add('on'); }
    };
    if (!quiet) { sfx('drumroll'); ctx.cyril.react('drumroll', { duration: 1300 }); }
    let lastHeat = -1;
    const frame = (c) => {
      const t = c.elapsed();
      const s = p.steps;
      const heat = Math.max(0, Math.min(1, (t - s.open) / 900));
      if (Math.abs(heat - lastHeat) > 0.001) { d.heat(heat); lastHeat = heat; }
      render(t >= s.points ? 3 : t >= s.verdict ? 2 : t >= s.open ? 1 : 0);
    };
    frame(ctx);
    return { frame };
  },
};

const scores = {
  id: 'thermostat-scores',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const rows = ctx.payload.rows || [];
    const next = ctx.player(ctx.payload.next);
    const list = rows.map((r, i) => {
      const pl = ctx.player(r.id);
      const me = r.id === ctx.meId;
      return h(`div.th-srow${i === 0 ? '.top' : ''}${me ? '.me' : ''}${r.id === ctx.payload.next ? '.next' : ''}`, { style: { '--i': i } },
        h('span.rk', String(r.rank ?? i + 1)), disc(pl, { size: i === 0 ? 40 : 32 }), h('span.nm', me ? 'You' : pl?.name || '?'), h('span.sc', String(r.score)));
    });
    show.append(h('div.th-scores',
      h('div.th-scores-h', 'The standings'),
      h('div.th-slist', list),
      h('div.th-nextup', disc(next, { size: 44 }), h('div', h('b', ctx.payload.next === ctx.meId ? 'You take the hot seat' : `${next?.name || '?'} takes the hot seat`), h('small', 'Last place gives the final clue. Triple points.')))));
    if (!ctx.frozen) ctx.audio.sfx('fanfare');
    ctx.cyril.react('delight', { duration: ctx.frozen ? 60000 : 1200 });
    const cancel = sayLater(ctx, ctx.line('thScores'), { delay: 900 });
    return { unmount: cancel };
  },
};

const hot = {
  id: 'thermostat-hot',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const giver = ctx.player(ctx.payload.giver);
    const me = ctx.payload.giver === ctx.meId;
    const card = howCard({
      title: 'The hot seat',
      cls: '.hot',
      art: h('div.th-hot-art', disc(giver, { size: 84, cls: '.big' }), h('div.th-hot-nm', me ? 'You' : giver?.name || '?'), h('span.th-x3', 'Triple points')),
      rules: [
        `${me ? 'You give' : `${giver?.name || '?'} gives`} the last clue.`,
        'The target is half as wide.',
        'Every point counts three times.',
      ],
    });
    show.append(h('div.th-dim'), h('div.th-cardwrap', card));
    if (!ctx.frozen) { card.animate([{ transform: 'translateY(28px) rotate(2deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }); ctx.audio.sfx('bell'); }
    const sk = skipBtn(ctx, show);
    const cancel = sayLater(ctx, ctx.line('thHot'), { delay: 900 });
    ctx.cyril.react('drumroll', { duration: ctx.frozen ? 60000 : 1400 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

export default [intro, reveal, scores, hot];
