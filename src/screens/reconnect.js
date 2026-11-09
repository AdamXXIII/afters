// reconnect (overlay): this phone has lost the table. The stage dims behind a menu-card panel with a
// little candle keeping a "Reserved" place card warm, a seat-held countdown (90 s, the engine's
// reconnect window), one primary retry and a quiet way out.
import './overlays.css';
import './reconnect.css';
import { h, button, onTap } from '../ui/components.js';
import { AVATARS } from '../game/constants.js';
import { SHOTS } from '../stage/Stage.js';

// Close on the real 3D Cyril, framed in the top 40% above the panel.
SHOTS['rc-host'] ||= { pos: [0, 0.3, 1.05], target: [0, 0.17, 0] };

const HOLD_MS = 90000;

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
    // the gear and the game behind belong to the paused show; one clock on screen at a time
    const hideEls = ['topbar', 'strip', 'show', 'sheet', 'rail', 'fx'].map((id) => document.getElementById(id)).filter(Boolean);
    const st = ctx.stage;
    const prev = { shot: st?.shotName, layout: st?.layout };
    if (st) { st.setLayout('split', { instant: ctx.frozen }); st.setShot('rc-host', { duration: 900, instant: ctx.frozen }); }
    ctx.cyril?.setMood?.('hurry');
    // Cyril turns towards the empty, reserved seat (restored on unmount)
    const cyRot = ctx.cyril?.group?.rotation.y ?? 0;
    if (ctx.cyril?.group) ctx.cyril.group.rotation.y = 0.45;
    hideEls.forEach((el) => { el.style.visibility = 'hidden'; });
    document.body.classList.add('rc-paused');

    const eyebrow = h('div.rc-eyebrow', h('span.rc-dot'), h('span.rc-eyebrow-txt', 'Connection lost'));
    const title = h('h2.rc-title', 'Hold that thought.');
    const body = h('p.rc-body');
    const clock = h('span.rc-clock');
    const bar = h('div.rc-bar', h('i'), h('b.rc-wick', { html: '<svg viewBox="0 0 12 16"><path d="M6 1c1.6 3 4 4.6 4 8a4 4 0 0 1-8 0c0-3 2.4-5 4-8z" fill="#FFC86B"/><path d="M6 7c.8 1.4 1.8 2.2 1.8 3.6a1.8 1.8 0 0 1-3.6 0C4.2 9.2 5.2 8.4 6 7z" fill="#FFF4D6"/></svg>' }));
    const held = h('div.rc-held', h('span.rc-held-k', 'Seat held for'), clock);
    const retry = button('Try again now', { onClick: () => { retry.setLoading(true); ctx.client?.retry(); setTimeout(() => retry.setLoading(false), 1600); }, e2e: 'retry' });
    const retryNote = h('div.rc-note', 'We knock again every couple of seconds on our own.');
    // leaving is the destructive way out: it asks once, in Cyril's voice
    let armed = 0;
    const leave = h('button.rc-leave', { type: 'button' }, 'Leave the table');
    onTap(leave, () => {
      if (Date.now() - armed < 3000) { ctx.actions.closeOverlay(); ctx.actions.leave(); return; }
      armed = Date.now();
      leave.textContent = 'Tap again to leave. Cyril will sulk.';
      leave.classList.add('armed');
      setTimeout(() => { if (Date.now() - armed >= 2900) { leave.textContent = 'Leave the table'; leave.classList.remove('armed'); } }, 3000);
    });
    const art = h('div.rc-art',
      h('div.rc-card', { style: { '--pc': colour } }, h('span.rc-card-k', 'Reserved'), h('span.rc-card-v', me?.name || 'You')),
    );
    const quote = h('p.rc-quote', '“I’ve kept your seat warm. Literally.”', h('span', '— Cyril'));
    const box = h('div.rc-box', { role: 'alertdialog', 'aria-live': 'assertive', 'aria-labelledby': 'rc-title' },
      eyebrow, title, body, h('div.rc-hold', held, bar), quote, h('div.rc-actions', retry, retryNote, leave));
    title.id = 'rc-title';
    overlay.append(h('div.dim.rc-dim', h('div.rc-stagearea', art), box));

    let lastState = '';
    const paint = (c) => {
      const st = c.client?.state.status;
      const lost = st === 'lost';
      const left = Math.max(0, HOLD_MS - elapsed());
      const s = Math.ceil(left / 1000);
      clock.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      bar.firstChild.style.transform = `scaleX(${(left / HOLD_MS).toFixed(4)})`;
      bar.classList.toggle('hurry', s <= 15);
      bar.style.setProperty('--k', (left / HOLD_MS).toFixed(4));
      const key = `${lost}`;
      if (key === lastState) return;
      lastState = key;
      box.classList.toggle('lost', lost);
      eyebrow.querySelector('.rc-eyebrow-txt').textContent = lost ? 'Couldn’t find the table' : 'Connection lost';
      title.textContent = lost ? 'The table’s gone quiet.' : 'Hold that thought.';
      body.textContent = lost
        ? 'Check your Wi-Fi or signal, then try again. If the host has left, the table may have closed.'
        : 'Finding the table again. Your seat and your score are safe.';
      if (!retry.disabled) retry.textContent = lost ? 'Try again' : 'Try again now';
      retryNote.textContent = lost ? 'Still nothing? The host\u2019s phone may have nodded off.' : 'Knocking every few seconds';
    };
    paint(ctx);
    const tick = setInterval(() => paint(ctx), 250);
    return { update: (c) => paint(c), unmount: () => {
      clearInterval(tick);
      if (bubbles) bubbles.style.visibility = '';
      hideEls.forEach((el) => { el.style.visibility = ''; });
      document.body.classList.remove('rc-paused');
      ctx.cyril?.setMood?.('calm');
      if (ctx.cyril?.group) ctx.cyril.group.rotation.y = cyRot;
      if (st && prev.layout) st.setLayout(prev.layout);
      if (st && prev.shot) st.setShot(prev.shot, { duration: 700 });
    } };
  },
};
