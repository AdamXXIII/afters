// Bad Taste shared bits: the prompt card (claret menu card with a brass blank you can preview
// your answer in), answer cards (linen, printed, identical for written and dealt cards so nobody
// can tell whose is whose), the card back, avatar discs, Cyril helpers.
import { h, onTap, timerRing } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { avatarIcon } from '../../../ui/icons.js';
import { fillText, cap } from '../content/index.js';

export const colourOf = (pl) => AVATARS[pl?.avatar]?.colour || '#7A4A2A';
export const nameOf = (ctx, id) => (id === 'house' ? 'Cyril' : ctx.player(id)?.name || 'Someone');

export function disc(player, { size = 30, cls = '' } = {}) {
  return h(`span.bt-av${cls}`, { style: { '--pc': colourOf(player), width: `${size}px`, height: `${size}px` }, title: player?.name || '', html: avatarIcon(player?.avatar ?? 0) });
}

/** Cyril's own disc (for the house card). */
export function cyrilDisc(size = 30) {
  return h('span.bt-av.cyril', { style: { width: `${size}px`, height: `${size}px` }, html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c1.6 2.3 3.4 3.7 3.4 6a3.4 3.4 0 0 1-6.8 0c0-2.3 1.8-3.7 3.4-6z" fill="#FFC86B"/><rect x="8.6" y="12.5" width="6.8" height="9" rx="1.6" fill="#FBF4EA"/></svg>' });
}

/** Avatar + name pill. */
export function tag(ctx, id, { cls = '' } = {}) {
  const me = id === ctx.meId;
  if (id === 'house') return h(`span.bt-tag.house${cls}`, cyrilDisc(26), h('span.nm', 'Cyril'));
  const pl = ctx.player(id);
  return h(`span.bt-tag${cls}${me ? '.you' : ''}`, { style: { '--pc': colourOf(pl) } }, disc(pl, { size: 26 }), h('span.nm', me ? 'You' : pl?.name || '?'));
}

/** Seeded -max..max (same on every phone). */
export function tilt(seed, key, max = 2) {
  let x = 2166136261 ^ (seed >>> 0);
  for (const ch of String(key)) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return (((x >>> 0) % 10000) / 10000 - 0.5) * 2 * max;
}

/** The brass critic's pen badge that sits on the Critic's avatar. */
const PEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.6L15.6 5a2.2 2.2 0 0 1 3.1 3.1L8.3 18.6z" fill="#FBF4EA" stroke="#2A1A17" stroke-width="1.4" stroke-linejoin="round"/><path d="M13.8 6.8l3.3 3.3" stroke="#2A1A17" stroke-width="1.4"/><path d="M4 20l1.2-4.6 3.1 3.2z" fill="#2A1A17"/></svg>';
export function criticBadge(player, { size = 44 } = {}) {
  return h('span.bt-critic', { style: { '--sz': `${size}px` } }, disc(player, { size }), h('span.bt-pen', { html: PEN }));
}

/**
 * The prompt card: claret, linen type, a brass blank. `answer` fills the blank (preview, focus,
 * winner); without one the blank is an empty line.
 */
export function promptCard(ctx, p, { answer = null, timer = true, size = '', head = true } = {}) {
  const critic = ctx.player(p.critic);
  const meCritic = p.critic === ctx.meId;
  const t = timer ? timerRing() : null;
  const text = h('div.bt-ptext');
  const card = h(`div.bt-prompt${size ? `.${size}` : ''}`,
    head ? h('div.bt-phead',
      criticBadge(critic, { size: 30 }),
      h('span.bt-pwho', meCritic ? 'You’re the Critic' : `Critic: ${critic?.name || '?'}`),
      h('span.bt-pround', p.decider ? 'Decider' : `${p.round}/${p.of}`),
      t) : null,
    text);
  card.timer = t;
  card.set = (a) => {
    const { before, answer: ans, after } = fillText(p.prompt, a || '');
    const slot = a ? h('span.bt-slot.full', ans) : h('span.bt-slot', { 'aria-label': 'blank' }, '    ');
    text.replaceChildren(before, slot, after);
    const len = (a ? ans.length : 8) + p.prompt.length;
    card.classList.toggle('long', len > 78);
    card.classList.toggle('xlong', len > 105);
    return slot;
  };
  card.set(answer);
  return card;
}

/** A printed answer card. */
export function answerCard(text, { cls = '', seed = 1, key = '', lean = 1.2 } = {}) {
  return h(`div.bt-card${cls}`, { style: { '--tilt': `${tilt(seed, key, lean)}deg` } },
    h(`span.bt-card-t${text.length > 30 ? '.long' : ''}`, cap(text)),
    h('span.bt-card-mark', { 'aria-hidden': 'true' }));
}

/** The back of a card: claret, a linen hairline frame and a brass flame. */
export function cardBack({ cls = '', seed = 1, key = '' } = {}) {
  return h(`div.bt-back${cls}`, { style: { '--tilt': `${tilt(seed, key, 2)}deg` }, html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c2 2.8 4.2 4.6 4.2 7.4a4.2 4.2 0 0 1-8.4 0C7.8 7.6 10 5.8 12 3z" fill="#C89B3C"/><path d="M12 9.2c.9 1.2 1.7 1.9 1.7 3a1.7 1.7 0 0 1-3.4 0c0-1.1.8-1.8 1.7-3z" fill="#FFC86B"/><path d="M9 17.5h6M10 20h4" stroke="#C89B3C" stroke-width="1.4" stroke-linecap="round"/></svg>' });
}

/** Fire Cyril's line once per mount. */
export function sayLater(ctx, lines, { delay = 500, ...o } = {}) {
  if (!lines) return () => {};
  const t = setTimeout(() => ctx.say(lines, { hold: 2600, placement: 'side', ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
}

export function skipBtn(ctx, show) {
  if (!ctx.isHost) return null;
  const b = h('button.bt-skip', { type: 'button', 'data-e2e': 'skip' }, 'Skip');
  onTap(b, () => ctx.client.skip());
  show.append(b);
  return (c) => b.classList.toggle('on', c.elapsed() > 2000 / (c.phase?.speed || 1));
}

/** Who's still choosing: discs that light up once each player has played. */
export function playedRow(ctx, ids) {
  const avs = new Map(ids.map((id) => [id, disc(ctx.player(id), { size: 30 })]));
  const lbl = h('span.bt-row-l');
  const el = h('div.bt-row', lbl, h('span.bt-row-avs', [...avs.values()]));
  el.sync = (c) => {
    let n = 0;
    for (const [id, d] of avs) { const on = !!c.progress.done?.[id]; d.classList.toggle('in', on); if (on) n++; }
    lbl.textContent = n === avs.size ? 'Everyone’s played' : `${n} of ${avs.size} played`;
  };
  el.sync(ctx);
  return el;
}
