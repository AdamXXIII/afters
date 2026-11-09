// telephone-vote (best bit of the line just shown) and telephone-awards (moment of the night).
import './tp.css';
import { drawingView } from '../../../shared/drawing.js';
import { onTap } from '../../../ui/components.js';
import { h, av, who, tilt, kindLabel, TP_ICONS, cordSvg, timeline } from './kit.js';

const vote = {
  id: 'telephone-vote',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const owner = ctx.player(p.ownerId);
    show.append(h('div.tp-vote-top',
      h('div.t-eyebrow', `Line ${p.index + 1} of ${p.count} · ${owner?.name || ''}'s rumour`),
      h('div.tp-vote-q', 'Best bit?'),
      h('div.tp-vote-sub', h('b', '+500'), ' a vote. Not your own.')));
    const views = [];
    const tiles = p.moments.map((m, i) => {
      const pl = ctx.player(m.authorId);
      const mine = m.authorId === ctx.meId;
      let inner;
      if (m.kind === 'draw') { const v = drawingView(m.drawing, { className: 'tp-tile-view' }); views.push(v); inner = v.el; } else inner = h('div.tp-tile-txt', { style: { '--fs': `${m.text.length > 44 ? 20 : m.text.length > 26 ? 23 : 27}px` } }, m.text);
      const b = h(`button.tp-tile.k-${m.kind}${mine ? '.mine' : ''}`, { type: 'button', 'aria-pressed': 'false', disabled: mine, 'data-e2e': mine ? 'moment-mine' : 'moment', style: { '--tilt': `${tilt(ctx.phase.seed, m.key, 1.6)}deg`, '--pc': pl?.colour, '--i': i } },
        h('span.tp-tile-n', String(m.step + 1)),
        inner,
        h('span.tp-tile-by', av(pl, { size: 18 }), h('span', mine ? 'Yours' : `${pl?.name || '?'} ${kindLabel(m.kind)}`)),
        h('span.tp-tile-tick', { html: TP_ICONS.star }));
      if (!mine) onTap(b, () => ctx.client.act('vote', { key: m.key }, { vote: m.key }), { sound: 'select', buzz: 'select' });
      return b;
    });
    sheet.append(h('div.tp-sheet.tp-vote', h('div.tp-grid', tiles)));
    const sync = (c) => { const v = c.mine.game.vote; tiles.forEach((t, i) => t.setAttribute('aria-pressed', String(p.moments[i].key === v))); };
    sync(ctx);
    const said = setTimeout(() => ctx.say(ctx.line('tpVote'), { hold: 1800, compact: true }), ctx.frozen ? 0 : 300);
    return { update: sync, frame() { views.forEach((v) => v.frame()); }, unmount() { clearTimeout(said); } };
  },
};

const awards = {
  id: 'telephone-awards',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const m = p.moment;
    const S = (ms) => ms / (ctx.phase.speed || 1);
    const quiet = ctx.frozen;
    let hero;
    if (m) {
      const pl = ctx.player(m.authorId);
      let body;
      let view = null;
      if (m.kind === 'draw') { view = drawingView(m.drawing, { className: 'tp-aw-view' }); body = view.el; } else body = h('div.tp-aw-txt', m.text);
      hero = h(`div.tp-aw-hero.k-${m.kind}`, { style: { '--pc': pl?.colour } },
        h('div.tp-aw-ribbon', h('span', { html: TP_ICONS.star }), 'Moment of the night'),
        m.kind === 'draw' && m.prompt ? h('div.tp-aw-prompt', 'Asked to draw: ', h('b', `“${m.prompt}”`)) : null,
        body,
        h('div.tp-aw-by', av(pl, { size: 46 }), h('div', h('div.tp-aw-name', pl?.name || '?'), h('div.tp-aw-votes', `${m.votes} vote${m.votes === 1 ? '' : 's'} from the table`)), h('span.tp-aw-pts', `+${m.votes * 500}`)));
      hero.view = view;
    } else {
      hero = h('div.tp-aw-hero.none', h('div.tp-aw-ribbon', 'Moment of the night'), h('div.tp-aw-txt', 'Nobody voted. I\'ll take that as stunned silence.'));
    }
    const plaque = (cls, title, b) => {
      if (!b) return null;
      const owner = ctx.player(b.ownerId);
      return h(`div.tp-plaque.${cls}`,
        h('div.t-eyebrow', title),
        h('div.tp-plaque-who', av(owner, { size: 22 }), h('b', `${owner?.name || '?'}'s rumour`)),
        h('div.tp-plaque-line', h('span', `“${b.first}”`), h('i', { html: cordSvg(30, 12, { loops: 2, stroke: 2 }) }), h('span', `“${b.last}”`)),
        cls === 'crossed' && b.crossedBy ? h('div.tp-plaque-foot', 'Wires crossed by ', who(ctx.player(b.crossedBy), { size: 16 })) : cls === 'straight' ? h('div.tp-plaque-foot', `${b.matches} guess${b.matches === 1 ? '' : 'es'} nailed`) : null);
    };
    const plaques = h('div.tp-plaques', plaque('straight', 'Straightest line', p.straight), plaque('crossed', 'Most crossed wires', p.crossed));
    show.append(h('div.tp-aw', h('div.tp-aw-rays'), hero, plaques));
    const tl = timeline([
      { at: 0, fn: (c) => { c.cyril.react('drumroll', { duration: S(1400) }); if (!quiet) { c.audio.sfx('drumroll', { duration: S(1300) / 1000 }); c.say(c.line('tpAwards'), { hold: 1200, compact: true }); } } },
      { at: S(1400), fn: (c) => { hero.classList.add('in'); if (!quiet) { c.audio.sfx('fanfare'); c.stage.shake?.(); } c.cyril.react('delight'); if (m?.authorId === c.meId) c.haptic('win'); } },
      { at: S(3200), fn: () => plaques.classList.add('in') },
      { at: S(4200), fn: (c) => c.say(c.line('tpAwardsDone'), { hold: quiet ? 99999 : 1800, compact: true }) },
    ]);
    if (quiet) { hero.classList.add('in', 'still'); plaques.classList.add('in', 'still'); }
    tl.run(ctx);
    return { frame(c) { tl.run(c); hero.view?.frame(quiet ? null : Math.max(0, c.elapsed() - S(1500))); } };
  },
};

export { vote, awards };
