// forehead-pick: the table picks the guesser's poison (one of 3 decks); the guesser gets ready.
import './forehead.css';
import { h, button, timerRing } from '../../../ui/components.js';
import { deckIcon, disc, cyrilCard, HEAD_SVG, TILT_DOWN_SVG, TILT_UP_SVG, teamOf, TEAMS, armGuesser, rnd } from './kit.js';

export default {
  id: 'forehead-pick',
  layout: 'split',
  shot: 'vote',
  rail: false,
  mount({ show, sheet }, ctx0) {
    let ctx = ctx0;
    const p = ctx.payload;
    const g = ctx.player(p.guesserId);
    const meG = p.guesserId === ctx.meId;
    const myTeam = teamOf(p.teams, ctx.meId);
    const canVote = !meG && (!p.team || myTeam === p.team);
    const seed = ctx.phase.seed;

    // ---- show: whose bonce, the three decks with votes landing on them ----
    const ring = timerRing();
    const mini = p.decks.map((d, i) => {
      const votes = h('div.fh-mini-votes');
      const el = h('div.fh-mini', { style: { '--dc': d.colour, '--rot': `${(i - 1) * 7 + (rnd(seed, d.id) - 0.5) * 3}deg`, '--i': i } },
        h('i', { html: deckIcon(d.icon) }), h('b', d.name), votes);
      el.votes = votes;
      return el;
    });
    const head = h('div.fh-pick-head',
      h('div.fh-pick-who', disc(g, { size: 46 }), h('div',
        h('div.fh-eyebrow-dark', `Bonce ${p.turn} of ${p.of}${p.team ? ` · ${TEAMS[p.team].name}` : ''}`),
        h('div.fh-pick-name', meG ? 'Your bonce!' : `${g?.name || '?'}'s bonce`))),
      h('div.fh-ring', ring));
    const mod = p.modifier ? h('div.fh-mod-stamp', h('small', 'House rule'), h('b', p.modifier.name)) : null;
    show.append(h('div.fh-pick-show', head, h('div.fh-mini-row', mini), mod));

    // ---- sheet ----
    const page = h('div.fh-sheet');
    sheet.append(page);
    const opts = [];
    let readyBtn = null;
    if (meG) {
      readyBtn = button('I\'m ready', {
        e2e: 'fh-ready',
        onClick: async () => {
          readyBtn.disabled = true;
          readyBtn.textContent = 'Bonce on!';
          ctx.client.act('fh-ready', {}, { ready: true });
          await armGuesser();
        },
      });
      page.append(
        h('div.fh-prep',
          h('i.fh-prep-head', { html: HEAD_SVG }),
          h('div', h('div.fh-prep-title', 'Turn it sideways. Screen out. On your forehead.'),
            h('div.fh-prep-tilts', h('span', h('i', { html: TILT_DOWN_SVG }), 'Nod down: got it'), h('span', h('i', { html: TILT_UP_SVG }), 'Tip up: pass')))),
        h('div.fh-prep-note', 'They\'re picking your deck right now. Don\'t peek.'),
        h('div.fh-grow'), readyBtn);
    } else if (canVote) {
      page.append(h('div.fh-sheet-title', `Pick ${g?.name || 'their'}'s poison`));
      for (const d of p.decks) {
        const count = h('span.fh-opt-count');
        const b = h('button.fh-opt', { type: 'button', 'data-e2e': 'fh-deck', style: { '--dc': d.colour } },
          h('i', { html: deckIcon(d.icon) }), h('span.fh-opt-txt', h('b', d.name), h('small', d.blurb)), count);
        b.addEventListener('click', () => { ctx.client.act('fh-vote', { deck: d.id }, { vote: d.id }); ctx.haptic('select'); ctx.audio.sfx('select'); paint(); });
        b.count = count; b.deck = d.id;
        opts.push(b);
        page.append(b);
      }
    } else {
      page.append(h('div.fh-other-team',
        h('div.fh-sheet-title', `${TEAMS[p.team].name} are choosing`),
        h('div.fh-body', 'Your job this go: watch them like a hawk. If anyone says the word, slam FOUL.'),
        h('div.fh-foul-preview', 'FOUL!')));
    }

    const paint = () => {
      const votes = ctx.progress.votes || {};
      const mine = ctx.mine.game.vote || votes[ctx.meId];
      p.decks.forEach((d, i) => {
        const who = Object.entries(votes).filter(([, v]) => v === d.id).map(([id]) => id);
        if (mine === d.id && !who.includes(ctx.meId)) who.push(ctx.meId);
        const have = new Set([...mini[i].votes.children].map((c) => c.dataset.id));
        for (const id of who) if (!have.has(id)) { const dsc = disc(ctx.player(id), { size: 26 }); dsc.dataset.id = id; mini[i].votes.append(dsc); }
        for (const c of [...mini[i].votes.children]) if (!who.includes(c.dataset.id)) c.remove();
        mini[i].classList.toggle('lead', who.length > 0 && who.length === Math.max(...p.decks.map((x) => Object.values(votes).filter((v) => v === x.id).length)));
        const b = opts.find((o) => o.deck === d.id);
        if (b) { b.classList.toggle('on', mine === d.id); b.setAttribute('aria-pressed', String(mine === d.id)); b.count.textContent = who.length ? `${who.length}` : ''; }
      });
      if (readyBtn && (ctx.progress.ready || ctx.mine.game.ready)) { readyBtn.disabled = true; readyBtn.textContent = 'Bonce on!'; }
    };
    paint();
    const key = meG ? 'fhPickMe' : 'fhPick';
    const quip = cyrilCard(p.modifier ? ctx.line(`fhMod_${p.modifier.id}`) : ctx.line(key, { name: g?.name || 'them' }));
    if (canVote) page.append(quip); else page.insertBefore(quip, page.querySelector('.fh-grow') || null);
    return {
      update: (c) => { ctx = c; paint(); },
      frame(c) { ctx = c; ring.set(c.remaining(), c.duration); },
    };
  },
};
