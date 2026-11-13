// Something in the Soup: the round table (talk + point the finger), the banish vote, the banish reveal.
import { h, onTap } from '../../../ui/components.js';
import { header, seats, say, nameOf, disc, isGhost, ghostRibbon, nameBtn, colourOf, VIAL, SPOON, WISP } from './kit.js';

/** Live finger tally: who's being pointed at, and by whom. */
function tally(ctx) {
  const alive = ctx.payload.alive;
  const cells = new Map(alive.map((id) => {
    const by = h('div.sp-by');
    const n = h('b.sp-tn', '0');
    return [id, { el: h('div.sp-tcell', { style: { '--pc': colourOf(ctx, id) } }, h('div.sp-tav', disc(ctx, id, { size: 38 }), n), h('span.nm', nameOf(ctx, id)), by), n, by }];
  }));
  const el = h('div.sp-tally', { style: { '--cols': alive.length > 4 ? Math.ceil(alive.length / 2) : alive.length } }, [...cells.values()].map((c) => c.el));
  el.sync = (points = {}) => {
    const counts = {};
    for (const to of Object.values(points)) counts[to] = (counts[to] || 0) + 1;
    const top = Math.max(0, ...Object.values(counts));
    for (const [id, c] of cells) {
      const k = counts[id] || 0;
      if (c.n.textContent !== String(k)) { c.n.textContent = String(k); c.el.classList.remove('bump'); void c.el.offsetWidth; c.el.classList.add('bump'); }
      c.el.classList.toggle('hot', k > 0 && k === top);
      c.el.classList.toggle('some', k > 0);
      const from = Object.keys(points).filter((f) => points[f] === id);
      c.by.replaceChildren(...from.slice(0, 4).map((f) => disc(ctx, f, { size: 16 })));
    }
  };
  return el;
}

const table = {
  id: 'soup-table',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const hd = header(ctx, { title: 'The round table', line: 'Talk it out loud. Point the finger.' });
    const tl = tally(ctx);
    show.append(h('div.sp-top', hd, tl));
    let body;
    let btns = [];
    const ready = h('button.btn.block.btn-secondary.sp-ready', { type: 'button', 'data-e2e': 'sp-ready' }, 'Ready to vote');
    const readyN = h('div.sp-readyn');
    if (isGhost(ctx)) {
      body = h('div.sp-sheet.sp-ghostsheet.sp-in', ghostRibbon(ctx), h('div.sp-ghost-b', 'Ghosts don’t talk. They do watch faces. Your séance vote comes in the banish vote.'), readyN);
    } else {
      btns = p.alive.filter((id) => id !== ctx.meId).map((id) => {
        const b = nameBtn(ctx, id, { e2e: `sp-point-${id}` });
        onTap(b, () => {
          const cur = ctx.mine.game.point;
          const to = cur === id ? null : id;
          ctx.client.act('sp-point', { to }, { point: to });
        }, { sound: 'select', buzz: 'select' });
        return b;
      });
      onTap(ready, () => { const on = !ctx.mine.game.ready; ctx.client.act('sp-ready', { on }, { ready: on }); });
      body = h('div.sp-sheet.sp-in',
        h('div.sp-ask', 'Point the finger at…'),
        h('div.sp-picks', btns),
        h('div.sp-foot', ready, readyN));
    }
    sheet.append(body);
    const cancel = say(ctx, ctx.line('spTable'), { hold: 3600 }, 600);
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1400 });
    const update = (c) => {
      tl.sync(c.progress.points || {});
      const mine = c.mine.game.point ?? c.progress.points?.[c.meId] ?? null;
      for (const b of btns) b.setAttribute('aria-pressed', String(b.dataset.id === mine));
      const r = !!c.mine.game.ready;
      ready.classList.toggle('on', r);
      ready.textContent = r ? 'Ready. Keep talking if you like.' : 'Ready to vote';
      const n = c.payload.alive.filter((id) => c.progress.done?.[id]).length;
      readyN.textContent = `${n} of ${c.payload.alive.length} ready. The vote starts when everyone is, or the clock runs out.`;
    };
    update(ctx);
    let late = false;
    return {
      update,
      frame(c) {
        hd.timer.set(c.remaining(), c.duration);
        if (!late && c.remaining() < 15000 && c.remaining() > 0 && !c.frozen) { late = true; c.cyril.react('shock'); }
      },
      unmount: cancel,
    };
  },
};

const vote = {
  id: 'soup-vote',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const hd = header(ctx, { title: p.final ? 'Banish again' : 'Banish someone', line: 'One vote each, in secret. Revealed one by one.', tone: 'claret' });
    const st = seats(ctx, { size: 28, done: (c, id) => c.progress.done?.[id] });
    show.append(h('div.sp-top', hd, st));
    let btns = [];
    let body;
    const ghost = isGhost(ctx);
    const seanceOk = ghost && (p.seanceLeft || []).includes(ctx.meId);
    if (ghost && !seanceOk) {
      body = h('div.sp-sheet.sp-ghostsheet.sp-in', ghostRibbon(ctx), h('div.sp-ghost-b', 'You’ve used your séance. Watch who they choose.'));
    } else {
      const act = ghost ? 'sp-seance' : 'sp-vote';
      btns = p.alive.filter((id) => id !== ctx.meId).map((id) => {
        const b = nameBtn(ctx, id, { e2e: `sp-vote-${id}`, dark: ghost });
        onTap(b, () => { ctx.client.act(act, { to: id }, ghost ? { seance: id } : { vote: id }); }, { sound: 'select', buzz: 'select' });
        return b;
      });
      const head = ghost
        ? h('div.sp-seance', h('span.ic', { html: WISP }), h('div', h('b', 'Séance. '), 'Once a game, a ghost may add a vote. It shows as “a ghost”, never your name.'))
        : h('div.sp-ask', 'Who leaves the table?');
      const save = ghost ? h('button.btn.block.btn-secondary', { type: 'button', 'data-e2e': 'sp-seance-skip' }, 'Save my séance') : null;
      if (save) onTap(save, () => ctx.client.act('sp-seance', { to: null }, { seance: null, skipped: true }));
      body = h(`div.sp-sheet.sp-in${ghost ? '.sp-ghostsheet' : ''}`, head, h('div.sp-picks', btns), save, h('div.sp-hint', ghost ? '' : 'You can change your mind until the clock runs out.'));
    }
    sheet.append(body);
    const cancel = say(ctx, ctx.line(p.final ? 'spVoteFinal' : 'spVote'), {}, 500);
    const update = (c) => {
      st.sync(c);
      const mine = c.mine.game.vote || c.mine.game.seance;
      for (const b of btns) b.setAttribute('aria-pressed', String(b.dataset.id === mine));
    };
    update(ctx);
    return { update, frame(c) { hd.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

const banish = {
  id: 'soup-banish',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const counts = {};
    const rows = p.votes.map((v) => {
      const from = v.ghost ? h('span.sp-vfrom.ghost', h('span.sp-av.ghostic', { html: WISP }), h('b', 'A ghost')) : h('span.sp-vfrom', disc(ctx, v.from, { size: 26 }), h('b', nameOf(ctx, v.from)));
      return h('div.sp-vrow', from, h('span.sp-varrow', { html: '<svg viewBox="0 0 24 12"><path d="M1 6h20M16 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }), h('span.sp-vto', disc(ctx, v.to, { size: 26 }), h('b', nameOf(ctx, v.to))), h('i.sp-vn'));
    });
    const list = h('div.sp-votes', rows.length ? rows : h('div.sp-novotes', 'Not one vote. Not one.'));
    const verdict = h('div.sp-verdict');
    if (p.banished) {
      const pois = p.role === 'poisoner';
      verdict.append(...[
        h('div.sp-vd-av', disc(ctx, p.banished, { size: 96, cls: '.keep' }), h('div.sp-stamp', 'Banished')),
        h('div.sp-vd-nm', nameOf(ctx, p.banished)),
        p.tie ? h('div.sp-vd-tie', `A tie between ${p.leaders.map((id) => nameOf(ctx, id)).join(' and ')}. Cyril drew a straw.`) : null,
        h('div.sp-rcwrap', h('div.sp-rc-back', h('span', 'They were…'), h('b', '?')), h(`div.sp-rolecard.${pois ? 'pois' : 'faith'}`, h('div.sp-rc-q', 'They were…'), h('div.sp-rc-a', h('span.ic', { html: pois ? VIAL : SPOON }), pois ? 'a Poisoner' : 'Faithful')))].filter(Boolean));
    } else verdict.append(h('div.sp-vd-nm', 'Nobody leaves.'), h('div.sp-vd-tie', 'The table couldn’t decide. The Poisoners are delighted.'));
    const card = h('div.sp-card.sp-banish', h('div.sp-banish-t', p.final ? 'Banish again' : 'The vote'), list, verdict);
    show.append(h('div.sp-dim'), h('div.sp-cardwrap', card));
    let shown = -1; let stamped = false; let revealed = false;
    let cancel = () => {};
    return {
      frame(c) {
        const t = c.elapsed();
        let k = -1;
        p.at.forEach((a, i) => { if (t >= a) k = i; });
        if (k !== shown) {
          for (let i = shown + 1; i <= k; i++) {
            const v = p.votes[i];
            counts[v.to] = (counts[v.to] || 0) + 1;
            rows[i].classList.add('on');
            rows[i].querySelector('.sp-vn').textContent = String(counts[v.to]);
            if (!c.frozen && i === k) { c.audio.sfx('pop'); c.haptic('select'); }
          }
          shown = k;
        }
        if (!stamped && t >= p.stampAt) {
          stamped = true;
          card.classList.add('stamped');
          if (!c.frozen) { c.audio.sfx('stamp'); c.haptic('stamp'); c.stage.shake(0.004, 150); c.cyril.react('drumroll'); if (p.banished === c.meId) c.haptic('fooled'); }
        }
        if (!revealed && t >= p.roleAt) {
          revealed = true;
          card.classList.add('revealed');
          const pois = p.role === 'poisoner';
          if (!c.frozen) { c.audio.sfx(pois ? 'truth' : 'groan'); c.cyril.react(pois ? 'delight' : 'sad'); c.stage.shake(0.006, 220); c.haptic(pois ? 'win' : 'stamp'); }
          const extra = p.landslide ? c.line('spLandslide') : p.tie ? c.line('spTie') : null;
          cancel = say(c, [...(p.banished ? c.line(pois ? 'spPoisoner' : 'spFaithful', { name: nameOf(c, p.banished) }) : c.line('spNone')), ...(extra || [])].slice(0, 2), { hold: 3000 }, 500);
        }
      },
      unmount: () => cancel(),
    };
  },
};

export default [table, vote, banish];
