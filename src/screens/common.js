// Small helpers shared by first-version screens. Screen owners may inline/replace these freely.
import './common.css';
import { h, roundCard, timerRing, leaderboard, button } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';

/** Fires callbacks once when ctx.elapsed() passes each time (ms). Works with frozen time too. */
export function timeline(steps) {
  const fired = new Set();
  return {
    run(ctx) {
      const t = ctx.elapsed();
      steps.forEach((s, i) => {
        if (!fired.has(i) && t >= s.at) {
          fired.add(i);
          try { s.fn(ctx, t - s.at); } catch (e) { console.error('[timeline]', e); }
        }
      });
    },
  };
}

/** Make the Cyril line play once per mount, after `delay` ms. */
export function sayLater(ctx, lines, { delay = 400, ...o } = {}) {
  const t = setTimeout(() => ctx.say(lines, o), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
}

export function promptCard(text, { eyebrow = null, round = 1 } = {}) {
  const cls = text.length > 70 ? '.t-prompt.long' : '.t-prompt';
  return h('div.card.prompt-card', { style: { '--round': `var(--round-${round})` } },
    eyebrow ? h('div.t-eyebrow', eyebrow) : null,
    h(`div${cls}`, text),
  );
}

/** Show-layer timer in the top-left of the visible region. */
export function showTimer(show) {
  const t = timerRing();
  show.append(h('div.show-timer', t));
  return t;
}

export function hostSkip(ctx, show) {
  if (!ctx.isHost) return null;
  const b = button('Skip', { kind: 'ghost', block: false, onClick: () => ctx.client.skip() });
  b.classList.add('on-dark');
  const wrap = h('div.skip-wrap', b);
  wrap.style.opacity = '0';
  show.append(wrap);
  return {
    frame(c) { wrap.style.opacity = c.elapsed() > 3000 / (c.phase?.speed || 1) ? '1' : '0'; },
  };
}

/** Round intro screen definition factory (r1-intro, r2-intro, r3-intro). */
export function introScreen({ id, round, eyebrow, title, rules, lineKey, bell = false }) {
  return {
    id,
    layout: 'show',
    shot: 'intro',
    mount({ show }, ctx) {
      const card = roundCard({ round, eyebrow, title, rules });
      const wrap = h('div.round-wrap', card);
      show.append(wrap);
      card.animate([{ transform: 'rotateY(90deg) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: ctx.frozen ? 1 : 750, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      if (bell) ctx.audio.sfx('bell');
      const skip = hostSkip(ctx, show);
      const cancel = sayLater(ctx, ctx.line(lineKey), { delay: 900, hold: 2400 });
      return { frame: (c) => skip?.frame(c), unmount: cancel };
    },
  };
}

/** Leaderboard screen factory (r1-scores, r2-scores). */
export function scoresScreen({ id, title, lineKey }) {
  return {
    id,
    layout: 'show',
    shot: 'scores',
    mount({ show }, ctx) {
      const rows = ctx.payload.rows || [];
      const board = leaderboard(rows, ctx.player, { animate: !ctx.frozen, delay: 700 });
      show.append(h('div.scores-wrap', h('div.t-eyebrow.on-dark', 'The standings'), h('h2.t-round.on-dark.scores-title', title), board));
      const cancel = sayLater(ctx, ctx.line(lineKey), { delay: 1800, hold: 2400, placement: 'side' });
      return { unmount: cancel };
    },
  };
}

/** Waiting card with a spin-the-plate fidget (r1-wait, r2-wait). */
export function waitCard(ctx, { title, waitingOn }) {
  const plate = h('button.fidget-plate', { type: 'button', 'aria-label': 'Spin the plate', html: plateSvg() });
  let spin = 0;
  plate.addEventListener('pointerdown', () => {
    spin += 360 + Math.random() * 360;
    plate.style.transform = `rotate(${spin}deg)`;
    ctx.haptic('tap');
    ctx.audio.sfx('tap');
  });
  const names = h('div.t-body.t-muted.waiting-on');
  const setNames = (list) => { names.textContent = list.length ? `Waiting on: ${list.join(', ')}` : 'Everyone\'s plated. Here we go.'; };
  setNames(waitingOn);
  const card = h('div.waiting-card', h('div.t-heading', title), names, plate, h('div.t-eyebrow', 'Tap the plate. Go on.'));
  card.setNames = setNames;
  return card;
}

export function waitingNames(ctx) {
  return ctx.players.filter((p) => !ctx.progress.done[p.id] && p.connected !== false).map((p) => p.name);
}

function plateSvg() {
  const dots = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return `<circle cx="${60 + Math.cos(a) * 48}" cy="${60 + Math.sin(a) * 48}" r="3.2" fill="#2F5D7C"/>`;
  }).join('');
  return `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="57" fill="#FBF7EF" stroke="#E6D3B8" stroke-width="2"/><circle cx="60" cy="60" r="54" fill="none" stroke="#2F5D7C" stroke-width="3"/>${dots}<circle cx="60" cy="60" r="38" fill="none" stroke="#2F5D7C" stroke-width="1.4"/><path d="M40 70c6-16 14-22 22-24-3 8-2 15 4 22M58 46c4-4 10-5 16-3M60 78h24" stroke="#2F5D7C" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`;
}

export function avatarToken(player, { house = false } = {}) {
  if (house) return h('span.token.house', { title: 'House vote', html: ICONS.flame });
  return h('span.token', { style: { '--pc': player?.colour || '#7A4A2A' }, title: player?.name || '' });
}

/** Seeded tilt for a card (same on every phone). */
export function tiltFor(seed, key, max = 3) {
  let h2 = 2166136261 ^ seed;
  for (const ch of String(key)) h2 = Math.imul(h2 ^ ch.charCodeAt(0), 16777619);
  return (((h2 >>> 0) % 1000) / 1000 * 2 - 1) * max;
}
