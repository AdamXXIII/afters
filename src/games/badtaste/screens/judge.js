// badtaste-judge: the Critic turns the cards over one at a time and reads each out. Every phone
// follows: the card being read is the hero (big, in the sheet) and fills the blank on the prompt;
// a numbered strip shows which are still face down. Once all are turned, the sheet becomes a
// list: the Critic taps one, then presses Crown. Players' own card is marked only for them.
import { h, onTap, button } from '../../../ui/components.js';
import { promptCard, cardBack, sayLater, nameOf } from './kit.js';
import { cap, fillText } from '../content/index.js';

const CROWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5l4.3 3.6L12 5l4.2 7.1 4.3-3.6-1.7 9.5H5.2z" fill="currentColor"/><rect x="5.2" y="19.2" width="13.6" height="2.3" rx="1" fill="currentColor"/></svg>';

export default {
  id: 'badtaste-judge',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const seed = ctx.phase?.seed || 1;
    const n = p.cards.length;
    const isCritic = p.critic === ctx.meId;
    const ownSet = new Set([].concat(ctx.priv?.own ?? []).filter((k) => k >= 0));
    const isOwn = (i) => ownSet.has(i);
    const critic = nameOf(ctx, p.critic);
    // the prompt shows once: the hero below carries the whole line; up top just who, which round, the clock
    const pc = promptCard(ctx, p, { body: false });
    show.append(h('div.bt-top', pc));

    // reading view: hero card + strip of numbered tabs
    const heroText = h('span.bt-hero-t');
    const heroNum = h('span.bt-hero-n');
    const heroYours = h('span.bt-yours', 'Yours');
    const hero = h('div.bt-hero', heroNum, heroText, heroYours, h('span.bt-card-mark'));
    const heroBack = cardBack({ cls: '.herob', seed, key: 'hero' });
    const tabs = p.cards.map((c, i) => {
      const t = h(`button.bt-tab${isOwn(i) ? '.own' : ''}`, { type: 'button', 'data-e2e': `bt-tab-${i}`, 'aria-label': `Card ${i + 1}` }, String(i + 1));
      if (isCritic) onTap(t, () => tap(i), { sound: 'select', buzz: 'select' }); else t.tabIndex = -1;
      return t;
    });
    const reading = h(`div.bt-reading${isCritic ? '' : '.watch'}`, h('div.bt-herowrap', heroBack, hero), h('div.bt-tabs', tabs));

    // choosing view: every card as a row
    const rows = p.cards.map((c, i) => {
      const r = h(`button.bt-pick${isOwn(i) ? '.own' : ''}`, { type: 'button', 'aria-pressed': 'false', 'data-e2e': `bt-pick-${i}`, style: { '--i': i } },
        h('span.bt-pick-n', String(i + 1)),
        h('span.bt-pick-t'),
        isOwn(i) ? h('span.bt-yours', 'Yours') : h('span.bt-pick-tick', { html: CROWN }));
      if (isCritic) onTap(r, () => tap(i), { sound: 'select', buzz: 'select' }); else r.tabIndex = -1;
      return r;
    });
    const choosing = h(`div.bt-picklist.n${n}`, rows);

    const title = h('div.bt-title');
    const sub = h('div.bt-sub');
    const btn = isCritic ? button('Turn card 1', { onClick: () => primary(), e2e: 'bt-primary' }) : null;
    const hint = h('div.bt-hint');
    const page = h(`div.bt-sheet.bt-judgesheet${isCritic ? '.critic' : ''}`,
      h('div.bt-sheethead', title, sub), reading, choosing,
      isCritic ? h('div.bt-actions', btn) : hint);
    sheet.append(page);

    function tap(i) {
      const pr = ctx.progress;
      if (pr.crowned != null) return;
      if (i >= (pr.flipped ?? 0)) ctx.client.act('bt-flip', {}, {});
      else ctx.client.act('bt-focus', { index: i }, {});
    }
    function primary() {
      const pr = ctx.progress;
      if ((pr.flipped ?? 0) < n) ctx.client.act('bt-flip', {}, {});
      else if (pr.focus >= 0 && pr.crowned == null) ctx.client.act('bt-crown', { index: pr.focus }, { crowned: pr.focus });
    }

    let lastFocus = null;
    let lastFlip = null;
    let lastAll = null;
    const sync = (c) => {
      const pr = c.progress || {};
      const flipped = pr.flipped ?? 0;
      const focus = pr.focus ?? -1;
      const all = flipped >= n;
      const texts = pr.texts || [];
      rows.forEach((r, i) => {
        const t = texts[i] || '';
        const el = r.querySelector('.bt-pick-t');
        if (el.textContent !== cap(t)) { el.textContent = cap(t); el.classList.toggle('long', t.length > 34); }
      });
      page.classList.toggle('choosing', all);
      tabs.forEach((t, i) => { t.classList.toggle('up', i < flipped); t.classList.toggle('focus', i === focus);  });
      rows.forEach((r, i) => r.setAttribute('aria-pressed', String(all && i === focus)));
      if (focus !== lastFocus || flipped !== lastFlip || (focus >= 0 && !heroText.textContent)) {
        const turned = focus >= 0;
        hero.classList.add('on');
        heroBack.classList.remove('on');
        hero.classList.toggle('blank', !turned);
        if (!turned) {
          const f = fillText(p.prompt, '');
          heroText.replaceChildren(f.before, h('span.bt-hero-gap', '\u2003\u2003\u2003\u2003'), f.after);
          heroNum.textContent = `${n} cards face down`;
          heroYours.style.display = 'none';
          heroText.classList.toggle('long', p.prompt.length > 80);
        }
        if (turned) {
          const t = texts[focus] || '';
          const f = fillText(p.prompt, t);
          heroText.replaceChildren(f.before, h('span.bt-hero-a', f.answer), f.after);
          const len = p.prompt.length + t.length;
          heroText.classList.toggle('long', len > 80);
          heroText.classList.toggle('xlong', len > 105);
          heroNum.textContent = `Card ${focus + 1} of ${n}`;
          heroYours.style.display = isOwn(focus) ? '' : 'none';
          if (!c.frozen && lastFocus !== null) hero.animate([{ transform: 'rotateY(80deg) scale(.96)', opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        }
        lastFocus = focus; lastFlip = flipped;
      }
      if (all !== lastAll) {
        if (all && lastAll === false && !c.frozen && isCritic) ctx.say(ctx.line('btChoose'), { hold: 2200, placement: 'side' });
        lastAll = all;
      }
      if (isCritic) {
        title.textContent = all ? (p.duo ? 'Which is funnier?' : 'Pick the winner') : flipped ? 'Read it out loud' : 'Turn the first card';
        sub.textContent = all ? (p.duo ? `One is ${nameOf(ctx, ctx.players.find((x) => x.id !== p.critic)?.id)}’s, one is Cyril’s. Tap the funnier, then Crown.` : 'Tap the one you liked best, then press Crown.') : flipped ? 'Read the line out to the table. Then turn the next.' : 'Then read the line out to the table.';
        btn.disabled = all && focus < 0;
        btn.innerHTML = all ? `${CROWN}<span>Crown card ${focus + 1}</span>` : `<span>Turn card ${flipped + 1} of ${n}</span>`;
        btn.classList.toggle('crown', all);
      } else {
        title.textContent = all ? `${critic} is picking` : `${critic} is reading`;
        sub.textContent = ownSet.size ? 'Keep a straight face. Yours is in there.' : 'Listen. They pick one.';
        hint.textContent = all ? '' : `${n - flipped} still face down`;
      }
    };
    sync(ctx);
    const cancel = sayLater(ctx, ctx.line(isCritic ? 'btJudge' : 'btWatch', { name: critic }), { delay: 600 });
    return { update: sync, frame(c) { pc.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};
