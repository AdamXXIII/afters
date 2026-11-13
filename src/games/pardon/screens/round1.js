// Pardon? intro, round cards, and Round 1 "Say What?": the reader's card (private), the table's
// listening screen (the card appears for everyone at the steal mark), and the reveal.
import { h, onTap, timerRing } from '../../../ui/components.js';
import { say, disc, colourOf, gibCard, skipBtn, standings, HINT, TRUMPET, EYE, MOUTH, easeOut } from './kit.js';

const ROUNDS = {
  1: { name: 'Say What?', rule: 'One reads nonsense aloud. The rest shout what it really says.', pts: 'Guess it: 1000 · Reader: up to 500' },
  2: { name: 'Hum Along', rule: 'Cyril plays a tune. Tap its name. Faster is more.', pts: 'Up to 1200 a tune · last two count double' },
  3: { name: 'Mishearing', rule: 'Write your own misheard version of a famous line. Vote the funniest.', pts: '300 a vote · 500 for the funniest' },
};

// ---------- intro ----------
const intro = {
  id: 'pardon-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const steps = ctx.game?.steps || [];
    const card = h('div.pd-card',
      h('div.pd-card-art', { html: TRUMPET }),
      h('div.pd-card-title', 'Pardon?'),
      h('ol.pd-how', steps.map((s, i) => h('li', h('span.n', String(i + 1)), h('span', s)))));
    show.append(h('div.pd-dim'), h('div.pd-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(30px) rotate(-3deg) scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 650, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    const sk = skipBtn(ctx, show);
    const cancel = say(ctx, ctx.line(ctx.payload.plays > 1 ? 'pdIntroAgain' : 'pdIntro'), { hold: 2800 }, 900);
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

// ---------- round card ----------
const round = {
  id: 'pardon-round',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const r = ROUNDS[p.round];
    const card = h(`div.pd-card.r${p.round}`,
      h('div.pd-card-num', ['Round one', 'Round two', 'Round three'][p.round - 1]),
      h('div.pd-card-title', r.name),
      h('div.pd-card-rule', r.rule),
      h('div.pd-card-pts', r.pts),
      p.rows ? standings(ctx, p.rows) : null);
    show.append(h('div.pd-dim'), h('div.pd-cardwrap', card));
    if (!ctx.frozen) {
      card.animate([{ transform: 'translateY(40px) rotate(4deg) scale(.9)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
      ctx.audio.sfx(p.round === 2 ? 'curtain' : 'bell');
    }
    const sk = skipBtn(ctx, show);
    return { frame: (c) => sk?.(c) };
  },
};

// ---------- the reader ----------
const read = {
  id: 'pardon-read',
  layout: 'split',
  shot: 'vote',
  rail: false,
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const real = ctx.priv?.real || '';
    const timer = timerRing();
    const head = h('div.pd-readhead',
      timer,
      h('div.pd-readhead-t', h('b', 'Read this out loud'), h('span', HINT[p.hint] || p.hint)),
      h('span.pd-count', `${p.index + 1}/${p.count}`));
    const accent = p.accent ? h('div.pd-accent', h('span.ic', { html: MOUTH }), h('span', 'Do it as ', h('b', p.accent))) : null;
    const card = h('div.pd-readcard', head, gibCard(p.say), accent);
    // peek: press and hold to see what it really says (so the reader knows when someone's got it)
    const peek = h('button.pd-peek', { type: 'button', 'data-e2e': 'pd-peek' },
      h('span.ic', { html: EYE }), h('span.lb', 'Hold to see the answer'), h('span.ans', real));
    const on = (e) => { e.preventDefault(); peek.classList.add('on'); };
    const off = () => peek.classList.remove('on');
    peek.addEventListener('pointerdown', on); peek.addEventListener('pointerup', off);
    peek.addEventListener('pointerleave', off); peek.addEventListener('pointercancel', off);
    peek.addEventListener('contextmenu', (e) => e.preventDefault());
    card.append(peek);
    show.append(h('div.pd-top', card));

    const others = ctx.players.filter((x) => x.id !== p.reader);
    let sent = !!ctx.mine.game.sent;
    const send = (id, el) => {
      if (sent) return;
      sent = true;
      ctx.client.act('pd-got', { id }, { sent: true, id });
      ctx.audio.sfx(id === 'none' ? 'groan' : 'plated'); ctx.haptic('submit');
      el?.classList.add('picked');
      grid.classList.add('sent');
    };
    const grid = h(`div.pd-grid.n${Math.min(others.length, 7)}`, others.map((pl) => {
      const b = h('button.pd-who', { type: 'button', 'data-e2e': `pd-got-${pl.id}`, style: { '--pc': colourOf(pl) } }, disc(pl, { size: 44 }), h('span.nm', pl.name));
      onTap(b, () => send(pl.id, b), { sound: 'select', buzz: 'select' });
      return b;
    }));
    const nobody = h('button.pd-nobody', { type: 'button', 'data-e2e': 'pd-got-none' }, 'Nobody got it');
    onTap(nobody, () => send('none', nobody));
    const stealNote = h('div.pd-stealnote');
    sheet.append(h('div.pd-sheet.pd-in',
      h('div.pd-ask', 'Who said it first?'),
      grid,
      h('div.pd-sheet-foot', stealNote, nobody)));
    if (sent) grid.classList.add('sent');
    const cancel = say(ctx, ctx.line('pdRead'), { hold: 2200 }, 500);
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1200 });
    return {
      update(c) { if (c.mine.game.sent) { sent = true; grid.classList.add('sent'); } },
      frame(c) {
        timer.set(c.remaining(), c.duration);
        const left = Math.ceil((p.stealAt - c.elapsed()) / 1000);
        stealNote.textContent = left > 0 ? `Everyone sees the card in ${left}s` : 'Everyone can see it now. Steals score 500.';
        stealNote.classList.toggle('hot', left <= 0);
      },
      unmount: cancel,
    };
  },
};

// ---------- everyone else ----------
const listen = {
  id: 'pardon-listen',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const reader = ctx.player(p.reader);
    const timer = timerRing();
    const rings = h('div.pd-rings', h('i'), h('i'), h('i'));
    const hero = h('div.pd-listen', { style: { '--pc': colourOf(reader) } },
      h('div.pd-listen-av', rings, disc(reader, { size: 92 })),
      h('div.pd-listen-t', h('b', reader?.name || '?'), ' is reading'),
      h('div.pd-listen-hint', h('span', HINT[p.hint] || p.hint)),
      p.accent ? h('div.pd-accent.small', h('span.ic', { html: MOUTH }), h('span', 'in the voice of ', h('b', p.accent))) : null);
    show.append(h('div.pd-top.row', timer, h('span.pd-count.on-dark', `${p.index + 1}/${p.count}`)), hero);

    const bar = h('div.pd-wait-bar', h('i'));
    const waitBox = h('div.pd-shout',
      h('div.pd-shout-ic', { html: TRUMPET }),
      h('div.pd-shout-t', 'Shout what you hear'),
      h('div.pd-shout-s', 'Out loud. First to say the real phrase scores 1000.'),
      h('div.pd-wait', h('span.pd-wait-l'), bar));
    const stealBox = h('div.pd-stealbox',
      h('div.pd-stealbox-t', 'Your turn to read it'),
      gibCard(p.say, { size: 'm' }),
      h('div.pd-shout-s', 'Mutter it. First to shout the answer still gets 500.'));
    sheet.append(h('div.pd-sheet.pd-in', waitBox, stealBox));
    let stole = false;
    const cancel = say(ctx, ctx.line('pdListen', { name: reader?.name || 'Someone' }), { hold: 2200 }, 500);
    const frame = (c) => {
      timer.set(c.remaining(), c.duration);
      const t = c.elapsed();
      const k = Math.min(1, t / p.stealAt);
      bar.firstChild.style.transform = `scaleX(${k})`;
      waitBox.querySelector('.pd-wait-l').textContent = t < p.stealAt ? `Stuck? Everyone sees the card in ${Math.ceil((p.stealAt - t) / 1000)}s` : '';
      const s = t >= p.stealAt;
      if (s !== stole) {
        stole = s;
        sheet.firstChild.classList.toggle('stolen', s);
        if (s && !c.frozen) { ctx.audio.sfx('page'); ctx.haptic('select'); ctx.say(ctx.line('pdSteal'), { hold: 2000, placement: 'side' }); }
      }
      [...rings.children].forEach((r, i) => r.style.setProperty('--k', String(((t / 1600) + i / 3) % 1)));
    };
    frame(ctx);
    return { frame, unmount: cancel };
  },
};

// ---------- the reveal ----------
const said = {
  id: 'pardon-said',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const reader = ctx.player(p.reader);
    const got = p.got ? ctx.player(p.got) : null;
    const gib = gibCard(p.say, { size: 's', tilt: false });
    const real = h('div.pd-real', p.real);
    const stamp = got
      ? h(`div.pd-stamp${p.stolen ? '.steal' : ''}`, disc(got, { size: 40 }),
        h('div.pd-stamp-t', h('b', got.name), h('span', p.stolen ? `stole it · ${p.secs}s` : `got it · ${p.secs}s`)),
        h('div.pd-stamp-p', `+${p.deltas[p.got]}`))
      : h('div.pd-stamp.none', h('div.pd-stamp-t', h('b', 'Nobody got it'), h('span', 'Not a single ear')));
    const readerPts = p.deltas[p.reader] || 0;
    const readerRow = got && readerPts ? h('div.pd-reader-pts', disc(reader, { size: 26 }), h('span', p.quick ? `${reader?.name} read it fast` : `${reader?.name} read it`), h('b', `+${readerPts}`)) : null;
    const card = h('div.pd-saidcard', h('div.pd-said-what', 'It said'), gib, h('div.pd-arrow'), real);
    show.append(h('div.pd-said', card, stamp, readerRow));
    const quiet = ctx.frozen;
    const at = { flip: 700, stamp: 1500 };
    let k = 0;
    const run = (c) => {
      const t = c.elapsed();
      card.classList.toggle('flipped', t >= at.flip);
      real.style.setProperty('--k', String(easeOut((t - at.flip) / 500)));
      if (t >= at.flip && k < 1) { k = 1; if (!quiet) ctx.audio.sfx('truth'); }
      if (t >= at.stamp && k < 2) {
        k = 2;
        stamp.classList.add('in'); readerRow?.classList.add('in');
        ctx.cyril.react(got ? 'delight' : 'sad', { duration: quiet ? 60000 : 1200 });
        if (!quiet) {
          ctx.audio.sfx(got ? 'stamp' : 'groan'); ctx.stage.shake?.();
          if (p.got === ctx.meId) ctx.haptic('win'); else ctx.haptic('stamp');
          ctx.say(ctx.line(got ? (p.quick ? 'pdQuick' : 'pdGot') : 'pdNobody'), { hold: 2200, placement: 'side' });
        }
      }
    };
    run(ctx);
    return { frame: run };
  },
};

export default [intro, round, read, listen, said];
