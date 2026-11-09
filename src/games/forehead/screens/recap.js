// forehead-recap: the big end-of-turn recap. Hits and misses flip in, the score counts up,
// Cyril gives a verdict, the guesser names the top shouter, standings at the bottom.
import './forehead.css';
import { h, countUp } from '../../../ui/components.js';
import { ICONS } from '../../../ui/icons.js';
import { deckIcon, disc, S, TEAMS, releaseGuesser, rnd } from './kit.js';

const CLOCK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2.4" fill="none"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

export default {
  id: 'forehead-recap',
  layout: 'show',
  shot: 'scores',
  rail: true,
  mount({ show }, ctx0) {
    let ctx = ctx0;
    const p = ctx.payload;
    const g = ctx.player(p.guesserId);
    const meG = p.guesserId === ctx.meId;
    if (meG) releaseGuesser();
    const seed = ctx.phase.seed;
    const n = p.results.length;
    const step = Math.min(260, 3200 / Math.max(1, n));
    const T0 = S(ctx, 500);
    const T_DONE = T0 + S(ctx, step * n + 300);

    const big = h('b.fh-rc-big', '0');
    const pts = h('span.fh-rc-pts', '+0');
    const head = h('div.fh-rc-head',
      disc(g, { size: 54, cls: '.ring' }),
      h('div.fh-rc-headtxt',
        h('div.fh-eyebrow-dark', h('i', { html: deckIcon(p.deck.icon) }), `${p.deck.name}${p.team ? ` · ${TEAMS[p.team].name}` : ''}`),
        h('div.fh-rc-title', meG ? 'You got ' : `${g?.name || '?'} got `, big, '!', pts)));

    const tiles = p.results.map((r, i) => h(`div.fh-rc-tile.${r.r}`, { style: { '--i': i, '--rot': `${(rnd(seed, i) - 0.5) * 5}deg`, '--dc': p.deck.colour } },
      h('span.fh-rc-ic', { html: r.r === 'hit' ? ICONS.tick : r.r === 'time' ? CLOCK : r.r === 'foul' ? '!' : CROSS }),
      h('span.fh-rc-txt', r.text),
      r.bonus ? h('span.fh-rc-bonus', `+${r.bonus}`) : null));
    const grid = h(`div.fh-rc-grid${n > 12 ? '.dense' : ''}`, tiles);

    const shout = h('div.fh-rc-shout');
    const standings = h('div.fh-rc-stand');
    const root = h('div.fh-recap', head, grid, shout, standings);
    show.append(root);

    // ---- top shouter ----
    const paintShout = () => {
      const sid = ctx.progress.shout;
      if (sid) {
        if (shout.dataset.done === sid) return;
        shout.dataset.done = sid;
        const sp = ctx.player(sid);
        shout.replaceChildren(h('div.fh-shout-stamp', disc(sp, { size: 34 }), h('span', h('small', 'Top shouter'), h('b', sp?.name || '?')), h('em', '+150')));
        if (!ctx.frozen) { ctx.audio.sfx('stamp'); ctx.haptic('stamp'); ctx.stage.shake?.(); }
        ctx.say(ctx.line('fhShout', { name: sp?.name || 'Someone' }), { hold: 1600, compact: true, placement: 'side' });
        return;
      }
      if (shout.dataset.built) return;
      shout.dataset.built = '1';
      if (meG && p.shoutable.length) {
        shout.append(h('div.fh-shout-q', 'Who shouted best? +150'),
          h('div.fh-shout-row', p.shoutable.map((id) => {
            const pl = ctx.player(id);
            const b = h('button.fh-shout-btn', { type: 'button', 'data-e2e': 'fh-shout' }, disc(pl, { size: 40 }), h('span', pl?.name || '?'));
            b.addEventListener('click', () => { ctx.client.act('fh-shout', { id }, { shout: id }); ctx.haptic('select'); ctx.audio.sfx('select'); shout.querySelectorAll('button').forEach((x) => { x.disabled = true; }); b.classList.add('on'); });
            return b;
          })));
      } else if (p.shoutable.length) {
        shout.append(h('div.fh-shout-wait', h('span.fh-dots', h('i'), h('i'), h('i')), `${g?.name || 'They'}'s picking the top shouter. Look helpful.`));
      }
    };

    // ---- standings ----
    const paintStand = () => {
      const sc = ctx.progress.scores || p.scores;
      if (sc.teams) {
        const a = sc.teams.gravy; const b = sc.teams.custard;
        const tot = Math.max(1, a + b);
        standings.replaceChildren(h('div.fh-teams',
          h('div.fh-team.gravy', { style: { flex: `${Math.max(0.2, a / tot)}` } }, h('span', 'Gravy'), h('b', String(a))),
          h('div.fh-team.custard', { style: { flex: `${Math.max(0.2, b / tot)}` } }, h('b', String(b)), h('span', 'Custard'))));
      } else {
        standings.replaceChildren(...sc.players.slice(0, 8).map((r, i) => {
          const pl = ctx.player(r.id);
          return h(`div.fh-st${i === 0 && r.score > 0 ? '.lead' : ''}`, disc(pl, { size: 26 }), h('span', pl?.name || '?'), h('b', r.score.toLocaleString('en-GB')));
        }));
      }
      if (p.nextId) standings.append(h('div.fh-next', `Next bonce: ${ctx.player(p.nextId)?.name || '?'}`));
      else if (p.last) standings.append(h('div.fh-next', 'Last bonce of the night'));
    };

    // ---- timeline ----
    let shown = 0;
    let verdict = false;
    const frame = (c) => {
      const t = c.elapsed();
      const want = t < T0 ? 0 : Math.min(n, Math.floor((t - T0) / S(c, step)) + 1);
      while (shown < want) {
        const tile = tiles[shown];
        tile.classList.add('in');
        if (!c.frozen) {
          tile.animate([{ transform: 'rotateY(90deg) scale(.8)', opacity: 0 }, { transform: 'rotate(var(--rot))', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });
          if (p.results[shown].r === 'hit') c.audio.sfx('clink', { step: shown }); else c.audio.sfx('tap');
        }
        shown += 1;
        const hitsSoFar = p.results.slice(0, shown).filter((x) => x.r === 'hit').length;
        big.textContent = String(hitsSoFar);
      }
      if (!verdict && t >= T_DONE) {
        verdict = true;
        big.textContent = String(p.hits);
        if (c.frozen) pts.textContent = `+${p.points}`; else countUp(pts, 0, p.points, 600);
        if (!c.frozen) pts.animate([{ transform: 'scale(1.6) rotate(-8deg)' }, { transform: 'rotate(-4deg)' }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        root.classList.add('done');
        const key = p.hits === 0 ? 'fhRecap0' : p.hits <= 3 ? 'fhRecapLow' : p.hits <= 7 ? 'fhRecapMid' : 'fhRecapHigh';
        c.cyril.react(p.hits === 0 ? 'sad' : p.hits <= 3 ? 'smug' : p.hits <= 7 ? 'delight' : 'guffaw');
        if (p.hits > 7 && !c.frozen) c.audio.sfx('fanfare');
        if (!c.progress.shout) c.say(c.line(key, { n: p.hits }), { hold: 2000, compact: true, placement: 'side' });
      }
    };
    paintShout();
    paintStand();
    frame(ctx);
    return { frame: (c) => { ctx = c; frame(c); }, update: (c) => { ctx = c; paintShout(); paintStand(); } };
  },
};
