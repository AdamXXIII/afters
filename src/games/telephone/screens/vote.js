// telephone-vote (best bit of the line just shown) and telephone-awards (moment of the night).
import './tp.css';
import { drawingView } from '../../../shared/drawing.js';
import { onTap } from '../../../ui/components.js';
import { h, av, who, tilt, kindLabel, TP_ICONS, cordSvg, timeline } from './kit.js';
import { fitToContent } from '../doodles.js';

const vote = {
  id: 'telephone-vote',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    const owner = ctx.player(p.ownerId);
    const top = h('div.tp-vote-head',
      h('div', h('div.t-eyebrow', `Rumour ${p.index + 1} of ${p.count} · ${owner?.name || ''}'s`), h('div.tp-vote-q', 'Best bit?')),
      h('div.tp-vote-sub', h('b', '+500'), h('span', 'a vote')));
    const views = [];
    const rank = (m) => (m.authorId === ctx.meId ? 2 : 0) + (m.kind === 'draw' ? 0 : 1);
    const list = [...p.moments].sort((a, b) => rank(a) - rank(b) || a.step - b.step);
    const tiles = list.map((m, i) => {
      const pl = ctx.player(m.authorId);
      const mine = m.authorId === ctx.meId;
      let inner;
      if (m.kind === 'draw') { const v = drawingView(fitToContent(m.drawing), { className: 'tp-vc-view' }); views.push(v); inner = v.el; } else inner = h('div.tp-vc-txt', { style: { '--fs': `${m.text.length > 44 ? 28 : m.text.length > 24 ? 34 : 42}px` } }, m.text);
      const btn = h('button.tp-vc-btn', { type: 'button', disabled: mine, 'data-e2e': mine ? 'moment-mine' : 'moment' },
        h('span', { html: TP_ICONS.star }), mine ? 'Yours' : 'This one!');
      const card = h(`div.tp-vc.k-${m.kind}${mine ? '.mine' : ''}`, { style: { '--pc': pl?.colour, '--tilt': `${tilt(ctx.phase.seed, m.key, 1.2)}deg` } },
        h('div.tp-vc-top', h('span.tp-vc-by', av(pl, { size: 22 }), h('b', pl?.name || '?'))),
        h('div.tp-vc-body', inner),
        btn);
      if (!mine) onTap(btn, () => { ctx.client.act('vote', { key: m.key }, { vote: m.key }); }, { sound: 'select', buzz: 'select' });
      card.btn = btn;
      return card;
    });
    const pages = [];
    for (let i = 0; i < tiles.length; i += 2) pages.push(h(`div.tp-vs-page${tiles[i + 1] ? '' : '.solo'}`, tiles[i], tiles[i + 1] ? h('div.tp-vs', 'VS') : null, tiles[i + 1] || null));
    const row = h('div.tp-vc-row.tp-vs-row', pages);
    const dots = h('div.tp-vc-dots', pages.map(() => h('i')));
    sheet.append(h('div.tp-sheet.tp-vote', top, row, dots));
    const syncDots = () => {
      const i = Math.round(row.scrollLeft / Math.max(1, (pages[0]?.offsetWidth || 1) + 12));
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
    };
    row.addEventListener('scroll', syncDots, { passive: true });
    requestAnimationFrame(syncDots);
    const sync = (c) => { const v = c.mine.game.vote; tiles.forEach((t, i) => { const on = list[i].key === v; t.classList.toggle('picked', on); t.btn.setAttribute('aria-pressed', String(on)); if (!t.classList.contains('mine')) t.btn.lastChild.textContent = on ? 'Picked!' : 'This one!'; }); };
    sync(ctx);
    const said = null;
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
      if (m.kind === 'draw') { view = drawingView(fitToContent(m.drawing, 40), { className: 'tp-aw-view' }); body = view.el; } else body = h('div.tp-aw-txt', m.text);
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
    show.append(h('div.tp-aw-scrim'), h('div.tp-aw', h('div.tp-aw-rays'), h('div.tp-aw-big', h('span', 'Best bit'), h('b', 'of the night!')), hero, plaques));
    const tl = timeline([
      { at: 0, fn: (c) => { c.cyril.react('drumroll', { duration: S(1400) }); if (!quiet) { c.audio.sfx('drumroll', { duration: S(1300) / 1000 }); c.say(c.line('tpAwards'), { hold: 1000, compact: true }); } } },
      { at: S(1400), fn: (c) => { hero.classList.add('in'); if (!quiet) { c.audio.sfx('fanfare'); c.stage.shake?.(); } c.cyril.react('delight'); if (m?.authorId === c.meId) c.haptic('win'); } },
      { at: S(3200), fn: () => plaques.classList.add('in') },
    ]);
    if (quiet) { hero.classList.add('in', 'still'); plaques.classList.add('in', 'still'); }
    tl.run(ctx);
    return { frame(c) { tl.run(c); hero.view?.frame(quiet ? null : Math.max(0, c.elapsed() - S(1500))); } };
  },
};

export { vote, awards };
