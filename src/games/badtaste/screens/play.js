// Bad Taste play screens.
// hand    (pick a card from your seven, or write your own; the prompt previews your joke)
// critic  (the Critic waits: the prompt, and the face-down pile growing as people play)
// played  (your card is in the pile, face down, anonymous)
import { h, onTap, button, textField, timerRing } from '../../../ui/components.js';
import { promptCard, answerCard, cardBack, criticBadge, playedRow, sayLater, nameOf, tilt } from './kit.js';

const PEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.6L15.6 5a2.2 2.2 0 0 1 3.1 3.1L8.3 18.6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.8 6.8l3.3 3.3" stroke="currentColor" stroke-width="1.8"/></svg>';

const others = (ctx) => ctx.players.filter((pl) => pl.id !== ctx.payload.critic).map((pl) => pl.id);

// ---------- hand ----------
const hand = {
  id: 'badtaste-hand',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const cards = ctx.priv?.hand || [];
    const seed = ctx.phase?.seed || 1;
    const pc = promptCard(ctx, p);
    show.append(h('div.bt-top', pc));
    let sel = null; // card id, or 'write'
    let writing = false;

    const tiles = cards.map((c, i) => {
      const b = h('button.bt-hcard', { type: 'button', 'aria-pressed': 'false', 'data-e2e': `bt-card-${i}`, style: { '--i': i } },
        h(`span.bt-card-t${c.text.length > 30 ? '.long' : ''}`, c.text[0].toUpperCase() + c.text.slice(1)));
      onTap(b, () => { sel = sel === c.id ? null : c.id; sync(); }, { sound: 'select', buzz: 'select' });
      return b;
    });
    const blank = h('button.bt-hcard.blank', { type: 'button', 'data-e2e': 'bt-write', style: { '--i': cards.length } },
      h('span.bt-pen-i', { html: PEN }), h('span.bt-blank-t', 'Write your own'));
    onTap(blank, () => { writing = true; sync(); setTimeout(() => field.input.focus({ preventScroll: true }), 60); }, { sound: 'select', buzz: 'select' });

    const field = textField({ max: p.max || 48, placeholder: 'Your answer', onSubmit: () => play(), e2e: 'answer-input' });
    field.input.addEventListener('input', () => sync());
    const back = h('button.bt-ghost', { type: 'button', 'data-e2e': 'bt-back' }, 'Back to my cards');
    onTap(back, () => { writing = false; sync(); });
    const writeBox = h('div.bt-writebox', h('div.bt-write-h', 'Your own card'), field, back);

    const grid = h('div.bt-hand', tiles, blank);
    const btn = button('Play this card', { onClick: () => play(), e2e: 'submit' });
    const subEl = h('div.bt-sub');
    const per = p.per || 1;
    const critic = nameOf(ctx, p.critic);
    const title = h('div.bt-title', p.decider ? `The decider: play to ${critic}` : p.duo ? 'Beat Cyril’s card' : `Play a card to ${critic}`);
    const page = h('div.bt-sheet.bt-handsheet',
      h('div.bt-sheethead', title, subEl),
      grid, writeBox,
      h('div.bt-actions', btn));
    sheet.append(page);

    function current() {
      if (writing) return field.input.value.trim();
      return cards.find((c) => c.id === sel)?.text || '';
    }
    function play() {
      if (writing) {
        const t = field.input.value.trim();
        if (!t) { field.error(); return; }
        ctx.audio.sfx('plated'); ctx.haptic('submit');
        const list = [...(ctx.mine.game.list || []), { text: t, written: true }];
        ctx.client.act('bt-play', { text: t }, { played: t, list });
        writing = false; field.clear(); sync();
        return;
      }
      const c = cards.find((x) => x.id === sel);
      if (!c) return;
      ctx.audio.sfx('plated'); ctx.haptic('submit');
      const list = [...(ctx.mine.game.list || []), { text: c.text, id: c.id }];
      ctx.client.act('bt-play', { cardId: c.id }, { played: c.text, list });
      sel = null; sync();
    }
    let lastPreview = null;
    function sync() {
      const list = ctx.mine.game.list || [];
      const left = per - list.length;
      tiles.forEach((b, i) => { b.hidden = list.some((x) => x.id === cards[i].id); });
      blank.hidden = list.some((x) => x.written);
      if (per > 1) title.textContent = left < per ? `One more card for ${critic}` : `Play two cards to ${critic}`;
      page.classList.toggle('writing', writing);
      tiles.forEach((b, i) => b.setAttribute('aria-pressed', String(cards[i].id === sel)));
      const a = current();
      if (a !== lastPreview) {
        lastPreview = a;
        const slot = pc.set(a || null);
        if (a && !ctx.frozen) slot.animate([{ transform: 'scale(.92)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      }
      btn.disabled = !a;
      btn.textContent = writing ? 'Play my card' : 'Play this card';
      subEl.textContent = writing ? 'Type it. It appears in the blank up top.' : p.duo ? `${critic} gets yours and Cyril’s, face down. Tap one to try it.` : per > 1 ? 'Only two of you are playing, so two cards each. Tap one to try it.' : 'Tap one to try it in the blank. Nobody sees who played what.';
    }
    if (ctx.frozen && ctx.demo && cards[2]) sel = cards[2].id;
    sync();
    const cancel = sayLater(ctx, ctx.line(p.double ? 'btLast' : p.duo ? 'btHandDuo' : 'btHand', { name: nameOf(ctx, p.critic) }), { delay: 800 });
    let autoSent = false;
    return {
      update: () => sync(),
      frame(c) {
        pc.timer?.set(c.remaining(), c.duration);
        // out of time with a card chosen or words typed: play it rather than let Cyril pick
        if (autoSent || c.frozen || !c.duration || c.remaining() > 500) return;
        autoSent = true;
        if (current()) play();
      },
      unmount: cancel,
    };
  },
};

// ---------- the Critic waits ----------
const critic = {
  id: 'badtaste-critic',
  layout: 'show',
  shot: 'intro',
  rail: false,
  mount({ show }, ctx) {
    const p = ctx.payload;
    const seed = ctx.phase?.seed || 1;
    const pc = promptCard(ctx, p, { size: 'big', head: false, timer: false });
    const ring = timerRing();
    const ids = others(ctx);
    const pile = h('div.bt-pile');
    const row = playedRow(ctx, ids);
    show.append(h('div.bt-criticwrap',
      h('div.bt-chair', criticBadge(ctx.me, { size: 56 }), h('div', h('div.bt-chair-t', 'You’re the Critic'), h('div.bt-chair-s', p.duo ? `Round ${p.round} of ${p.of}. ${nameOf(ctx, ids[0])} is picking a card to beat Cyril’s.` : `Round ${p.round} of ${p.of}. Wait while they pick their cards.`)), ring),
      pc, pile, row));
    let n = -1;
    const sync = (c) => {
      row.sync(c);
      const k = c.progress.counts?.cards ?? c.progress.counts?.played ?? 0;
      if (k === n) return;
      const grew = n >= 0 && k > n;
      n = k;
      pile.replaceChildren(...Array.from({ length: Math.max(k, 0) }, (_, i) => {
        const b = cardBack({ cls: '.pile', seed, key: `pile${i}` });
        b.style.setProperty('--k', i);
        if (grew && i === k - 1 && !c.frozen) b.classList.add('land');
        return b;
      }));
      if (!k) pile.append(h('div.bt-pile-empty', 'Cards land here face down'));
    };
    sync(ctx);
    const cancel = sayLater(ctx, ctx.line('btCritic'), { delay: 700 });
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1200 });
    return { update: sync, frame(c) { ring.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

// ---------- played ----------
const played = {
  id: 'badtaste-played',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const seed = ctx.phase?.seed || 1;
    const mineList = ctx.mine.game.list || [];
    const text = ctx.mine.game.played || '';
    const out = p.decider && !p.tied?.includes(ctx.meId);
    if (out) {
      const pc = promptCard(ctx, p);
      const names = (p.tied || []).map((id) => nameOf(ctx, id));
      const row = playedRow(ctx, p.tied || []);
      show.append(h('div.bt-top', pc, row));
      sheet.append(h('div.bt-sheet.bt-playedsheet',
        h('div.bt-sheethead.center', h('div.bt-title', 'The decider'), h('div.bt-sub', `${names.join(' and ')} are tied for first. Only they play this one. You watch.`)),
        h('div.bt-mine', cardBack({ cls: '.under', seed, key: 'u1' }), cardBack({ cls: '.big', seed, key: 'u2' }))));
      const cancel = sayLater(ctx, ctx.line('btDecider'), { delay: 600 });
      return { update: (c) => row.sync(c), frame(c) { pc.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
    }
    const pc = promptCard(ctx, p, { answer: mineList.length > 1 ? null : text || null });
    const row = playedRow(ctx, others(ctx));
    show.append(h('div.bt-top', pc, row));
    const two = mineList.length > 1;
    sheet.append(h('div.bt-sheet.bt-playedsheet',
      h('div.bt-sheethead.center', h('div.bt-title', 'In the pile'), h('div.bt-sub', two ? `Both your cards are in, face down. Only two of you are playing, so two each.` : p.duo ? `Face down next to Cyril’s. ${nameOf(ctx, p.critic)} won’t know which is yours.` : `Face down. ${nameOf(ctx, p.critic)} won’t know it’s yours.`)),
      mineList.length > 1
        ? h('div.bt-mine.two', mineList.map((x, i) => answerCard(x.text, { cls: '.big.mine', seed, key: `mine${i}` })))
        : h('div.bt-mine', cardBack({ cls: '.under', seed, key: 'u1' }), answerCard(text || 'Played', { cls: '.big.mine', seed, key: 'mine' }))));
    const cancel = sayLater(ctx, ctx.line('btPlayed'), { delay: 600 });
    return { update: (c) => row.sync(c), frame(c) { pc.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

export default [hand, critic, played];
export { tilt };
