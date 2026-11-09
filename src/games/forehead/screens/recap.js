// forehead-recap: one hero moment - "DEV GOT 7" - with the cards flipping into a hits/misses
// pile underneath, Cyril's verdict, then the top shouter (the guesser picks) and the leader line.
import './forehead.css';
import { h, countUp } from '../../../ui/components.js';
import { ICONS } from '../../../ui/icons.js';
import { deckIcon, disc, S, TEAMS, releaseGuesser, rnd, CYRIL_BADGE, PLATE_SVG } from './kit.js';


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
    const step = Math.min(240, 3000 / Math.max(1, n));
    const T0 = S(ctx, 400);
    const T_DONE = T0 + S(ctx, step * n + 250);

    const big = h('b.fh-hero-n', '0');
    const pts = h('span.fh-hero-pts', `+${p.points}`);
    const verdict = h('div.fh-hero-quip', h('i', { html: CYRIL_BADGE }), h('span'));
    const hero = h('div.fh-hero',
      h('div.fh-hero-who', disc(g, { size: 34 }), h('span', meG ? 'You got' : `${g?.name || '?'} got`)),
      h('div.fh-hero-row', big, pts),
      h('div.fh-hero-deck', h('i', { html: deckIcon(p.deck.icon) }), p.deck.name, p.team ? ` · ${TEAMS[p.team].name}` : ''),
      verdict);

    // hits are big place cards; misses are a small struck-through line underneath
    const hitsN = p.results.filter((r) => r.r === 'hit').length;
    const misses = h('div.fh-rc-misses');
    const tiles = p.results.map((r, i) => {
      if (r.r === 'hit') {
        return h('div.fh-rc-tile.hit', { style: { '--rot': `${(rnd(seed, i) - 0.5) * 16}deg`, '--dy': `${(rnd(seed, `y${i}`) - 0.5) * 10}px`, '--dc': p.deck.colour } },
          h('span.fh-rc-ic', { html: ICONS.tick }), h('span.fh-rc-txt', r.text), r.bonus ? h('span.fh-rc-bonus', `+${r.bonus}`) : null);
      }
      const m = h(`span.fh-rc-miss.${r.r}`, h('i', { html: r.r === 'time' ? CLOCK : r.r === 'foul' ? '!' : CROSS }), r.text);
      misses.append(m);
      return m;
    });
    const pile = h(`div.fh-rc-pile${hitsN > 8 ? '.dense' : ''}`, tiles.filter((t) => t.classList.contains('fh-rc-tile')), hitsN === 0 ? h('div.fh-rc-none', 'Not a', h('br'), 'sausage.') : null);
    const grid = h('div.fh-rc-plate', h('i.fh-plate', { html: PLATE_SVG }), pile);
    const shout = h('div.fh-rc-shout');
    const lead = h('div.fh-rc-lead');
    const root = h('div.fh-recap.fh-burst', hero, grid, misses, shout, lead);
    show.append(root);

    const paintShout = () => {
      const sid = ctx.progress.shout;
      if (sid) {
        if (shout.dataset.done === sid) return;
        shout.dataset.done = sid;
        const sp = ctx.player(sid);
        shout.replaceChildren(h('div.fh-shout-stamp', disc(sp, { size: 34 }), h('span', h('small', 'Top shouter'), h('b', sp?.name || '?')), h('em', '+100')));
        if (!ctx.frozen) { ctx.audio.sfx('stamp'); ctx.haptic('stamp'); }
        verdict.lastChild.textContent = ctx.line('fhShout', { name: sp?.name || 'Someone' }).join(' ');
        return;
      }
      if (shout.dataset.built) return;
      shout.dataset.built = '1';
      if (meG && p.shoutable.length) {
        shout.append(h('div.fh-shout-q', 'Who shouted best?'),
          h('div.fh-shout-row', p.shoutable.map((id) => {
            const pl = ctx.player(id);
            const b = h('button.fh-shout-btn', { type: 'button', 'data-e2e': 'fh-shout' }, disc(pl, { size: 36 }), h('span', pl?.name || '?'));
            b.addEventListener('click', () => { ctx.client.act('fh-shout', { id }, { shout: id }); ctx.haptic('select'); ctx.audio.sfx('select'); shout.querySelectorAll('button').forEach((x) => { x.disabled = true; }); b.classList.add('on'); });
            return b;
          })));
      } else if (p.shoutable.length) {
        shout.append(h('div.fh-shout-wait', `${g?.name || 'They'}'s picking the top shouter. Look helpful.`));
      }
    };
    const paintLead = () => {
      const sc = ctx.progress.scores || p.scores;
      let txt;
      if (sc.teams) txt = `Gravy ${sc.teams.gravy.toLocaleString('en-GB')} · Custard ${sc.teams.custard.toLocaleString('en-GB')}`;
      else { const top = sc.players[0]; txt = top && top.score > 0 ? `Top of the table: ${ctx.player(top.id)?.name} ${top.score.toLocaleString('en-GB')}` : ''; }
      const next = p.nextId ? `Next bonce: ${ctx.player(p.nextId)?.name || '?'}` : p.last ? 'Last bonce of the night' : '';
      lead.replaceChildren(h('span', txt), next ? h('b', next) : null);
    };

    let shown = 0;
    let done = false;
    const frame = (c) => {
      ctx = c;
      const t = c.elapsed();
      const want = t < T0 ? 0 : Math.min(n, Math.floor((t - T0) / S(c, step)) + 1);
      while (shown < want) {
        const tile = tiles[shown];
        tile.classList.add('in');
        if (!c.frozen) {
          tile.animate([{ transform: 'translateY(-30px) scale(1.3)', opacity: 0 }, { transform: 'rotate(var(--rot))', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' });
          if (p.results[shown].r === 'hit') { c.audio.sfx('clink'); big.animate([{ transform: 'scale(1.25)' }, { transform: 'none' }], { duration: 200 }); } else c.audio.sfx('tap');
        }
        shown += 1;
        big.textContent = String(p.results.slice(0, shown).filter((x) => x.r === 'hit').length);
      }
      if (!done && t >= T_DONE) {
        done = true;
        big.textContent = String(p.hits);
        root.classList.add('done');
        if (!c.frozen) { countUp(pts, 0, p.points, 500); pts.animate([{ transform: 'scale(2) rotate(-14deg)', opacity: 0 }, { transform: 'rotate(-6deg)', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
        const key = p.hits === 0 ? 'fhRecap0' : p.hits <= 3 ? 'fhRecapLow' : p.hits <= 7 ? 'fhRecapMid' : 'fhRecapHigh';
        c.cyril.react(p.hits === 0 ? 'sad' : p.hits <= 3 ? 'smug' : p.hits <= 7 ? 'delight' : 'guffaw');
        if (p.hits > 7 && !c.frozen) c.audio.sfx('fanfare');
        if (!c.progress.shout) verdict.lastChild.textContent = c.line(key, { n: p.hits }).join(' ');
        verdict.classList.add('in');
      }
    };
    paintShout();
    paintLead();
    frame(ctx);
    return { frame, update: (c) => { ctx = c; paintShout(); paintLead(); } };
  },
};
