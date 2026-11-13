// Odd Sock show screens: intro (how it plays), reveal (the vote, the accused, the truth),
// round (both words side by side, who scored). Timelines are pure functions of ctx.elapsed().
import { h } from '../../../ui/components.js';
import { disc, sayLater, skipBtn, sockSvg, nameOf, you, countTo, nameTape } from './kit.js';

const TEAL = '#3E8E8A';
const ODD = '#E2553B';

function pairArt() {
  return h('div.os-pairart',
    h('span.os-ps.a', { html: sockSvg({ body: TEAL, pattern: 'stripe' }) }),
    h('span.os-ps.b', { html: sockSvg({ body: TEAL, pattern: 'stripe' }) }),
    h('span.os-ps.c', { html: sockSvg({ body: ODD, pattern: 'spot' }) }));
}

const intro = {
  id: 'oddsock-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const rules = [
      ['Everyone gets the same secret word.', ' One of you gets a slightly different one, and doesn’t know.'],
      ['Take turns saying one word about yours, out loud.', ' Then vote for the Odd Sock.'],
      ['Caught?', ' The Odd Sock gets one guess at everyone else’s word to steal the round.'],
    ];
    const card = h('div.os-card.os-intro',
      h('div.os-intro-title', 'Odd Sock'),
      pairArt(),
      h('ol.os-rules', rules.map(([b, t], i) => h('li', h('span.n', String(i + 1)), h('span.t', h('b', b), t)))),
      h('div.os-foot', `Most votes is accused. A tie lets the Odd Sock off. ${p.rounds} rounds, last one double.`));
    show.append(h('div.os-dim'), h('div.os-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(28px) rotate(-2deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 620, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    const sk = skipBtn(ctx, show);
    const cancel = sayLater(ctx, ctx.line(p.plays > 1 ? 'osIntroAgain' : 'osIntro'), { delay: 900, hold: 3000 });
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1200 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

const ARROW = '<svg viewBox="0 0 24 12"><path d="M1 6h20M16 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const reveal = {
  id: 'oddsock-reveal',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const counts = {};
    const rows = p.votes.map((v) => h(`div.os-vrow${v.to === p.sock ? '.right' : ''}`,
      h('span.os-vfrom', disc(ctx, v.from, { size: 26 }), h('b', you(ctx, v.from))),
      h('span.os-varrow', { html: ARROW }),
      h('span.os-vto', disc(ctx, v.to, { size: 26 }), h('b', you(ctx, v.to))),
      h('i.os-vn')));
    const list = h('div.os-votes', rows.length ? rows : h('div.os-novotes', 'Not one vote. Not one.'));
    const accused = p.accused;
    const sockName = nameOf(ctx, p.sock);
    const verdict = h('div.os-verdict');
    if (accused) {
      verdict.append(
        h('div.os-vd-av', disc(ctx, accused, { size: 84 }), h('div.os-stamp', 'Accused')),
        h('div.os-vd-nm', you(ctx, accused)));
    } else {
      verdict.append(h('div.os-vd-nm', p.tie ? 'A tie' : 'No votes'), h('div.os-vd-sub', p.tie ? `${p.leaders.map((id) => you(ctx, id)).join(' and ')} tied. Nobody gets accused.` : 'Nobody gets accused.'));
    }
    const truth = p.caught
      ? h('div.os-truth.caught', h('span.os-truth-sock', { html: sockSvg({ body: ODD, pattern: 'spot' }) }),
        h('div', h('div.os-truth-h', 'Odd Sock!'), h('div.os-truth-s', p.sock === ctx.meId ? 'Your word was ' : 'Their word was ', h('b', p.oddWord), '. Now one guess at everyone else’s word.')))
      : h('div.os-truth.escaped', h('div.os-truth-av', disc(ctx, p.sock, { size: 52 }), h('span.os-truth-mini', { html: sockSvg({ body: ODD, pattern: 'spot' }) })),
        h('div', h('div.os-truth-h', accused ? 'Wrong sock.' : 'Got away.'), h('div.os-truth-s', p.sock === ctx.meId ? 'The Odd Sock was ' : 'The Odd Sock was ', h('b', p.sock === ctx.meId ? 'you' : sockName), '. They walk free.')));
    const card = h(`div.os-card.os-reveal${p.caught ? '.caught' : '.escaped'}`, h('div.os-reveal-t', 'The vote'), list, verdict, truth);
    show.append(h('div.os-dim'), h('div.os-cardwrap', card));
    let shown = -1; let stamped = false; let flipped = false;
    let cancel = () => {};
    const run = (c) => {
      const t = c.elapsed();
      let k = -1;
      p.at.forEach((a, i) => { if (t >= a) k = i; });
      if (k !== shown) {
        for (let i = shown + 1; i <= k; i++) {
          const v = p.votes[i];
          counts[v.to] = (counts[v.to] || 0) + 1;
          rows[i].classList.add('on');
          rows[i].querySelector('.os-vn').textContent = String(counts[v.to]);
          if (!c.frozen && i === k) { c.audio.sfx('pop'); c.haptic('select'); }
        }
        shown = k;
      }
      if (!stamped && t >= p.stampAt) {
        stamped = true;
        card.classList.add('stamped');
        if (!c.frozen) { c.audio.sfx('stamp'); c.haptic('stamp'); c.stage.shake?.(0.004, 150); c.cyril.react('drumroll'); }
      }
      if (!flipped && t >= p.flipAt) {
        flipped = true;
        card.classList.add('flipped');
        if (!c.frozen) {
          c.audio.sfx(p.caught ? 'truth' : 'groan');
          c.stage.shake?.(0.006, 220);
          if (p.sock === c.meId) c.haptic('fooled');
        }
        c.cyril.react(p.caught ? 'delight' : 'shock', { duration: c.frozen ? 60000 : 1400 });
        const line = p.caught ? c.line('osCaught', { name: you(c, p.sock) }) : accused ? (accused === c.meId ? c.line('osWrongYou') : c.line('osWrong', { name: nameOf(c, accused) })) : c.line('osEscaped', { name: sockName });
        cancel = sayLater(c, line, { delay: c.frozen ? 0 : 500, hold: 2600 });
      }
    };
    run(ctx);
    return { frame: run, unmount: () => cancel() };
  },
};

const HEAD = { stolen: 'Stolen!', caught: 'Caught!', escaped: 'Got away with it' };

const round = {
  id: 'oddsock-round',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const sockName = you(ctx, p.sock);
    const sub = {
      stolen: `${sockName} guessed “${p.guess}”. The round is theirs.`,
      caught: p.guess ? `${sockName} guessed “${p.guess}”. Wrong. The table wins.` : `${sockName} didn’t guess. The table wins.`,
      escaped: p.accused ? `The table picked ${p.accused === ctx.meId ? 'you' : nameOf(ctx, p.accused)}. Wrong sock. ${sockName} slipped away.` : `Nobody got the most votes. ${sockName} slipped away.`,
    }[p.outcome];
    const pair = h('div.os-pair',
      h('div.os-pw.common', h('span.os-pw-sock', { html: sockSvg({ body: TEAL, pattern: 'stripe' }) }), nameTape(p.common, { size: 'small', label: 'Everyone' })),
      h('div.os-pw.odd', h('span.os-pw-sock', { html: sockSvg({ body: ODD, pattern: 'spot', mirror: true }) }), nameTape(p.odd, { size: 'small', label: `Odd Sock · ${sockName}` })));
    const rows = Object.entries(p.deltas).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);
    const why = (id) => (id === p.sock ? (p.outcome === 'stolen' ? 'guessed the word' : 'got away with it') : 'voted for the Odd Sock');
    const pts = [];
    const list = rows.length
      ? rows.map(([id, d], i) => { const n = h('span.os-rpts', '+0'); pts.push([n, d]); return h(`div.os-rrow${id === ctx.meId ? '.me' : ''}`, { style: { '--i': i } }, disc(ctx, id, { size: 32 }), h('span.nm', h('b', you(ctx, id)), h('small', why(id))), n); })
      : [h('div.os-rnone', 'Nobody scored this round.')];
    const lead = p.rows?.[0];
    const card = h(`div.os-card.os-round.${p.outcome}`,
      h('div.os-round-top', h('span.os-badge', p.final ? 'Last round · ×2' : `Round ${p.round} of ${p.rounds}`)),
      h('div.os-round-h', HEAD[p.outcome]),
      h('div.os-round-s', sub),
      pair,
      h('div.os-rlist', list),
      lead ? h('div.os-lead', p.last ? 'Final: ' : 'Leading: ', h('b', you(ctx, lead.id, false)), ` on ${lead.score}`) : null);
    show.append(h('div.os-dim'), h('div.os-cardwrap', card));
    pts.forEach(([n, d]) => countTo(n, d, { frozen: ctx.frozen }));
    if (!ctx.frozen) { ctx.audio.sfx(p.outcome === 'caught' ? 'fanfare' : 'countup', { ticks: 8 }); if ((p.deltas[ctx.meId] || 0) > 0) ctx.haptic('win'); }
    ctx.cyril.react(p.outcome === 'caught' ? 'delight' : 'guffaw', { duration: ctx.frozen ? 60000 : 1300 });
    const key = p.outcome === 'stolen' ? 'osStolen' : p.outcome === 'caught' ? 'osMissed' : 'osEscaped';
    const cancel = sayLater(ctx, ctx.line(key, { name: nameOf(ctx, p.sock) }), { delay: 900 });
    return { unmount: cancel };
  },
};

export default [intro, reveal, round];
