// Many Happy Returns: the table screens (split layout). Top: whose turn + the seats. Bottom: the
// pile and your hand.
// myturn     your turn: tap a card to play it, or draw (the pile is a button too)
// watch      someone else's turn: your hand, Steady On ready
// play       a card was played: a short window for anyone to Steady On it
// peek       you see the top three; peekwatch: they're peeking
// tuck       you blew a cake out: hide it back in the pile; tuckwatch: they're hiding it
import { h, onTap, button } from '../../../ui/components.js';
import { KINDS } from '../cards.js';
import {
  banner, seats, pile, cardFace, cardBack, disc, lastLine, sayLater, sting, buzz,
  nameOf, ownName, isMe, possessive, colourOf,
} from './kit.js';

/** Show layer for every table screen: banner + seats + what just happened. */
function top(show, ctx, o = {}) {
  const b = banner(ctx, o);
  const s = seats(ctx, { highlight: o.who ?? ctx.payload.turn });
  const line = o.line === undefined ? lastLine(ctx, ctx.payload.last) : o.line;
  const wrap = h('div.rt-top', b, s, line ? h('div.rt-last', line) : null);
  show.append(wrap);
  return b;
}

/** Private news from a pinch (shown once, at the top of the sheet). */
function news(ctx) {
  const n = ctx.priv?.news;
  if (!n) return null;
  const K = KINDS[n.k]?.name || 'a card';
  if (n.kind === 'pinched') return h('div.rt-news.good', cardFace(ctx, { k: n.k, f: n.f }, { size: 'mini' }), h('span', `You pinched `, h('b', K), ` from ${ownName(ctx, n.other)}.`));
  if (n.kind === 'lost') return h('div.rt-news.bad', cardFace(ctx, { k: n.k, f: n.f }, { size: 'mini' }), h('span', `${ownName(ctx, n.other)} pinched your `, h('b', K), '.'));
  return null;
}

/** Your hand as a row of cards. pick(card) when tappable. */
function handRow(ctx, { pick = null, ready = null } = {}) {
  const hand = ctx.priv?.hand || [];
  const order = ['breath', 'steady', 'skip', 'plate', 'peek', 'shuffle', 'pinch'];
  const cards = hand.slice().sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));
  const els = new Map();
  const row = h(`div.rt-hand${cards.length > 5 ? '.lots' : ''}`, { role: pick ? 'listbox' : 'list', 'aria-label': 'Your hand' },
    cards.length ? cards.map((c, i) => {
      const el = cardFace(ctx, c, { size: 'hand', cls: `${ready?.(c) ? '.ready' : ''}${pick && !KINDS[c.k].act ? '.idle' : ''}` });
      el.style.setProperty('--i', i);
      if (pick) {
        el.setAttribute('role', 'option');
        el.setAttribute('tabindex', '0');
        el.setAttribute('data-e2e', `rt-card-${c.k}`);
        onTap(el, () => pick(c), { sound: 'select', buzz: 'select' });
      }
      els.set(c.id, el);
      return el;
    }) : h('div.rt-hand-empty', 'No cards. Just you and the pile.'));
  row.els = els;
  return row;
}

// ---------- your turn ----------
const myturn = {
  id: 'returns-myturn',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const b = top(show, ctx, { sub: p.turnsLeft > 1 ? 'Two turns. Play cards, then draw.' : 'Play cards if you like, then draw.' });
    const glow = h('div.rt-myglow', { 'aria-hidden': 'true' });
    document.body.append(glow);
    // a one-second "Your turn!" slam across the table, then it gets out of the way
    if (!ctx.frozen || ctx.elapsed() < 1400) {
      const slam = h('div.rt-slam', { 'aria-hidden': 'true' }, h('span', p.turnsLeft > 1 ? 'Your turn ×2' : 'Your turn!'));
      if (ctx.frozen) slam.classList.add('hold');
      document.body.append(slam);
      setTimeout(() => slam.remove(), ctx.frozen ? 60000 : 1500);
    }
    let sel = null;
    let target = null;
    const pz = pile(ctx, { onTap: true });
    pz.stack.setAttribute('role', 'button');
    pz.stack.setAttribute('aria-label', 'Draw a card');
    pz.stack.setAttribute('data-e2e', 'rt-pile');
    const sent = () => !!(ctx.mine.game.played || ctx.mine.game.drew);
    const draw = () => {
      if (sent()) return;
      sting(ctx, 'flip');
      ctx.client.act('rt-draw', {}, { drew: true });
      pz.stack.classList.add('pulled');
    };
    onTap(pz.stack, draw, { sound: 'tap', buzz: 'tap' });

    const actions = h('div.rt-actions');
    const hint = h('div.rt-hint');
    const targets = h('div.rt-targets');
    const hand = handRow(ctx, {
      pick: (c) => {
        if (sent()) return;
        sel = sel?.id === c.id ? null : c;
        target = null;
        paint();
      },
      ready: (c) => KINDS[c.k].act,
    });

    function playSel() {
      if (!sel || sent()) return;
      const K = KINDS[sel.k];
      if (K.target && !target) return;
      ctx.audio.sfx('plated'); ctx.haptic('submit');
      ctx.client.act('rt-play', { cardId: sel.id, target }, { played: sel.id });
      hand.els.get(sel.id)?.classList.add('thrown');
    }

    function paint() {
      for (const [id, el] of hand.els) el.classList.toggle('sel', sel?.id === id);
      hand.classList.toggle('picking', !!sel);
      actions.replaceChildren();
      targets.replaceChildren();
      targets.hidden = true;
      if (!sel) {
        hint.textContent = (ctx.priv?.hand || []).some((c) => KINDS[c.k].act) ? 'Tap a card to play it. Or just draw.' : 'Nothing to play. Draw and hope.';
        actions.append(button('Draw a card', { e2e: 'rt-draw', onClick: draw }));
        return;
      }
      const K = KINDS[sel.k];
      if (!K.act) {
        hint.textContent = sel.k === 'steady' ? 'Steady On is for when someone else plays a card.' : 'Your Big Breath works by itself if you draw a cake.';
        actions.append(button('Draw a card', { e2e: 'rt-draw', onClick: draw }));
        return;
      }
      hint.textContent = K.rule;
      if (K.target) {
        const others = (ctx.payload.alive || []).filter((id) => id !== ctx.meId);
        targets.hidden = false;
        targets.append(h('span.rt-targets-l', 'From'), ...others.map((id) => {
          const n = ctx.payload.counts?.[id] || 0;
          const t = h(`button.rt-target${target === id ? '.on' : ''}${n ? '' : '.empty'}`, { type: 'button', 'data-e2e': `rt-target-${id}`, disabled: !n, style: { '--pc': colourOf(ctx, id) } },
            disc(ctx, id, { size: 30 }), h('span.nm', ownName(ctx, id)), h('span.ct', `${n}`));
          onTap(t, () => { target = id; paint(); }, { sound: 'select', buzz: 'select' });
          return t;
        }));
      }
      const label = K.target ? (target ? `Pinch from ${ownName(ctx, target)}` : 'Pick who to pinch from') : `Play ${K.name}`;
      const go = button(label, { e2e: 'rt-play', onClick: playSel, disabled: K.target && !target });
      go.classList.add('rt-play-btn');
      go.style.setProperty('--kc', K.colour);
      go.style.setProperty('--kl', K.lip);
      const back = h('button.rt-ghost', { type: 'button', 'data-e2e': 'rt-unselect' }, 'Back');
      onTap(back, () => { sel = null; target = null; paint(); });
      actions.append(h('div.rt-actrow', back, go));
    }

    const body = h('div.rt-sheet.mine.rt-in',
      news(ctx),
      pz.el,
      h('div.rt-handhead', h('span.rt-handhead-t', 'Your hand'), hint),
      hand,
      targets,
      actions);
    sheet.append(body);
    paint();

    if (!ctx.frozen) {
      sting(ctx, 'turn');
      buzz([30, 60, 30]);
      ctx.stage?.hop?.(ctx.meId);
    }
    ctx.cyril.react('drumroll', { duration: ctx.frozen ? 60000 : 900 });
    const cancel = sayLater(ctx, ctx.line(p.turnsLeft > 1 && p.last?.kind === 'plate' ? 'rtTwoTurns' : 'rtYourTurn'), { delay: 500 });
    return {
      update(c) {
        const done = !!(c.mine.game.played || c.mine.game.drew);
        body.classList.toggle('sent', done);
      },
      frame(c) { b.timer?.set(c.remaining(), c.duration); },
      unmount() { cancel(); glow.remove(); },
    };
  },
};

// ---------- someone else's turn ----------
const watch = {
  id: 'returns-watch',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const out = !(p.alive || []).includes(ctx.meId);
    const b = top(show, ctx, { sub: p.turnsLeft > 1 ? 'Two turns' : null });
    const hasSteady = (ctx.priv?.hand || []).some((c) => c.k === 'steady');
    const pz = pile(ctx);
    const next = p.alive[(p.alive.indexOf(p.turn) + 1) % p.alive.length];
    const status = h('div.rt-status', h('b', `${ownName(ctx, p.turn)} is deciding`), h('span', out
      ? 'You’re out. Heckle freely.'
      : next === ctx.meId ? 'You’re next. Start sweating.' : 'Play cards, then draw. Watch their face.'));
    const body = h(`div.rt-sheet.watch.rt-in${out ? '.ghost' : ''}`,
      news(ctx),
      status,
      pz.el,
      out ? null : h('div.rt-handhead', h('span.rt-handhead-t', 'Your hand'), h('div.rt-hint', hasSteady ? 'Got a Steady On? Use it when they play a card.' : 'Wait for your turn.')),
      out ? h('div.rt-ghostnote', disc(ctx, ctx.meId, { size: 40, cls: '.gone' }), h('span', 'Your candles are out. You can still throw bread rolls.')) : handRow(ctx, { ready: (c) => c.k === 'steady' }));
    sheet.append(body);
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 900 });
    const cancel = sayLater(ctx, ctx.line('rtWatch', { name: ownName(ctx, p.turn) }), { delay: 900 });
    return { frame(c) { b.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

// ---------- a card was played: the Steady On window ----------
const play = {
  id: 'returns-play',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const chain = p.chain || [];
    const first = chain[0];
    const last = chain[chain.length - 1];
    const K = KINDS[first.k];
    const label = chain.length > 1 ? 'Steady On!' : `${K.name}!`;
    const tgt = first.target ? ` on ${isMe(ctx, first.target) ? 'you' : ownName(ctx, first.target)}` : '';
    const sub = chain.length > 1
      ? `${nameOf(ctx, last.by)} ${p.cancelled ? 'cancelled' : 'put back'} ${possessive(ctx, first.by).toLowerCase() === 'your' ? 'your' : possessive(ctx, first.by)} ${K.name}`
      : `${isMe(ctx, first.by) ? 'You played it' : `${ownName(ctx, first.by)} played it`}${tgt}`;
    top(show, ctx, { who: last.by, label, sub, timer: false, line: null });
    const at = first.target ? h('div.rt-at', 'on ', disc(ctx, first.target, { size: 26 }), h('b', isMe(ctx, first.target) ? 'you' : ownName(ctx, first.target))) : null;
    const plateNext = first.k === 'plate' ? p.alive[(p.alive.indexOf(p.turn) + 1) % p.alive.length] : null;
    const effect = first.k === 'plate' && !p.cancelled ? `${isMe(ctx, plateNext) ? 'You' : ownName(ctx, plateNext)} would take two turns.` : null;
    const stack = h('div.rt-stack',
      cardFace(ctx, first, { size: 'big', cls: '.played' }),
      ...chain.slice(1).map((x, i) => {
        const c = cardFace(ctx, x, { size: 'hand', cls: '.steadied' });
        c.style.setProperty('--n', i);
        c.append(h('span.rt-by', { style: { '--pc': colourOf(ctx, x.by) } }, nameOf(ctx, x.by)));
        return c;
      }));
    const verdict = h(`div.rt-verdict${p.cancelled ? '.no' : '.yes'}`, p.cancelled ? 'Cancelled… unless someone Steadies On back' : chain.length > 1 ? 'Back on… unless someone Steadies On again' : 'Going ahead…');
    const fuse = h('div.rt-fuse', h('i'));
    const priv = ctx.priv || {};
    const nSteady = (priv.hand || []).filter((c) => c.k === 'steady').length;
    let foot;
    if (priv.canSteady) {
      const want = p.cancelled ? 'Put it back on' : `Cancel ${isMe(ctx, first.by) ? 'it' : 'their ' + K.name}`;
      const btn = h('button.rt-steady', { type: 'button', 'data-e2e': 'rt-steady' },
        h('span.rt-steady-i', { html: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 21V10a2.4 2.4 0 0 1 4.8 0v8"/><path d="M17.8 17V7.5a2.4 2.4 0 0 1 4.8 0V17"/><path d="M22.6 17.5V9.5a2.4 2.4 0 0 1 4.8 0V20"/><path d="M27.4 20v-5.5a2.3 2.3 0 0 1 4.6 0V24c0 6-4 10-10 10-4.4 0-7-2-9-5.5L9 22.4a2.4 2.4 0 0 1 4-2.4l2 2.5"/></svg>' }),
        h('span.rt-steady-t', h('b', 'Steady On!'), h('small', `${want}. You have ${nSteady}.`)));
      onTap(btn, () => {
        if (ctx.mine.game.steadied) return;
        sting(ctx, 'steady'); ctx.haptic('stamp');
        ctx.client.act('rt-steady', {}, { steadied: true });
      }, { sound: null, buzz: null });
      foot = btn;
    } else if (isMe(ctx, last.by)) {
      foot = h('div.rt-wait', 'Played. Anyone could Steady On it…');
    } else {
      foot = h('div.rt-wait', nSteady ? 'You can’t cancel your own Steady On.' : 'No Steady On in your hand. Watch and wince.');
    }
    const body = h('div.rt-sheet.play.rt-in', h('div.rt-playzone', stack, at, effect ? h('div.rt-effect', effect) : null), verdict, fuse, foot);
    sheet.append(body);
    if (!ctx.frozen) {
      if (chain.length > 1) { sting(ctx, 'steady'); ctx.stage?.shake?.(0.006, 220); buzz([40]); } else ctx.audio.sfx('swipe');
      if (first.target === ctx.meId && chain.length === 1) buzz([60, 40, 60]);
    }
    ctx.cyril.react(chain.length > 1 ? 'guffaw' : 'shock', { duration: ctx.frozen ? 60000 : 800 });
    const cancel = sayLater(ctx, ctx.line(chain.length > 1 ? 'rtSteadied' : 'rtPlay'), { delay: 300, hold: 1800 });
    const bar = fuse.firstChild;
    return {
      update(c) { body.classList.toggle('sent', !!c.mine.game.steadied); },
      frame(c) { bar.style.transform = `scaleX(${Math.max(0, Math.min(1, c.remaining() / (c.duration || 1)))})`; },
      unmount: cancel,
    };
  },
};

// ---------- peek ----------
const peek = {
  id: 'returns-peek',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const b = top(show, ctx, { label: 'Your peek', sub: 'Only you can see this', line: null });
    const topCards = ctx.priv?.top || [];
    const names = ['Next', 'Then', 'Then'];
    const row = h('div.rt-peekrow', topCards.map((c, i) => {
      const f = cardFace(ctx, c, { size: 'hand', cls: c.k === 'cake' ? '.danger' : '' });
      return h('div.rt-peekslot', { style: { '--i': i } }, h('span.rt-peekn', i === 0 ? 'Next' : names[i]), f);
    }));
    const cakeAt = topCards.findIndex((c) => c.k === 'cake');
    const read = cakeAt === 0 ? 'The next card is a cake. Do something!' : cakeAt > 0 ? `A cake is ${cakeAt === 1 ? 'second' : 'third'} from the top.` : 'No cakes in the top three. Breathe.';
    const btn = button('Got it', { e2e: 'rt-seen', onClick: () => { if (!ctx.mine.game.seen) ctx.client.act('rt-seen', {}, { seen: true }); } });
    sheet.append(h(`div.rt-sheet.peek.rt-in${cakeAt === 0 ? '.alarm' : ''}`, h('div.rt-peekh', 'The top of the pile'), row, h('div.rt-peekread', read), h('div.rt-actions', btn)));
    if (cakeAt === 0 && !ctx.frozen) buzz([80, 50, 80]);
    ctx.cyril.react(cakeAt === 0 ? 'shock' : 'smug', { duration: ctx.frozen ? 60000 : 1000 });
    const cancel = sayLater(ctx, ctx.line('rtPeek'), { delay: 700 });
    return { frame(c) { b.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

const peekwatch = {
  id: 'returns-peekwatch',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const b = top(show, ctx, { label: `${ownName(ctx, p.by)} is peeking`, line: null });
    const fan = h('div.rt-peekfan', cardBack({ cls: '.f1' }), cardBack({ cls: '.f2' }), cardBack({ cls: '.f3' }),
      h('span.rt-eye', { html: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 20c4-7 9.5-10.5 16-10.5S32 13 36 20c-4 7-9.5 10.5-16 10.5S8 27 4 20z"/><circle cx="20" cy="20" r="5.2"/></svg>' }));
    sheet.append(h('div.rt-sheet.watch.rt-in', h('div.rt-peekwatch', fan,
      h('div.rt-status', h('b', `${ownName(ctx, p.by)} is looking at the top three`), h('span', 'Watch their face. Do they look worried?'))),
    (p.alive || []).includes(ctx.meId) ? handRow(ctx, { ready: (c) => c.k === 'steady' }) : null));
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1000 });
    return { frame(c) { b.timer?.set(c.remaining(), c.duration); } };
  },
};

// ---------- tuck the cake back ----------
const SLOTS = [
  { pos: 0, t: 'Right on top', s: 'The next player draws it' },
  { pos: 1, t: 'Second from the top', s: '' },
  { pos: 2, t: 'Third from the top', s: '' },
  { pos: 'random', t: 'Somewhere random', s: 'Even you won’t know' },
  { pos: 'bottom', t: 'Right at the bottom', s: 'Safe for ages' },
];
const tuck = {
  id: 'returns-tuck',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const b = top(show, ctx, { label: 'Hide the cake', sub: 'Nobody else can see where', line: null });
    const n = p.pile || 0;
    const slots = SLOTS.filter((s) => !(Number.isInteger(s.pos) && s.pos > n));
    const list = h('div.rt-slots', slots.map((s, i) => {
      const el = h(`button.rt-slot.s${i}`, { type: 'button', 'data-e2e': `rt-tuck-${s.pos}` },
        h('span.rt-slot-pile', { html: slotArt(s.pos) }),
        h('span.rt-slot-t', h('b', s.t), s.s ? h('small', s.s) : null));
      onTap(el, () => {
        if (ctx.mine.game.tucked != null) return;
        ctx.audio.sfx('plated'); ctx.haptic('submit');
        ctx.client.act('rt-tuck', { pos: s.pos }, { tucked: s.pos });
        el.classList.add('on');
      }, { sound: null, buzz: null });
      return el;
    }));
    sheet.append(h('div.rt-sheet.tuck.rt-in', h('div.rt-tuckh', cardFace(ctx, { k: 'cake' }, { size: 'mini' }), h('div', h('b', 'Where does the cake go?'), h('span', `${n} cards in the pile. Pick a spot.`))), list));
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1200 });
    const cancel = sayLater(ctx, ctx.line('rtTuck'), { delay: 600 });
    return {
      update(c) { list.classList.toggle('sent', c.mine.game.tucked != null); },
      frame(c) { b.timer?.set(c.remaining(), c.duration); },
      unmount: cancel,
    };
  },
};

function slotArt(pos) {
  // five little card edges; the cake slot glows
  const idx = pos === 'random' ? -1 : pos === 'bottom' ? 4 : pos;
  const rows = [0, 1, 2, 3, 4].map((i) => `<rect x="4" y="${4 + i * 7}" width="32" height="5" rx="1.6" class="${i === idx ? 'hot' : ''}"/>`).join('');
  const q = pos === 'random' ? '<text x="20" y="27" text-anchor="middle" class="q">?</text>' : '';
  return `<svg viewBox="0 0 40 42" aria-hidden="true">${rows}${q}</svg>`;
}

const tuckwatch = {
  id: 'returns-tuckwatch',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const b = top(show, ctx, { who: p.by, label: `${ownName(ctx, p.by)} is hiding the cake`, line: null });
    const pz = pile(ctx);
    sheet.append(h('div.rt-sheet.watch.rt-in',
      h('div.rt-watchhead', pz.el, h('div.rt-status', h('b', 'Back in the pile it goes'), h('span', `${possessive(ctx, p.by)} choosing where. Watch their face.`))),
      (p.alive || []).includes(ctx.meId) ? handRow(ctx, { ready: (c) => c.k === 'steady' }) : null));
    ctx.cyril.react('shock', { duration: ctx.frozen ? 60000 : 900 });
    const cancel = sayLater(ctx, ctx.line('rtTuckWatch', { name: ownName(ctx, p.by) }), { delay: 600 });
    return { frame(c) { b.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

export default [myturn, watch, play, peek, peekwatch, tuck, tuckwatch];
