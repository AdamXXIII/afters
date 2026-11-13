// Something in the Soup: the intro card and the private role reveal (press and hold the place card).
import { h, onTap } from '../../../ui/components.js';
import { header, seats, say, tureen, nameOf, VIAL, SPOON, MOON, SHIELD } from './kit.js';

function skipBtn(ctx, show) {
  if (!ctx.isHost) return null;
  const b = h('button.sp-skip', { type: 'button', 'data-e2e': 'skip' }, 'Skip');
  onTap(b, () => ctx.client.skip());
  show.append(b);
  return (c) => b.classList.toggle('on', c.elapsed() > 1500 / (c.phase?.speed || 1));
}

const intro = {
  id: 'soup-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const pot = tureen({ size: 128, label: 'Tonight’s pot' });
    pot.set(0);
    const row = (icon, text) => h('li', h('span.ic', { html: icon }), h('span', text));
    const card = h('div.sp-card.sp-intro',
      h('div.sp-intro-t', 'Something', h('br'), h('i', 'in the'), ' Soup'),
      pot,
      h('ul.sp-how',
        row(VIAL, p.poisoners > 1 ? 'Two of you are secretly Poisoners.' : 'One of you is secretly a Poisoner.'),
        row(SPOON, 'By day, grow the pot, argue, and vote someone out.'),
        row(MOON, 'By night, the Poisoners strike. Survive to share the pot.')),
      h('div.sp-intro-foot', `${p.n} at the table · ${p.poisoners} Poisoner${p.poisoners > 1 ? 's' : ''} · about 10 minutes`));
    show.append(h('div.sp-dim'), h('div.sp-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(30px) rotate(-2deg) scale(.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    const sk = skipBtn(ctx, show);
    const cancel = say(ctx, ctx.line(p.plays > 1 ? 'spIntroAgain' : 'spIntro'), { hold: 3200 }, 900);
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1400 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

/** The place card: willow-pattern back; press and hold to see your role. */
export function roleCard(ctx, { open = false } = {}) {
  const pr = ctx.priv || {};
  const pois = pr.role === 'poisoner';
  const partners = (pr.partners || []).map((id) => nameOf(ctx, id));
  const face = pois
    ? h('div.sp-face.pois',
      h('span.sp-face-ic', { html: VIAL }),
      h('div.sp-face-t', 'Poisoner'),
      h('div.sp-face-b', partners.length ? ['Your partner is ', h('b', partners.join(' & ')), '. Never look at them.'] : 'You work alone. Blend in.'),
      h('div.sp-face-s', 'Each night, the name you tap is poisoned.'))
    : h('div.sp-face.faith',
      h('span.sp-face-ic', { html: SPOON }),
      h('div.sp-face-t', 'Faithful'),
      h('div.sp-face-b', 'Grow the pot. Find the Poisoners. Banish them.'),
      h('div.sp-face-s', 'At night, the name you tap is only a hunch.'));
  if (pr.shield) face.append(h('div.sp-face-shield', h('span', { html: SHIELD }), 'You hold a Shield'));
  const back = h('div.sp-back', h('div.sp-back-in', h('span.sp-back-ic', { html: '<svg viewBox="0 0 48 48"><path d="M12 30c0-10 5-18 12-18s12 8 12 18" fill="none" stroke="#FBF4EA" stroke-width="3"/><path d="M8 30h32" stroke="#FBF4EA" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="10" r="2.6" fill="#FBF4EA"/></svg>' }), h('div.sp-back-t', 'Press and hold'), h('div.sp-back-s', 'to read your card')));
  const card = h('div.sp-role', { 'data-e2e': 'sp-role', role: 'button', tabindex: '0', 'aria-label': 'Press and hold to read your card' }, h('div.sp-role-in', back, face));
  let peeked = false;
  const set = (on) => {
    card.classList.toggle('open', on);
    if (on && !peeked) { peeked = true; card.dispatchEvent(new CustomEvent('peek')); }
    if (on) ctx.haptic(pois ? 'fooled' : 'select');
  };
  card.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) card.addEventListener(ev, () => set(false));
  card.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') set(true); });
  card.addEventListener('keyup', () => set(false));
  card.addEventListener('contextmenu', (e) => e.preventDefault());
  if (open) card.classList.add('open');
  return card;
}

const roles = {
  id: 'soup-roles',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const hd = header(ctx, { title: 'Your place card', line: 'Keep your screen to yourself.', pot: false });
    const st = seats(ctx, { size: 28, done: (c, id) => c.progress.done[id] });
    show.append(h('div.sp-top', hd, st));
    const card = roleCard(ctx, { open: ctx.frozen });
    const ok = h('button.btn.block.sp-ok', { type: 'button', 'data-e2e': 'sp-seen', disabled: true }, 'Got it. Face on.');
    const hint = h('div.sp-hint', 'Hold the card to read it. Let go to hide it.');
    card.addEventListener('peek', () => { ok.disabled = !!ctx.mine.game.seen; });
    onTap(ok, () => { ctx.client.act('sp-seen', {}, { seen: true }); ctx.audio.sfx('plated'); ctx.haptic('submit'); });
    sheet.append(h('div.sp-sheet.sp-in', h('div.sp-rolewrap', card), hint, ok));
    const cancel = say(ctx, ctx.line('spRoles'), {}, 700);
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1400 });
    const update = (c) => {
      st.sync(c);
      if (c.mine.game.seen) { ok.disabled = true; ok.textContent = 'Seen. Look innocent.'; }
    };
    update(ctx);
    return { update, frame(c) { hd.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

export default [intro, roles];
