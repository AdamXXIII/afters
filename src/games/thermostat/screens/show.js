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
    const duo = !!ctx.payload.duo;
    const card = duo ? howCard({
      title: 'Thermostat',
      cls: '.duo',
      art: miniDial(false),
      rules: [
        'One of you secretly sees a spot on a scale, like Cold to Hot, and gives one clue.',
        'The other turns the dial to it. Then you swap.',
        'Closer scores more. You score together.',
      ],
      foot: h('span.th-duo-target', h('small', 'Cyril’s number'), h('b', String(ctx.payload.goal)), h('em', `${ctx.payload.first === ctx.meId ? 'You give' : `${ctx.player(ctx.payload.first)?.name || '?'} gives`} the first clue. Three each, then a hot one.`)),
    }) : howCard({
      title: 'Thermostat',
      art: miniDial(false),
      rules: [
        'One of you secretly sees a spot on a scale, like Cold to Hot.',
        'They say one clue out loud. Everyone else drags the same dial to it.',
        'Closer scores more. The Clue-giver scores double.',
      ],
      foot: 'Everyone gives a clue. Big final round at the end.',
    });
    show.append(h('div.th-dim'), h('div.th-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(28px) rotate(-2deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    const sk = skipBtn(ctx, show);
    const cancel = sayLater(ctx, ctx.line(duo ? 'thDuoIntro' : ctx.payload.plays > 1 ? 'thIntroAgain' : 'thIntro'), { delay: 900, hold: 3000 });
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1200 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

/** Two players: the running total against Cyril's target, as a brass thermometer bar. */
function tally(p, { before = null } = {}) {
  const k = (v) => `${Math.max(0, Math.min(1, v / p.goal)) * 100}%`;
  const fill = h('i.fill', { style: { width: k(before ?? p.total) } });
  const num = h('b', String(before ?? p.total));
  const el = h(`div.th-tally${p.total >= p.goal ? '.beat' : ''}`,
    h('span.lbl', 'Together'), num,
    h('span.bar', fill, h('i.goal')),
    h('span.of', `Cyril’s number ${p.goal}`));
  el.to = (frozen) => {
    fill.style.width = k(p.total);
    const from = before ?? p.total;
    if (frozen || from === p.total) { num.textContent = String(p.total); return; }
    const t0 = performance.now();
    const step = (now) => {
      const e = Math.min(1, (now - t0) / 650);
      num.textContent = String(Math.round(from + (p.total - from) * (1 - (1 - e) ** 3)));
      if (e < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  return el;
}

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
      stamp, pts,
      h('div.th-key', ['spot', 'warm', 'luke'].map((b) => h(`span.k.${b}`, h('i'), `${VERDICT[b]} ${{ spot: 300, warm: 200, luke: 100 }[b] * m}`))),
      you);
    show.append(panel);

    // points rows
    const giverPts = p.deltas[p.giver] || 0;
    const tablePts = p.base * m;
    const rows = [];
    const bar = p.duo ? tally(p, { before: p.total - tablePts }) : null;
    if (p.duo) {
      rows.push(p.base ? h('div.th-prow', h('span.lbl', 'You both score'), h('span.v', `+${tablePts}`)) : h('div.th-prow.none', h('span.lbl', 'Nothing this round')));
      rows.push(bar);
    } else if (p.base) {
      rows.push(h('div.th-prow', h('span.lbl', 'Everyone'), h('span.v', `+${tablePts}`)));
      rows.push(h('div.th-prow.giver', disc(ctx.player(p.giver), { size: 26 }), h('span.lbl', `${nameOf(ctx, p.giver)} gave the clue: double`), h('span.v', `+${giverPts}`)));
    } else {
      rows.push(h('div.th-prow.none', h('span.lbl', 'Nobody scores this round')));
    }
    pts.append(...rows);
    you.textContent = p.base ? '' : p.duo ? 'Not even close. Shake hands, next one.' : p.giver === ctx.meId ? 'Your clue. Their dial. Nobody’s fault. Probably.' : 'Not even close. Next one.';
    if (!you.textContent) you.style.display = 'none';

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
        // Cyril only talks when nobody scores: otherwise the stamp says it and his bubble would sit on the points
        if (p.band === 'cold') ctx.say(ctx.line(LINE[p.band]), { hold: 2200, placement: 'side' });
      }
      if (k >= 3) { pts.classList.add('on'); you.classList.add('on'); bar?.to(quiet); }
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
    if (ctx.payload.duo) return duoScores(show, ctx);
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

function duoScores(show, ctx) {
  const p = ctx.payload;
  const next = ctx.player(p.next);
  const need = Math.max(0, p.goal - p.total);
  const bar = tally(p);
  show.append(h('div.th-scores.duo',
    h('div.th-scores-h', 'Six clues in'),
    bar,
    h('div.th-duo-need', need ? h('span', 'You need ', h('b', String(need)), ' more. The last dial is worth up to ', h('b', '900'), '.') : h('span', h('b', 'Target beaten.'), ' The last dial is for glory.')),
    h('div.th-nextup', disc(next, { size: 44 }), h('div', h('b', p.next === ctx.meId ? 'You give the hot clue' : `${next?.name || '?'} gives the hot clue`), h('small', 'Narrower bands. Triple points.')))));
  if (!ctx.frozen) ctx.audio.sfx('fanfare');
  ctx.cyril.react(need ? 'smug' : 'delight', { duration: ctx.frozen ? 60000 : 1200 });
  const cancel = sayLater(ctx, ctx.line('thDuoScores'), { delay: 900 });
  return { unmount: cancel };
}

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
      foot: ctx.payload.duo ? `Together: ${ctx.payload.total} of ${ctx.payload.goal}` : null,
    });
    show.append(h('div.th-dim'), h('div.th-cardwrap', card));
    if (!ctx.frozen) { card.animate([{ transform: 'translateY(28px) rotate(2deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }); ctx.audio.sfx('bell'); }
    const sk = skipBtn(ctx, show);
    const cancel = sayLater(ctx, ctx.line('thHot'), { delay: 900 });
    ctx.cyril.react('drumroll', { duration: ctx.frozen ? 60000 : 1400 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

// ---------- two players: Cyril's verdict on the pair ----------
const verdict = {
  id: 'thermostat-verdict',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const players = ctx.players.slice(0, 2);
    const pips = h('div.th-vd-bands', (p.bands || []).map((b, i) => h(`i.${b}${i === p.bands.length - 1 ? '.hot' : ''}`, { title: VERDICT[b] })));
    const card = h(`div.th-how.th-vd.${p.rank}${p.beat ? '.beat' : ''}`,
      h('div.th-vd-avs', players.map((pl) => disc(pl, { size: 52 }))),
      h('div.th-vd-eyebrow', p.beat ? 'You beat Cyril’s number' : 'Short of Cyril’s number'),
      h('div.th-how-title', p.title),
      h('div.th-vd-sub', p.sub),
      h('div.th-vd-score', h('b', String(p.total)), h('span', `vs Cyril’s ${p.goal}`)),
      pips,
      h('div.th-vd-key', `One square per clue · ${p.spots} of ${p.rounds} spot on`));
    show.append(h('div.th-dim'), h('div.th-cardwrap', card));
    if (!ctx.frozen) { ctx.audio.sfx(p.beat ? 'fanfare' : 'groan'); card.animate([{ transform: 'scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }); }
    ctx.cyril.react(p.beat ? 'delight' : 'sad', { duration: ctx.frozen ? 60000 : 1400 });
    const cancel = sayLater(ctx, ctx.line(p.beat ? 'thDuoWin' : 'thDuoLose'), { delay: 900, hold: 3000 });
    return { unmount: cancel };
  },
};

export default [intro, reveal, scores, hot, verdict];
