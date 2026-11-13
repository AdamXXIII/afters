// telephone-intro: the Crossed Wires card, how a line travels, and the host's mode pick.
import './tp.css';
import { h, button, TP_ICONS, cordSvg } from './kit.js';

const MODES = [
  { id: 'classic', name: 'Classic', icon: 'pencil', sub: 'Draw, guess, draw, guess', t: '50 s to draw' },
  { id: 'speedy', name: 'Speedy', icon: 'bolt', sub: 'Half the time, twice the mess', t: '30 s to draw' },
  { id: 'flip', name: 'Flipbook', icon: 'film', sub: 'Everyone draws the next frame', t: '45 s a frame' },
];

export default {
  id: 'telephone-intro',
  layout: 'show',
  shot: 'intro',
  rail: false,
  mount({ show }, ctx) {
    const host = ctx.isHost;
    const steps = h('div.tp-how',
      ...[['pencil', 'Write a sentence'], ['brush', 'Next draws it'], ['eye', 'Next describes'], ['handset', 'Turn the pages']].flatMap(([ic, label], i, arr) => [
        h('div.tp-how-step', { style: { '--i': i } }, h('span.tp-how-ic', { html: TP_ICONS[ic] }), h('span', label)),
        i < arr.length - 1 ? h('span.tp-how-cord', { html: cordSvg(40, 18, { loops: 3, stroke: 2.4 }) }) : null,
      ]));
    const tiles = MODES.map((m) => {
      const b = h(`button.tp-mode`, { type: 'button', 'data-e2e': `mode-${m.id}`, 'aria-pressed': 'false', disabled: !host },
        h('span.tp-mode-ic', { html: TP_ICONS[m.icon] }),
        h('b', m.name), h('small', m.sub), h('em', m.t));
      b.addEventListener('click', () => { if (!host) return; ctx.audio.sfx('select'); ctx.haptic('select'); ctx.client.act('mode', { mode: m.id }, { mode: m.id }); });
      return b;
    });
    const lens = ctx.payload.lengths || {};
    const LEN = [
      { id: 'once', name: 'Once round', n: lens.once },
      { id: 'twice', name: 'Twice round', n: lens.twice },
    ].filter((l) => l.n);
    // at 5+ players twice round is capped, so only offer it when it adds turns
    const lenOpts = LEN.filter((l, i) => i === 0 || l.n > LEN[0].n);
    const lenBtns = lenOpts.map((l) => {
      const b = h('button.tp-len-opt', { type: 'button', 'data-e2e': `length-${l.id}`, 'aria-pressed': 'false', disabled: !host },
        h('b', l.name), h('span', `${l.n} turns`));
      b.addEventListener('click', () => { if (!host) return; ctx.audio.sfx('select'); ctx.haptic('select'); ctx.client.act('length', { length: l.id }, { length: l.id }); });
      return b;
    });
    // two of you: no choice to make, each sentence swaps back and forth three times
    const duo = ctx.players.length === 2;
    const lenRow = duo
      ? h('div.tp-len.duo', h('div.tp-len-opt', { 'aria-pressed': 'true' }, h('b', 'Back and forth'), h('span', `${lens.once || 6} turns`)))
      : lenBtns.length > 1 ? h('div.tp-len', { role: 'group', 'aria-label': 'How far each sentence travels' }, lenBtns) : null;
    const startBtn = host ? button('Start writing', { e2e: 'tp-start', onClick: () => ctx.client.skip() }) : null;
    const note = h('div.tp-intro-foot', host ? null : h('span.tp-dots', h('i'), h('i'), h('i')), host ? null : h('span', `${ctx.players.find((p) => p.isHost)?.name || 'The host'} is picking the mode`));
    const card = h('div.tp-intro-card',
      h('div.tp-intro-eyebrow', h('span', { html: TP_ICONS.handset }), 'Tonight\'s party line'),
      h('div.tp-intro-title', 'Crossed', h('br'), 'Wires'),
      steps,
      h('div.tp-modes', tiles),
      lenRow,
      startBtn || note);
    show.append(h('div.tp-intro', card));
    const sync = (c) => {
      const mode = c.mine.game.mode || c.progress.mode || 'classic';
      tiles.forEach((b, i) => b.setAttribute('aria-pressed', String(MODES[i].id === mode)));
      const len = c.mine.game.length || c.progress.length || 'once';
      lenBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(lenOpts[i].id === len)));
    };
    sync(ctx);
    let said = null;
    if (!ctx.frozen) said = setTimeout(() => ctx.say(ctx.line(ctx.payload.plays > 1 ? 'tpModeClassic' : 'tpIntro'), { hold: 2600 }), 500);
    else ctx.say(ctx.line('tpIntro'), { hold: 99999 });
    let lastMode = ctx.progress.mode;
    return {
      update(c) {
        sync(c);
        if (c.progress.mode && c.progress.mode !== lastMode) {
          lastMode = c.progress.mode;
          c.say(c.line({ classic: 'tpModeClassic', speedy: 'tpModeSpeedy', flip: 'tpModeFlip' }[lastMode]), { hold: 1600, compact: true });
          c.cyril.react(lastMode === 'speedy' ? 'shock' : 'delight');
        }
      },
      unmount() { clearTimeout(said); },
    };
  },
};
