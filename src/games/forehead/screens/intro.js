// forehead-intro: a full-screen Bonce poster (one hero: the title + the head with a phone on it),
// three big rules, and a compact host control bar; guests see who's at the table.
import './forehead.css';
import { h, button } from '../../../ui/components.js';
import { HEAD_SVG, disc, CYRIL_BADGE } from './kit.js';

function pills(options, value, onPick, e2e) {
  const row = h('div.fh-pills', { role: 'radiogroup' });
  const btns = options.map((o) => {
    const b = h('button.fh-pill', { type: 'button', 'data-e2e': `${e2e}-${o.value}`, disabled: !!o.disabled }, o.label);
    b.addEventListener('click', () => { if (!b.disabled) onPick(o.value); });
    row.append(b);
    return [o.value, b];
  });
  row.set = (v) => btns.forEach(([k, b]) => { b.classList.toggle('on', k === v); b.setAttribute('aria-checked', String(k === v)); });
  row.set(value);
  return row;
}

export default {
  id: 'forehead-intro',
  layout: 'show',
  shot: 'intro',
  rail: false,
  mount({ show }, ctx0) {
    let ctx = ctx0;
    const p = ctx.payload;
    const head = h('i.fh-po-head', { html: HEAD_SVG });
    const title = h('div.fh-po-title', 'Bonce');
    const rules = h('ol.fh-po-rules',
      h('li', h('b', '1'), h('span', 'Phone on your head, screen out')),
      h('li', h('b', '2'), h('span', 'Everyone else shouts, acts, hums')),
      h('li', h('b', '3'), h('span', h('em', 'Nod'), ' = got it. ', h('em', 'Tip back'), ' = pass')));
    const setup = () => ({ ...(ctx.progress.setup || { mode: 'ffa', goes: 1 }), ...(ctx.mine.game.setup || {}) });
    const bar = h('div.fh-po-bar');
    let modeP = null; let goesP = null; let summary = null;
    if (ctx.isHost) {
      const send = (patch) => { const next = { ...setup(), ...patch }; ctx.client.act('fh-setup', next, { setup: next }); ctx.haptic('select'); ctx.audio.sfx('select'); paint(); };
      modeP = pills([{ value: 'ffa', label: 'Every bonce for itself' }, { value: 'teams', label: p.canTeams ? 'Gravy v Custard' : 'Teams (4+)', disabled: !p.canTeams }], setup().mode, (v) => send({ mode: v }), 'fh-mode');
      goesP = pills([{ value: 1, label: '1 go each' }, { value: 2, label: '2 goes each' }], setup().goes, (v) => send({ goes: v }), 'fh-goes');
      const go = button('Bonces up!', { e2e: 'fh-go', onClick: () => { ctx.client.act('fh-go', {}, { go: true }); go.disabled = true; } });
      bar.append(modeP, goesP, go);
    } else {
      const host = ctx.players.find((x) => x.isHost);
      summary = h('div.fh-po-summary');
      bar.append(h('div.fh-po-table', ctx.players.map((x) => disc(x, { size: 38 }))), summary,
        h('div.fh-po-wait', h('i', { html: CYRIL_BADGE }), h('span', `${host?.name || 'The host'} is pouring the jelly`, h('span.fh-dots', h('i'), h('i'), h('i')))));
    }
    const root = h('div.fh-poster.fh-burst', h('div.fh-po-eyebrow', 'Tonight\'s wobbly jelly'), title, head, rules, bar);
    show.append(root);
    if (!ctx.frozen) {
      title.animate([{ transform: 'scale(.4) rotate(-12deg)', opacity: 0 }, { transform: 'rotate(-4deg)', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
      [...rules.children].forEach((li, i) => li.animate([{ transform: 'translateX(-40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: 350 + i * 120, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }));
    }
    const paint = () => {
      const s = setup();
      if (summary) summary.textContent = `${s.mode === 'teams' ? 'Gravy v Custard' : 'Every bonce for itself'} · ${s.goes} go${s.goes > 1 ? 'es' : ''} each`;
      modeP?.set(s.mode); goesP?.set(s.goes);
    };
    paint();
    return { update: (c) => { ctx = c; paint(); } };
  },
};
