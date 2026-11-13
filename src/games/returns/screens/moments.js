// Many Happy Returns: the big moments, full stage (show layout), the same on every phone.
// intro (how it plays), draw (a safe card), cake (the panic), out, win.
import { h, onTap } from '../../../ui/components.js';
import { KINDS } from '../cards.js';
import { cardFace, cardBack, cakeArt, disc, sayLater, sting, buzz, ownName, isMe, colourOf, seats } from './kit.js';

function skipBtn(ctx, show) {
  if (!ctx.isHost) return null;
  const b = h('button.rt-skip', { type: 'button', 'data-e2e': 'skip' }, 'Skip');
  onTap(b, () => ctx.client.skip());
  show.append(b);
  return (c) => b.classList.toggle('on', c.elapsed() > 2000 / (c.phase?.speed || 1));
}

// ---------- how it plays ----------
const intro = {
  id: 'returns-intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const cakes = p.cakes || 1;
    const panels = [
      { art: h('div.rt-pan-art', cardBack({ cls: '.mini' }), cardFace(ctx, { k: 'cake' }, { size: 'mini' })), t: 'On your turn, draw a card. Draw a birthday cake and you’re out.' },
      { art: h('div.rt-pan-art', cardFace(ctx, { k: 'breath' }, { size: 'mini' })), t: 'A Big Breath blows the candles out and saves you. You start with one.' },
      { art: h('div.rt-pan-art.fan', cardFace(ctx, { k: 'skip' }, { size: 'mini' }), cardFace(ctx, { k: 'pinch' }, { size: 'mini' }), cardFace(ctx, { k: 'steady' }, { size: 'mini' })), t: 'Before you draw, play cards to dodge, peek and stitch up your mates. Last one in wins.' },
    ];
    const card = h('div.rt-intro',
      h('div.rt-intro-h', h('span.rt-intro-cake', cakeArt('.tiny')), h('div', h('div.rt-intro-t', 'Many Happy Returns'), h('div.rt-intro-s', `${cakes} ${cakes === 1 ? 'cake' : 'cakes'} hidden in ${p.pile} cards`))),
      h('ol.rt-panels', panels.map((x, i) => h('li.rt-panel', { style: { '--i': i } }, x.art, h('p', x.t)))));
    show.append(h('div.rt-dim'), h('div.rt-cardwrap', card));
    if (!ctx.frozen) card.animate([{ transform: 'translateY(26px) rotate(-1.5deg) scale(.95)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
    const sk = skipBtn(ctx, show);
    ctx.cyril.react('shock', { duration: ctx.frozen ? 60000 : 1200 });
    const cancel = sayLater(ctx, ctx.line(p.plays > 1 ? 'rtIntroAgain' : 'rtIntro'), { delay: 900, hold: 3200, compact: false });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

// ---------- a safe draw ----------
const draw = {
  id: 'returns-draw',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const mine = isMe(ctx, p.by);
    const c = ctx.priv?.card;
    const face = mine && c ? cardFace(ctx, c, { size: 'big' }) : cardBack({ cls: '.big' });
    const flip = h(`div.rt-flip${mine ? '.mine' : ''}`, face, mine ? null : h('span.rt-stamp.safe', 'Safe'));
    const who = h('div.rt-momenth', disc(ctx, p.by, { size: 40, cls: '.ring' }),
      h('div', h('b', mine ? (p.auto ? 'Time’s up. You drew…' : 'You drew…') : `${ownName(ctx, p.by)} drew`),
        h('span', mine && c ? `${KINDS[c.k].name}. Phew, not a cake.` : 'Not a cake. Phew.')));
    show.append(h('div.rt-dim.soft'), h('div.rt-moment.draw', who, flip, seats(ctx, { highlight: p.by })));
    if (!ctx.frozen) { sting(ctx, 'flip'); if (mine) ctx.haptic('select'); }
    ctx.cyril.react('delight', { duration: ctx.frozen ? 60000 : 900 });
    const cancel = sayLater(ctx, ctx.line('rtSafe'), { delay: 800, hold: 1600 });
    return { unmount: cancel };
  },
};

// ---------- the cake ----------
const cake = {
  id: 'returns-cake',
  layout: 'show',
  shot: 'reveal',
  rail: false,
  mount({ show }, ctx) {
    const p = ctx.payload;
    const mine = isMe(ctx, p.by);
    const name = ownName(ctx, p.by);
    const art = cakeArt();
    const status = h('div.rt-cakestatus');
    let btn = null;
    if (mine && p.can) {
      btn = h('button.rt-blow', { type: 'button', 'data-e2e': 'rt-blow' },
        h('span.rt-blow-i', { html: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="20" r="9"/><path d="M10.5 17.2v.1M15.5 17.2v.1" stroke-width="3.4"/><circle cx="17.6" cy="22.6" r="1.8"/><path d="M23.5 18h9.5c2.2 0 3.2-2.6 1.5-4"/><path d="M24 23h12"/><path d="M23.5 28h7.5c2.2 0 3.2 2.6 1.5 4"/></svg>' }),
        h('span.rt-blow-t', h('b', 'Big Breath!'), h('small', 'Tap to blow them out')));
      onTap(btn, () => {
        if (ctx.mine.game.blown) return;
        ctx.client.act('rt-blow', {}, { blown: true });
      }, { sound: null, buzz: 'submit' });
    }
    const head = h('div.rt-cakeh',
      h('div.rt-cakewho', disc(ctx, p.by, { size: 34, cls: '.ring' }), h('span', mine ? 'You drew a' : `${name} drew a`)),
      h('div.rt-caket', 'Birthday cake!'),
      p.occ ? h('div.rt-occ', p.occ) : null);
    const wrap = h(`div.rt-cake${mine ? '.mine' : ''}${p.can ? '.can' : '.doomed'}`, h('div.rt-cakewash'), h('div.rt-cakebox', head, art, status), btn);
    show.append(wrap);
    let blownShown = false;
    const paint = (c) => {
      const blown = !!(c.mine.game.blown || c.progress?.blown || c.progress?.done?.[p.by]);
      if (blown && !blownShown) {
        blownShown = true;
        wrap.classList.add('blown');
        art.classList.add('out');
        if (!c.frozen) { sting(c, 'blow'); c.stage?.shake?.(0.004, 200); }
        c.cyril.react('delight', { duration: c.frozen ? 60000 : 1400 });
        c.cyril.setMood?.('calm');
        c.say(c.line('rtBlown'), { hold: 1800, placement: 'side', compact: true });
      }
      status.textContent = blown
        ? (mine ? 'Phew! Now hide it back in the pile.' : `${name} blew them out! The cake goes back in the pile.`)
        : p.can
          ? (mine ? 'You’ve got a Big Breath. Use it!' : `${name} has a Big Breath…`)
          : (mine ? 'No Big Breath. Oh no.' : `${name} has no Big Breath…`);
    };
    paint(ctx);
    let lastShock = 0;
    if (!ctx.frozen) {
      sting(ctx, 'cake');
      ctx.stage?.shake?.(0.012, 600);
      if (mine) buzz([120, 60, 120, 60, 300]); else buzz([60, 40, 60]);
    }
    ctx.cyril.react('shock', { duration: ctx.frozen ? 60000 : 900 });
    ctx.cyril.setMood?.('hurry');
    const cancel = blownShown ? () => {} : sayLater(ctx, ctx.line(mine && p.can ? 'rtBlow' : 'rtCake'), { delay: 250, hold: 2200 });
    return {
      update: paint,
      frame(c) {
        // Cyril keeps panicking until the candles are out
        if (c.frozen || blownShown) return;
        const t = c.elapsed();
        if (t - lastShock > 1100) { lastShock = t; c.cyril.react('shock', { duration: 900 }); }
      },
      unmount() { cancel(); ctx.cyril.setMood?.('calm'); },
    };
  },
};

// ---------- out ----------
const out = {
  id: 'returns-out',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const mine = isMe(ctx, p.by);
    const name = ownName(ctx, p.by);
    const place = p.place || 2;
    const ord = (n) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
    const card = h('div.rt-outcard', { style: { '--pc': colourOf(ctx, p.by) } },
      h('div.rt-outav', disc(ctx, p.by, { size: 96, cls: '.gone' }), h('span.rt-outsmoke', { html: '<svg viewBox="0 0 40 60" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 58c-8-10 8-16 0-28s8-16 0-28"/></svg>' })),
      h('div.rt-outt', mine ? 'You’re out' : `${name}’s out`),
      h('div.rt-outs', `${ord(place)} place`),
      p.occ ? h('div.rt-occ.dark', p.occ) : null,
      h('div.rt-outleft', `${p.alive.length} still in`));
    show.append(h('div.rt-dim'), h('div.rt-cardwrap.mid', card));
    if (!ctx.frozen) { sting(ctx, 'out'); if (mine) buzz([200, 80, 400]); }
    ctx.cyril.react('sad', { duration: ctx.frozen ? 60000 : 1400 });
    const cancel = sayLater(ctx, ctx.line(mine ? 'rtOutMe' : 'rtOut', { name }), { delay: 900 });
    return { unmount: cancel };
  },
};

// ---------- win ----------
const win = {
  id: 'returns-win',
  layout: 'show',
  shot: 'scores',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const mine = isMe(ctx, p.winner);
    const name = ownName(ctx, p.winner);
    const outs = (p.out || []).slice().reverse();
    const card = h('div.rt-wincard', { style: { '--pc': colourOf(ctx, p.winner) } },
      h('div.rt-winav', disc(ctx, p.winner, { size: 104, cls: '.ring' }), cakeArt('.crown')),
      h('div.rt-wint', mine ? 'You’re the last one in' : `${name} is the last one in`),
      h('div.rt-wins', 'Survived every cake.'),
      h('ol.rt-winlist', outs.map((id, i) => h('li', h('span.n', String(i + 2)), disc(ctx, id, { size: 24 }), h('span.nm', isMe(ctx, id) ? 'You' : ownName(ctx, id))))));
    show.append(h('div.rt-dim'), h('div.rt-cardwrap.mid', card));
    if (!ctx.frozen) { ctx.audio.sfx('fanfare'); if (mine) ctx.haptic('win'); }
    ctx.cyril.react('delight', { duration: ctx.frozen ? 60000 : 1600 });
    const sk = skipBtn(ctx, show);
    const cancel = sayLater(ctx, ctx.line('rtWin', { name }), { delay: 900 });
    return { frame: (c) => sk?.(c), unmount: cancel };
  },
};

export default [intro, draw, cake, out, win];
