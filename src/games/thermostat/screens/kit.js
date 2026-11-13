// Thermostat shared bits: the dial (a brass-rimmed half-moon thermostat face with a willow-to-
// tomato rim, tick marks, hidden heat bands and a claret needle on a knurled brass hub), avatar
// discs, the clue card, Cyril timing helpers.
import { h, onTap, timerRing } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { avatarIcon } from '../../../ui/icons.js';
import { BANDS } from '../host.js';

export const colourOf = (pl) => AVATARS[pl?.avatar]?.colour || '#7A4A2A';
export const nameOf = (ctx, id) => (id === ctx.meId ? 'You' : ctx.player(id)?.name || 'Someone');

export function disc(player, { size = 30, cls = '' } = {}) {
  return h(`span.th-av${cls}`, { style: { '--pc': colourOf(player), width: `${size}px`, height: `${size}px` }, title: player?.name || '', html: avatarIcon(player?.avatar ?? 0) });
}

export function tag(player, { meId = null, cls = '' } = {}) {
  const me = meId && player?.id === meId;
  return h(`span.th-tag${cls}${me ? '.you' : ''}`, { style: { '--pc': colourOf(player) } }, disc(player, { size: 26 }), h('span.nm', me ? 'You' : player?.name || '?'));
}

// ---------- the dial ----------
const W = 320; const CX = 160; const CY = 170; const R = 150;
const NS = 'http://www.w3.org/2000/svg';
const ang = (v) => Math.PI * (1 - v / 100);
const pt = (v, r) => [CX + r * Math.cos(ang(v)), CY - r * Math.sin(ang(v))];
const f = (n) => n.toFixed(2);
function wedge(a, b, r0, r1) {
  a = Math.max(0, Math.min(100, a)); b = Math.max(0, Math.min(100, b));
  if (b - a < 0.05) return '';
  const [x1, y1] = pt(a, r1); const [x2, y2] = pt(b, r1); const [x3, y3] = pt(b, r0); const [x4, y4] = pt(a, r0);
  return `M${f(x1)} ${f(y1)}A${r1} ${r1} 0 0 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${r0} ${r0} 0 0 0 ${f(x4)} ${f(y4)}Z`;
}
let uid = 0;

/**
 * The thermostat face. Returns an element with:
 *   .set(v)                 needle to value v (0..100), instantly
 *   .bands(target, final)   draw the heat bands for a target (hidden until .heat(k))
 *   .heat(k)                0..1: how far the bands have bloomed out from the hub
 *   .holders(players)       avatars riding the needle (who's touching it)
 *   .cover(on)              the face goes dim with a question mark (before the clue)
 *   .onDrag(fn)             make it draggable: fn(v, phase) phase = 'down'|'move'|'up'
 */
export function dial({ cls = '', needle = true } = {}) {
  const id = `thd${++uid}`;
  const ticks = [];
  for (let i = 0; i <= 40; i++) {
    const v = i * 2.5;
    const major = i % 10 === 0;
    const mid = i % 2 === 0;
    const [x1, y1] = pt(v, 134); const [x2, y2] = pt(v, major ? 116 : mid ? 124 : 128);
    ticks.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="${major ? 'mj' : mid ? 'md' : 'mn'}"/>`);
  }
  const knurl = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return `<line x1="${f(CX + Math.cos(a) * 17)}" y1="${f(CY + Math.sin(a) * 17)}" x2="${f(CX + Math.cos(a) * 21)}" y2="${f(CY + Math.sin(a) * 21)}"/>`;
  }).join('');
  const svg = `<svg viewBox="0 0 ${W} 186" class="th-dial-svg" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-rim" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#2F5D7C"/><stop offset=".5" stop-color="#E0A526"/><stop offset="1" stop-color="#E2553B"/>
      </linearGradient>
      <radialGradient id="${id}-face" cx=".5" cy="1" r="1">
        <stop offset="0" stop-color="#FFFBF4"/><stop offset=".75" stop-color="#FBF4EA"/><stop offset="1" stop-color="#F0E2CC"/>
      </radialGradient>
      <linearGradient id="${id}-brass" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#E9C46A"/><stop offset=".55" stop-color="#C89B3C"/><stop offset="1" stop-color="#8A6420"/>
      </linearGradient>
      <clipPath id="${id}-clip"><path d="M${CX - 146} ${CY}A146 146 0 0 1 ${CX + 146} ${CY}Z"/></clipPath>
    </defs>
    <path class="bezel" d="M${CX - R - 2} ${CY}A${R + 2} ${R + 2} 0 0 1 ${CX + R + 2} ${CY}" stroke="url(#${id}-brass)"/>
    <path class="face" d="M${CX - 146} ${CY}A146 146 0 0 1 ${CX + 146} ${CY}Z" fill="url(#${id}-face)"/>
    <g clip-path="url(#${id}-clip)">
      <g class="bands"></g>
    </g>
    <path class="rim" d="M${CX - 140} ${CY}A140 140 0 0 1 ${CX + 140} ${CY}" stroke="url(#${id}-rim)"/>
    <g class="ticks">${ticks.join('')}</g>
    <g class="cover"><path d="M${CX - 146} ${CY}A146 146 0 0 1 ${CX + 146} ${CY}Z"/><text x="${CX}" y="${CY - 62}">?</text></g>
    <rect class="plinth" x="${CX - R - 8}" y="${CY - 1}" width="${2 * R + 16}" height="14" rx="7" fill="url(#${id}-brass)"/>
    <g class="needle"${needle ? '' : ' style="display:none"'}>
      <path class="nd-shadow" d="M${CX} ${CY - 7}L${CX - 128} ${CY - 1}L${CX - 128} ${CY + 1}L${CX} ${CY + 7}Z" transform="translate(2 4)"/>
      <path class="nd" d="M${CX + 16} ${CY - 6}L${CX - 128} ${CY - 1.4}Q${CX - 132} ${CY} ${CX - 128} ${CY + 1.4}L${CX + 16} ${CY + 6}Z"/>
      <circle class="hub" cx="${CX}" cy="${CY}" r="22" fill="url(#${id}-brass)"/>
      <g class="knurl">${knurl}</g>
      <circle class="hub-cap" cx="${CX}" cy="${CY}" r="9"/>
    </g>
  </svg>`;
  const holds = h('div.th-holds');
  const el = h(`div.th-dial${cls}`, { html: svg });
  el.append(holds);
  const nd = el.querySelector('.needle');
  const bandsG = el.querySelector('.bands');
  const coverG = el.querySelector('.cover');
  el.value = 50;
  el.set = (v) => {
    el.value = v;
    nd.setAttribute('transform', `rotate(${f(1.8 * v)} ${CX} ${CY})`);
    placeHolds();
  };
  el.bands = (target, final = false) => {
    const k = final ? 0.5 : 1;
    const parts = [
      ['luke', BANDS.luke * k], ['warm', BANDS.warm * k], ['spot', BANDS.spot * k],
    ].map(([c, w]) => `<path class="b-${c}" d="${wedge(target - w, target + w, 26, 146)}"/>`);
    bandsG.innerHTML = parts.join('');
    bandsG.style.transformOrigin = `${CX}px ${CY}px`;
  };
  el.heat = (k) => {
    const e = Math.max(0, Math.min(1, k));
    bandsG.style.opacity = e > 0 ? '1' : '0';
    bandsG.style.transform = `scale(${(0.15 + 0.85 * (1 - (1 - e) ** 3)).toFixed(3)})`;
  };
  el.heat(0);
  el.cover = (on) => coverG.classList.toggle('on', !!on);
  // avatars riding the needle
  let held = [];
  function placeHolds() {
    held.forEach((d, i) => {
      const [x, y] = pt(el.value, 96 - i * 26);
      d.style.left = `${(x / W) * 100}%`;
      d.style.top = `${(y / 186) * 100}%`;
    });
  }
  let heldKey = '';
  el.holders = (players) => {
    const key = players.map((p) => p.id).join(',');
    if (key === heldKey) return;
    heldKey = key;
    held = players.slice(0, 3).map((p) => disc(p, { size: 34, cls: '.hold' }));
    holds.replaceChildren(...held);
    placeHolds();
  };
  el.onDrag = (fn) => {
    el.classList.add('live');
    const toV = (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      const y = ((e.clientY - r.top) / r.height) * 186;
      const dx = x - CX; const dy = CY - y;
      let a = Math.atan2(Math.max(dy, 0), dx);
      if (dy < 0) a = dx < 0 ? Math.PI : 0;
      return Math.round((1 - a / Math.PI) * 1000) / 10;
    };
    let down = false;
    el.addEventListener('pointerdown', (e) => {
      down = true; el.setPointerCapture?.(e.pointerId); el.classList.add('grab');
      fn(toV(e), 'down');
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => { if (down) fn(toV(e), 'move'); });
    const up = (e) => { if (!down) return; down = false; el.classList.remove('grab'); fn(toV(e), 'up'); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  el.set(50);
  return el;
}

/** The two ends of the scale, under the dial. */
export function ends(scale, { cls = '' } = {}) {
  return h(`div.th-ends${cls}`,
    h(`span.th-end.l${scale.l.length > 16 ? '.long' : ''}`, h('i', { html: '<svg viewBox="0 0 24 24"><path d="M14 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' }), h('span', scale.l)),
    h(`span.th-end.r${scale.r.length > 16 ? '.long' : ''}`, h('span', scale.r), h('i', { html: '<svg viewBox="0 0 24 24"><path d="M10 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' })));
}

/** The clue card for the show layer: who gave it, what they said, a timer. */
export function clueCard(ctx, p, { timer = true, compact = false, label = null } = {}) {
  const giver = ctx.player(p.giver);
  const me = p.giver === ctx.meId;
  const t = timer ? timerRing() : null;
  const clue = p.clue || '';
  const head = h('div.th-cc-head',
    disc(giver, { size: compact ? 34 : 40 }),
    h('div.th-cc-who', h('b', label || (me ? 'Your clue' : `${giver?.name || '?'}’s clue`)), h('small', p.final ? 'Hot seat · triple points' : `Round ${(p.index ?? 0) + 1} of ${p.count ?? 1}`)),
    t);
  const body = clue
    ? h(`div.th-cc-clue${clue.length > 22 ? '.long' : ''}`, `“${clue}”`)
    : h('div.th-cc-clue.said', 'Said out loud');
  const card = h(`div.th-cluecard${compact ? '.compact' : ''}${p.final ? '.final' : ''}`, head, body);
  card.timer = t;
  return card;
}

/** Fire Cyril's line once per mount. */
export function sayLater(ctx, lines, { delay = 500, ...o } = {}) {
  if (!lines) return () => {};
  const t = setTimeout(() => ctx.say(lines, { hold: 2600, placement: 'side', ...o }), ctx.frozen ? 0 : delay);
  return () => clearTimeout(t);
}

export function skipBtn(ctx, show) {
  if (!ctx.isHost) return null;
  const b = h('button.th-skip', { type: 'button', 'data-e2e': 'skip' }, 'Skip');
  onTap(b, () => ctx.client.skip());
  show.append(b);
  return (c) => b.classList.toggle('on', c.elapsed() > 2000 / (c.phase?.speed || 1));
}

export function countTo(el, to, { prefix = '+', frozen = false, ms = 650 } = {}) {
  if (frozen || !to) { el.textContent = `${prefix}${to}`; return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    el.textContent = `${prefix}${Math.round(to * (1 - (1 - k) ** 3))}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
