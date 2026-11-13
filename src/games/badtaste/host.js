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
  intro: 10000, play: 45000, judgeBase: 14000, judgePer: 7000, judgeMax: 75000,
  win: 9500, winPer: 700,
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
    api.enter('badtaste-intro', DUR.intro, { rounds: n, plays: api.plays });
  }

  advance(id) {
    switch (id) {
      case 'badtaste-intro': return this._play();
      case 'badtaste-play': return this._judge();
      case 'badtaste-judge': return this._win();
      case 'badtaste-win':
        if (this.i + 1 < this.order.length) { this.i += 1; return this._play(); }
        return this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
      default:
    }
  }

  activeFor(phaseId, connected) {
    const r = this.r;
    if (!r) return connected;
    if (phaseId === 'badtaste-play') return connected.filter((p) => p.id !== r.critic);
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
        if (ph !== 'badtaste-play' || p.id === r.critic || r.played[p.id]) return;
        if (msg.text != null) {
          const t = this.api.clean(String(msg.text), MAX);
          if (!t) return this.api.reject(p, 'empty');
          r.played[p.id] = { text: t, written: true };
        } else {
          const hand = this.hands[p.id] || [];
          const card = hand.find((c) => c.id === msg.cardId);
          if (!card) return;
          r.played[p.id] = { cardId: card.id, text: card.text, written: false };
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

  // ---------- phases ----------

  _critic() {
    // skip a Critic who has left the table
    const connected = new Set(this.api.connected.map((p) => p.id));
    for (let k = 0; k < this.order.length; k++) {
      const id = this.order[(this.i + k) % this.order.length];
      if (connected.has(id)) return id;
    }
    return this.order[this.i];
  }

  _base() {
    const r = this.r;
    return { round: this.i + 1, of: this.order.length, critic: r.critic, prompt: r.prompt.text, last: this.i + 1 === this.order.length };
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
    const answering = () => api.players.filter((p) => p.id !== r.critic);
    api.enter('badtaste-play', DUR.play, { ...this._base(), max: MAX }, {
      priv: (p) => (p.id === r.critic ? { role: 'critic' } : { role: 'player', hand: this.hands[p.id] || [] }),
      progress: () => ({
        done: this._doneMap((p) => p.id === r.critic || !!r.played[p.id]),
        counts: { played: answering().filter((p) => r.played[p.id]).length, of: answering().length },
      }),
    });
  }

  _judge() {
    const api = this.api;
    const r = this.r;
    const rng = api.sub(`judge-${this.i}`);
    // anyone still at the table who didn't play gets a card played for them from their hand
    for (const p of api.connected) {
      if (p.id === r.critic || r.played[p.id]) continue;
      const hand = this.hands[p.id] || [];
      if (!hand.length) continue;
      const c = hand[Math.floor(rng() * hand.length)];
      r.played[p.id] = { cardId: c.id, text: c.text, written: false, auto: true };
    }
    // played cards leave the hand (refilled next round)
    for (const [pid, pl] of Object.entries(r.played)) {
      if (pl.cardId) this.hands[pid] = (this.hands[pid] || []).filter((c) => c.id !== pl.cardId);
    }
    const entries = Object.entries(r.played).map(([pid, pl]) => ({ by: pid, text: pl.text, written: pl.written }));
    // too few answers for a real choice: Cyril slips one in from the deck
    let tries = 0;
    while (entries.length < 3 && tries++ < 4) {
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
      priv: (p) => ({ role: p.id === r.critic ? 'critic' : 'player', own: r.cards.findIndex((c) => c.by === p.id) }),
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
    if (cyrilChose) k = Math.floor(api.sub(`cyril-${this.i}`)() * r.cards.length);
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
