// r3-swipe: synced deck, perCard ms each, auto-advance. Swipe right / Cheers spends one of your
// five glasses; left / Pass. Your own cards show "yours, skip". Show layer: the prompt on a menu
// slip with a segmented deck-progress rail, and Cyril (shared, no herd voting).
import './r3.css';
import { h, button } from '../ui/components.js';
import { glassSvg, clinkSvg, passSvg, sayIfFresh } from './r3-art.js';

const HINTS = ['Dry. Pass the rest.', 'Last one. Make it count.', 'Two left. Be choosy.', 'Three left. Steady.', 'Four left. Easy now.', 'Spend them wisely.'];

export default {
  id: 'r3-swipe',
  layout: 'split',
  shot: 'r3-swipe',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const deck = p.deck;
    const own = new Set(ctx.priv.ownCardIds || []);

    // ---------- show layer ----------
    const counter = h('span.r3s-count');
    const pips = deck.map(() => h('i'));
    const rail = h('div.r3s-rail', pips);
    const slip = h('div.r3s-slip',
      h('div.r3s-slip-top', h('span.r3s-eyebrow', 'Last orders'), counter),
      h(`div.r3s-slip-t${p.prompt.length > 48 ? '.long' : ''}`, p.prompt),
      rail);
    show.append(slip);

    // ---------- sheet ----------
    const glassEls = Array.from({ length: p.glasses }, () => h('span.r3s-glass'));
    const left = h('span.r3s-left');
    const tray = h('div.r3s-tray', h('div.r3s-tray-g', glassEls), left);
    const hintEl = h('span.r3s-hint');
    const head = h('div.r3s-head', h('div.r3s-head-l', h('span.r3s-q', 'Raise a glass?'), hintEl), tray);

    const area = h('div.r3s-area');
    const fuse = h('i');
    const pass = button('', { kind: 'secondary', onClick: () => decide(false), e2e: 'pass' });
    pass.classList.add('r3s-btn');
    pass.append(h('span.r3s-bi', { html: passSvg() }), h('span', 'Pass'));
    const cheersLabel = h('span', 'Cheers');
    const cheers = button('', { onClick: () => decide(true), e2e: 'cheers' });
    cheers.classList.add('r3s-btn', 'r3s-cheers');
    cheers.append(h('span.r3s-bi', { html: clinkSvg() }), cheersLabel);
    sheet.append(head, area, h('div.r3s-actions', pass, cheers));

    let idx = -1;
    let cardEl = null;
    let lastLeft = null;
    const used = () => Object.values(ctx.client.state.mine.swipes).filter(Boolean).length;
    const renderGlasses = (pop = false) => {
      const remaining = p.glasses - used();
      glassEls.forEach((g, i) => {
        const full = i < remaining;
        if (g.dataset.full !== String(full)) {
          g.innerHTML = glassSvg(full ? 1 : 0);
          g.dataset.full = String(full);
          if (!full && pop) { g.classList.remove('drain'); void g.offsetWidth; g.classList.add('drain'); }
        }
      });
      left.textContent = remaining === 1 ? '1 left' : `${remaining} left`;
      hintEl.textContent = HINTS[Math.max(0, Math.min(HINTS.length - 1, remaining))];
      tray.classList.toggle('empty', remaining <= 0);
      if (lastLeft !== null && remaining !== lastLeft) refreshButtons();
      lastLeft = remaining;
    };
    function refreshButtons() {
      const card = deck[idx];
      const mine = card && own.has(card.id);
      const decided = card && ctx.client.state.mine.swipes[card.id] !== undefined;
      const out = used() >= p.glasses;
      cheers.disabled = !card || mine || out || decided;
      pass.disabled = !card || mine || decided;
      cheersLabel.textContent = out ? 'Out of glasses' : 'Cheers';
      cardEl?.classList.toggle('dry', out && !mine && !decided);
    }
    const said = new Set();
    const quip = (key, text) => { if (said.has(key) || ctx.frozen) return; said.add(key); ctx.say(text, { compact: true, hold: 1200, placement: 'side' }); };
    function decide(yes) {
      const card = deck[idx];
      if (!card || own.has(card.id) || ctx.client.state.mine.swipes[card.id] !== undefined) return;
      if (yes && used() >= p.glasses) { ctx.toast('Out of glasses. Pass, or sulk.'); ctx.haptic('error'); return; }
      ctx.client.swipe(card.id, yes);
      ctx.audio.sfx('swipe', { dir: yes ? 'right' : 'left' });
      if (yes) ctx.audio.sfx('clink', { step: used() });
      ctx.haptic(yes ? 'submit' : 'select');
      const el = cardEl;
      if (el) {
        el.style.transition = '';
        el.style.transform = '';
        el.classList.add(yes ? 'gone-right' : 'gone-left');
        setTimeout(() => el.remove(), 420);
      }
      area.querySelector('.r3s-after')?.remove();
      area.append(afterNote(yes));
      renderGlasses(true);
      refreshButtons();
      if (yes && used() >= p.glasses) quip('dry', 'That\'s your last glass. Choose wisely? Too late.');
      else quip(yes ? 'yes' : 'no', yes ? 'Bold choice.' : 'Ruthless.');
      if (yes) ctx.cyril.react('smug');
    }
    function afterNote(yes) {
      return h(`div.r3s-after${yes ? '.yes' : ''}`,
        h('span.r3s-after-i', { html: yes ? clinkSvg() : passSvg() }),
        h('span.r3s-after-t', yes ? 'Glass raised' : 'Passed'),
        h('span.r3s-after-s', 'Next card on its way'));
    }
    function showCard(i) {
      idx = i;
      pips.forEach((d, k) => { d.className = k < i ? 'past' : k === i ? 'now' : ''; });
      counter.textContent = i < deck.length ? `Card ${i + 1} of ${deck.length}` : `${deck.length} of ${deck.length}`;
      const card = deck[i];
      if (!card) {
        area.replaceChildren(h('div.r3s-end', h('span.r3s-end-t', 'That\'s the lot.'), h('span.r3s-end-s', 'Cyril is counting the glasses…')));
        cardEl = null;
        refreshButtons();
        return;
      }
      const mine = own.has(card.id);
      const decided = ctx.client.state.mine.swipes[card.id];
      fuse.style.width = '100%';
      cardEl = h(`div.r3s-card${mine ? '.yours' : ''}`, { style: { '--tilt': `${((i * 53) % 5) - 2}deg` } },
        mine ? h('div.r3s-card-top', h('span.r3s-yours', 'Yours')) : null,
        h(`div.r3s-text${card.text.length > 28 ? '.long' : ''}`, card.text),
        mine ? h('div.r3s-skip', 'Modesty, please. Skipping this one.') : null,
        h('div.r3s-fuse', fuse),
        mine ? null : h('div.r3s-sides', h('span', '‹ pass'), h('span', 'cheers ›')),
        h('span.r3s-stamp.yes', 'Cheers!'),
        h('span.r3s-stamp.no', 'Pass'),
      );
      const ghosts = [h('div.r3s-ghost.g2'), h('div.r3s-ghost.g1')];
      area.replaceChildren(...(i < deck.length - 1 ? ghosts : ghosts.slice(1)), cardEl);
      if (mine) quip('mine', 'Yours. I\'ll look away.');
      if (decided !== undefined) {
        cardEl.remove();
        area.append(afterNote(decided));
      } else if (!mine) {
        attachDrag(cardEl);
        if (!ctx.frozen && !ctx.reduced) cardEl.classList.add('deal');
      }
      refreshButtons();
    }
    function attachDrag(el) {
      let x0 = null;
      const yes = el.querySelector('.r3s-stamp.yes');
      const no = el.querySelector('.r3s-stamp.no');
      el.addEventListener('pointerdown', (e) => { x0 = e.clientX; el.setPointerCapture(e.pointerId); el.style.transition = 'none'; el.classList.remove('deal'); });
      el.addEventListener('pointermove', (e) => {
        if (x0 === null) return;
        let dx = e.clientX - x0;
        if (dx > 0 && cheers.disabled) dx *= 0.25; // out of glasses: rubber-band
        el.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
        yes.style.opacity = String(Math.max(0, Math.min(1, dx / 90)));
        no.style.opacity = String(Math.max(0, Math.min(1, -dx / 90)));
      });
      const end = (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0;
        x0 = null;
        el.style.transition = '';
        el.style.transform = '';
        yes.style.opacity = '';
        no.style.opacity = '';
        if (dx > 70 && !cheers.disabled) decide(true);
        else if (dx > 70) { ctx.toast('Out of glasses. Pass, or sulk.'); ctx.haptic('error'); }
        else if (dx < -70) decide(false);
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }
    renderGlasses();
    const cancel = sayIfFresh(ctx, ctx.line('r3Swipe'), { at: 200, window: 1200, hold: 1600, placement: 'side' });
    const frame = (c) => {
      const e = c.elapsed();
      const i = Math.min(deck.length, Math.floor(e / p.perCard));
      if (i !== idx) showCard(i);
      const k = Math.min(1, (e % p.perCard) / p.perCard);
      fuse.style.width = `${(1 - k) * 100}%`;
      cardEl?.classList.toggle('hurry', k > 0.7);
    };
    frame(ctx);
    return { frame, update: () => renderGlasses(), unmount: cancel };
  },
};
