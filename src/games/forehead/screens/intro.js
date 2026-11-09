// forehead-intro: a full-screen Bonce poster (one hero: the title + the head with a phone on it),
// three big rules, and a compact host control bar; guests see who's at the table.
import './forehead.css';
import { h, button } from '../../../ui/components.js';
import { CYRIL_BONCE_SVG, disc, CYRIL_BADGE } from './kit.js';

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
    const head = h('i.fh-po-head', { html: CYRIL_BONCE_SVG });
    const title = h('div.fh-po-title', 'Bonce');
    const rules = h('div.fh-po-rule', h('span', 'Phone on your head.'), h('span', h('em', 'The sofa shouts.')), h('span', 'Nod = got it. Tip back = pass.'));
    const setup = () => ({ ...(ctx.progress.setup || { mode: 'ffa', goes: 1 }), ...(ctx.mine.game.setup || {}) });
    const bar = h('div.fh-po-bar');
    let modeP = null; let goesP = null; let summary = null;
    if (ctx.isHost) {
      const send = (patch) => { const next = { ...setup(), ...patch }; ctx.client.act('fh-setup', next, { setup: next }); ctx.haptic('select'); ctx.audio.sfx('select'); paint(); };
      modeP = pills([{ value: 'ffa', label: 'Every bonce for itself' }, { value: 'teams', label: p.canTeams ? 'Gravy v Custard' : 'Teams (4+)', disabled: !p.canTeams }], setup().mode, (v) => send({ mode: v }), 'fh-mode');
      goesP = pills([{ value: 1, label: '1 go each' }, { value: 2, label: '2 goes each' }], setup().goes, (v) => send({ goes: v }), 'fh-goes');
      const go = button('Bonces up!', { kind: 'candle', e2e: 'fh-go', onClick: () => { ctx.client.act('fh-go', {}, { go: true }); go.disabled = true; } });
      summary = h('span');
      const opts = h('div.fh-po-opts', modeP, goesP);
      const open = h('button.fh-po-change', { type: 'button', 'data-e2e': 'fh-setup-open' }, summary, h('b', 'Change'));
      open.addEventListener('click', () => { opts.classList.toggle('open'); ctx.haptic('tap'); });
      bar.append(opts, open, go);
    } else {
      const host = ctx.players.find((x) => x.isHost);
      summary = h('div.fh-po-summary');
      bar.append(h('div.fh-po-table', ctx.players.map((x) => disc(x, { size: 38 }))), summary,
        h('div.fh-po-wait', h('i', { html: CYRIL_BADGE }), h('span', `${host?.name || 'The host'} is pouring the jelly`, h('span.fh-dots', h('i'), h('i'), h('i')))));
    }
    const root = h('div.fh-poster.fh-burst', h('div.fh-po-stage', head, h('span.fh-po-shout.s1', 'Gravy!'), h('span.fh-po-shout.s2', 'Hum it!'), h('span.fh-po-shout.s3', 'Ooh ooh!')), h('div.fh-po-copy', h('div.fh-po-eyebrow', 'Tonight\'s wobbly jelly'), title, rules, bar));
    show.append(root);
    if (!ctx.frozen) {
      title.animate([{ transform: 'scale(.4) rotate(-12deg)', opacity: 0 }, { transform: 'rotate(-4deg)', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
      head.animate([{ transform: 'translateY(80px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, delay: 200, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
    }
    const paint = () => {
      const s = setup();
      if (summary) summary.textContent = `${s.mode === 'teams' ? 'Gravy v Custard' : 'Every bonce for itself'} · ${s.goes} go${s.goes > 1 ? 'es' : ''}`;
      modeP?.set(s.mode); goesP?.set(s.goes);
    };
    paint();
    return { update: (c) => { ctx = c; paint(); } };
  },
};
