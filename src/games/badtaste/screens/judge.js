// badtaste-judge: the Critic turns the cards over one at a time and reads each out; every phone
// follows along (the card in focus fills the blank on the prompt). Once all are face up the
// Critic taps one and crowns it. Everyone else watches; their own card is marked only for them.
import { h, onTap, button } from '../../../ui/components.js';
import { promptCard, answerCard, cardBack, sayLater, nameOf } from './kit.js';

const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5l4.3 3.6L12 5l4.2 7.1 4.3-3.6-1.7 9.5H5.2z" fill="currentColor"/><rect x="5.2" y="19.2" width="13.6" height="2.3" rx="1" fill="currentColor"/></svg>';

export default {
  id: 'badtaste-judge',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const seed = ctx.phase?.seed || 1;
    const isCritic = p.critic === ctx.meId;
    const own = ctx.priv?.own ?? -1;
    const critic = nameOf(ctx, p.critic);
    const pc = promptCard(ctx, p);
    const counter = h('div.bt-turned');
    show.append(h('div.bt-top', pc, counter));

    const slots = p.cards.map((c, i) => {
      const face = answerCard(c.text, { cls: '.face', seed, key: c.id, lean: 0 });
      if (i === own) face.append(h('span.bt-yours', 'Yours'));
      const back = cardBack({ cls: '.flipback', seed, key: c.id });
      const el = h(`button.bt-slotcard${i === own ? '.own' : ''}`, { type: 'button', 'data-e2e': `bt-slot-${i}`, style: { '--i': i } },
        h('span.bt-flip', back, face), h('span.bt-num', String(i + 1)));
      if (isCritic) {
        onTap(el, () => {
          const pr = ctx.progress;
          const flipped = pr.flipped ?? 0;
          if (pr.crowned != null) return;
          if (i >= flipped) ctx.client.act('bt-flip', {}, {});
          else ctx.client.act('bt-focus', { index: i }, {});
        }, { sound: 'select', buzz: 'select' });
      } else el.tabIndex = -1;
      return el;
    });
    const grid = h(`div.bt-table.n${p.cards.length}`, slots);
    const btn = isCritic ? button('Turn the first card', { onClick: () => primary(), e2e: 'bt-primary' }) : null;
    const hint = h('div.bt-hint');
    const title = h('div.bt-title');
    const sub = h('div.bt-sub');
    sheet.append(h(`div.bt-sheet.bt-judgesheet${isCritic ? '.critic' : ''}`,
      h('div.bt-sheethead', title, sub),
      grid,
      isCritic ? h('div.bt-actions', btn) : hint));

    function primary() {
      const pr = ctx.progress;
      const flipped = pr.flipped ?? 0;
      if (flipped < p.cards.length) ctx.client.act('bt-flip', {}, {});
      else if (pr.focus >= 0 && pr.crowned == null) ctx.client.act('bt-crown', { index: pr.focus }, { crowned: pr.focus });
    }

    let lastFlip = -1;
    let lastFocus = null;
    const sync = (c) => {
      const pr = c.progress || {};
      const flipped = pr.flipped ?? 0;
      const focus = pr.focus ?? -1;
      const all = flipped >= p.cards.length;
      slots.forEach((el, i) => {
        const up = i < flipped;
        if (up && !el.classList.contains('up') && lastFlip >= 0 && !c.frozen) el.classList.add('turning');
        el.classList.toggle('up', up);
        el.classList.toggle('focus', i === focus);
        el.classList.toggle('next', isCritic && i === flipped && !all);
        el.setAttribute('aria-pressed', String(i === focus));
      });
      lastFlip = flipped;
      if (focus !== lastFocus) {
        lastFocus = focus;
        const slot = pc.set(focus >= 0 ? p.cards[focus].text : null);
        if (focus >= 0 && !c.frozen) slot.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
      counter.textContent = !flipped ? `${p.cards.length} cards, face down` : all ? `All ${p.cards.length} turned` : `Card ${focus + 1} of ${p.cards.length} · ${p.cards.length - flipped} face down`;
      if (isCritic) {
        title.textContent = all ? 'Crown your favourite' : 'Read them out loud';
        sub.textContent = all ? 'Tap one to read it again. No take-backs.' : 'Turn a card, then read the whole line to the table.';
        btn.disabled = all ? focus < 0 : false;
        btn.innerHTML = all ? `${CROWN}<span>Crown card ${focus + 1}</span>` : `<span>${flipped ? `Turn card ${flipped + 1}` : 'Turn the first card'}</span>`;
        btn.classList.toggle('crown', all);
        
      } else {
        title.textContent = `${critic} is reading`;
        sub.textContent = own >= 0 ? 'Keep a straight face. Yours is in there.' : 'Listen. They pick one.';
        hint.textContent = all ? `${critic} is choosing…` : '';
      }
    };
    sync(ctx);
    const cancel = sayLater(ctx, ctx.line(isCritic ? 'btJudge' : 'btWatch', { name: critic }), { delay: 600 });
    return { update: sync, frame(c) { pc.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};
