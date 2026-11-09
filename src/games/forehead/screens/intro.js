// forehead-intro: the Bonce card with three picture rules; the host sets the mode and starts.
import './forehead.css';
import { h, button } from '../../../ui/components.js';
import { HEAD_SVG, TILT_DOWN_SVG, TILT_UP_SVG, SHOUT_SVG, disc, cyrilCard, TEAMS } from './kit.js';

function seg(options, value, onPick, e2e) {
  const row = h('div.fh-seg', { role: 'radiogroup' });
  const btns = options.map((o) => {
    const b = h('button.fh-seg-btn', { type: 'button', 'data-e2e': `${e2e}-${o.value}`, disabled: !!o.disabled }, h('b', o.label), o.sub ? h('small', o.sub) : null);
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
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx0) {
    let ctx = ctx0;
    const p = ctx.payload;
    const card = h('div.fh-bonce-card',
      h('div.fh-bc-eyebrow', 'Tonight\'s jelly'),
      h('div.fh-bc-title', 'Bonce'),
      h('div.fh-bc-rules',
        h('div.fh-rule', h('i', { html: HEAD_SVG }), h('span', 'Phone on', h('br'), 'your bonce')),
        h('div.fh-rule', h('i', { html: SHOUT_SVG }), h('span', 'The sofa', h('br'), 'shouts')),
        h('div.fh-rule', h('i.pair', h('i', { html: TILT_DOWN_SVG }), h('i', { html: TILT_UP_SVG })), h('span', h('b', 'Down'), ' got it', h('br'), h('b', 'Up'), ' pass')),
      ),
      h('div.fh-bc-foot', '60 seconds a go · 100 a card'));
    show.append(h('div.fh-intro-wrap', card));
    card.animate([{ transform: 'translateY(30px) rotate(-6deg) scale(.9)', opacity: 0 }, { transform: 'rotate(-2deg)', opacity: 1 }], { duration: ctx.frozen ? 1 : 700, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });

    const setup = () => ({ ...(ctx.progress.setup || { mode: 'ffa', goes: 1 }), ...(ctx.mine.game.setup || {}) });
    const page = h('div.fh-sheet');
    sheet.append(page);
    let modeSeg = null; let goesSeg = null; let go = null; let order = null; let summary = null;
    if (ctx.isHost) {
      const send = (patch) => { const next = { ...setup(), ...patch }; ctx.client.act('fh-setup', next, { setup: next }); ctx.haptic('select'); ctx.audio.sfx('select'); modeSeg.set(next.mode); goesSeg.set(next.goes); };
      modeSeg = seg([
        { value: 'ffa', label: 'Everyone for themselves', sub: 'Guess for you' },
        { value: 'teams', label: `${TEAMS.gravy.name.replace('Team ', '')} vs ${TEAMS.custard.name.replace('Team ', '')}`, sub: p.canTeams ? 'Two teams, shout FOUL' : '4+ players', disabled: !p.canTeams },
      ], setup().mode, (v) => send({ mode: v }), 'fh-mode');
      goesSeg = seg([{ value: 1, label: '1 go each' }, { value: 2, label: '2 goes each' }], setup().goes, (v) => send({ goes: v }), 'fh-goes');
      go = button('Bonces up!', { e2e: 'fh-go', onClick: () => { ctx.client.act('fh-go', {}, { go: true }); go.disabled = true; } });
      page.append(h('div.t-eyebrow', 'How are we playing?'), modeSeg, goesSeg,
        cyrilCard(ctx.line('fhIntro')), h('div.fh-grow'), go);
    } else {
      const host = ctx.players.find((x) => x.isHost);
      summary = h('div.fh-summary');
      order = h('div.fh-order', ctx.players.map((x) => disc(x, { size: 40 })));
      page.append(h('div.t-eyebrow', 'At the table'), order, summary, cyrilCard(ctx.line('fhIntro')),
        h('div.fh-wait', h('span.fh-dots', h('i'), h('i'), h('i')), `${host?.name || 'The host'} is setting the table`));
    }
    const paint = () => {
      const s = setup();
      if (summary) summary.replaceChildren(h('b', s.mode === 'teams' ? 'Gravy vs Custard' : 'Everyone for themselves'), h('span', ` · ${s.goes} go${s.goes > 1 ? 'es' : ''} each`));
      if (modeSeg) { modeSeg.set(s.mode); goesSeg.set(s.goes); }
    };
    paint();
    if (!ctx.frozen) ctx.cyril.react('delight');
    return { update: (c) => { ctx = c; paint(); } };
  },
};
