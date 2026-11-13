// Many Happy Returns: push your luck from a shared pile. Draw a birthday cake and you're out,
// unless you've a Big Breath to blow it out. Play cards before you draw to dodge, peek and stitch
// up your mates. Last one in wins. Rules + screens: ./DESIGN.md.
// AI-generated (Claude, Many Happy Returns builder, 2026-11-13).
import { ReturnsHost } from './host.js';

// ---------- demo rigging (only used by ?demo=; never in a real game) ----------
const H = (e) => e.game?.host;
const isTurn = (e) => e.phase.id === 'returns-turn';
/** Move the first card of kind `k` to the top of the pile. */
function topOf(h, k) {
  const i = h.pile.findIndex((c) => c.k === k);
  if (i > 0) h.pile.unshift(h.pile.splice(i, 1)[0]);
}
function safeTop(h) {
  const i = h.pile.findIndex((c) => c.k !== 'cake' && c.k !== 'breath');
  if (i > 0) h.pile.unshift(h.pile.splice(i, 1)[0]);
}
function give(h, id, k) {
  if (!h.hands[id].some((c) => c.k === k)) h.hands[id].push({ id: `demo-${k}-${id}`, k, f: 1 });
}
function strip(h, id, k) { h.hands[id] = h.hands[id].filter((c) => c.k !== k); }
/** Someone other than me who is still in. */
const other = (h, me) => h.alive.find((id) => id !== me);

/** On the first turn phase, make it `who`'s turn and run `fn(host, who, me)` to jump to the moment we want. */
function rig(match, fn) {
  return (e, me) => {
    const h = H(e);
    if (h?._rigged && match(e, me)) return true;
    if (!h || !isTurn(e) || h._rigged) return false;
    const who = fn.who === 'other' ? other(h, me) : me;
    if (!who) return false;
    if (h.turnId !== who) { h.turnIdx = h.alive.indexOf(who); h.turnsLeft = 1; }
    h._rigged = true;
    fn(h, who, me);
    return match(e, me);
  };
}
const asOther = (fn) => Object.assign(fn, { who: 'other' });
const playAs = (h, who, k, target = null) => {
  give(h, who, k);
  const c = h.hands[who].find((x) => x.k === k);
  h.hands[who].splice(h.hands[who].indexOf(c), 1);
  h.chain = [{ by: who, card: c, target }];
};

export default {
  id: 'returns',
  title: 'Many Happy Returns',
  dish: 'cake',            // menu illustration key (src/screens/menu-art.js); the cloche shows until it's drawn
  // Dish art notes for the menu (box team): a squat two-tier birthday cake on the trolley plate,
  // linen icing with a claret drip, five lit candles on top, one bent over and smoking,
  // a little paper party hat leaning on the plate. Chunky #3B1F18 outlines like the trifle.
  mood: ['loud', 'sneaky', 'rude'], // menu filters: loud, talky, sneaky, clever, drawing, rude (18+)
  course: 'A birthday cake. Candles lit. Cyril’s hiding under the table.',
  hint: 'Draw a cake, you’re out',
  tagline: 'Draw a card. Pray it isn’t cake.',
  blurb: 'Take turns drawing from the pile. Draw a birthday cake and you’re out, unless you’ve a Big Breath to blow it out. Dodge, peek and stitch up your mates. Last one in wins.',
  players: [2, 8],
  duo: 'A duel over one hidden birthday cake: draw it without a Big Breath and you lose.',
  minutes: 10,
  steps: [
    'Take turns drawing a card. Draw a birthday cake and you’re out; last one in wins.',
    'A Big Breath blows the candles out and saves you. You start with one.',
    'Before you draw, play cards to skip, peek or pinch. Each card says what it does.',
  ],
  hasAdult: true,
  colour: '#7A1E2C',
  tags: ['Cards', 'Push your luck', 'Sabotage'],
  createHost: (api) => new ReturnsHost(api),
  screens: () => import('./screens/index.js'),

  bot({ ph, client, later, rand, rng, still }) {
    const me = client.state.me;
    const p = ph.payload || {};
    const priv = ph.private || {};
    const hand = priv.hand || [];
    const mem = (client._rt ||= { peekTurn: -1, top: null, turnNo: -1, plays: 0 });
    const has = (k) => hand.find((c) => c.k === k);
    switch (ph.id) {
      case 'returns-turn': {
        if (p.turn !== me) return true;
        if (mem.turnNo !== p.turnNo) { mem.turnNo = p.turnNo; mem.plays = 0; }
        const known = mem.peekTurn === p.turnNo && p.last?.kind !== 'shuffle' ? mem.top : null;
        const risk = p.pile ? p.cakes / p.pile : 0;
        let card = null; let target = null;
        const others = (p.alive || []).filter((id) => id !== me && (p.counts?.[id] || 0) > 0);
        if (mem.plays < 3) {
          // someone just tucked a cake back: with two of you it's probably on top, so dodge
          const tucked = p.last?.kind === 'tucked' && p.last.by !== me && (p.alive || []).length === 2;
          if (known?.[0] === 'cake' || (tucked && !known && rng() < 0.7)) card = has('skip') || has('plate') || has('shuffle');
          else if (!known && rng() < risk * 1.6) card = (rng() < 0.5 ? has('plate') : null) || has('skip') || has('plate');
          if (!card && !known && has('peek') && rng() < 0.45) card = has('peek');
          if (!card && has('pinch') && others.length && rng() < 0.3) {
            card = has('pinch');
            target = others.sort((a, b) => (p.counts[b] || 0) - (p.counts[a] || 0))[0];
          }
          if (!card && !known && has('shuffle') && rng() < 0.12) card = has('shuffle');
        }
        later(rand(1500, 5000), () => {
          if (!still()) return;
          if (card) { mem.plays += 1; client.act('rt-play', { cardId: card.id, target }, { played: card.id }); } else client.act('rt-draw', {}, { drew: true });
        });
        return true;
      }
      case 'returns-play': {
        if (!priv.canSteady) return true;
        const first = p.chain?.[0] || {};
        const cancelled = !!p.cancelled;
        const next = p.alive?.[(p.alive.indexOf(p.turn) + 1) % p.alive.length];
        const hurtsMe = first.target === me || (first.k === 'plate' && next === me);
        const chance = (hurtsMe && !cancelled) || (cancelled && first.by === me) ? 0.6 : 0.1;
        if (rng() < chance) later(rand(600, 2400), () => { if (still()) client.act('rt-steady', {}, { steadied: true }); });
        return true;
      }
      case 'returns-peek':
        if (p.by !== me) return true;
        mem.peekTurn = p.turnNo;
        mem.top = (priv.top || []).map((c) => c.k);
        later(rand(1200, 3000), () => { if (still()) client.act('rt-seen', {}, { seen: true }); });
        return true;
      case 'returns-cake':
        if (p.by === me && p.can) later(rand(900, 2600), () => { if (still()) client.act('rt-blow', {}, { blown: true }); });
        return true;
      case 'returns-tuck': {
        if (p.by !== me) return true;
        const r = rng();
        const pos = r < 0.35 ? 0 : r < 0.5 ? 1 : r < 0.65 ? 'bottom' : 'random';
        later(rand(1500, 4500), () => { if (still()) client.act('rt-tuck', { pos }, { tucked: pos }); });
        return true;
      }
      default:
        return false; // intro, draw, out, win: let the box brain throw the odd bread roll
    }
  },

  resolveScreen(state) {
    const ph = state.phase;
    if (!ph || ph.game !== 'returns') return null;
    const p = ph.payload || {};
    const me = state.me;
    if (ph.id === 'returns-turn') return p.turn === me ? 'returns-myturn' : 'returns-watch';
    if (ph.id === 'returns-peek') return p.by === me ? 'returns-peek' : 'returns-peekwatch';
    if (ph.id === 'returns-tuck') return p.by === me ? 'returns-tuck' : 'returns-tuckwatch';
    return null;
  },

  demos: {
    'returns-intro': { match: (e) => e.phase.id === 'returns-intro', t: 3200 },
    'returns-myturn': {
      match: rig((e, me) => isTurn(e) && e.phase.payload.turn === me, (h, me) => {
        give(h, me, 'pinch'); give(h, me, 'skip'); give(h, me, 'steady'); h.turnsLeft = 2;
        h.last = { kind: 'plate', by: other(h, me), next: me };
        h._turn();
      }), me: 'idle', bots: 'idle', t: 7000,
    },
    'returns-yourturn': {
      match: rig((e, me) => isTurn(e) && e.phase.payload.turn === me, (h, me) => { give(h, me, 'skip'); h._turn(); }),
      me: 'idle', bots: 'idle', t: 500,
    },
    'returns-watch': {
      match: rig((e, me) => isTurn(e) && e.phase.payload.turn !== me, asOther((h, who, me) => {
        give(h, me, 'steady'); h.last = { kind: 'drew', by: me }; h._turn();
      })), me: 'idle', bots: 'idle', t: 9000,
    },
    'returns-play': {
      match: rig((e) => e.phase.id === 'returns-play', asOther((h, who, me) => {
        give(h, me, 'steady'); give(h, me, 'peek');
        playAs(h, who, 'pinch', me); h._window();
      })), me: 'idle', bots: 'idle', t: 1500,
    },
    'returns-steadied': {
      match: rig((e) => e.phase.id === 'returns-play', asOther((h, who, me) => {
        const third = h.alive.find((id) => id !== me && id !== who) || who;
        playAs(h, who, 'plate');
        give(h, third, 'steady');
        const s = h.hands[third].find((c) => c.k === 'steady');
        h.hands[third].splice(h.hands[third].indexOf(s), 1);
        h.chain.push({ by: third, card: s });
        give(h, me, 'steady');
        h._window();
      })), me: 'idle', bots: 'idle', t: 1200,
    },
    'returns-peek': {
      match: rig((e) => e.phase.id === 'returns-peek', (h, me) => {
        safeTop(h);
        const i = h.pile.findIndex((c) => c.k === 'cake');
        if (i > 1) h.pile.splice(1, 0, h.pile.splice(i, 1)[0]);
        playAs(h, me, 'peek'); h._resolve();
      }), me: 'idle', bots: 'idle', t: 2400,
    },
    'returns-peekwatch': {
      match: rig((e) => e.phase.id === 'returns-peek', asOther((h, who) => { playAs(h, who, 'peek'); h._resolve(); })),
      me: 'idle', bots: 'idle', t: 2400,
    },
    'returns-draw': {
      match: rig((e) => e.phase.id === 'returns-draw', (h, me) => { safeTop(h); h._draw(me, false); }),
      me: 'idle', bots: 'idle', t: 2000,
    },
    'returns-drawwatch': {
      match: rig((e) => e.phase.id === 'returns-draw', asOther((h, who) => { safeTop(h); h._draw(who, false); })),
      me: 'idle', bots: 'idle', t: 2000,
    },
    'returns-cake': {
      match: rig((e) => e.phase.id === 'returns-cake', (h, me) => { give(h, me, 'breath'); topOf(h, 'cake'); h._draw(me, false); }),
      me: 'idle', bots: 'idle', t: 2600,
    },
    'returns-cake-doomed': {
      match: rig((e) => e.phase.id === 'returns-cake', (h, me) => { strip(h, me, 'breath'); topOf(h, 'cake'); h._draw(me, false); }),
      me: 'idle', bots: 'idle', t: 2600,
    },
    'returns-cake-watch': {
      match: rig((e) => e.phase.id === 'returns-cake', asOther((h, who) => { give(h, who, 'breath'); topOf(h, 'cake'); h._draw(who, false); })),
      me: 'idle', bots: 'idle', t: 2200,
    },
    'returns-blown': {
      match: rig((e) => e.phase.id === 'returns-cake', (h, me) => {
        give(h, me, 'breath'); topOf(h, 'cake'); h._draw(me, false); h.drawn.blown = true; h.api.progress();
      }), me: 'idle', bots: 'idle', t: 1500,
    },
    'returns-tuck': {
      match: rig((e) => e.phase.id === 'returns-tuck', (h, me) => { give(h, me, 'breath'); topOf(h, 'cake'); h._draw(me, false); h._afterCake(); }),
      me: 'idle', bots: 'idle', t: 2500,
    },
    'returns-tuckwatch': {
      match: rig((e) => e.phase.id === 'returns-tuck', asOther((h, who) => { give(h, who, 'breath'); topOf(h, 'cake'); h._draw(who, false); h._afterCake(); })),
      me: 'idle', bots: 'idle', t: 2500,
    },
    'returns-out': {
      match: rig((e) => e.phase.id === 'returns-out', asOther((h, who) => { strip(h, who, 'breath'); topOf(h, 'cake'); h._draw(who, false); h._afterCake(); })),
      me: 'idle', bots: 'idle', t: 2600,
    },
    'returns-out-me': {
      match: rig((e) => e.phase.id === 'returns-out', (h, me) => { strip(h, me, 'breath'); topOf(h, 'cake'); h._draw(me, false); h._afterCake(); }),
      me: 'idle', bots: 'idle', t: 2600,
    },
    // two of you (shoot with --players 2): the deal and the tuck read differently
    'returns-duo-intro': { match: (e) => e.phase.id === 'returns-intro', t: 3200 },
    'returns-duo-myturn': {
      match: rig((e, me) => isTurn(e) && e.phase.payload.turn === me, (h, me) => { give(h, me, 'pinch'); give(h, me, 'skip'); h.last = { kind: 'tucked', by: other(h, me) }; h._turn(); }),
      me: 'idle', bots: 'idle', t: 7000,
    },
    'returns-duo-tuck': {
      match: rig((e) => e.phase.id === 'returns-tuck', (h, me) => { give(h, me, 'breath'); topOf(h, 'cake'); h._draw(me, false); h._afterCake(); }),
      me: 'idle', bots: 'idle', t: 2500,
    },
    'returns-win': {
      match: rig((e) => e.phase.id === 'returns-win', (h, me) => {
        const rest = h.alive.filter((id) => id !== me);
        h.outOrder.push(...rest); h.alive = [me]; h.turnIdx = 0; h._win();
      }), me: 'idle', bots: 'idle', t: 3000,
    },
  },

  lines: {
    family: {
      rtIntro: [
        ['Many Happy Returns. There are birthday cakes in that pile.', 'Lit candles. I’m a candle. Do you see my problem?'],
        ['Somebody’s hidden cakes in the pile. With candles on.', 'I’ll be under the table.'],
      ],
      rtIntroAgain: [['More cakes. Who keeps baking these?'], ['Back again. I’ve barely stopped shaking.']],
      rtYourTurn: [['Your turn. Play something, or draw.'], ['Over to you. No pressure. Lots of pressure.'], ['The pile is waiting for you.']],
      rtTwoTurns: [['Two turns. Somebody passed you the plate.'], ['Double helping. Two turns for you.']],
      rtWatch: [['{name} is deciding. Look casual.'], ['All eyes on {name}.'], ['{name}’s hand is hovering…']],
      rtPlay: [['Ooh. Anyone want to stop that?'], ['Steady on, anyone?'], ['Bold. Very bold.']],
      rtSteadied: [['Steady on! Cancelled.'], ['Denied!'], ['Not today, thank you.']],
      rtPeek: [['A sneaky look. I saw nothing.'], ['Read it and keep a straight face.']],
      rtSafe: [['Phew. Not a cake.'], ['Safe. My wick stopped shaking.'], ['Just a card. Carry on.']],
      rtCake: [['CAKE! CANDLES! EVERYONE STAY CALM!'], ['A CAKE! Lit! Somebody hold me!'], ['Not the candles! Anything but the candles!']],
      rtBlow: [['Blow! BLOW! Quickly!'], ['Big breath! Now!']],
      rtBlown: [['Out! They’re out! I can breathe again.'], ['Saved! What lungs!']],
      rtTuck: [['Now hide it. Somewhere sneaky.'], ['Put it back. Anywhere you like. Evil laugh optional.']],
      rtTuckWatch: [['{name} is hiding the cake. Watch their face.'], ['Where’s it going, {name}? Don’t tell me.']],
      rtOut: [['{name} is out. Many happy returns.'], ['Goodnight, {name}. Have a slice.']],
      rtOutMe: [['You’re out. Have a slice and heckle.'], ['Out you go. You can still throw bread rolls.']],
      rtWin: [['{name} is the last one in. Happy birthday to them!'], ['{name} survived the cakes. Hero.']],
    },
    adult: {
      rtIntro: [
        ['Many Happy Returns. There are birthday cakes in that pile. Lit ones.', 'I’m a candle. This is a fucking horror film.'],
        ['Somebody’s hidden cakes in the pile, the absolute psychopath.', 'Draw one and you’re out. I’ll be under the table.'],
      ],
      rtIntroAgain: [['More cakes? Who keeps bringing these bastard things?']],
      rtYourTurn: [['Your turn. Don’t fuck it up.'], ['Play something or draw. Hurry up, I’m sweating wax.']],
      rtTwoTurns: [['Two turns. Somebody stitched you right up.']],
      rtWatch: [['{name} is thinking. Christ, it’s tense.'], ['Come on, {name}. Some of us are flammable.']],
      rtPlay: [['Oh, you sneaky sod. Anyone stopping that?'], ['Steady on, anyone? No? Bloody hell.']],
      rtSteadied: [['Steady on! Bollocks to that, then.'], ['Cancelled. Brutal.']],
      rtSafe: [['Phew. Not a cake. Carry on, you lucky sod.'], ['Safe. My wick unclenched.']],
      rtCake: [['CAKE! FUCKING CAKE! EVERYBODY PANIC!'], ['Oh shit. Oh shit. It’s got CANDLES on!'], ['A CAKE! Lit! I can’t look!']],
      rtBlow: [['BIG BREATH! Now, for fuck’s sake!']],
      rtBlown: [['Out! Thank fuck for that.'], ['Saved! Lungs like a bloody bagpiper.']],
      rtTuck: [['Now hide it where it hurts. Go on, be a bastard.']],
      rtOut: [['{name} is out. Many happy returns, you poor sod.'], ['That’s {name} done. Pour them a drink.']],
      rtOutMe: [['You’re out. Get a drink and heckle.']],
      rtWin: [['{name} is the last one standing. Smug bastard.'], ['{name} wins. Nobody else blow on anything.']],
    },
  },
};
