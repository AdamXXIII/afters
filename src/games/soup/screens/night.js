// Something in the Soup: night (the same dark screen on every living phone) and morning.
// The night screen never reads ctx.priv: what you see, and what your neighbour sees, are identical.
import { h, onTap } from '../../../ui/components.js';
import { header, say, nameOf, disc, isGhost, ghostRibbon, nameBtn, MOON, SHIELD, WISP } from './kit.js';

const night = {
  id: 'soup-night',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    document.body.classList.add('sp-night');
    const hd = header(ctx, { title: 'Night', line: 'Everyone taps a name. Only the Poisoners’ taps count.', tone: 'dark', pot: false });
    show.append(h('div.sp-nightsky', h('span.sp-moon', { html: MOON }), Array.from({ length: 14 }, (_, i) => h('i.sp-star', { style: { '--i': i, top: `${46 + ((i * 37) % 41)}%` } }))), h('div.sp-top', hd));
    let btns = [];
    let body;
    const note = h('div.sp-hint.dark');
    if (isGhost(ctx)) {
      body = h('div.sp-sheet.sp-in.sp-nightsheet', ghostRibbon(ctx), h('div.sp-ghost-b', 'The dead don’t sleep. Watch the living tap. Somebody is choosing.'));
    } else {
      btns = p.alive.filter((id) => id !== ctx.meId).map((id) => {
        const b = nameBtn(ctx, id, { e2e: `sp-night-${id}`, dark: true });
        onTap(b, () => {
          if (ctx.mine.game.night) return;
          ctx.client.act('sp-night', { to: id }, { night: id });
          ctx.haptic('submit');
        }, { sound: 'select', buzz: null });
        return b;
      });
      body = h('div.sp-sheet.sp-in.sp-nightsheet', h('div.sp-ask.dark', 'Tap a name'), h('div.sp-picks', btns), note);
    }
    sheet.append(body);
    const cancel = say(ctx, ctx.line('spNight'), {}, 600);
    ctx.cyril.react('sad', { duration: ctx.frozen ? 60000 : 1200 });
    const update = (c) => {
      const mine = c.mine.game.night;
      for (const b of btns) { b.setAttribute('aria-pressed', String(b.dataset.id === mine)); b.disabled = !!mine && b.dataset.id !== mine; }
      note.textContent = mine ? 'Done. Eyes down. Phone face down.' : 'Every phone looks like this. Nobody can tell.';
    };
    update(ctx);
    return {
      update,
      frame(c) { hd.timer.set(c.remaining(), c.duration); },
      unmount() { cancel(); document.body.classList.remove('sp-night'); },
    };
  },
};

const morning = {
  id: 'soup-morning',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const parts = [h('div.sp-morning-t', 'Morning')];
    if (p.victim) {
      const me = p.victim === ctx.meId;
      parts.push(
        h('div.sp-vd-av.dead', disc(ctx, p.victim, { size: 104 }), h('div.sp-stamp.green', 'Poisoned')),
        h('div.sp-vd-nm', nameOf(ctx, p.victim)),
        h('div.sp-morning-l', (p.line || '{name} was poisoned in the night.').replaceAll('{name}', nameOf(ctx, p.victim))),
        me ? h('div.sp-morning-me', h('span', { html: WISP }), 'That’s you. You’re a ghost now: watch, don’t talk.') : null);
    } else if (p.saved) {
      parts.push(h('div.sp-saved', h('span', { html: SHIELD })), h('div.sp-vd-nm', 'Nobody died'), h('div.sp-morning-l', 'A Shield took the poison. Someone at this table is very lucky, and someone else is furious.'));
    }
    if (p.hunch) parts.push(h('div.sp-hunch', 'Last night, ', h('b', `${p.hunch.n} of you`), ' lay awake thinking about ', disc(ctx, p.hunch.id, { size: 20 }), h('b', `${nameOf(ctx, p.hunch.id)}.`)));
    const card = h('div.sp-card.sp-morning', parts.filter(Boolean));
    show.append(h('div.sp-dawn'), h('div.sp-cardwrap', card));
    if (!ctx.frozen) {
      card.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 500, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      setTimeout(() => { ctx.audio.sfx(p.victim ? 'stamp' : 'truth'); ctx.cyril.react(p.victim ? 'sad' : 'delight'); if (p.victim === ctx.meId) ctx.haptic('fooled'); }, 1300);
    }
    const cancel = p.saved ? say(ctx, ctx.line('spSaved'), { hold: 3200 }, 2600) : say(ctx, ctx.line('spMorning'), { hold: 1800 }, 300);
    return { unmount: cancel };
  },
};

export default [night, morning];
