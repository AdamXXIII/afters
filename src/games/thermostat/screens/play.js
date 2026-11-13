// Thermostat play screens.
// give    (the Clue-giver sees the hidden heat bands, says one clue out loud, may swap the scale once)
// listen  (everyone else: the dial is covered, listen to the Clue-giver)
// dial    (everyone but the Clue-giver drags ONE shared dial, live, then locks in)
// squirm  (the Clue-giver watches the dial move over their secret bands, and must say nothing)
import { h, onTap, button, textField, timerRing } from '../../../ui/components.js';
import { LOCK_SLOP } from '../host.js';
import { dial, ends, disc, tag, clueCard, sayLater, nameOf } from './kit.js';

const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.4" fill="currentColor"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
const SWAP = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>';

// ---------- give (Clue-giver, clue phase) ----------
const give = {
  id: 'thermostat-give',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    const target = ctx.priv?.target ?? 50;
    const d = dial({ cls: '.give', needle: false });
    d.bands(target, p.final);
    d.heat(1);
    const field = textField({ max: p.max || 40, placeholder: 'Type it too, so it shows on every phone', onSubmit: () => send(), e2e: 'clue-input', enterkeyhint: 'done' });
    const btn = button('I’ve said my clue', { onClick: () => send(), e2e: 'said' });
    function send() {
      const clue = field.input.value.trim();
      ctx.audio.sfx('plated'); ctx.haptic('submit');
      ctx.client.act('th-said', { clue }, { said: true, clue });
    }
    let swap = null;
    if (p.canSwap) {
      swap = h('button.th-swap', { type: 'button', 'data-e2e': 'swap' }, h('i', { html: SWAP }), 'Swap scale (once)');
      onTap(swap, () => { swap.disabled = true; ctx.client.act('th-swap', {}, { swapped: true }); }, { sound: 'select', buzz: 'select' });
    }
    const el = h(`div.th-sheet.th-give.th-in${p.final ? '.final' : ''}`,
      h('div.th-head',
        h('div.th-title', p.final ? 'Hot seat: say one clue' : 'Say one clue out loud'),
        h('div.th-sub', 'Only you can see the target (the dark red bit). Say something that sits right there.')),
      h('div.th-dialwrap', d, ends(p.scale)),
      h('div.th-rule', p.final ? 'The target is half as wide. Every point triples.' : 'One clue. No numbers, no pointing, no faces.'),
      h('div.th-field', field),
      h('div.th-actions', btn, swap));
    sheet.append(el);
    if (ctx.frozen && ctx.demo) { field.input.value = ctx.priv?.eg?.[0] || ''; field.input.dispatchEvent(new Event('input')); }
    const cancel = sayLater(ctx, ctx.line(p.final ? 'thHot' : 'thGive'), { delay: 700 });
    let autoSent = false;
    return {
      update(c) { btn.disabled = !!c.mine.game.said; if (swap && c.mine.game.swapped) swap.disabled = true; },
      frame(c) {
        // the clock ran out: whatever they typed still counts
        if (autoSent || c.frozen || !c.duration || c.remaining() > 400 || c.mine.game.said) return;
        autoSent = true;
        const clue = field.input.value.trim();
        c.client.act('th-said', { clue }, { said: true, clue });
      },
      unmount: cancel,
    };
  },
};

// ---------- after the Clue-giver taps "said" (they wait for the phase to flip) ----------
// (the phase ends early as soon as they tap, so this is only ever a blink)

// ---------- listen (everyone else, clue phase) ----------
const listen = {
  id: 'thermostat-listen',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const giver = ctx.player(p.giver);
    const t = timerRing();
    show.append(h('div.th-top',
      h(`div.th-cluecard.listen${p.final ? '.final' : ''}`,
        h('div.th-cc-head', disc(giver, { size: 40 }),
          h('div.th-cc-who', h('b', `${giver?.name || '?'}’s giving the clue`), h('small', p.final ? 'Hot seat · triple points' : `Round ${(p.index ?? 0) + 1} of ${p.count ?? 1}`)), t),
        h('div.th-cc-clue.wait', 'Thinking of a clue…'))));
    const d = dial({ cls: '.covered' });
    d.cover(true);
    sheet.append(h('div.th-sheet.th-listen.th-in',
      h('div.th-head',
        h('div.th-title', `Listen to ${giver?.name || 'them'}`),
        h('div.th-sub', p.swapped ? 'They swapped the scale. One clue, out loud, then the dial is yours.' : 'They can see where the target is. One clue, out loud, then the dial is yours.')),
      h('div.th-dialwrap', d, ends(p.scale)),
      h('div.th-rule', p.final ? 'Hot seat: half the target, triple points.' : 'Start arguing about the scale. It helps.')));
    const cancel = sayLater(ctx, ctx.line('thListen', { name: giver?.name || 'them' }), { delay: 700 });
    return { frame(c) { t.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

// ---------- the live dial ----------
/** Shared live-dial behaviour for the guessers' screen and the Clue-giver's. */
function liveDial(ctx, d, { status, canDrag }) {
  const p = ctx.payload;
  let shown = ctx.progress?.dial ?? 50;
  let local = null; // my finger's value while I drag
  let lastSent = 0;
  let lastMoves = ctx.progress?.moves ?? 0;
  let lastChange = performance.now();
  d.set(shown);
  if (canDrag) {
    d.onDrag((v, phase) => {
      local = v;
      const now = performance.now();
      if (phase === 'down') { ctx.haptic('select'); ctx.audio.sfx('select'); }
      if (phase === 'up' || now - lastSent > 66) {
        lastSent = now;
        ctx.client.act('th-dial', { v, up: phase === 'up' }, null);
      }
      if (phase === 'up') setTimeout(() => { local = null; }, 250);
    });
  }
  const sync = (c) => {
    const pr = c.progress || {};
    if ((pr.moves ?? 0) !== lastMoves) { lastMoves = pr.moves ?? 0; lastChange = performance.now(); }
    const fresh = c.frozen || performance.now() - lastChange < 900;
    const ids = (fresh ? pr.holding || [] : []).filter((id) => id !== c.meId || local != null);
    if (local != null && !ids.includes(c.meId)) ids.unshift(c.meId);
    d.holders(ids.map((id) => c.player(id)).filter(Boolean));
    const names = ids.map((id) => nameOf(c, id));
    let txt;
    if (names.length > 2) txt = `${names.length} of you are fighting over it`;
    else if (names.length === 2) txt = `${names[0]} and ${names[1]} are fighting over it`;
    else if (names.length === 1) txt = names[0] === 'You' ? 'You’re turning it' : `${names[0]} is turning it`;
    else if (!pr.moves) txt = canDrag ? 'Grab the needle and drag. Everyone can.' : 'Nobody’s touched it yet';
    else txt = `${nameOf(c, pr.by)} moved it last`;
    status.textContent = txt;
    status.classList.toggle('fight', names.length >= 2);
  };
  return {
    sync,
    frame(c, dt) {
      const target = local ?? c.progress?.dial ?? shown;
      if (c.frozen) shown = target;
      else shown += (target - shown) * Math.min(1, (dt || 0.016) * 14); // dt is in seconds
      if (Math.abs(shown - d.value) > 0.02) d.set(shown);
      if (!c.frozen && performance.now() - lastChange > 950 && performance.now() - lastChange < 1100) sync(c);
    },
  };
}

function locksRow(ctx) {
  const giver = ctx.payload.giver;
  const ps = ctx.players.filter((pl) => pl.id !== giver);
  const avs = new Map(ps.map((pl) => [pl.id, disc(pl, { size: 30 })]));
  const lbl = h('span.th-locks-l');
  const el = h('div.th-locks', lbl, h('span.th-locks-avs', [...avs.values()]));
  el.sync = (c) => {
    let n = 0;
    for (const [id, a] of avs) { const on = !!c.progress?.done?.[id]; a.classList.toggle('in', on); if (on) n++; }
    lbl.textContent = n === avs.size ? 'Everyone’s locked in' : `${n} of ${avs.size} locked in`;
  };
  el.sync(ctx);
  return el;
}

const dialScreen = {
  id: 'thermostat-dial',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const card = clueCard(ctx, p);
    show.append(h('div.th-top', card));
    const d = dial({ cls: '.drag' });
    const status = h('div.th-status');
    const locks = locksRow(ctx);
    const lockBtn = h('button.th-lock', { type: 'button', 'data-e2e': 'lock' }, h('i', { html: LOCK }), h('span.t', 'Lock it in'));
    sheet.append(h(`div.th-sheet.th-dialsheet.th-in${p.final ? '.final' : ''}`,
      status,
      h('div.th-dialwrap', d, ends(p.scale)),
      h('div.th-lockrow', lockBtn, locks),
      h('div.th-hint', 'One dial for everyone. Drag it, argue, then all lock in.')));
    const live = liveDial(ctx, d, { status, canDrag: true });
    let state = 'open';
    onTap(lockBtn, () => {
      const on = ctx.progress?.done?.[ctx.meId];
      ctx.client.act('th-lock', on ? { off: true } : {}, { locked: !on, lockedAt: ctx.progress?.dial });
    }, { sound: 'select', buzz: 'select' });
    const sync = (c) => {
      live.sync(c);
      locks.sync(c);
      const done = !!c.progress?.done?.[c.meId];
      const g = c.mine.game;
      const moved = g.locked && !done && g.lockedAt != null && Math.abs((c.progress?.dial ?? 0) - g.lockedAt) > LOCK_SLOP;
      const next = done ? 'locked' : moved ? 'moved' : 'open';
      if (next === state) return;
      if (next === 'moved') ctx.haptic('error');
      state = next;
      lockBtn.dataset.state = state;
      lockBtn.querySelector('.t').textContent = state === 'locked' ? 'Locked in · tap to unlock' : state === 'moved' ? 'It moved. Lock it again' : 'Lock it in';
    };
    lockBtn.dataset.state = 'open';
    sync(ctx);
    const cancel = sayLater(ctx, ctx.line(p.final ? 'thHot' : 'thDial'), { delay: 700 });
    return {
      update: sync,
      frame(c, dt) { live.frame(c, dt); card.timer?.set(c.remaining(), c.duration); },
      unmount: cancel,
    };
  },
};

const squirm = {
  id: 'thermostat-squirm',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const card = clueCard(ctx, p);
    show.append(h('div.th-top', card));
    const d = dial({ cls: '.ghost' });
    d.bands(ctx.priv?.target ?? 50, p.final);
    d.heat(1);
    const status = h('div.th-status');
    const locks = locksRow(ctx);
    sheet.append(h(`div.th-sheet.th-dialsheet.th-squirm.th-in${p.final ? '.final' : ''}`,
      h('div.th-head.center', h('div.th-title', 'Not a word'), h('div.th-sub', 'You score double whatever they score.')),
      status,
      h('div.th-dialwrap', d, ends(p.scale)),
      h('div.th-lockrow.solo', locks)));
    const live = liveDial(ctx, d, { status, canDrag: false });
    const sync = (c) => { live.sync(c); locks.sync(c); };
    sync(ctx);
    const cancel = sayLater(ctx, ctx.line('thSquirm', { name: ctx.me?.name || 'you' }), { delay: 700 });
    return {
      update: sync,
      frame(c, dt) { live.frame(c, dt); card.timer?.set(c.remaining(), c.duration); },
      unmount: cancel,
    };
  },
};

export default [give, listen, dialScreen, squirm];
export { tag };
