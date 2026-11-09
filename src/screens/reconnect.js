// reconnect (overlay): this phone has lost the table. The stage dims behind a menu-card panel with a
// little candle keeping a "Reserved" place card warm, a seat-held countdown (90 s, the engine's
// reconnect window), one primary retry and a quiet way out.
import './overlays.css';
import './reconnect.css';
import { h, button } from '../ui/components.js';
import { AVATARS } from '../game/constants.js';

const HOLD_MS = 90000;

function candleSvg() {
  return `<svg viewBox="0 0 64 96" aria-hidden="true">
    <defs>
      <radialGradient id="rcGlow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFC86B" stop-opacity=".7"/><stop offset="1" stop-color="#FFC86B" stop-opacity="0"/></radialGradient>
      <linearGradient id="rcWax" x1="0" x2="1"><stop offset="0" stop-color="#E9D7B8"/><stop offset=".45" stop-color="#FBF1DE"/><stop offset="1" stop-color="#DCC6A2"/></linearGradient>
      <linearGradient id="rcBrass" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E9C779"/><stop offset="1" stop-color="#A87C2A"/></linearGradient>
    </defs>
    <circle class="rc-glow" cx="32" cy="20" r="22" fill="url(#rcGlow)"/>
    <path class="rc-flame" d="M32 6c3 6 7 9 7 15a7 7 0 0 1-14 0c0-5 4-8 7-15z" fill="#FFC86B"/>
    <path class="rc-flame-core" d="M32 15c1.5 3 3 4.5 3 7a3 3 0 0 1-6 0c0-2.5 1.5-4 3-7z" fill="#FFF4D6"/>
    <path d="M32 27v6" stroke="#2B1D18" stroke-width="2" stroke-linecap="round"/>
    <path d="M17 34q15-4 30 0v42H17z" fill="url(#rcWax)"/>
    <path d="M22 34v9a2.5 2.5 0 0 0 5 0v-9M38 34v14a2.5 2.5 0 0 0 5 0V34" fill="#FBF1DE"/>
    <g class="rc-eyes"><ellipse cx="27" cy="52" rx="2.6" ry="3" fill="#2A1A17"/><ellipse cx="37" cy="52" rx="2.6" ry="3" fill="#2A1A17"/></g>
    <path d="M24 46.5l5-1.2M40 46.5l-5-1.2" stroke="#7A4A2A" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M29 60q3 2 6 0" stroke="#7A1E2C" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M26 66l6 3 6-3-6 3z M26 66v6l6-3zM38 66v6l-6-3z" fill="#7A1E2C"/>
    <ellipse cx="32" cy="80" rx="22" ry="5" fill="url(#rcBrass)"/>
    <rect x="10" y="76" width="44" height="6" rx="3" fill="url(#rcBrass)"/>
  </svg>`;
}

export default {
  id: 'reconnect',
  overlay: true,
  mount({ overlay }, ctx) {
    const me = ctx.me || ctx.players?.find?.((p) => p.id === ctx.meId);
    const colour = AVATARS[me?.avatar]?.colour || '#7A1E2C';
    const started = Date.now();
    const elapsed = () => (ctx.frozen ? 14000 : Date.now() - started);
    // Cyril's bubble belongs to the game behind us; keep it from floating over the panel.
    const bubbles = document.getElementById('bubbles');
    if (bubbles) bubbles.style.visibility = 'hidden';

    const eyebrow = h('div.rc-eyebrow', h('span.rc-dot'), h('span.rc-eyebrow-txt', 'Connection lost'));
    const title = h('h2.rc-title', 'Hold that thought.');
    const body = h('p.rc-body');
    const clock = h('span.rc-clock');
    const bar = h('div.rc-bar', h('i'));
    const held = h('div.rc-held', h('span.rc-held-k', 'Seat held for'), clock);
    const retry = button('Try again now', { onClick: () => { retry.setLoading(true); ctx.client?.retry(); setTimeout(() => retry.setLoading(false), 1600); }, e2e: 'retry' });
    const leave = button('Leave the table', { kind: 'ghost', onClick: () => { ctx.actions.closeOverlay(); ctx.actions.leave(); } });
    const art = h('div.rc-art',
      h('div.rc-candle', { html: candleSvg() }),
      h('div.rc-card', { style: { '--pc': colour } }, h('span.rc-card-k', 'Reserved'), h('span.rc-card-v', me?.name || 'You')),
    );
    const quote = h('p.rc-quote', '“I’ve kept your seat warm. Literally.”', h('span', '— Cyril'));
    const box = h('div.rc-box', { role: 'alertdialog', 'aria-live': 'assertive', 'aria-labelledby': 'rc-title' },
      art, eyebrow, title, body, h('div.rc-hold', held, bar), quote, h('div.rc-actions', retry, leave));
    title.id = 'rc-title';
    overlay.append(h('div.dim.rc-dim', box));

    let lastState = '';
    const paint = (c) => {
      const st = c.client?.state.status;
      const lost = st === 'lost';
      const left = Math.max(0, HOLD_MS - elapsed());
      const s = Math.ceil(left / 1000);
      clock.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      bar.firstChild.style.transform = `scaleX(${(left / HOLD_MS).toFixed(4)})`;
      bar.classList.toggle('hurry', s <= 20);
      const key = `${lost}`;
      if (key === lastState) return;
      lastState = key;
      box.classList.toggle('lost', lost);
      eyebrow.querySelector('.rc-eyebrow-txt').textContent = lost ? 'Couldn’t find the table' : 'Connection lost';
      title.textContent = lost ? 'The table’s gone quiet.' : 'Hold that thought.';
      body.textContent = lost
        ? 'Check your Wi-Fi or signal, then try again. If the host has left, the table may have closed.'
        : 'Finding the table again. Your seat and your score are safe.';
      retry.textContent = lost ? 'Try again' : 'Try again now';
    };
    paint(ctx);
    const tick = setInterval(() => paint(ctx), 250);
    return { update: (c) => paint(c), unmount: () => { clearInterval(tick); if (bubbles) bubbles.style.visibility = ''; } };
  },
};
