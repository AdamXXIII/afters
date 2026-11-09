// Drawing pad UI + replay view (browser only). Pure data helpers live in drawing-data.js
// (Node-safe, for host logic) and are re-exported here. See drawing-data.js for the format.
import './drawing.css';
import { BOARD, PALETTE, PALETTE_NAMES, SIZES, MIN_STEP, MAX_POINTS, emptyDrawing, countPoints, decodeDrawing, replayDuration, renderDrawing } from './drawing-data.js';

export * from './drawing-data.js';

/** Size a canvas's backing store to its CSS box at the device pixel ratio (max 2). */
export function fitCanvas(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * dpr)); const hh = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; return true; }
  return false;
}

const el = (tag, cls, attrs = {}) => { const e = document.createElement(tag); if (cls) e.className = cls; for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

/**
 * Interactive drawing pad: square board + toolbar.
 * @param {object} o
 * @param {(d)=>void} [o.onChange]   after each finished stroke, undo or clear
 * @param {object} [o.initial]       drawing to start from
 * @param {number[]} [o.colours]     palette indexes to offer (default all)
 * @param {number} [o.colour=0] [o.size=1]
 * @param {boolean} [o.disabled]
 * @param {string} [o.prompt]        small caption over the board ("Draw: a haunted sandwich")
 */
export function drawPad({ onChange = null, initial = null, colours = null, colour = 0, size = 1, disabled = false, prompt = null } = {}) {
  let drawing = initial ? decodeDrawing(initial) : emptyDrawing();
  let cur = null; // stroke in progress {c, s, p, lx, ly}
  let state = { colour, size, disabled };
  const root = el('div', 'dp');
  const board = el('div', 'dp-board');
  const canvas = el('canvas', 'dp-canvas', { 'aria-label': 'Drawing board', role: 'img', 'data-e2e': 'draw-canvas' });
  board.append(canvas);
  if (prompt) { const cap = el('div', 'dp-cap'); cap.textContent = prompt; root.append(cap); }
  const tools = el('div', 'dp-tools');
  const sw = el('div', 'dp-swatches', { role: 'radiogroup', 'aria-label': 'Colour' });
  const sizes = el('div', 'dp-sizes', { role: 'radiogroup', 'aria-label': 'Brush size' });
  const undoB = el('button', 'dp-btn dp-undo', { type: 'button', 'aria-label': 'Undo', 'data-e2e': 'draw-undo' });
  undoB.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 12h-2" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 -3)"/></svg>';
  const clearB = el('button', 'dp-btn dp-clear', { type: 'button', 'aria-label': 'Clear the board', 'data-e2e': 'draw-clear' });
  clearB.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  (colours || PALETTE.map((_, i) => i)).forEach((ci) => {
    const b = el('button', `dp-sw${ci === PALETTE.length - 1 ? ' rubber' : ''}`, { type: 'button', role: 'radio', 'aria-label': PALETTE_NAMES[ci], 'data-c': ci });
    b.style.setProperty('--sw', PALETTE[ci]);
    b.addEventListener('click', () => { state.colour = ci; paintTools(); });
    sw.append(b);
  });
  SIZES.forEach((sz, si) => {
    const b = el('button', 'dp-sz', { type: 'button', role: 'radio', 'aria-label': ['Fine', 'Medium', 'Thick', 'Huge'][si], 'data-s': si });
    const dot = el('i');
    dot.style.setProperty('--d', `${Math.round(4 + si * 5)}px`);
    b.append(dot);
    b.addEventListener('click', () => { state.size = si; paintTools(); });
    sizes.append(b);
  });
  undoB.addEventListener('click', () => { if (state.disabled) return; drawing.strokes.pop(); redraw(); emit(); });
  clearB.addEventListener('click', () => { if (state.disabled || !drawing.strokes.length) return; drawing = emptyDrawing(); redraw(); emit(); });
  tools.append(sw, sizes, undoB, clearB);
  root.append(board, tools);

  function paintTools() {
    for (const b of sw.children) b.setAttribute('aria-checked', String(+b.dataset.c === state.colour));
    for (const b of sizes.children) b.setAttribute('aria-checked', String(+b.dataset.s === state.size));
    for (const b of sizes.querySelectorAll('i')) b.style.background = PALETTE[state.colour] === '#FBF4EA' ? '#C9B79C' : PALETTE[state.colour];
    undoB.disabled = state.disabled || !drawing.strokes.length;
    clearB.disabled = state.disabled || !drawing.strokes.length;
    root.classList.toggle('disabled', !!state.disabled);
  }
  function redraw() {
    fitCanvas(canvas);
    const live = cur ? { v: 1, strokes: [...drawing.strokes, cur] } : drawing;
    renderDrawing(canvas, live);
    paintTools();
  }
  function emit() { onChange?.(pad.drawing); }

  const toBoard = (e) => {
    const r = canvas.getBoundingClientRect();
    const k = BOARD / Math.min(r.width, r.height);
    const ox = (r.width - BOARD / k) / 2; const oy = (r.height - BOARD / k) / 2;
    return [Math.round(Math.max(0, Math.min(BOARD, (e.clientX - r.left - ox) * k))), Math.round(Math.max(0, Math.min(BOARD, (e.clientY - r.top - oy) * k)))];
  };
  let pid = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (state.disabled || pid !== null || countPoints(drawing) >= MAX_POINTS) return;
    pid = e.pointerId;
    try { canvas.setPointerCapture(pid); } catch { /* ignore */ }
    const [x, y] = toBoard(e);
    cur = { c: state.colour, s: state.size, p: [x, y], lx: x, ly: y };
    redraw();
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid || !cur) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) {
      const [x, y] = toBoard(ev);
      if (Math.hypot(x - cur.lx, y - cur.ly) < MIN_STEP) continue;
      cur.p.push(x - cur.lx, y - cur.ly);
      cur.lx = x; cur.ly = y;
    }
    redraw();
  });
  const end = (e) => {
    if (e.pointerId !== pid) return;
    pid = null;
    if (cur) { drawing.strokes.push({ c: cur.c, s: cur.s, p: cur.p }); cur = null; redraw(); emit(); }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => redraw()) : null;
  ro?.observe(canvas);
  requestAnimationFrame(redraw);

  const pad = {
    el: root,
    canvas,
    get drawing() { return { v: 1, strokes: drawing.strokes.map((s) => ({ c: s.c, s: s.s, p: s.p.slice() })) }; },
    set drawing(d) { drawing = decodeDrawing(d); redraw(); },
    get empty() { return !drawing.strokes.length; },
    undo() { drawing.strokes.pop(); redraw(); emit(); },
    clear() { drawing = emptyDrawing(); redraw(); emit(); },
    setDisabled(v) { state.disabled = !!v; paintTools(); },
    redraw,
    destroy() { ro?.disconnect(); root.remove(); },
  };
  paintTools();
  return pad;
}

/**
 * A read-only drawing view that replays stroke by stroke. Call .frame(t) each frame with ms into
 * the replay (e.g. ctx.elapsed() - stepStart); omit t to show it finished.
 */
export function drawingView(d, { className = '', duration = null } = {}) {
  const wrap = el('div', `dp-view ${className}`.trim());
  const canvas = el('canvas', 'dp-canvas', { role: 'img', 'aria-label': 'A drawing' });
  wrap.append(canvas);
  let drawing = decodeDrawing(d);
  let lastKey = '';
  return {
    el: wrap,
    canvas,
    set(dd) { drawing = decodeDrawing(dd); lastKey = ''; },
    duration: () => duration ?? replayDuration(drawing),
    frame(t = null) {
      const resized = fitCanvas(canvas);
      const total = duration ?? replayDuration(drawing);
      const tt = t === null ? null : Math.min(t, total);
      const key = `${tt === null ? 'done' : Math.floor(tt / 16)}|${canvas.width}`;
      if (key === lastKey && !resized) return;
      lastKey = key;
      renderDrawing(canvas, drawing, { t: tt, duration: total });
    },
  };
}
