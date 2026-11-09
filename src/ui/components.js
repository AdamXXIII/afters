// Shared UI components (DESIGN 3.4). Plain DOM, no framework. Every screen builds from these.
import { avatarIcon, ICONS } from './icons.js';
import { haptic } from './haptics.js';
import { audio } from '../audio/synth.js';
import { AVATARS } from '../game/constants.js';

// ---------- procedural paper + grain (DESIGN 3.4) ----------
// One small PNG tile made once at startup replaces the SVG feTurbulence data URI: SVG filters in
// CSS backgrounds rasterise slowly on iOS and per element size; a decoded PNG is shared by every card.
function makeTile(size, { fibres = 0, alpha = 0.2, rgb = [64, 38, 26] } = {}) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(size, size);
  const d = img.data;
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < d.length; i += 4) {
    const n = rnd();
    d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2];
    d[i + 3] = Math.round(n * n * alpha * 255);
  }
  g.putImageData(img, 0, 0);
  // faint card-stock fibres
  g.lineCap = 'round';
  for (let i = 0; i < fibres; i++) {
    const x = rnd() * size; const y = rnd() * size; const a = rnd() * Math.PI; const l = 3 + rnd() * 9;
    g.strokeStyle = `rgba(${rgb.join(',')},${0.05 + rnd() * 0.07})`;
    g.lineWidth = 0.6;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 1, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  try { return c.toDataURL('image/png'); } catch { return null; }
}
try {
  if (typeof document !== 'undefined') {
    const paper = makeTile(128, { fibres: 22, alpha: 0.1 });
    const grain = makeTile(128, { alpha: 0.6, rgb: [40, 24, 18] });
    if (paper) document.documentElement.style.setProperty('--paper', `url("${paper}")`);
    if (grain) document.documentElement.style.setProperty('--grain', `url("${grain}")`);
  }
} catch { /* keep the SVG fallback from tokens.css */ }

/**
 * Tiny hyperscript: h('div.card.big#id', {onclick, style:{}, dataset:{}, html:'...'}, ...children)
 */
export function h(sel, props = {}, ...children) {
  if (props === null || typeof props !== 'object' || props instanceof Node || Array.isArray(props)) {
    children.unshift(props);
    props = {};
  }
  const m = sel.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement(m?.[1] || 'div');
  (m?.[2]?.match(/[.#][\w-]+/g) || []).forEach((t) => (t[0] === '.' ? el.classList.add(t.slice(1)) : (el.id = t.slice(1))));
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'class') el.className += ` ${v}`;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Fire on press with sound + haptic. Sound/haptic land on pointerdown (feels instant), the action on click. */
export function onTap(el, fn, { sound = 'tap', buzz = 'tap' } = {}) {
  let handledAt = 0;
  let fedBackAt = 0;
  const feedback = () => {
    if (el.disabled || Date.now() - fedBackAt < 300) return;
    fedBackAt = Date.now();
    audio.unlock();
    if (sound) audio.sfx(sound);
    if (buzz) haptic(buzz);
  };
  el.addEventListener('pointerdown', (e) => { if (e.button === 0 || e.pointerType !== 'mouse') feedback(); }, { passive: true });
  const fire = (e) => {
    if (el.disabled) return;
    if (Date.now() - handledAt < 400) return;
    handledAt = Date.now();
    if (Date.now() - fedBackAt > 600) feedback(); // keyboard / programmatic clicks
    fn(e);
  };
  el.addEventListener('click', fire);
  return el;
}

export function button(label, { kind = 'primary', block = true, onClick, disabled = false, id, e2e } = {}) {
  const cls = kind === 'primary' ? '' : `.btn-${kind}`;
  const b = h(`button.btn${cls}${block ? '.block' : ''}`, { type: 'button', disabled, id, 'data-e2e': e2e }, label);
  if (onClick) onTap(b, onClick);
  b.setLoading = (on) => {
    if (on) { b.dataset.label = b.textContent; b.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>'; b.disabled = true; b.classList.add('loading'); }
    else if (b.dataset.label) { b.textContent = b.dataset.label; b.disabled = false; b.classList.remove('loading'); }
  };
  return b;
}

export function iconButton(icon, { label, onClick } = {}) {
  const b = h('button.icon-btn', { type: 'button', 'aria-label': label, html: ICONS[icon] || icon });
  if (onClick) onTap(b, onClick);
  return b;
}

/** Player chip. state: waiting | done | disconnected ; flags: host, speaker, compact */
export function chip(player, { state = null, host = false, speaker = false, compact = false } = {}) {
  if (!player) return h('span');
  const colour = AVATARS[player.avatar]?.colour || '#7A4A2A';
  const el = h(`span.chip${compact ? '.compact' : ''}`, { style: { '--pc': colour }, dataset: { pid: player.id } },
    h('span.av', { html: avatarIcon(player.avatar) }, h('span.badge', { html: ICONS.tick })),
    h('span.nm', player.name),
    h('span.typing', h('i'), h('i'), h('i')),
  );
  if (host) el.prepend(h('span.crown', { html: ICONS.crown }));
  if (speaker) el.append(h('span.spk', { html: ICONS.speaker }));
  el.setState = (s) => {
    el.classList.toggle('waiting', s === 'waiting');
    el.classList.toggle('done', s === 'done');
    el.classList.toggle('disconnected', s === 'disconnected');
  };
  el.setState(player.connected === false ? 'disconnected' : state);
  return el;
}

export function chipsRow(players, stateFor = () => null, opts = {}) {
  const row = h('div.chips');
  const map = new Map();
  for (const p of players) {
    const c = chip(p, { state: stateFor(p), ...opts });
    map.set(p.id, c);
    row.append(c);
  }
  row.update = (fn) => { for (const p of players) map.get(p.id)?.setState(p.connected === false ? 'disconnected' : fn(p)); };
  return row;
}

/** Timer ring with a candle stub that burns down. Call .set(remainingMs, totalMs). */
/**
 * Timer ring (DESIGN 3.4): the burning progress arc carries a little candle flame at its head,
 * 12 hour-notches like a carriage clock, tomato + pulse in the last 10 s, tick + haptic in the last 3.
 * Call .set(remainingMs, totalMs) every frame; DOM writes only happen when something visible changes.
 */
export function timerRing({ big = false } = {}) {
  const r = 26;
  const C = 2 * Math.PI * r;
  const notches = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const x1 = 32 + Math.cos(a) * 21; const y1 = 32 + Math.sin(a) * 21;
    const x2 = 32 + Math.cos(a) * (i % 3 ? 19.6 : 18.6); const y2 = 32 + Math.sin(a) * (i % 3 ? 19.6 : 18.6);
    return `<line class="notch" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke-width="${i % 3 ? 1 : 1.6}" stroke-linecap="round"/>`;
  }).join('');
  const el = h(`div.timer.timer-bg${big ? '.big' : ''}`, {
    role: 'timer', 'aria-live': 'off',
    html: `<svg viewBox="0 0 64 64">${notches}<circle class="track" cx="32" cy="32" r="${r}" stroke-width="6" fill="none"/><circle class="prog" cx="32" cy="32" r="${r}" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="${C.toFixed(3)}" stroke-dashoffset="0"/><g class="head"><circle class="head-glow" cx="${32 + r}" cy="32" r="6"/><path class="head-core" d="M${32 + r} 28.4c.9 1.4 2.3 2.2 2.3 3.8a2.3 2.3 0 0 1-4.6 0c0-1.4 1.3-2.3 2.3-3.8z" transform="rotate(90 ${32 + r} 32)"/></g></svg><div class="num">0</div>`,
  });
  const prog = el.querySelector('.prog');
  const head = el.querySelector('.head');
  const num = el.querySelector('.num');
  let lastSec = null;
  let lastOff = -1;
  el.set = (remaining, total) => {
    const rem = Math.max(0, remaining);
    const frac = total > 0 ? Math.min(1, rem / total) : 0;
    const off = Math.round(C * (1 - frac) * 10) / 10;
    if (off !== lastOff) {
      lastOff = off;
      prog.style.strokeDashoffset = String(off);
      head.setAttribute('transform', `rotate(${(frac * 360).toFixed(1)} 32 32)`);
    }
    const sec = Math.ceil(rem / 1000);
    if (sec !== lastSec) {
      num.textContent = String(sec);
      el.classList.toggle('hurry', sec <= 10 && sec > 0);
      el.classList.toggle('out', sec <= 0);
      if (lastSec !== null && sec < lastSec && sec <= 3 && sec >= 0) {
        audio.sfx('tick', { last: sec === 0 });
        haptic('tick');
        num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump');
      }
      lastSec = sec;
    }
    return sec;
  };
  return el;
}

export function textField({ max = 60, placeholder = '', value = '', onSubmit, e2e = 'answer-input', enterkeyhint = 'send' } = {}) {
  const input = h('input.input', {
    type: 'text', maxLength: max, placeholder, value, autocomplete: 'off', autocapitalize: 'sentences', spellcheck: true,
    enterkeyhint, 'data-e2e': e2e, 'aria-label': placeholder || 'Your answer',
  });
  const count = h('span.count', `0/${max}`);
  const wrap = h('div.field', input, count);
  const upd = () => {
    const n = input.value.length;
    count.textContent = `${n}/${max}`;
    count.classList.toggle('hot', n >= max * 0.9);
  };
  input.addEventListener('input', upd);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit?.(input.value); } });
  upd();
  wrap.input = input;
  input.addEventListener('focus', () => wrap.classList.add('focused'));
  input.addEventListener('blur', () => wrap.classList.remove('focused'));
  wrap.error = () => {
    input.classList.remove('error');
    void input.offsetWidth;
    input.classList.add('error');
    haptic('error');
    audio.sfx('error');
  };
  wrap.clear = () => { input.value = ''; upd(); };
  return wrap;
}

export function choice(text, { selected = false, mine = false, tall = false, tag = null, onPick, e2e = 'choice' } = {}) {
  const b = h(`button.choice${tall ? '.tall' : ''}${mine ? '.mine' : ''}`, { type: 'button', 'aria-pressed': String(!!selected), disabled: mine, 'data-e2e': mine ? 'choice-mine' : e2e },
    tag ? h('span.t-eyebrow.tag', tag) : null,
    h('span.txt', text),
    h('span.tick', { html: ICONS.tick }),
  );
  if (onPick && !mine) onTap(b, () => onPick(b), { sound: 'select', buzz: 'select' });
  return b;
}

const NUMERALS = ['I', 'II', 'III', 'IV'];
const FLOURISH = '<svg viewBox="0 0 150 14" aria-hidden="true"><path d="M2 7h50M98 7h50" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M56 7c4-5 9-5 12 0s8 5 12 0 8-5 12 0" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="75" cy="7" r="2.2" fill="currentColor"/><circle cx="52" cy="7" r="1.3" fill="currentColor"/><circle cx="98" cy="7" r="1.3" fill="currentColor"/></svg>';

/** Round card: a menu card in the round's colour, brass course medal, double hairline frame. */
export function roundCard({ round = 1, eyebrow, title, rules }) {
  return h('div.round-card', { style: { '--round': `var(--round-${round})` }, dataset: { round: String(round) } },
    h('div.medal', { 'aria-hidden': 'true' }, NUMERALS[round - 1] || String(round)),
    h('div.eyebrow', eyebrow),
    h('div.t-round', title),
    h('div.flourish', { html: FLOURISH }),
    h('div.rules', rules),
  );
}

export function placeCard(text, { tilt = 0, hand = true } = {}) {
  return h('div.place-card', { style: { '--tilt': `${tilt}deg` } }, h(hand ? 'div.t-answer' : 'div.t-body', text));
}

export function codeTiles(code) {
  return h('div.code-tiles', [...String(code || '----')].map((ch) => h('div.code-tile', ch)));
}

/** Leaderboard with FLIP reorder from prevRank order to final order, score count-up, delta flag. */
export function leaderboard(rows, playerById, { animate = true, delay = 600 } = {}) {
  const el = h('div.board');
  const byPrev = rows.slice().sort((a, b) => (a.prevRank ?? 0) - (b.prevRank ?? 0));
  const rowEls = new Map();
  const setLead = () => {
    const firstRow = el.firstElementChild;
    for (const e of rowEls.values()) {
      const lead = e === firstRow && rows[0] && rows[0].score > 0;
      e.classList.toggle('lead', !!lead);
    }
  };
  for (const r of animate ? byPrev : rows) {
    const p = playerById(r.id);
    const scoreEl = h('span.score', String(animate ? r.prev ?? r.score : r.score));
    const rowEl = h('div.board-row', h('span.rank', String((animate ? r.prevRank : rows.indexOf(r)) + 1)), chip(p), scoreEl);
    rowEl.scoreEl = scoreEl;
    if (!animate && r.delta > 0) rowEl.append(h('span.delta', `+${r.delta}`));
    rowEls.set(r.id, rowEl);
    el.append(rowEl);
  }
  if (!animate) setLead();
  if (animate) {
    // rows deal in like cards, top first
    [...rowEls.values()].forEach((e, i) => e.animate(
      [{ opacity: 0, transform: 'translateY(18px) scale(.98)' }, { opacity: 1, transform: 'none' }],
      { duration: 380, delay: 60 * i, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' },
    ));
    setTimeout(() => {
      const first = new Map([...rowEls].map(([id, e]) => [id, e.getBoundingClientRect().top]));
      rows.forEach((r, i) => { const e = rowEls.get(r.id); el.append(e); e.querySelector('.rank').textContent = String(i + 1); });
      let moved = false;
      for (const [id, e] of rowEls) {
        const dy = first.get(id) - e.getBoundingClientRect().top;
        if (dy) {
          moved = true;
          e.animate([{ transform: `translateY(${dy}px)`, zIndex: dy > 0 ? 2 : 1 }, { transform: 'none', zIndex: 1 }], { duration: 420, easing: 'cubic-bezier(.83,0,.17,1)' });
        }
      }
      rows.forEach((r, i) => {
        const e = rowEls.get(r.id);
        if (r.delta > 0) setTimeout(() => e.append(h('span.delta', `+${r.delta}`)), 40 * i);
        countUp(e.scoreEl, r.prev ?? 0, r.score, 600);
      });
      setTimeout(setLead, 440);
      audio.sfx('countup', { ticks: 14 });
      if (moved) haptic('rank');
    }, delay);
  }
  return el;
}

export function countUp(el, from, to, ms = 600) {
  const t0 = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    const e = 1 - (1 - k) ** 3;
    el.textContent = String(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Fit text by shrinking font-size until it fits maxLines (simple, runs once). */
export function autoFit(el, { min = 22, max = 28, maxHeight }) {
  let size = max;
  el.style.fontSize = `${size}px`;
  requestAnimationFrame(() => {
    while (size > min && el.scrollHeight > (maxHeight || el.clientHeight + 1)) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  });
}

let toastHost = null;
export function toast(msg, { ms = 3000, onTap: tap, icon = 'flame' } = {}) {
  toastHost ||= document.getElementById('toasts');
  if (!toastHost) return;
  const t = h('div.toast', { role: 'status' }, icon && ICONS[icon] ? h('span.ico', { html: ICONS[icon], 'aria-hidden': 'true' }) : null, h('span', msg));
  if (tap) t.addEventListener('click', tap);
  toastHost.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 220); }, ms);
}

export function toggle(label, { checked = false, onChange, disabled = false, e2e } = {}) {
  const input = h('input', { type: 'checkbox', checked, disabled, 'data-e2e': e2e });
  input.addEventListener('change', () => { audio.sfx('tap'); haptic('tap'); onChange?.(input.checked); });
  return h('label.toggle', h('span', label), input);
}
