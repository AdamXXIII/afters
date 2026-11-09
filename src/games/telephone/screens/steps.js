// telephone-write / -draw / -guess / -wait: the private, one-handed bits of each step.
import './tp.css';
import { textField } from '../../../ui/components.js';
import { drawPad, drawingView, encodeDrawing } from '../../../shared/drawing.js';
import { STARTERS } from '../content/starters.js';
import { doodle, doodleFor } from '../doodles.js';
import { mulberry32 } from '../../../util/rng.js';
import { h, button, av, who, fitText, cyrilNote, iconBtn, stepPips, nudgeWatcher, TP_ICONS, cordSvg, tilt } from './kit.js';

const kindAt = (mode) => (i) => (i === 0 ? 'w' : mode === 'flip' ? 'd' : i % 2 ? 'd' : 'g');

function head(ctx, title) {
  const p = ctx.payload;
  return h('div.tp-head',
    h('div.tp-head-top', h('span.t-eyebrow', `Step ${p.step + 1} of ${p.steps}`), stepPips(p.step, p.steps, kindAt(p.mode))),
    title ? h('div.tp-head-title', title) : null);
}

function sentAnim(el) {
  el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-160px) rotate(-6deg) scale(.7)', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.64,0,.78,0)', fill: 'forwards' });
}

// ---------------------------------------------------------------- write
const write = {
  id: 'telephone-write',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const next = ctx.player(ctx.priv?.next);
    const deck = STARTERS[ctx.adult ? 'adult' : 'family'];
    const rng = mulberry32((ctx.phase.seed ^ (ctx.meId || '').length * 7919) >>> 0);
    let ci = Math.floor(rng() * deck.length);
    const field = textField({ max: ctx.payload.max || 70, placeholder: 'Write something daft…', onSubmit: () => send() });
    const cardTxt = h('div.tp-stuck-txt');
    const card = h('div.tp-stuck',
      h('div.tp-stuck-top', h('span.t-eyebrow', 'Stuck? Take a card'), h('span.tp-stuck-n', `${deck.length} in the deck`)),
      cardTxt,
      h('div.tp-stuck-row',
        button('Deal another', { kind: 'secondary', block: false, e2e: 'tp-deal', onClick: () => { ci = (ci + 1 + Math.floor(rng() * 7)) % deck.length; deal(true); } }),
        button('Use it', { kind: 'secondary', block: false, e2e: 'tp-use', onClick: () => { field.input.value = deck[ci].text; field.input.dispatchEvent(new Event('input')); field.input.focus({ preventScroll: true }); } })));
    const deal = (anim) => {
      cardTxt.textContent = deck[ci].text;
      card.style.setProperty('--tilt', `${tilt(ci, 'stuck', 2.2)}deg`);
      if (anim) card.animate([{ transform: 'rotate(var(--tilt)) translateX(30px)', opacity: 0 }, { transform: 'rotate(var(--tilt))', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
    };
    deal(false);
    card.querySelectorAll('.btn-secondary')[0].insertAdjacentHTML('afterbegin', `<span class="tp-btn-ic">${TP_ICONS.dice}</span>`);
    const btn = iconBtn('Pass it on', 'send', { e2e: 'submit', onClick: () => send() });
    const title = h('div.tp-write-title', 'Start a rumour.');
    const sub = h('div.tp-write-sub', next ? ['It goes to ', who(next, { size: 20 }), ' to draw.'] : 'Somebody has to draw it.');
    const body = h('div.tp-sheet', head(ctx, null), h('div.tp-write-card', title, sub), field, card, cyrilNote(ctx.line('tpWrite')), h('div.tp-grow'), btn);
    sheet.append(body);
    function send() {
      const text = field.input.value.trim();
      if (!text) { field.error(); return; }
      ctx.audio.sfx('plated'); ctx.haptic('submit');
      btn.disabled = true;
      sentAnim(body.querySelector('.tp-write-card'));
      setTimeout(() => ctx.client.act('text', { text }, { sent: true, text }), 200);
    }
    if (!ctx.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
    const nudged = nudgeWatcher(ctx);
    return { update: nudged };
  },
};

// ---------------------------------------------------------------- draw
const draw = {
  id: 'telephone-draw',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const pv = ctx.priv || {};
    const flip = ctx.payload.mode === 'flip';
    const from = ctx.player(pv.from);
    const txt = h('div.tp-slip-txt', pv.text || '');
    const slip = h('div.tp-slip',
      h('div.tp-slip-top', h('span.t-eyebrow', flip ? `Frame ${pv.frame} · animate this` : 'Draw this'), from ? who(from, { size: 18, label: flip ? 'last frame by' : 'from' }) : null),
      txt);
    let timer = null;
    let lastSent = '';
    const sendDraft = (d, final = false) => {
      const enc = encodeDrawing(d);
      if (!final && enc === lastSent) return;
      lastSent = enc;
      ctx.client.act('draw', { d: enc, final }, final ? { sent: true } : null);
    };
    const pad = drawPad({
      onChange: (d) => {
        clearTimeout(timer);
        doneBtn.disabled = false;
        if (ctx.remaining() < 4000) sendDraft(d); else timer = setTimeout(() => sendDraft(d), 350);
      },
    });
    // demo/screenshot: a half-finished doodle so the board isn't empty
    if (ctx.demo && ctx.frozen) {
      const dd = doodle(doodleFor(pv.text, () => 0.4), 3);
      dd.strokes = dd.strokes.slice(0, Math.max(3, dd.strokes.length - 3));
      pad.drawing = dd;
    }
    let onion = null;
    if (flip && pv.prev?.strokes?.length) {
      onion = drawingView(pv.prev, { className: 'tp-onion' });
      pad.el.querySelector('.dp-board').append(onion.el);
      pad.el.querySelector('.dp-board').append(h('span.tp-onion-tag', 'last frame (faint)'));
    }
    const doneBtn = iconBtn(flip ? 'Done, next frame' : 'Done drawing', 'send', { e2e: 'done-drawing', onClick: () => finish() });
    doneBtn.disabled = pad.empty && !(ctx.demo && ctx.frozen);
    const body = h('div.tp-sheet.tp-draw', head(ctx, null), slip, pad.el, doneBtn);
    sheet.append(body);
    fitText(txt, { max: 25, min: 18, maxH: 64 });
    function finish() {
      clearTimeout(timer);
      ctx.audio.sfx('plated'); ctx.haptic('submit');
      doneBtn.disabled = true;
      pad.setDisabled(true);
      sendDraft(pad.drawing, true);
    }
    const nudged = nudgeWatcher(ctx);
    let warned = false;
    return {
      update: nudged,
      frame(c) {
        onion?.frame();
        if (!warned && c.duration && c.remaining() < 8000 && !c.frozen) {
          warned = true;
          body.classList.add('tp-hurry');
          if (!pad.empty) sendDraft(pad.drawing);
        }
      },
      unmount() { clearTimeout(timer); if (!pad.empty && !ctx.mine.game.sent) sendDraft(pad.drawing); pad.destroy(); },
    };
  },
};

// ---------------------------------------------------------------- guess
const guess = {
  id: 'telephone-guess',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const pv = ctx.priv || {};
    const from = ctx.player(pv.from);
    const empty = !pv.drawing?.strokes?.length;
    const view = drawingView(pv.drawing, { className: 'tp-guess-view' });
    const paper = h('div.tp-paper', { style: { '--tilt': `${tilt(ctx.phase.seed, ctx.meId, 1.4)}deg` } }, view.el,
      from ? h('div.tp-drawn-by', who(from, { size: 18, label: 'drawn by' })) : null,
      empty ? h('div.tp-blank', 'They drew nothing. Make something up.') : null);
    const field = textField({ max: ctx.payload.max || 70, placeholder: 'What on earth is this?', onSubmit: () => send() });
    const btn = iconBtn('Pass it on', 'send', { e2e: 'submit', onClick: () => send() });
    const body = h('div.tp-sheet.tp-guess', head(ctx, null), h('div.tp-guess-q', 'What on earth is this?'), paper, field, btn);
    sheet.append(body);
    function send() {
      const text = field.input.value.trim();
      if (!text) { field.error(); return; }
      ctx.audio.sfx('plated'); ctx.haptic('submit');
      btn.disabled = true;
      sentAnim(paper);
      setTimeout(() => ctx.client.act('text', { text }, { sent: true, text }), 200);
    }
    const nudged = nudgeWatcher(ctx);
    return { update: nudged, frame() { view.frame(); } };
  },
};

// ---------------------------------------------------------------- wait
const wait = {
  id: 'telephone-wait',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const pv = ctx.priv || {};
    const next = ctx.player(pv.next);
    const kind = ctx.payload.kind;
    const last = ctx.payload.step + 1 >= ctx.payload.steps;
    const mineTxt = ctx.mine.game.text;
    const parcel = h('div.tp-parcel', kind === 'draw' ? h('span.tp-parcel-ic', { html: TP_ICONS.brush }) : h('span.tp-parcel-txt', mineTxt || (kind === 'write' ? 'Your rumour' : 'Your guess')));
    const route = h('div.tp-route',
      h('div.tp-route-end', av(ctx.me, { size: 44 }), h('span', 'You')),
      h('div.tp-route-wire', { html: cordSvg(180, 30, { loops: 9, stroke: 3 }) }, parcel),
      h('div.tp-route-end', last ? h('span.tp-route-bell', { html: TP_ICONS.handset }) : av(next, { size: 44 }), h('span', last ? 'The reveal' : (next?.name || 'Next'))));
    const title = h('div.tp-wait-title', last ? 'Line complete!' : `Passed to ${next?.name || 'the next seat'}.`);
    const list = h('div.tp-slow');
    const note = cyrilNote(ctx.line('tpWait'));
    const verb = kind === 'draw' ? 'drawing' : kind === 'guess' ? 'guessing' : 'writing';
    const rows = new Map();
    const lastPoke = {};
    const render = (c) => {
      const left = c.players.filter((p) => p.id !== c.meId && !c.progress.done?.[p.id] && p.connected !== false);
      const done = c.players.filter((p) => c.progress.done?.[p.id] || p.id === c.meId);
      for (const [id, row] of rows) if (!left.some((p) => p.id === id)) { row.remove(); rows.delete(id); }
      for (const p of left) {
        if (rows.has(p.id)) continue;
        const nb = button('Nudge', { kind: 'secondary', block: false, e2e: 'nudge', onClick: () => {
          if (Date.now() - (lastPoke[p.id] || 0) < 3000) { c.audio.sfx('nope'); return; }
          lastPoke[p.id] = Date.now();
          ctx.client.act('nudge', { to: p.id });
          nb.classList.remove('poked'); void nb.offsetWidth; nb.classList.add('poked');
        } });
        nb.insertAdjacentHTML('afterbegin', `<span class="tp-btn-ic">${TP_ICONS.bell}</span>`);
        const row = h('div.tp-slow-row', { style: { '--pc': p.colour } }, av(p, { size: 38 }),
          h('div.tp-slow-who', h('b', p.name), h('span', h('span.tp-pen', { html: TP_ICONS[kind === 'draw' ? 'brush' : 'pencil'] }), `still ${verb}`)), nb);
        rows.set(p.id, row);
        list.append(row);
      }
      head2.textContent = left.length ? `Still ${verb} (${left.length})` : 'Everyone\'s done. Here we go…';
      doneRow.replaceChildren(...done.map((p) => av(p, { size: 26, cls: '.done' })));
    };
    const head2 = h('div.t-eyebrow.tp-slow-head');
    const doneRow = h('div.tp-done-row');
    sheet.append(h('div.tp-sheet.tp-wait', head(ctx, null), h('div.tp-wait-card', title, route), h('div.tp-slow-box', h('div.tp-slow-top', head2, doneRow), list), note));
    render(ctx);
    const nudged = nudgeWatcher(ctx);
    return { update(c) { render(c); nudged(c); } };
  },
};

export default [write, draw, guess, wait];
