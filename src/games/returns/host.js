// Many Happy Returns host logic. Runs on the host phone only; talks to phones only through `api`.
// Push your luck from a shared pile. Draw a birthday cake and you're out, unless you hold a Big
// Breath (then you hide the cake back in the pile). Action cards before you draw: Peek, Skip,
// Shuffle, Pinch, Pass the Plate; anyone can Steady On a played card in a short window. Last one in
// wins. Rules + screens: ./DESIGN.md. AI-generated (Claude, Many Happy Returns builder, 2026-11-13).
import { KINDS, CAKES, deckPlan } from './cards.js';

export const RT = {
  intro: 12000, turn: 25000, turnAway: 3500, window: 3600, peek: 6500, draw: 2600,
  cake: 6500, cakeDoomed: 4200, tuck: 12000, out: 4800, win: 7000,
};

const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export class ReturnsHost {
  constructor(api) {
    this.api = api;
  }

  // ---------- setup ----------

  start() {
    const api = this.api;
    const rng = api.sub('rt-deal');
    const ids = api.players.map((p) => p.id);
    const plan = deckPlan(ids.length);
    let k = 0;
    const card = (kind, extra = {}) => ({ id: `c${++k}`, k: kind, f: Math.floor(rng() * 6), ...extra });
    let actions = [];
    for (const [kind, c] of Object.entries(plan.counts)) for (let i = 0; i < c; i++) actions.push(card(kind));
    actions = shuffle(actions, rng);
    this.hands = {};
    for (const id of ids) this.hands[id] = [card('breath'), ...actions.splice(0, plan.hand)];
    const occasions = api.take(CAKES, 'rt-cake', plan.cakes, rng);
    const cakes = Array.from({ length: plan.cakes }, (_, i) => card('cake', { occ: occasions[i]?.t || 'Somebody’s birthday.' }));
    const spare = Array.from({ length: plan.spareBreaths }, () => card('breath'));
    this.pile = shuffle([...actions, ...cakes, ...spare], rng);
    this.discard = [];
    this.order = shuffle(ids, rng); // seating order for turns
    this.alive = this.order.slice();
    this.outOrder = [];
    this.turnIdx = 0;
    this.turnsLeft = 1;
    this.chain = [];
    this.last = null;
    this.news = {};
    this.drawn = null;
    this.plays = 0;
    this.turnNo = 0;
    this.peekSeen = false;
    api.enter('returns-intro', RT.intro, { order: this.order, cakes: plan.cakes, pile: this.pile.length, plays: api.plays });
  }

  get turnId() { return this.alive[this.turnIdx % this.alive.length]; }

  // ---------- engine hooks ----------

  advance(id) {
    switch (id) {
      case 'returns-intro': return this._turn();
      case 'returns-turn': return this._draw(this.turnId, true); // time's up: draw for them
      case 'returns-play': return this._resolve();
      case 'returns-peek': return this._turn();
      case 'returns-draw': return this._endTurn(1);
      case 'returns-cake': return this._afterCake();
      case 'returns-tuck': return this._tuck(null);
      case 'returns-out': return this.alive.length <= 1 ? this._win() : this._turn();
      case 'returns-win': return this._finish();
      default:
    }
  }

  canSkip(phaseId, since) { return phaseId === 'returns-win' && since > 1500; }

  activeFor(phaseId, connected) {
    const who = this._actor();
    return who ? connected.filter((p) => p.id === who) : [];
  }

  onLeave(p) {
    // A phone that drops keeps its seat; its turns time out quickly (see _turn).
    if (this.api.phase.id === 'returns-turn' && this.turnId === p.id) this.api.hurry(RT.turnAway);
  }

  handle(p, msg, { fresh }) {
    if (!fresh || !this.hands) return;
    const ph = this.api.phase.id;
    const me = p.id;
    const hand = this.hands[me];
    if (!hand || !this.alive.includes(me)) return;
    switch (msg.type) {
      case 'rt-draw':
        if (ph === 'returns-turn' && me === this.turnId) this._draw(me, false);
        return;
      case 'rt-play': {
        if (ph !== 'returns-turn' || me !== this.turnId) return;
        const c = hand.find((x) => x.id === msg.cardId);
        if (!c || !KINDS[c.k]?.act) { this.api.reject(p, 'not-playable'); return; }
        let target = null;
        if (KINDS[c.k].target) {
          target = msg.target;
          if (!this.alive.includes(target) || target === me || !(this.hands[target]?.length)) { this.api.reject(p, 'bad-target'); return; }
        }
        hand.splice(hand.indexOf(c), 1);
        this.plays += 1;
        this.chain = [{ by: me, card: c, target }];
        this._window();
        return;
      }
      case 'rt-steady': {
        if (ph !== 'returns-play') return;
        const top = this.chain[this.chain.length - 1];
        if (!top || top.by === me) return;
        const c = hand.find((x) => x.k === 'steady');
        if (!c) { this.api.reject(p, 'no-steady'); return; }
        hand.splice(hand.indexOf(c), 1);
        this.chain.push({ by: me, card: c });
        this._window();
        return;
      }
      case 'rt-seen':
        if (ph === 'returns-peek' && me === this.turnId) { this.peekSeen = true; this.api.progress(); }
        return;
      case 'rt-blow':
        if (ph === 'returns-cake' && me === this.drawn?.by && this.drawn.can && !this.drawn.blown) { this.drawn.blown = true; this.api.progress(); }
        return;
      case 'rt-tuck':
        if (ph === 'returns-tuck' && me === this.drawn?.by) this._tuck(msg.pos);
        return;
      default:
    }
  }

  // ---------- helpers ----------

  _actor() {
    const ph = this.api.phase?.id;
    if (ph === 'returns-peek') return this.turnId;
    if (ph === 'returns-cake') return this.drawn?.can ? this.drawn.by : null;
    return null;
  }

  _counts() { return Object.fromEntries(this.order.map((id) => [id, this.hands[id]?.length || 0])); }

  _cakesLeft() { return this.pile.filter((c) => c.k === 'cake').length; }

  _base(extra = {}) {
    return {
      order: this.order, alive: this.alive.slice(), out: this.outOrder.slice(), turn: this.turnId, turnsLeft: this.turnsLeft,
      pile: this.pile.length, cakes: this._cakesLeft(), counts: this._counts(), discard: this.discard[this.discard.length - 1]?.k || null,
      turnNo: this.turnNo, ...extra,
    };
  }

  _priv(extra) {
    const news = this.news;
    return (pl) => ({ hand: (this.hands[pl.id] || []).map((c) => ({ id: c.id, k: c.k, f: c.f })), news: news[pl.id] || null, ...(extra ? extra(pl) : {}) });
  }

  // ---------- phases ----------

  _turn() {
    const id = this.turnId;
    const away = !this.api.player(id)?.connected;
    const last = this.last;
    this.last = null;
    this.api.enter('returns-turn', away ? RT.turnAway : RT.turn, this._base({ last }), {
      priv: this._priv(),
      progress: () => ({ done: {}, counts: {} }),
    });
    this.news = {};
  }

  _window() {
    const chain = this.chain.map((x) => ({ by: x.by, k: x.card.k, f: x.card.f, target: x.target || null }));
    const cancelled = chain.length % 2 === 0; // an even chain means the first card is cancelled
    const top = chain[chain.length - 1].by;
    this.api.enter('returns-play', RT.window, this._base({ chain, cancelled }), {
      priv: this._priv((pl) => ({ canSteady: pl.id !== top && this.alive.includes(pl.id) && this.hands[pl.id].some((c) => c.k === 'steady') })),
    });
  }

  _resolve() {
    const first = this.chain[0];
    if (!first) return this._turn();
    const cancelled = this.chain.length % 2 === 0;
    for (const x of this.chain) this.discard.push(x.card);
    this.chain = [];
    const by = first.by;
    const k = first.card.k;
    if (cancelled) {
      this.last = { kind: 'cancelled', by, k, target: first.target };
      return this._turn();
    }
    switch (k) {
      case 'peek':
        this.peekSeen = false;
        return this.api.enter('returns-peek', RT.peek, this._base({ by }), {
          priv: this._priv((pl) => (pl.id === by ? { top: this.pile.slice(0, 3).map((c) => ({ id: c.id, k: c.k, f: c.f })) } : {})),
          progress: () => ({ done: { [by]: !!this.peekSeen }, counts: {} }),
        });
      case 'skip':
        this.last = { kind: 'skip', by };
        return this._endTurn(1);
      case 'plate':
        this.last = { kind: 'plate', by, next: this.alive[(this.turnIdx + 1) % this.alive.length] };
        return this._endTurn(Infinity, 2);
      case 'shuffle':
        this.pile = shuffle(this.pile, this.api.sub(`shuffle-${this.plays}`));
        this.last = { kind: 'shuffle', by };
        return this._turn();
      case 'pinch': {
        const from = this.hands[first.target] || [];
        if (!from.length) { this.last = { kind: 'pinch-empty', by, target: first.target }; return this._turn(); }
        const c = from.splice(Math.floor(this.api.sub(`pinch-${this.plays}`)() * from.length), 1)[0];
        this.hands[by].push(c);
        this.last = { kind: 'pinch', by, target: first.target };
        this.news[by] = { kind: 'pinched', k: c.k, f: c.f, other: first.target };
        this.news[first.target] = { kind: 'lost', k: c.k, f: c.f, other: by };
        return this._turn();
      }
      default:
        return this._turn();
    }
  }

  _draw(id, auto) {
    const c = this.pile.shift();
    if (!c) return this._endTurn(1); // can't happen: a cake is always left while 2+ are in
    this.turnNo += 1;
    if (c.k === 'cake') {
      const can = this.hands[id].some((x) => x.k === 'breath');
      this.drawn = { by: id, card: c, can, blown: false, auto };
      return this.api.enter('returns-cake', can ? RT.cake : RT.cakeDoomed, this._base({ by: id, occ: c.occ, can, auto }), {
        priv: this._priv(),
        progress: () => ({ done: { [id]: !!this.drawn?.blown }, counts: {}, blown: !!this.drawn?.blown }),
      });
    }
    this.hands[id].push(c);
    this.drawn = null;
    this.last = { kind: 'drew', by: id, auto };
    return this.api.enter('returns-draw', RT.draw, this._base({ by: id, auto }), {
      priv: this._priv((pl) => (pl.id === id ? { card: { id: c.id, k: c.k, f: c.f } } : {})),
    });
  }

  _afterCake() {
    const d = this.drawn;
    if (!d) return this._turn();
    if (d.can) {
      const hand = this.hands[d.by];
      const bb = hand.find((x) => x.k === 'breath');
      hand.splice(hand.indexOf(bb), 1);
      this.discard.push(bb);
      return this.api.enter('returns-tuck', RT.tuck, this._base({ by: d.by, occ: d.card.occ }), {
        priv: this._priv(),
        progress: () => ({ done: {}, counts: {} }),
      });
    }
    // out: hand goes to the discard, seat goes dark, the next player (now at the same index) is up
    const who = d.by;
    this.discard.push(...this.hands[who], d.card);
    this.hands[who] = [];
    const idx = this.alive.indexOf(who);
    this.alive.splice(idx, 1);
    this.outOrder.push(who);
    this.turnIdx = this.alive.length ? idx % this.alive.length : 0;
    this.turnsLeft = 1;
    this.drawn = null;
    this.last = { kind: 'out', by: who };
    return this.api.enter('returns-out', RT.out, this._base({ by: who, occ: d.card.occ, place: this.alive.length + 1 }), { priv: this._priv() });
  }

  /** pos: 0 = top, 1, 2, 'bottom', or anything else = somewhere random. */
  _tuck(pos) {
    const d = this.drawn;
    if (!d || this.api.phase.id !== 'returns-tuck') return;
    let at;
    if (pos === 'bottom') at = this.pile.length;
    else if (Number.isInteger(pos) && pos >= 0 && pos <= 2) at = Math.min(pos, this.pile.length);
    else at = Math.floor(this.api.sub(`tuck-${this.turnNo}`)() * (this.pile.length + 1));
    this.pile.splice(at, 0, d.card);
    this.drawn = null;
    this.last = { kind: 'tucked', by: d.by };
    this._endTurn(1);
  }

  /** End `n` of the current player's turns (Infinity = all), then give the next player `next` turns. */
  _endTurn(n, next = 1) {
    this.turnsLeft -= n;
    if (this.turnsLeft > 0) return this._turn();
    this.turnIdx = (this.turnIdx + 1) % this.alive.length;
    this.turnsLeft = next;
    return this._turn();
  }

  _win() {
    const winner = this.alive[0];
    this.api.enter('returns-win', RT.win, this._base({ winner }), { priv: this._priv() });
  }

  _finish() {
    // place points: each place survived is worth 100, the last one in gets a 500 bonus
    const rank = [...this.outOrder, ...this.alive];
    const deltas = {};
    for (const p of this.api.players) {
      const i = rank.indexOf(p.id);
      deltas[p.id] = i < 0 ? 0 : (i + 1) * 100 + (i === rank.length - 1 ? 500 : 0);
    }
    this.api.addScores(deltas);
    this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
  }
}
