// Odd Sock play screens: word (your secret word), clue (whose turn, out loud), vote (live),
// guess (the caught Odd Sock has one go at the table's word).
import { h, onTap, button, textField } from '../../../ui/components.js';
import { header, nameTape, washingLine, nameBtn, disc, sayLater, nameOf, you, colourOf, SPEAK, sockSvg } from './kit.js';

const word = {
  id: 'oddsock-word',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const w = ctx.priv?.word || '?';
    const hd = header(ctx, { title: 'Read your word', line: 'Keep it to yourself.' });
    const seats = washingLine(ctx, { order: p.order });
    show.append(h('div.os-top', hd, seats));
    const btn = button('Got it', { e2e: 'os-ready', onClick: () => ctx.client.act('os-ready', {}, { ready: true }) });
    const wait = h('div.os-hint');
    sheet.append(h('div.os-sheet.os-wordsheet.os-in',
      nameTape(w, { size: 'big' }),
      h('p.os-warn', h('b', 'One of you has a different word.'), ' Close, but different. It might be you. Nobody knows, not even them.'),
      h('div.os-actions', btn, wait)));
    const sync = (c) => {
      const ready = !!c.mine.game.ready || !!c.progress.done?.[c.meId];
      btn.disabled = ready;
      btn.textContent = ready ? 'Got it' : 'Got it';
      btn.classList.toggle('os-done', ready);
      const n = c.players.filter((pl) => c.progress.done?.[pl.id]).length;
      wait.textContent = ready ? `${n} of ${c.players.length} ready` : 'Tap when you’ve memorised it.';
      seats.querySelectorAll('.os-peg').forEach((el, i) => el.classList.toggle('in', !!c.progress.done?.[p.order[i]]));
    };
    sync(ctx);
    const cancel = sayLater(ctx, ctx.line(p.final ? 'osFinal' : 'osWord'), { delay: 700 });
    if (!ctx.frozen) ctx.haptic('select');
    return { update: sync, frame(c) { hd.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

const clue = {
  id: 'oddsock-clue',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const me = p.speaker === ctx.meId;
    const name = nameOf(ctx, p.speaker);
    const hd = header(ctx, { title: me ? 'Your turn' : `${name}’s turn`, line: me ? 'Say one word about your word, out loud.' : `${name} says one word, out loud.`, tone: me ? 'go' : '' });
    const line = washingLine(ctx, { order: p.order, turn: p.turn, lap: p.lap, laps: p.laps });
    show.append(h('div.os-top', hd, line));
    const nextId = p.turn + 1 < p.total ? p.order[(p.turn + 1) % p.order.length] : null;
    const tape = nameTape(ctx.priv?.word, { size: 'small' });
    let body;
    if (me) {
      const said = button('I’ve said it', { e2e: 'os-said', onClick: () => ctx.client.act('os-said', {}, { said: true }) });
      body = h('div.os-sheet.os-cluesheet.os-in.me',
        tape,
        h('div.os-say', h('span.os-say-ic', { html: SPEAK }), h('div', h('div.os-say-t', 'Say one word'), h('div.os-say-s', 'Close enough to prove you know it. Vague enough not to give it away.'))),
        h('div.os-actions', said));
    } else {
      const next = h('div.os-next', nextId
        ? (nextId === ctx.meId ? h('b', 'You’re next. Think of a word.') : ['Next: ', h('b', nameOf(ctx, nextId))])
        : h('b', 'Last clue. Then the vote.'));
      const nudge = ctx.isHost ? h('button.os-ghost', { type: 'button', 'data-e2e': 'os-next' }, `${name} has said it`) : null;
      if (nudge) onTap(nudge, () => ctx.client.act('os-said', {}, { said: true }));
      body = h('div.os-sheet.os-cluesheet.os-in',
        tape,
        h('div.os-listen', disc(ctx, p.speaker, { size: 52 }), h('div', h('div.os-say-t', `Listen to ${name}`), h('div.os-say-s', 'Does their word fit yours? Watch their face.'))),
        next, nudge);
    }
    sheet.append(body);
    const cancel = sayLater(ctx, me ? ctx.line('osYou') : p.turn === 0 ? ctx.line('osClue', { name }) : null, { delay: 500, hold: 2200 });
    if (me && !ctx.frozen) { ctx.haptic('win'); ctx.audio.sfx('pop'); }
    return { frame(c) { hd.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

/** Live tally on the show layer: avatars with vote piles under them. */
function tally(ctx, order) {
  const cells = new Map(order.map((id) => {
    const n = h('b.os-tn', '0');
    const by = h('div.os-by');
    return [id, { el: h('div.os-tcell', { style: { '--pc': colourOf(ctx, id) } }, h('div.os-tav', disc(ctx, id, { size: 34 }), n), h('span.nm', you(ctx, id)), by), n, by }];
  }));
  const el = h('div.os-tally', { style: { '--cols': order.length > 5 ? Math.ceil(order.length / 2) : order.length } }, [...cells.values()].map((c) => c.el));
  el.sync = (votes = {}) => {
    const counts = {};
    for (const to of Object.values(votes)) counts[to] = (counts[to] || 0) + 1;
    const top = Math.max(0, ...Object.values(counts));
    for (const [id, c] of cells) {
      const k = counts[id] || 0;
      if (c.n.textContent !== String(k)) { c.n.textContent = String(k); c.el.classList.remove('bump'); void c.el.offsetWidth; c.el.classList.add('bump'); }
      c.el.classList.toggle('hot', k > 0 && k === top);
      c.el.classList.toggle('some', k > 0);
      const from = Object.keys(votes).filter((f) => votes[f] === id);
      c.by.replaceChildren(...from.slice(0, 5).map((f) => disc(ctx, f, { size: 16 })));
    }
  };
  return el;
}

const vote = {
  id: 'oddsock-vote',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const hd = header(ctx, { title: 'Who’s the Odd Sock?', line: 'Argue out loud. Votes show live.', tone: 'claret' });
    const tl = tally(ctx, p.order);
    show.append(h('div.os-top', hd, tl));
    const btns = p.order.filter((id) => id !== ctx.meId).map((id) => {
      const b = nameBtn(ctx, id);
      onTap(b, () => {
        const to = ctx.mine.game.vote === id ? null : id;
        ctx.client.act('os-vote', { to }, { vote: to });
      }, { sound: 'select', buzz: 'select' });
      return b;
    });
    const hint = h('div.os-hint');
    sheet.append(h(`div.os-sheet.os-votesheet.os-in${btns.length > 5 ? '.many' : ''}`,
      h('div.os-voterow', h('div.os-ask', 'Vote for the Odd Sock'), nameTape(ctx.priv?.word, { size: 'small', label: 'Yours' })),
      h('div.os-picks', btns),
      hint));
    const sync = (c) => {
      const votes = c.progress.votes || {};
      tl.sync(votes);
      const mine = c.mine.game.vote !== undefined ? c.mine.game.vote : votes[c.meId] ?? null;
      for (const b of btns) b.setAttribute('aria-pressed', String(b.dataset.id === mine));
      const n = Object.keys(votes).length;
      hint.textContent = mine ? `Voted ${nameOf(c, mine)}. Change it any time. ${n} of ${c.players.length} voted.` : `Can’t be you, if you’re wondering. ${n} of ${c.players.length} voted.`;
      hint.classList.toggle('locked', !!mine);
    };
    sync(ctx);
    // no Cyril line here: his bubble would sit on the live tally
    return { update: sync, frame(c) { hd.timer.set(c.remaining(), c.duration); } };
  },
};

const guess = {
  id: 'oddsock-guess',
  layout: (ctx) => (ctx.payload?.sock === ctx.meId ? 'input' : 'split'),
  shot: (ctx) => (ctx.payload?.sock === ctx.meId ? 'write' : 'vote'),
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const me = p.sock === ctx.meId;
    const name = nameOf(ctx, p.sock);
    if (me) {
      const field = textField({ max: 30, placeholder: 'Their word', onSubmit: () => send(), e2e: 'os-guess-input' });
      const btn = button('Steal the round', { e2e: 'os-guess', onClick: () => send() });
      function send() {
        const t = field.input.value.trim();
        if (!t) { field.error(); return; }
        ctx.audio.sfx('plated'); ctx.haptic('submit');
        ctx.client.act('os-guess', { text: t }, { guess: t });
      }
      const sent = ctx.mine.game.guess;
      sheet.append(h('div.os-sheet.os-guesssheet.os-in',
        h('div.os-guesshead', h('span.os-guess-sock', { html: sockSvg({ body: '#E2553B', pattern: 'spot' }) }),
          h('div', h('div.os-title.dark', 'You’re the Odd Sock'), h('div.os-say-s', 'Everyone else had a different word. One guess. Get it and the round is yours.'))),
        nameTape(p.oddWord, { size: 'small', label: 'Yours was' }),
        sent ? h('div.os-sentguess', 'Guessed: ', h('b', sent)) : h('div.os-field', field),
        h('div.os-pay', h('b', `+${1500 * (p.mult || 1)}`), ' for you if you’re right. Nothing for anyone else.'),
        sent ? null : h('div.os-actions', btn)));
      if (ctx.frozen && ctx.demo) { field.input.value = 'Swimm'; field.input.dispatchEvent(new Event('input')); }
      else if (!sent) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
      const cancel = sayLater(ctx, ctx.line('osGuessYou'), { delay: 600 });
      let auto = false;
      return {
        frame(c) {
          if (auto || c.frozen || !c.duration || c.remaining() > 500 || c.mine.game.guess) return;
          auto = true;
          const t = field.input.value.trim();
          if (t) c.client.act('os-guess', { text: t }, { guess: t });
        },
        unmount: cancel,
      };
    }
    const hd = header(ctx, { title: `${name} gets one guess`, line: 'At your word. Faces still. Nobody help.', tone: 'claret' });
    show.append(h('div.os-top', hd));
    sheet.append(h('div.os-sheet.os-guesswait.os-in',
      h('div.os-caughtrow', h('div.os-caughtav', disc(ctx, p.sock, { size: 72 }), h('span.os-caught-sock', { html: sockSvg({ body: '#E2553B', pattern: 'spot' }) })),
        h('div', h('div.os-say-t', `${name} was the Odd Sock`), h('div.os-say-s', 'Their word was ', h('b', p.oddWord), '. If they guess yours, they steal the round.'))),
      nameTape(ctx.priv?.word || '', { size: 'small', label: 'Don’t say it' }),
      h('div.os-thinking', h('span.os-dots', h('i'), h('i'), h('i')), `${name} is thinking`)));
    const cancel = sayLater(ctx, ctx.line('osGuess', { name }), { delay: 600 });
    return { frame(c) { hd.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

export default [word, clue, vote, guess];
