// forehead-pick: "Pick Dev's poison". The three decks are the only thing on screen: big, loud,
// tappable tiles with voters' avatars landing on them. The guesser watches and taps I'm ready.
import './forehead.css';
import { h, button, timerRing } from '../../../ui/components.js';
import { deckIcon, disc, teamOf, TEAMS, armGuesser, HEAD_SVG, CYRIL_BADGE } from './kit.js';

export default {
  id: 'forehead-pick',
  layout: 'show',
  shot: 'vote',
  rail: false,
  mount({ show }, ctx0) {
    let ctx = ctx0;
    const p = ctx.payload;
    const g = ctx.player(p.guesserId);
    const meG = p.guesserId === ctx.meId;
    const myTeam = teamOf(p.teams, ctx.meId);
    const canVote = !meG && (!p.team || myTeam === p.team);

    const ring = timerRing();
    const head = h('div.fh-pk-head',
      h('div.fh-pk-titles',
        h('div.fh-pk-eyebrow', disc(g, { size: 30 }), `Bonce ${p.turn} of ${p.of}${p.team ? ` · ${TEAMS[p.team].name}` : ''}`),
        h('div.fh-pk-title', meG ? h('span', 'Your', h('br'), 'fate') : h('span', `Pick ${g?.name || '?'}'s`, h('br'), 'poison'))),
      h('div.fh-ring', ring));
    const mascot = h('div.fh-pk-mascot', h('i', { html: HEAD_SVG }), disc(g, { size: 40, cls: '.badge' }));

    const tiles = p.decks.map((d, i) => {
      const votes = h('span.fh-pk-votes');
      const tile = h(`${canVote ? 'button' : 'div'}.fh-pk-tile`, { type: canVote ? 'button' : undefined, 'data-e2e': canVote ? 'fh-deck' : undefined, style: { '--dc': d.colour, '--i': i } },
        h('i.fh-pk-icon', { html: deckIcon(d.icon) }),
        h('span.fh-pk-txt', h('b', d.name), h('small', d.blurb)),
        votes);
      tile.votes = votes;
      tile.deck = d.id;
      if (canVote) tile.addEventListener('click', () => { ctx.client.act('fh-vote', { deck: d.id }, { vote: d.id }); ctx.haptic('select'); ctx.audio.sfx('select'); paint(); });
      return tile;
    });

    const foot = h('div.fh-pk-foot');
    let readyBtn = null;
    if (meG) {
      readyBtn = button('I\'m ready', { kind: 'candle',
        e2e: 'fh-ready',
        onClick: async () => {
          readyBtn.disabled = true;
          readyBtn.textContent = 'Bonce on!';
          ctx.client.act('fh-ready', {}, { ready: true });
          await armGuesser();
        },
      });
      foot.append(h('div.fh-pk-prep', h('i', { html: HEAD_SVG }), h('span', h('b', 'Phone sideways, screen out, on your forehead.'), ' Nod for got it, tip back to pass.')), readyBtn);
    } else if (!canVote) {
      foot.append(h('div.fh-pk-note', h('i', { html: CYRIL_BADGE }), h('span', h('b', 'Your job: catch them cheating.'), ' Say any word on the card and it\'s a FOUL.')));
    } else {
      foot.append(h('div.fh-pk-note', h('i', { html: CYRIL_BADGE }), h('span', ctx.line('fhPick', { name: g?.name || 'them' }).join(' '))));
    }
    const root = h(`div.fh-pick.fh-burst.claret${canVote ? '.can' : ''}`, head, mascot, h('div.fh-pk-tiles', tiles), foot);
    show.append(root);
    if (!ctx.frozen) tiles.forEach((t, i) => t.animate([{ transform: 'translateY(60px) rotate(6deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: 80 + i * 90, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' }));

    const paint = () => {
      const votes = ctx.progress.votes || {};
      const mine = ctx.mine.game.vote || votes[ctx.meId];
      const counts = p.decks.map((d) => Object.values(votes).filter((v) => v === d.id).length + (mine === d.id && votes[ctx.meId] !== d.id ? 1 : 0));
      const top = Math.max(...counts);
      p.decks.forEach((d, i) => {
        const who = Object.entries(votes).filter(([, v]) => v === d.id).map(([id]) => id);
        if (mine === d.id && !who.includes(ctx.meId)) who.push(ctx.meId);
        const have = new Set([...tiles[i].votes.children].map((c) => c.dataset.id));
        for (const id of who) if (!have.has(id)) { const dsc = disc(ctx.player(id), { size: 32 }); dsc.dataset.id = id; tiles[i].votes.append(dsc); }
        for (const c of [...tiles[i].votes.children]) if (!who.includes(c.dataset.id)) c.remove();
        tiles[i].classList.toggle('lead', top > 0 && counts[i] === top);
        tiles[i].classList.toggle('on', mine === d.id);
        if (canVote) tiles[i].setAttribute('aria-pressed', String(mine === d.id));
      });
      if (readyBtn && (ctx.progress.ready || ctx.mine.game.ready)) { readyBtn.disabled = true; readyBtn.textContent = 'Bonce on!'; }
    };
    paint();
    return {
      update: (c) => { ctx = c; paint(); },
      frame(c) { ctx = c; ring.set(c.remaining(), c.duration); },
    };
  },
};
