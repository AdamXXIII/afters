// Bad Taste host logic. Runs on the host phone only; talks to phones only through `api`.
// Each round one player is the Critic. A prompt with a blank appears; everyone else plays one
// answer from a private hand of seven (or writes their own on the blank card). The Critic turns
// the answers over one at a time, reading them out, and crowns one. Anonymous until the crown.
// With only two answer-players (3 at the table) Cyril slips in a card from the deck too.
// See ./DESIGN.md.
import { PROMPTS, ANSWERS } from './content/index.js';

export const HAND = 7;
export const MAX = 48; // characters on a written card
export const DUR = {
  intro: 10000, play: 45000, judgeBase: 14000, judgePer: 10000, judgeMax: 100000,
  win: 9500, winPer: 700, playExtra: 15000,
};

export const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** Laps of Critics: everyone judges once; at 3 or 4 players everyone judges twice. */
export const roundsFor = (n) => (n <= 4 ? n * 2 : n);

export class BadTasteHost {
  constructor(api) {
    this.api = api;
    this.order = [];
    this.i = 0;
    this.hands = {};
    this.r = null;
  }

  start() {
    const api = this.api;
    const rng = api.sub('bt-plan');
    const ids = shuffle(api.players.map((p) => p.id), rng);
    const n = roundsFor(ids.length);
    this.order = Array.from({ length: n }, (_, k) => ids[k % ids.length]);
    this.prompts = api.take(PROMPTS, 'bt-p', n, rng);
    this.hands = {};
    for (const p of api.players) this.hands[p.id] = api.take(ANSWERS, 'bt-a', HAND, rng);
    this.i = 0;
    this.deciders = 0;
    this.decider = null;
    api.enter('badtaste-intro', DUR.intro, { rounds: n, plays: api.plays });
  }

  advance(id) {
    switch (id) {
      case 'badtaste-intro': return this._play();
      case 'badtaste-play': return this._judge();
      case 'badtaste-judge': return this._win();
      case 'badtaste-win':
        if (this.i + 1 < this.order.length || this._decider()) { this.i += 1; return this._play(); }
        return this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
      default:
    }
  }

  activeFor(phaseId, connected) {
    const r = this.r;
    if (!r) return connected;
    if (phaseId === 'badtaste-play') return connected.filter((p) => p.id !== r.critic && !this._out(p.id));
    if (phaseId === 'badtaste-judge') return connected.filter((p) => p.id === r.critic);
    return connected;
  }

  handle(p, msg, { fresh }) {
    if (!fresh) return;
    const r = this.r;
    const ph = this.api.phase.id;
    if (!r) return;
    switch (msg.type) {
      case 'bt-play': {
        const mine = r.played[p.id] || [];
        if (ph !== 'badtaste-play' || p.id === r.critic || mine.length >= r.per || this._out(p.id)) return;
        if (msg.text != null) {
          const t = this.api.clean(String(msg.text), MAX);
          if (!t) return this.api.reject(p, 'empty');
          if (mine.some((x) => x.written)) return;
          r.played[p.id] = [...mine, { text: t, written: true }];
        } else {
          const hand = this.hands[p.id] || [];
          const card = hand.find((c) => c.id === msg.cardId);
          if (!card || mine.some((x) => x.cardId === card.id)) return;
          r.played[p.id] = [...mine, { cardId: card.id, text: card.text, written: false }];
        }
        this.api.ack(p);
        this.api.progress();
        return;
      }
      case 'bt-flip': {
        if (ph !== 'badtaste-judge' || p.id !== r.critic || r.crowned != null) return;
        if (r.flipped < r.cards.length) { r.flipped += 1; r.focus = r.flipped - 1; }
        this.api.progress();
        return;
      }
      case 'bt-focus': {
        if (ph !== 'badtaste-judge' || p.id !== r.critic || r.crowned != null) return;
        const k = Number(msg.index);
        if (!Number.isInteger(k) || k < 0 || k >= r.flipped) return;
        r.focus = k;
        this.api.progress();
        return;
      }
      case 'bt-crown': {
        if (ph !== 'badtaste-judge' || p.id !== r.critic || r.crowned != null) return;
        const k = Number(msg.index);
        if (!Number.isInteger(k) || k < 0 || k >= r.cards.length || r.flipped < r.cards.length) return;
        r.crowned = k;
        r.focus = k;
        this.api.ack(p);
        this.api.progress();
        return;
      }
      default:
    }
  }

  /** A shared first place gets one deciding round, judged by someone who isn't in the tie. */
  _decider() {
    if (this.deciders >= 2) return false;
    const rows = this._rows();
    const top = rows.filter((r) => r.rank === 1).map((r) => r.id);
    if (top.length < 2) return false;
    const pool = this.api.connected.filter((p) => !top.includes(p.id));
    if (!pool.length) return false;
    const judge = pool[Math.floor(this.api.sub(`decider-${this.deciders || 0}`)() * pool.length)];
    this.deciders = (this.deciders || 0) + 1;
    this.order.push(judge.id);
    this.decider = new Set(top);
    const [q] = this.api.take(PROMPTS, 'bt-p', 1, this.api.sub('decider'));
    this.prompts.push(q || this.prompts[0]);
    return true;
  }

  // ---------- phases ----------

  _critic() {
    if (this.decider && this.i === this.order.length - 1 && this.api.connected.some((p) => p.id === this.order[this.i])) return this.order[this.i];
    // skip a Critic who has left the table
    const connected = new Set(this.api.connected.map((p) => p.id));
    for (let k = 0; k < this.order.length; k++) {
      const id = this.order[(this.i + k) % this.order.length];
      if (connected.has(id)) return id;
    }
    return this.order[this.i];
  }

  /** In a decider only the tied players play. */
  _out(id) {
    return !!this.decider && this.i === this.order.length - 1 && !this.decider.has(id);
  }

  _base() {
    const r = this.r;
    const decider = !!this.decider && this.i === this.order.length - 1;
    return { round: this.i + 1, of: this.order.length, critic: r.critic, prompt: r.prompt.text, last: this.i + 1 === this.order.length, decider, tied: decider ? [...this.decider] : [] };
  }

  _play() {
    const api = this.api;
    const rng = api.sub(`deal-${this.i}`);
    // top every hand back up to seven (new players get a fresh hand)
    for (const p of api.players) {
      const hand = this.hands[p.id] || (this.hands[p.id] = []);
      if (hand.length < HAND) hand.push(...api.take(ANSWERS, 'bt-a', HAND - hand.length, rng));
    }
    this.r = { critic: this._critic(), prompt: this.prompts[this.i] || this.prompts[0], played: {}, cards: [], flipped: 0, focus: -1, crowned: null };
    const r = this.r;
    const answering = () => api.players.filter((p) => p.id !== r.critic && !this._out(p.id));
    // only two people answering (a table of three, or a two-way decider): each plays two cards
    r.per = answering().filter((p) => p.connected !== false).length <= 2 ? 2 : 1;
    api.enter('badtaste-play', DUR.play + (r.per - 1) * DUR.playExtra, { ...this._base(), max: MAX, per: r.per }, {
      priv: (p) => (p.id === r.critic ? { role: 'critic' } : { role: 'player', hand: this.hands[p.id] || [] }),
      progress: () => ({
        done: this._doneMap((p) => p.id === r.critic || this._out(p.id) || (r.played[p.id]?.length || 0) >= r.per),
        counts: { played: answering().filter((p) => (r.played[p.id]?.length || 0) >= r.per).length, of: answering().length, cards: Object.values(r.played).reduce((n, x) => n + x.length, 0) },
      }),
    });
  }

  _judge() {
    const api = this.api;
    const r = this.r;
    const rng = api.sub(`judge-${this.i}`);
    // nobody gets a card played for them: no card, no chance (phones send a chosen card at the buzzer)
    // played cards leave the hand (refilled next round)
    for (const [pid, list] of Object.entries(r.played)) {
      for (const pl of list) {
        const hand = this.hands[pid] || [];
        // a written card still uses one up, so hands keep moving
        this.hands[pid] = pl.cardId ? hand.filter((c) => c.id !== pl.cardId) : hand.slice(1);
      }
    }
    const entries = Object.entries(r.played).flatMap(([pid, list]) => list.map((pl) => ({ by: pid, text: pl.text, written: pl.written })));
    // too few answers for a real choice (a three-player table): Cyril slips his own in for cover
    let tries = 0;
    while (entries.length < 3 && tries++ < 6) {
      const [c] = api.take(ANSWERS, 'bt-a', 1, rng);
      if (c && !entries.some((e) => e.text === c.text)) entries.push({ by: 'house', text: c.text, written: false });
    }
    r.cards = shuffle(entries, rng).map((e, k) => ({ ...e, id: `c${k}` }));
    r.flipped = 0; r.focus = -1; r.crowned = null;
    const n = r.cards.length;
    const dur = Math.min(DUR.judgeMax, DUR.judgeBase + n * DUR.judgePer);
    api.enter('badtaste-judge', dur, {
      ...this._base(), count: n, cards: r.cards.map((c) => ({ id: c.id, text: c.text })),
    }, {
      priv: (p) => ({ role: p.id === r.critic ? 'critic' : 'player', own: r.cards.map((c, k) => (c.by === p.id ? k : -1)).filter((k) => k >= 0) }),
      progress: () => ({
        done: this._doneMap((p) => p.id !== r.critic || r.crowned != null),
        counts: {}, flipped: r.flipped, focus: r.focus, crowned: r.crowned,
      }),
    });
  }

  _win() {
    const api = this.api;
    const r = this.r;
    let k = r.crowned;
    const cyrilChose = k == null;
    // the Critic dithered: Cyril picks among the cards that were read out (any, if none were)
    if (cyrilChose) k = Math.floor(api.sub(`cyril-${this.i}`)() * Math.max(1, r.flipped || r.cards.length));
    const win = r.cards[k];
    const deltas = Object.fromEntries(api.players.map((p) => [p.id, 0]));
    if (win && win.by !== 'house' && win.by in deltas) deltas[win.by] = 1;
    api.addScores(deltas);
    api.enter('badtaste-win', DUR.win + r.cards.length * DUR.winPer, {
      ...this._base(), winner: k, cyrilChose, deltas,
      cards: r.cards.map((c) => ({ id: c.id, text: c.text, by: c.by, written: c.written })),
      scores: this._rows(),
    });
  }

  _rows() {
    const rows = this.api.players.map((p) => ({ id: p.id, score: p.score })).sort((a, b) => b.score - a.score);
    let rank = 0;
    rows.forEach((row, i) => { if (i === 0 || row.score !== rows[i - 1].score) rank = i + 1; row.rank = rank; });
    return rows;
  }

  _doneMap(fn) {
    const done = {};
    for (const p of this.api.players) done[p.id] = !!fn(p);
    return done;
  }

  // ---------- demo helpers (screenshots only) ----------
  /** Seat this phone in (or out of) the Critic's chair for every round. */
  _demoCritic(meId, isCritic) {
    const other = this.api.players.find((p) => p.id !== meId)?.id;
    this.order = this.order.map(() => (isCritic ? meId : other));
  }

  /** Turn some cards over (and optionally crown one) for a frozen screenshot. */
  _demoJudge(flipped, crowned = null) {
    const r = this.r;
    if (!r) return;
    r.flipped = Math.min(flipped, r.cards.length);
    r.focus = crowned ?? r.flipped - 1;
    r.crowned = crowned;
    this.api.progress();
  }
}
