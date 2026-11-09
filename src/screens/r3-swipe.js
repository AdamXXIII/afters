// r3-swipe: synced deck, 4 s per card. Swipe right / Cheers uses a glass (5); left / Pass.
// Own cards flash "yours, skip". Show layer: Cyril + deck progress rail.
import './r3.css';
import { h, button } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { sayLater } from './common.js';

export default {
  id: 'r3-swipe',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const deck = p.deck;
    const own = new Set(ctx.priv.ownCardIds || []);
    const dots = deck.map(() => h('i'));
    show.append(h('div.show-top', h('div.t-eyebrow.on-dark.center', 'Last orders'), h('div.show-prompt.center', p.prompt)), h('div.deck-progress', dots));

    const glasses = h('div.glasses');
    const bar = h('i');
    const area = h('div.swipe-area');
    const pass = button('Pass', { kind: 'secondary', onClick: () => decide(false), e2e: 'pass' });
    const cheers = button('Cheers', { onClick: () => decide(true), e2e: 'cheers' });
    sheet.append(h('div.r3-count', h('span.t-eyebrow', 'Raise a glass?'), glasses), h('div.swipe-bar', bar), area, h('div.swipe-actions', pass, cheers));

    let idx = -1;
    let cardEl = null;
    const used = () => Object.values(ctx.client.state.mine.swipes).filter(Boolean).length;
    const renderGlasses = () => {
      const left = p.glasses - used();
      glasses.replaceChildren(...Array.from({ length: p.glasses }, (_, i) => h('span', { html: i < left ? ICONS.glassFull : ICONS.glass })));
    };
    function decide(yes) {
      const card = deck[idx];
      if (!card || own.has(card.id) || ctx.client.state.mine.swipes[card.id] !== undefined) return;
      if (yes && used() >= p.glasses) { ctx.toast('Out of glasses.'); return; }
      ctx.client.swipe(card.id, yes);
      ctx.audio.sfx('swipe', { dir: yes ? 'right' : 'left' });
      if (yes) ctx.audio.sfx('clink', { step: used() });
      ctx.haptic('select');
      cardEl?.classList.add(yes ? 'gone-right' : 'gone-left');
      renderGlasses();
    }
    function showCard(i) {
      idx = i;
      dots.forEach((d, k) => { d.className = k < i ? 'past' : k === i ? 'now' : ''; });
      const card = deck[i];
      if (!card) { area.replaceChildren(h('div.t-body.t-muted', 'That\'s the lot.')); return; }
      const mine = own.has(card.id);
      cardEl = h(`div.place-card.swipe-card${mine ? '.yours' : ''}`, h('div.t-answer', card.text), mine ? h('div.t-eyebrow', 'Yours, skip') : null);
      area.replaceChildren(cardEl);
      const out = used() >= p.glasses;
      cheers.disabled = mine || out;
      pass.disabled = mine;
      cheers.textContent = out ? 'Out of glasses' : 'Cheers';
      if (!mine) attachDrag(cardEl);
    }
    function attachDrag(el) {
      let x0 = null;
      el.addEventListener('pointerdown', (e) => { x0 = e.clientX; el.setPointerCapture(e.pointerId); el.style.transition = 'none'; });
      el.addEventListener('pointermove', (e) => { if (x0 === null) return; const dx = e.clientX - x0; el.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`; });
      const end = (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0;
        x0 = null;
        el.style.transition = '';
        el.style.transform = '';
        if (dx > 70 && !cheers.disabled) decide(true);
        else if (dx < -70) decide(false);
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }
    renderGlasses();
    const cancel = sayLater(ctx, ctx.line('r3Swipe'), { delay: 200, hold: 1800 });
    const frame = (c) => {
      const e = c.elapsed();
      const i = Math.min(deck.length, Math.floor(e / p.perCard));
      if (i !== idx) showCard(i);
      bar.style.width = `${Math.min(100, ((e % p.perCard) / p.perCard) * 100)}%`;
    };
    frame(ctx);
    return { frame, update: renderGlasses, unmount: cancel };
  },
};
