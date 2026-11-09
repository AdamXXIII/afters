// Content-aware framing (stage team). The show layer is HTML laid over the WebGL stage, and the
// screen agents change their layouts independently. Instead of hard-coding where Cyril appears,
// we measure where HTML content actually sits and frame the 3D subject into the free space.
// Also used by the speech bubble to find a spot that never covers content.

/** Is this element something a player reads or taps (not an empty layout box)? */
function isVisual(el, cs) {
  const tag = el.tagName;
  if (tag === 'IMG' || tag === 'svg' || tag === 'CANVAS' || tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA') return true;
  for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
  if (cs.backgroundImage !== 'none') return true;
  const bg = cs.backgroundColor;
  if (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0(\.0+)?\)$/.test(bg)) {
    const m = bg.match(/rgba\([^)]*,\s*([\d.]+)\)$/);
    if (!m || +m[1] > 0.12) return true;
  }
  if (cs.boxShadow !== 'none') return true;
  return false;
}

function hiddenChain(el, stop) {
  for (let e = el; e && e !== stop; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.08) return true;
  }
  return false;
}

/**
 * Rects of visible content inside the given roots, each with a weight (how bad it is to cover it).
 * @param {(Element|null)[]} roots
 * @returns {{x:number,y:number,w:number,h:number,weight:number,el:Element}[]}
 */
export function contentRects(roots, { skip = '.bubble', maxFrac = 0.6 } = {}) {
  const W = window.innerWidth; const H = window.innerHeight;
  const out = [];
  for (const root of roots) {
    if (!root) continue;
    if (hiddenChain(root, null)) continue;
    const els = root.querySelectorAll('*');
    for (const el of els) {
      if (el.ownerSVGElement) continue; // the <svg> itself counts
      if (skip && el.closest(skip)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 3 || r.height < 3) continue;
      if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
      if (r.width * r.height > maxFrac * W * H) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity < 0.08) continue;
      if (!isVisual(el, cs)) continue;
      if (hiddenChain(el.parentElement, root)) continue;
      let weight = 1.5;
      if (el.matches('.timer, .timer *')) weight = 5;
      else if (el.matches('button, input, textarea, .btn, [role="button"]')) weight = 3;
      else if (el.closest('.chip, .chips')) weight = 2.5;
      const fs = parseFloat(cs.fontSize) || 16;
      if (weight === 1.5 && fs > 20) weight = 1.5 * Math.min(4, fs / 20); // headlines matter most
      out.push({ x: r.left, y: r.top, w: r.width, h: r.height, weight, el });
    }
  }
  return out;
}

export function overlap(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Largest free vertical band inside [top, bottom] in the column [x0, x1], given obstacle rects.
 * Ties (within 10%) prefer the lower band: Cyril sits on a table.
 */
export function freeBands(rects, top, bottom, x0, x1) {
  const iv = rects
    .filter((r) => r.x < x1 && r.x + r.w > x0 && r.y + r.h > top && r.y < bottom)
    .map((r) => [Math.max(top, r.y), Math.min(bottom, r.y + r.h)])
    .sort((a, b) => a[0] - b[0]);
  const bands = [];
  let cur = top;
  for (const [a, b] of iv) {
    if (a > cur) bands.push({ top: cur, bottom: a, h: a - cur });
    cur = Math.max(cur, b);
  }
  if (bottom > cur) bands.push({ top: cur, bottom, h: bottom - cur });
  bands.sort((p, q) => (Math.abs(p.h - q.h) < Math.max(p.h, q.h) * 0.1 ? q.bottom - p.bottom : q.h - p.h));
  return bands;
}

export function cssPx(name) {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
}
