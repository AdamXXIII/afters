// Pie Chart play screens: poll (table poll answer), dial (knife-holder cuts the pie), watch
// (everyone else: the live pie + heckle buttons), bet (higher/lower ladder), sweat (knife-holder
// watches the bets land).
import { h, onTap } from '../../../ui/components.js';
import { ICONS } from '../../../ui/icons.js';
import { pie, questionCard, disc, heckleFeed, BET_INFO, ARROW_UP, ARROW_UP2 } from './kit.js';

const say = (ctx, lines, o = {}, delay = 500) => {
  const t = setTimeout(() => ctx.say(lines, { hold: 2600, placement: 'side', ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
};

const knifeName = (ctx) => ctx.player(ctx.payload.knife)?.name || 'Someone';

function topWrap(...kids) { return h('div.pc-top', ...kids); }

// ---------- poll ----------
const poll = {
  id: 'percentages-poll',
  layout: 'split',
  shot: 'scores',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const card = questionCard(p);
    show.append(topWrap(card));
    const pick = (yes) => {
      if (ctx.mine.game.yes !== undefined) return;
      ctx.client.act('pc-poll', { yes }, { yes });
      ctx.audio.sfx('plated'); ctx.haptic('submit');
    };
    const yesB = h('button.pc-pollbtn.yes', { type: 'button', 'data-e2e': 'pc-yes' }, h('span.ic', { html: ICONS.tick }), h('span.lb', p.yes || 'Yes'));
    const noB = h('button.pc-pollbtn.no', { type: 'button', 'data-e2e': 'pc-no' }, h('span.ic', { html: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>' }), h('span.lb', p.no || 'No'));
    onTap(yesB, () => pick(true), { sound: 'select', buzz: 'select' });
    onTap(noB, () => pick(false), { sound: 'select', buzz: 'select' });
    const discs = new Map(ctx.players.map((pl) => [pl.id, disc(pl, { size: 30 })]));
    const count = h('span.pc-count');
    const note = h('div.pc-hint');
    sheet.append(h('div.pc-sheet.pc-in',
      h('div.pc-ask', h('div.pc-ask-q', 'Have you? Be honest.'), h('div.pc-ask-hint', 'Nobody sees your answer. Not even me. Well. Barely.')),
      h('div.pc-pollrow', yesB, noB),
      note,
      h('div.pc-tally', h('div.pc-discs', [...discs.values()]), count)));
    const update = (c) => {
      const mine = c.mine.game.yes;
      yesB.setAttribute('aria-pressed', String(mine === true));
      noB.setAttribute('aria-pressed', String(mine === false));
      yesB.disabled = noB.disabled = mine !== undefined;
      note.textContent = mine === undefined ? '' : 'Answered. Now look innocent.';
      let n = 0;
      for (const [id, d] of discs) { const done = !!c.progress.done[id]; d.classList.toggle('in', done); if (done) n++; }
      count.textContent = `${n}/${discs.size} answered`;
    };
    update(ctx);
    const cancel = say(ctx, ctx.line('pcPoll'), { hold: 3000 });
    return { update, frame(c) { card.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

// ---------- dial (knife-holder) ----------
const dial = {
  id: 'percentages-dial',
  layout: 'split',
  shot: 'scores',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const card = questionCard(p);
    const feed = heckleFeed(ctx);
    const hcUp = h('b', '0'); const hcDown = h('b', '0');
    show.append(topWrap(card));
    let v = Math.round(ctx.mine.game.v ?? ctx.progress.dial ?? 50);
    let locked = !!ctx.mine.game.locked;
    const pieEl = pie({ size: 262 });
    pieEl.classList.add('dial');
    pieEl.setAttribute('data-e2e', 'pc-pie');
    const render = () => { pieEl.slice(v); pieEl.knife(v); pieEl.num(`${v}%`); pieEl.label(locked ? 'cut!' : 'drag'); };
    render();
    let lastSent = 0; let pending = null;
    const send = (force = false) => {
      const now = performance.now();
      if (!force && now - lastSent < 110) {
        if (!pending) pending = setTimeout(() => { pending = null; send(true); }, 120);
        return;
      }
      lastSent = now;
      ctx.client.act('pc-dial', { v }, { v });
    };
    const set = (nv) => {
      nv = Math.max(0, Math.min(100, Math.round(nv)));
      if (nv === v || locked) return;
      if (Math.abs(nv - v) >= 1 && nv % 5 === 0) ctx.haptic('tick');
      v = nv; render(); send();
    };
    let dragging = false;
    const fromPointer = (e) => {
      let raw = pieEl.valueAt(e.clientX, e.clientY);
      if (v > 75 && raw < 25) raw = 100;
      else if (v < 25 && raw > 75) raw = 0;
      set(raw);
    };
    pieEl.addEventListener('pointerdown', (e) => {
      if (locked) return;
      dragging = true; try { pieEl.setPointerCapture?.(e.pointerId); } catch { /* synthetic pointer */ } pieEl.classList.add('grab'); fromPointer(e);
    });
    pieEl.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
    const up = () => { dragging = false; pieEl.classList.remove('grab'); };
    pieEl.addEventListener('pointerup', up); pieEl.addEventListener('pointercancel', up);
    const minus = h('button.pc-nudge', { type: 'button', 'data-e2e': 'pc-minus', 'aria-label': 'One less' }, '−1');
    const plus = h('button.pc-nudge', { type: 'button', 'data-e2e': 'pc-plus', 'aria-label': 'One more' }, '+1');
    onTap(minus, () => set(v - 1)); onTap(plus, () => set(v + 1));
    const lock = h('button.btn.pc-lock', { type: 'button', 'data-e2e': 'pc-lock' }, 'Cut it here');
    onTap(lock, () => {
      if (locked) return;
      locked = true; render();
      ctx.client.act('pc-lock', { v }, { v, locked: true });
      ctx.audio.sfx('stamp'); ctx.haptic('submit');
      lock.textContent = `Cut at ${v}%`; lock.disabled = true; minus.disabled = plus.disabled = true;
      pieEl.classList.add('locked');
    });
    if (locked) { lock.textContent = `Cut at ${v}%`; lock.disabled = true; pieEl.classList.add('locked'); }
    sheet.append(h('div.pc-sheet.pc-dialsheet.pc-in',
      h('div.pc-ask.row', h('span.pc-knifeic', { html: KNIFE }), h('div', h('div.pc-ask-q', 'You hold the knife'), h('div.pc-ask-hint', 'Drag round the dish. Ignore the shouting.')),
        h('span.pc-hc', h('span.up', { html: ARROW_UP }), hcUp, h('span.down', { html: ARROW_UP }), hcDown)),
      h('div.pc-dialwrap', pieEl, feed),
      h('div.pc-dialrow', minus, lock, plus)));
    let heard = (ctx.progress.heckles || []).length ? ctx.progress.heckles[ctx.progress.heckles.length - 1].n : 0;
    feed.sync(ctx.progress.heckles, { quiet: true });
    const update = (c) => {
      const list = c.progress.heckles || [];
      feed.sync(list, { quiet: c.frozen });
      const last = list.length ? list[list.length - 1].n : 0;
      if (last > heard && !c.frozen) { c.haptic('select'); c.audio.sfx('pop'); pieEl.classList.remove('jolt'); void pieEl.offsetWidth; pieEl.classList.add('jolt'); }
      heard = last;
      hcUp.textContent = String(c.progress.hc?.up || 0); hcDown.textContent = String(c.progress.hc?.down || 0);
    };
    update(ctx);
    const cancel = say(ctx, ctx.line('pcDialMe'), {}, 400);
    return { update, frame(c) { card.timer.set(c.remaining(), c.duration); }, unmount() { cancel(); clearTimeout(pending); } };
  },
};

// ---------- watch (everyone else during the dial) ----------
const watch = {
  id: 'percentages-watch',
  layout: 'split',
  shot: 'scores',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const knife = ctx.player(p.knife);
    const card = questionCard(p);
    const feed = heckleFeed(ctx);
    show.append(topWrap(card));
    const pieEl = pie({ size: 240 });
    pieEl.classList.add('live');
    let shown = ctx.progress.dial ?? 50;
    const cutTag = h('div.pc-cuttag', 'Cut!');
    const pieWrap = h('div.pc-dialwrap', pieEl, feed, cutTag);
    const mk = (dir) => {
      const b = h(`button.pc-heckbtn.${dir}`, { type: 'button', 'data-e2e': `pc-heckle-${dir}` },
        h('span.ic', { html: ARROW_UP }), h('span.lb', dir === 'up' ? 'Higher!' : 'Lower!'));
      let last = 0;
      onTap(b, () => {
        const now = performance.now();
        if (now - last < 300 || ctx.progress.locked) return;
        last = now;
        ctx.client.act('pc-heckle', { dir });
        b.classList.remove('boom'); void b.offsetWidth; b.classList.add('boom');
      }, { sound: 'pop', buzz: 'tap' });
      return b;
    };
    const lowB = mk('down'); const highB = mk('up');
    sheet.append(h('div.pc-sheet.pc-watchsheet.pc-in',
      h('div.pc-ask.row', disc(knife, { size: 40 }), h('div', h('div.pc-ask-q', `${knife?.name || 'They'} holds the knife`), h('div.pc-ask-hint', 'Shout at them. Every tap buzzes their phone.'))),
      pieWrap,
      h('div.pc-heckrow', lowB, highB)));
    feed.sync(ctx.progress.heckles, { quiet: true });
    const update = (c) => {
      feed.sync(c.progress.heckles || [], { quiet: c.frozen });
      const lk = !!c.progress.locked;
      pieWrap.classList.toggle('locked', lk);
      lowB.disabled = highB.disabled = lk;
      if (lk) cutTag.textContent = `Cut at ${c.progress.dial}%`;
    };
    update(ctx);
    const draw = (val) => { pieEl.slice(val); pieEl.knife(val); pieEl.num(`${Math.round(val)}%`); pieEl.label(ctx.progress.touched ? `${knife?.name || ''}’s cut` : 'thinking'); };
    draw(shown);
    const cancel = say(ctx, ctx.line('pcDial', { name: knife?.name || 'Someone' }), {}, 400);
    return {
      update,
      frame(c, dt = 16) {
        card.timer.set(c.remaining(), c.duration);
        const target = c.progress.dial ?? 50;
        if (Math.abs(target - shown) > 0.05) { shown += (target - shown) * Math.min(1, (dt || 16) / 90); draw(shown); }
      },
      unmount: cancel,
    };
  },
};

// ---------- bet ladder (shared by bet + sweat) ----------
function ladder(ctx, { interactive }) {
  const p = ctx.payload;
  const rows = {};
  const order = ['mhigher', 'higher', 'cut', 'lower', 'mlower'];
  const el = h(`div.pc-ladder${interactive ? '' : '.view'}`);
  for (const k of order) {
    if (k === 'cut') {
      el.append(h('div.pc-cutpill', h('span.pc-cutnum', `${p.cut}%`), h('span.pc-cutwho', `${knifeName(ctx)}’s cut`)));
      continue;
    }
    const info = BET_INFO[k];
    const down = k === 'lower' || k === 'mlower';
    const much = k[0] === 'm';
    const who = h('span.pc-who');
    const b = h(`button.pc-bet.${k}${much ? '.much' : ''}${down ? '.down' : '.up'}`, { type: 'button', 'data-e2e': `pc-bet-${k}`, disabled: !interactive },
      h('span.pc-betic', { html: much ? ARROW_UP2 : ARROW_UP }),
      h('span.pc-betlb', h('b', info.label), h('small', much ? `${down ? '15+ below' : '15+ above'} · 1000` : 'pays 500')),
      who,
      h('span.pc-bettick', { html: ICONS.tick }));
    if (interactive) onTap(b, () => { ctx.client.act('pc-bet', { bet: k }, { bet: k }); }, { sound: 'select', buzz: 'select' });
    rows[k] = { b, who, discs: new Map() };
    el.append(b);
  }
  el.sync = (c) => {
    const bets = c.progress.bets || {};
    for (const [k, r] of Object.entries(rows)) {
      r.b.setAttribute('aria-pressed', String(c.mine.game.bet === k));
      const ids = Object.keys(bets).filter((id) => bets[id] === k);
      for (const [id, d] of r.discs) if (!ids.includes(id)) { d.remove(); r.discs.delete(id); }
      for (const id of ids) if (!r.discs.has(id)) { const d = disc(c.player(id), { size: 26, cls: '.pop' }); r.discs.set(id, d); r.who.append(d); }
    }
    el.classList.toggle('chosen', !!c.mine.game.bet);
  };
  return el;
}

function cutBanner(ctx) {
  const p = ctx.payload;
  const mini = pie({ size: 74, number: false, ticks: false });
  mini.slice(p.cut); mini.knife(p.cut);
  return h('div.pc-cutbanner', mini, h('div', h('div.pc-cb-l', `${knifeName(ctx)} cut it at`), h('div.pc-cb-n', `${p.cut}%`)),
    p.hc && (p.hc.up || p.hc.down) ? h('div.pc-cb-hc', `${p.hc.up} shouted higher`, h('br'), `${p.hc.down} shouted lower`) : null);
}

const bet = {
  id: 'percentages-bet',
  layout: 'split',
  shot: 'scores',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const card = questionCard(p, { compact: true });
    show.append(topWrap(card, cutBanner(ctx)));
    const lad = ladder(ctx, { interactive: true });
    sheet.append(h('div.pc-sheet.pc-in', h('div.pc-ask', h('div.pc-ask-q', `Higher or lower than ${p.cut}%?`), h('div.pc-ask-hint', 'Go big for double. Change your mind till the timer’s out.')), lad));
    lad.sync(ctx);
    const cancel = say(ctx, ctx.line('pcBet', { name: knifeName(ctx) }), {}, 400);
    return { update: (c) => lad.sync(c), frame(c) { card.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

const sweat = {
  id: 'percentages-sweat',
  layout: 'split',
  shot: 'scores',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const card = questionCard(p, { compact: true });
    show.append(topWrap(card, cutBanner(ctx)));
    const lad = ladder(ctx, { interactive: false });
    const others = ctx.players.filter((x) => x.id !== p.knife).length;
    const count = h('span');
    sheet.append(h('div.pc-sheet.pc-in', h('div.pc-ask', h('div.pc-ask-q', 'They’re betting on your cut'), h('div.pc-ask-hint', h('span', 'Look confident. '), count)), lad));
    const update = (c) => { lad.sync(c); count.textContent = `${Object.keys(c.progress.bets || {}).length} of ${others} bets in.`; };
    update(ctx);
    const cancel = say(ctx, ctx.line('pcSweat'), {}, 400);
    return { update, frame(c) { card.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

export const KNIFE = '<svg viewBox="0 0 24 24"><path d="M4 20l9-9 2 2-9 9z" fill="#5A3424"/><path d="M13 11l7-8c1 2 1 6-3 10z" fill="#F4E7C8" stroke="#8A6A2A" stroke-width="1"/></svg>';

export default [poll, dial, watch, bet, sweat];
