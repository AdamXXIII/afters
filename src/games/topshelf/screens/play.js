// Top Shelf play screens: pick (lowest player chooses the bottle), q (the question: answer,
// or bet on the port-holder), port (choose who answers alone), wager (the Last Drop bet).
import { h, onTap } from '../../../ui/components.js';
import { ICONS } from '../../../ui/icons.js';
import { cabinet, catChip, qCard, disc, cat, say, colourOf, LETTERS, CAT_BOTTLE, bottleSvg } from './kit.js';

const nameOf = (ctx, id) => ctx.player(id)?.name || 'Someone';

/** Show-layer header: one line saying what the table is doing, over the compact cabinet. */
function standHead(title, sub) {
  return h('div.ts-stand-h', h('div.ts-stand-t', title), sub ? h('div.ts-stand-s', sub) : null);
}

// ---------- pick ----------
const pick = {
  id: 'topshelf-pick',
  layout: 'split',
  shot: 'scores',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const mePick = p.picker === ctx.meId;
    const cab = cabinet(ctx, { top: p.top, size: 'mini', labels: false });
    cab.still(p.shelves, { [p.picker]: { hot: true, flag: 'Picks' }, ...Object.fromEntries(Object.keys(p.shields || {}).map((id) => [id, { shield: true, hot: id === p.picker, flag: id === p.picker ? 'Picks' : '' }])) });
    show.append(h('div.ts-stand', standHead(`Round ${p.round + 1} of ${p.of}`, mePick ? 'You’re lowest, so you choose' : `${nameOf(ctx, p.picker)} is lowest, so they choose`), cab));
    const btns = new Map();
    const choose = (id) => {
      if (!mePick || ctx.mine.game.cat || ctx.progress.chosen) return;
      ctx.client.act('ts-pick', { cat: id }, { cat: id });
      ctx.audio.sfx('plated'); ctx.haptic('submit');
    };
    const list = h('div.ts-bottles', p.options.map((id) => {
      const c = cat(id);
      const b = h('button.ts-bottle', { type: 'button', 'data-e2e': `ts-cat-${id}`, disabled: !mePick, style: { '--g': c.glass } },
        h('span.ts-bottle-art', { html: CAT_BOTTLE }),
        h('span.ts-bottle-t', h('b', c.name), h('small', c.note)),
        h('span.ts-bottle-tick', { html: ICONS.tick }));
      onTap(b, () => choose(id), { sound: 'select', buzz: 'select' });
      btns.set(id, b);
      return b;
    }));
    const picker = ctx.player(p.picker);
    const head = mePick
      ? h('div.ts-ask', h('div.ts-ask-t', 'Pick the next category'), h('div.ts-ask-s', (ctx.line('tsPickMe') || [''])[0]))
      : h('div.ts-ask', h('div.ts-ask-t', disc(picker, { size: 30 }), ` ${picker?.name || '?'} is choosing`), h('div.ts-ask-s', 'Two questions from it, for everyone.'));
    sheet.append(h('div.ts-sheet.ts-in', head, list));
    const cancel = () => {};
    const update = (c) => {
      const chosen = c.progress.chosen || c.mine.game.cat;
      for (const [id, b] of btns) {
        b.setAttribute('aria-pressed', String(chosen === id));
        b.classList.toggle('out', !!chosen && chosen !== id);
        if (chosen) b.disabled = true;
      }
    };
    update(ctx);
    return { update, unmount: cancel };
  },
};

// ---------- question ----------
function answeredStrip(ctx, ids) {
  const discs = new Map(ids.map((id) => [id, h('div.ts-in-p', disc(ctx.player(id), { size: 34 }), h('span', ctx.player(id)?.name || '?'))]));
  const el = h('div.ts-instrip', [...discs.values()]);
  el.sync = (c) => { for (const [id, d] of discs) d.classList.toggle('in', !!c.progress.done?.[id]); };
  return el;
}

const q = {
  id: 'topshelf-q',
  layout: 'split',
  shot: 'scores',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const port = p.mode === 'port';
    const betting = port && p.victim !== ctx.meId;
    const card = qCard(p);
    const strip = answeredStrip(ctx, ctx.players.map((x) => x.id));
    show.append(h('div.ts-top', card), strip);
    const myShelf = p.shelves[ctx.meId] ?? 0;

    // banner: what this question means for me
    let banner = null;
    if (p.mode === 'steal') {
      banner = p.leader === ctx.meId
        ? h('div.ts-banner.steal', h('b', 'You’re the leader.'), ' Get it right and nobody can steal your shelf.')
        : h('div.ts-banner.steal', h('b', 'Steal:'), ` fastest right answer swaps shelves with ${nameOf(ctx, p.leader)} (shelf ${p.shelves[p.leader]}).`);
    } else if (port && !betting) {
      banner = h('div.ts-banner.port', h('b', 'All eyes on you.'), ' Right: up two shelves. Wrong: down two.');
    } else if (betting) {
      banner = h('div.ts-banner.port', disc(ctx.player(p.victim), { size: 26 }), h('b', ` ${nameOf(ctx, p.victim)}`), ' answers this alone. Will they get it?');
    } else if (p.mode === 'final') {
      const w = p.wagers?.[ctx.meId] || 1;
      banner = h('div.ts-banner.final', h('b', `You bet ${w} shelf${w > 1 ? 's' : ''}.`), ` Right: shelf ${Math.min(p.top, myShelf + w)}. Wrong: shelf ${Math.max(0, myShelf - w)}.`);
    }

    // speed meter (normal questions): the fast pour drains over the first five seconds
    let meter = null;
    if (p.mode === 'normal' && p.fast) {
      meter = h('div.ts-pour', h('div.ts-pour-bar', h('i')), h('div.ts-pour-l', h('span.lb'), h('span.you', h('span.ts-mini', { html: bottleSvg(colourOf(ctx.me), ctx.me?.avatar) }), `Shelf ${myShelf}`)));
    }

    const opts = p.options.map((t, i) => {
      const b = h('button.ts-opt', { type: 'button', 'data-e2e': `ts-opt-${i}`, disabled: betting },
        h('span.ts-opt-k', LETTERS[i]), h('span.ts-opt-t', t), h('span.ts-opt-tick', { html: ICONS.tick }));
      if (!betting) {
        onTap(b, () => {
          if (ctx.mine.game.i !== undefined) return;
          ctx.client.act('ts-answer', { i }, { i, at: ctx.elapsed() });
          ctx.audio.sfx('plated'); ctx.haptic('submit');
        }, { sound: 'select', buzz: 'select' });
      }
      return b;
    });
    let bets = null;
    if (betting) {
      const mk = (yes) => {
        const b = h(`button.ts-betbtn.${yes ? 'yes' : 'no'}`, { type: 'button', 'data-e2e': `ts-bet-${yes ? 'yes' : 'no'}` },
          h('span.ic', { html: yes ? ICONS.tick : ICONS.close }), h('span.lb', yes ? 'Gets it' : 'Fluffs it'), h('small', 'Right call: up one shelf'));
        onTap(b, () => { if (ctx.mine.game.yes !== undefined) return; ctx.client.act('ts-bet', { yes }, { yes }); ctx.audio.sfx('plated'); ctx.haptic('submit'); }, { sound: 'select', buzz: 'select' });
        return b;
      };
      bets = h('div.ts-betrow', mk(true), mk(false));
    }
    const status = h('div.ts-status');
    sheet.append(h(`div.ts-sheet.ts-qsheet.ts-in${betting ? '.betting' : ''}`, banner, meter, h(`div.ts-opts${betting ? '.ro' : ''}`, opts), bets, status));

    if (p.n === 1 || p.mode !== 'normal') ctx.cyril.react(p.mode === 'normal' ? 'smug' : 'drumroll', { duration: ctx.frozen ? 60000 : 1200 });
    const cancel = p.mode === 'normal' ? say(ctx, ctx.line(p.n === 1 ? 'tsQ' : 'tsQ2'), { hold: 2200, compact: true }, 300) : () => {};

    const update = (c) => {
      strip.sync(c);
      const mine = c.mine.game.i;
      opts.forEach((b, i) => {
        b.setAttribute('aria-pressed', String(mine === i));
        if (!betting) b.disabled = mine !== undefined;
        b.classList.toggle('other', mine !== undefined && mine !== i);
      });
      if (bets) {
        const y = c.mine.game.yes;
        bets.querySelectorAll('button').forEach((b) => {
          const isYes = b.classList.contains('yes');
          b.setAttribute('aria-pressed', String(y === isYes));
          b.disabled = y !== undefined;
        });
      }
      const done = Object.values(c.progress.done || {}).filter(Boolean).length;
      const total = c.players.length;
      if (betting) status.textContent = c.mine.game.yes === undefined ? '' : `Bet placed. ${done} of ${total} in.`;
      else if (mine !== undefined) {
        const at = c.mine.game.at;
        const quick = p.mode === 'normal' && at !== undefined && at <= p.fast;
        status.textContent = `Locked in${quick ? ' · quick, if it’s right' : ''}. ${done} of ${total} in.`;
      } else status.textContent = '';
      sheet.querySelector('.ts-qsheet')?.classList.toggle('locked', mine !== undefined || c.mine.game.yes !== undefined);
    };
    update(ctx);
    let lastQuick = null;
    const frame = (c) => {
      card.timer?.set(c.remaining(), c.duration);
      if (meter) {
        const k = Math.max(0, 1 - c.elapsed() / p.fast);
        meter.querySelector('i').style.transform = `scaleX(${k.toFixed(3)})`;
        const quick = k > 0;
        if (quick !== lastQuick) {
          lastQuick = quick;
          meter.classList.toggle('over', !quick);
          meter.querySelector('.lb').textContent = quick ? 'Quick answer: two shelves' : 'Right answer: one shelf';
        }
      }
    };
    frame(ctx);
    return { update, frame, unmount: cancel };
  },
};

// ---------- pass the port: choose who answers ----------
const port = {
  id: 'topshelf-port',
  layout: 'split',
  shot: 'scores',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const cab = cabinet(ctx, { top: p.top, size: 'mini', labels: false });
    cab.still(p.shelves);
    show.append(h('div.ts-stand', standHead('Pass the Port', h('span', 'Next question: ', catChip(p.cat))), cab));
    const others = ctx.players.filter((x) => x.id !== ctx.meId);
    const tiles = new Map();
    const grid = h(`div.ts-ppl.n${Math.min(7, others.length)}`, others.map((pl) => {
      const votes = h('span.ts-ppl-v');
      const b = h('button.ts-ppl-b', { type: 'button', 'data-e2e': `ts-port-${pl.id}`, style: { '--pc': colourOf(pl) } },
        disc(pl, { size: 44 }), h('span.ts-ppl-n', pl.name), h('span.ts-ppl-s', `Shelf ${p.shelves[pl.id] ?? 0}`), votes);
      onTap(b, () => { if (ctx.mine.game.to) return; ctx.client.act('ts-port', { to: pl.id }, { to: pl.id }); ctx.audio.sfx('plated'); ctx.haptic('submit'); }, { sound: 'select', buzz: 'select' });
      tiles.set(pl.id, { b, votes });
      return b;
    }));
    sheet.append(h('div.ts-sheet.ts-in',
      h('div.ts-ask', h('div.ts-ask-t', 'Who answers the next one alone?'), h('div.ts-ask-s', 'Most votes gets the port. Right: up two. Wrong: down two.')),
      grid));
    const cancel = () => {};
    const update = (c) => {
      const votes = c.progress.votes || {};
      const tally = {};
      for (const to of Object.values(votes)) tally[to] = (tally[to] || 0) + 1;
      for (const [id, t] of tiles) {
        t.b.setAttribute('aria-pressed', String(c.mine.game.to === id));
        t.b.disabled = !!c.mine.game.to;
        const n = tally[id] || 0;
        t.votes.replaceChildren(...Array.from({ length: n }, () => h('i')));
      }
      cab.still(p.shelves, Object.fromEntries(Object.entries(tally).map(([id, n]) => [id, { flag: '●'.repeat(Math.min(n, 4)), hot: true }])));
    };
    update(ctx);
    return { update, unmount: cancel };
  },
};

// ---------- the last drop: wager ----------
const wager = {
  id: 'topshelf-wager',
  layout: 'split',
  shot: 'scores',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const cab = cabinet(ctx, { top: p.top, size: 'mini', labels: false });
    cab.still(p.shelves, { [ctx.meId]: { hot: true } });
    show.append(h('div.ts-stand', standHead('The Last Drop', h('span', 'One hard question: ', catChip(p.cat))), cab));
    const s = p.shelves[ctx.meId] ?? 0;
    const btns = [1, 2, 3].map((n) => {
      const up = Math.min(p.top, s + n); const down = Math.max(0, s - n);
      const b = h('button.ts-wbtn', { type: 'button', 'data-e2e': `ts-wager-${n}` },
        h('span.ts-wbtn-n', String(n)),
        h('span.ts-wbtn-u', n === 1 ? 'shelf' : 'shelves'),
        h('span.ts-wbtn-r', h('span.up', `Right: ${up}`), h('span.dn', `Wrong: ${down}`)));
      onTap(b, () => { if (ctx.mine.game.n) return; ctx.client.act('ts-wager', { n }, { n }); ctx.audio.sfx('stamp'); ctx.haptic('submit'); }, { sound: 'select', buzz: 'select' });
      return b;
    });
    sheet.append(h('div.ts-sheet.ts-in',
      h('div.ts-ask', h('div.ts-ask-t', 'Bet your shelves'), h('div.ts-ask-s', `You’re on shelf ${s}. No bet means one.`)),
      h('div.ts-wrow', btns)));
    const cancel = () => {};
    const update = (c) => {
      btns.forEach((b, i) => {
        b.setAttribute('aria-pressed', String(c.mine.game.n === i + 1));
        b.disabled = !!c.mine.game.n;
      });
    };
    update(ctx);
    return { update, unmount: cancel };
  },
};

export default [pick, q, port, wager];
