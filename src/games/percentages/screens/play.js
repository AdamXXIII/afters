// Pie Chart play screens: poll (table poll answer), dial (knife-holder cuts the pie), watch
// (everyone else: the live pie + heckle buttons), bet (higher/lower around the big cut number),
// sweat (knife-holder watches the bets land).
// Round 2 (blind A/B): one hero per screen (the question, then the number), no duplicate copy,
// heckles fly beside Cyril (never over the number), a tug-of-war meter says who's winning the shouting.
import { h, onTap } from '../../../ui/components.js';
import { ICONS } from '../../../ui/icons.js';
import { pie, questionCard, disc, heckleFeed, ARROW_UP, ARROW_UP2 } from './kit.js';

const say = (ctx, lines, o = {}, delay = 500) => {
  const t = setTimeout(() => ctx.say(lines, { hold: 2600, placement: 'side', ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
};

const knifeName = (ctx) => ctx.player(ctx.payload.knife)?.name || 'Someone';

function topWrap(...kids) { return h('div.pc-top', ...kids); }

/** Tug-of-war heckle meter: Lower on the left, Higher on the right. */
function tug() {
  const lo = h('b', '0'); const hi = h('b', '0');
  const bar = h('div.pc-tug-bar', h('i.lo'), h('i.hi'));
  const el = h('div.pc-tug', h('span.pc-tug-l', h('span.ic', { html: ARROW_UP }), lo), bar, h('span.pc-tug-r', hi, h('span.ic', { html: ARROW_UP })));
  el.set = (hc = {}) => {
    const u = hc.up || 0; const d = hc.down || 0;
    lo.textContent = String(d); hi.textContent = String(u);
    const f = u + d ? u / (u + d) : 0.5;
    bar.style.setProperty('--f', String(f));
  };
  el.set({});
  return el;
}

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
    const noB = h('button.pc-pollbtn.no', { type: 'button', 'data-e2e': 'pc-no' }, h('span.ic', { html: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>' }), h('span.lb', p.no || 'No'));
    onTap(yesB, () => pick(true), { sound: 'select', buzz: 'select' });
    onTap(noB, () => pick(false), { sound: 'select', buzz: 'select' });
    const discs = new Map(ctx.players.map((pl) => [pl.id, disc(pl, { size: 38 })]));
    const count = h('span.pc-count');
    const note = h('div.pc-hint');
    sheet.append(h('div.pc-sheet.pc-pollsheet.pc-in',
      h('div.pc-ask', h('div.pc-ask-q', 'You? Honestly?'), h('div.pc-ask-hint', 'Secret answer. Then someone guesses what % of you said yes.')),
      h('div.pc-pollrow', yesB, noB),
      note,
      h('div.pc-tally.big', h('div.pc-discs', [...discs.values()]), count)));
    const update = (c) => {
      const mine = c.mine.game.yes;
      yesB.setAttribute('aria-pressed', String(mine === true));
      noB.setAttribute('aria-pressed', String(mine === false));
      yesB.disabled = noB.disabled = mine !== undefined;
      note.textContent = mine === undefined ? '' : 'Answered. Now look innocent.';
      let n = 0;
      for (const [id, d] of discs) { const done = !!c.progress.done[id]; d.classList.toggle('in', done); if (done) n++; }
      count.textContent = `${n}/${discs.size} in`;
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
    show.append(topWrap(card), feed);
    const meter = tug();
    let v = Math.round(ctx.mine.game.v ?? ctx.progress.dial ?? 50);
    let locked = !!ctx.mine.game.locked;
    const pieEl = pie({ size: 270 });
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
      if (nv % 5 === 0) ctx.haptic('tick');
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
      dragging = true; try { pieEl.setPointerCapture?.(e.pointerId); } catch { /* synthetic pointer */ }
      pieEl.classList.add('grab'); fromPointer(e);
    });
    pieEl.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
    const up = () => { dragging = false; pieEl.classList.remove('grab'); };
    pieEl.addEventListener('pointerup', up); pieEl.addEventListener('pointercancel', up);
    const minus = h('button.pc-nudge', { type: 'button', 'data-e2e': 'pc-minus', 'aria-label': 'One less' }, '−1');
    const plus = h('button.pc-nudge', { type: 'button', 'data-e2e': 'pc-plus', 'aria-label': 'One more' }, '+1');
    onTap(minus, () => set(v - 1)); onTap(plus, () => set(v + 1));
    const lock = h('button.btn.pc-lock', { type: 'button', 'data-e2e': 'pc-lock' }, 'Cut it here');
    const doLock = () => {
      lock.textContent = `Cut at ${v}%`; lock.disabled = true; minus.disabled = plus.disabled = true;
      pieEl.classList.add('locked');
    };
    onTap(lock, () => {
      if (locked) return;
      locked = true; render();
      ctx.client.act('pc-lock', { v }, { v, locked: true });
      ctx.audio.sfx('stamp'); ctx.haptic('submit');
      doLock();
    });
    if (locked) doLock();
    sheet.append(h('div.pc-sheet.pc-dialsheet.pc-in',
      h('div.pc-dialhead', h('span.pc-knifeic', { html: KNIFE }), h('div.pc-ask-q', 'Your knife'), meter),
      h('div.pc-dialwrap', pieEl),
      h('div.pc-dialrow', minus, lock, plus)));
    let heard = (ctx.progress.heckles || []).length ? ctx.progress.heckles[ctx.progress.heckles.length - 1].n : 0;
    feed.sync(ctx.progress.heckles, { quiet: true });
    const update = (c) => {
      const list = c.progress.heckles || [];
      feed.sync(list, { quiet: c.frozen });
      const last = list.length ? list[list.length - 1].n : 0;
      if (last > heard && !c.frozen) { c.haptic('select'); c.audio.sfx('pop'); pieEl.classList.remove('jolt'); void pieEl.offsetWidth; pieEl.classList.add('jolt'); }
      heard = last;
      meter.set(c.progress.hc);
    };
    update(ctx);
    return { update, frame(c) { card.timer.set(c.remaining(), c.duration); }, unmount() { clearTimeout(pending); } };
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
    show.append(topWrap(card), feed);
    const meter = tug();
    const pieEl = pie({ size: 236 });
    pieEl.classList.add('live');
    let shown = ctx.progress.dial ?? 50;
    const cutTag = h('div.pc-cuttag', 'Cut!');
    const pieWrap = h('div.pc-dialwrap', pieEl, cutTag);
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
      h('div.pc-dialhead', disc(knife, { size: 36 }), h('div.pc-ask-q', h('span.nm', knife?.name || '?'), ' cuts'), meter),
      pieWrap,
      h('div.pc-heckrow', lowB, highB)));
    feed.sync(ctx.progress.heckles, { quiet: true });
    const update = (c) => {
      feed.sync(c.progress.heckles || [], { quiet: c.frozen });
      meter.set(c.progress.hc);
      const lk = !!c.progress.locked;
      pieWrap.classList.toggle('locked', lk);
      lowB.disabled = highB.disabled = lk;
      if (lk) cutTag.textContent = `Cut at ${c.progress.dial}%`;
    };
    update(ctx);
    const draw = (val) => { pieEl.slice(val); pieEl.knife(val); pieEl.num(`${Math.round(val)}%`); pieEl.label(ctx.progress.touched ? 'live' : 'thinking'); };
    draw(shown);
    return {
      update,
      frame(c, dt = 16) {
        card.timer.set(c.remaining(), c.duration);
        const target = c.progress.dial ?? 50;
        if (Math.abs(target - shown) > 0.05) { shown += (target - shown) * Math.min(1, (dt || 16) / 90); draw(shown); }
      },
    };
  },
};

// ---------- bet board (shared by bet + sweat): the cut is the hero, four bets around it ----------
const BETS_UI = {
  higher: { label: 'Higher', pay: '500', much: false, down: false },
  mhigher: { label: 'Much higher', pay: '1000 · 15+ above', much: true, down: false },
  lower: { label: 'Lower', pay: '500', much: false, down: true },
  mlower: { label: 'Much lower', pay: '1000 · 15+ below', much: true, down: true },
};

function betBoard(ctx, { interactive }) {
  const p = ctx.payload;
  const rows = {};
  const mk = (k) => {
    const u = BETS_UI[k];
    const who = h('span.pc-who');
    const b = h(`button.pc-bet.${k}${u.much ? '.much' : ''}${u.down ? '.down' : '.up'}`, { type: 'button', 'data-e2e': `pc-bet-${k}`, disabled: !interactive },
      h('span.pc-betic', { html: u.much ? ARROW_UP2 : ARROW_UP }),
      h('b.pc-betlb', u.label),
      h('small.pc-betpay', u.pay),
      who,
      h('span.pc-bettick', { html: ICONS.tick }));
    if (interactive) onTap(b, () => { ctx.client.act('pc-bet', { bet: k }, { bet: k }); }, { sound: 'select', buzz: 'select' });
    rows[k] = { b, who, discs: new Map() };
    return b;
  };
  const mini = pie({ size: 92, number: false, ticks: false });
  mini.slice(p.cut); mini.knife(p.cut);
  const hero = h('div.pc-cuthero', mini,
    h('div.pc-cuthero-t', h('div.pc-cuthero-l', `${knifeName(ctx)}’s cut`), h('div.pc-cuthero-n', `${p.cut}%`)));
  const el = h(`div.pc-board${interactive ? '' : '.view'}`,
    h('div.pc-board-row', mk('higher'), mk('mhigher')),
    hero,
    h('div.pc-board-row', mk('lower'), mk('mlower')));
  el.sync = (c) => {
    const bets = c.progress.bets || {};
    for (const [k, r] of Object.entries(rows)) {
      r.b.setAttribute('aria-pressed', String(c.mine.game.bet === k));
      const ids = Object.keys(bets).filter((id) => bets[id] === k);
      for (const [id, d] of r.discs) if (!ids.includes(id)) { d.remove(); r.discs.delete(id); }
      for (const id of ids) if (!r.discs.has(id)) { const d = disc(c.player(id), { size: 24, cls: '.pop' }); r.discs.set(id, d); r.who.append(d); }
    }
    el.classList.toggle('chosen', !!c.mine.game.bet);
  };
  return el;
}

const bet = {
  id: 'percentages-bet',
  layout: 'split',
  shot: 'scores',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const card = questionCard(p);
    show.append(topWrap(card));
    const board = betBoard(ctx, { interactive: true });
    sheet.append(h('div.pc-sheet.pc-betsheet.pc-in', h('div.pc-ask-q.center', 'The real answer is...'), board));
    board.sync(ctx);
    const cancel = say(ctx, ctx.line('pcBet', { name: knifeName(ctx) }), {}, 400);
    return { update: (c) => board.sync(c), frame(c) { card.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

const sweat = {
  id: 'percentages-sweat',
  layout: 'split',
  shot: 'scores',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const card = questionCard(p);
    show.append(topWrap(card));
    const board = betBoard(ctx, { interactive: false });
    const others = ctx.players.filter((x) => x.id !== p.knife).length;
    const count = h('span.pc-sweatn');
    sheet.append(h('div.pc-sheet.pc-betsheet.pc-in', h('div.pc-ask-q.center', 'The table bets on your cut ', count), board));
    const update = (c) => { board.sync(c); count.textContent = `${Object.keys(c.progress.bets || {}).length}/${others}`; };
    update(ctx);
    const cancel = say(ctx, ctx.line('pcSweat'), {}, 400);
    return { update, frame(c) { card.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

export const KNIFE = '<svg viewBox="0 0 24 24"><path d="M4 20l9-9 2 2-9 9z" fill="#5A3424"/><path d="M13 11l7-8c1 2 1 6-3 10z" fill="#F4E7C8" stroke="#8A6A2A" stroke-width="1"/></svg>';

export default [poll, dial, watch, bet, sweat];
