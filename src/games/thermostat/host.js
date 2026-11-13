// Thermostat host logic. Runs on the host phone only; talks to phones only through `api`.
// Each round one Clue-giver secretly sees a target on a two-ended scale ("Cold ... Hot") and
// says one clue out loud. Everyone else drags ONE shared dial together (live on every phone,
// with whoever is touching it), then locks in. Reveal scores by distance; the Clue-giver scores
// double. Finale "Hot seat": last place gives the clue, the target is half as wide, triple points.
// See ./DESIGN.md. AI-generated (Claude, Thermostat builder, 2026-11-13).
import { SCALES } from './content/scales.js';

export const TH = {
  intro: 9000, clue: 45000, dial: 60000, reveal: 8400, scores: 7000, hotIntro: 7500, verdict: 9000,
};
/** Two players play together: three clues each, a hot one, against Cyril's target. */
export const DUO = { rounds: 6, target: 1200, raise: 200, cap: 1800 };
/** Cyril's verdict on a two-player game, best first (share of the target). */
export const DUO_LADDER = [
  { at: 1.5, key: 'central', title: 'Central heating', sub: 'One brain, four thumbs.' },
  { at: 1, key: 'toasty', title: 'Toasty', sub: 'You beat my number. I’m warm all over.' },
  { at: 0.66, key: 'luke', title: 'Lukewarm', sub: 'Close. Not close enough.' },
  { at: 0, key: 'draughty', title: 'Draughty', sub: 'Have you two actually met?' },
];
export const duoRank = (total, target) => DUO_LADDER.find((r) => total >= r.at * target) || DUO_LADDER[DUO_LADDER.length - 1];
/** Half-widths of the bands (dial runs 0..100). The final round halves them. */
export const BANDS = { spot: 4, warm: 9, luke: 14 };
export const PTS = { spot: 300, warm: 200, luke: 100 };
export const CLUE_MAX = 40;
export const LOCK_SLOP = 1.5; // a lock holds while the dial stays within this of where you locked

export const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

/** Which band a dial value lands in for a target (pure; screens use it too). */
export function bandOf(dial, target, final = false) {
  const k = final ? 0.5 : 1;
  const d = Math.abs(dial - target);
  if (d <= BANDS.spot * k) return 'spot';
  if (d <= BANDS.warm * k) return 'warm';
  if (d <= BANDS.luke * k) return 'luke';
  return 'cold';
}

export class ThermostatHost {
  constructor(api) {
    this.api = api;
    this.rounds = [];
    this.i = 0;
  }

  start() {
    const api = this.api;
    const rng = api.sub('th-plan');
    const ids = api.players.map((p) => p.id);
    // two of you: co-op, take turns (three clues each), then a hot one, against Cyril's target
    this.duo = ids.length === 2;
    this.target = Math.min(DUO.cap, DUO.target + DUO.raise * Math.max(0, (api.plays || 1) - 1));
    const first = shuffle(ids, rng);
    // small tables give two clues each so the game has some length
    const order = this.duo ? Array.from({ length: DUO.rounds }, (_, k) => first[k % 2])
      : ids.length <= 4 ? [...shuffle(ids, rng), ...shuffle(ids, rng)] : shuffle(ids, rng);
    for (let k = 1; k < order.length; k++) {
      if (order[k] === order[k - 1]) { const j = (k + 1) % order.length; [order[k], order[j]] = [order[j], order[k]]; }
    }
    // two scales a round (the Clue-giver may swap once) + two for the final
    const scales = api.take(SCALES, 'th-scale', order.length * 2 + 2, rng);
    const at = (n) => scales[n % scales.length];
    this.rounds = order.map((id, n) => ({ giver: id, scales: [at(n * 2), at(n * 2 + 1)], final: false }));
    this.finalScales = [at(order.length * 2), at(order.length * 2 + 1)];
    this.i = 0;
    api.enter('thermostat-intro', TH.intro, { rounds: order.length, plays: api.plays, duo: this.duo, goal: this.target, first: order[0] });
  }

  get r() { return this.rounds[this.i]; }

  advance(id) {
    const r = this.r;
    switch (id) {
      case 'thermostat-intro': return this._clue();
      case 'thermostat-clue': return this._dial();
      case 'thermostat-dial': return this._reveal();
      case 'thermostat-reveal':
        if (r.final && this.duo) return this._verdict();
        if (r.final) return this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
        if (this.i + 1 < this.rounds.length) { this.i += 1; return this._clue(); }
        return this._scores();
      case 'thermostat-scores': return this._hotIntro();
      case 'thermostat-hot': this.i += 1; return this._clue();
      case 'thermostat-verdict': return this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
      default:
    }
  }

  activeFor(phaseId, connected) {
    const r = this.r;
    if (!r) return connected;
    if (phaseId === 'thermostat-clue') return connected.filter((p) => p.id === r.giver);
    if (phaseId === 'thermostat-dial') return connected.filter((p) => p.id !== r.giver);
    return connected;
  }

  handle(p, msg, { fresh }) {
    if (!fresh) return;
    const ph = this.api.phase.id;
    const r = this.r;
    if (!r) return;
    switch (msg.type) {
      case 'th-swap': {
        if (ph !== 'thermostat-clue' || p.id !== r.giver || r.swapped || r.said || !r.scales[1]) return;
        r.swapped = true;
        r.s = r.scales[1];
        r.target = this._target(`swap-${r.s.id}`);
        // the scale and the secret target change: re-enter the phase with the time that's left
        const left = Math.max(15000, (this.api.phase.endsAt ?? 0) - this.api.now());
        this._enterClue(left);
        return;
      }
      case 'th-said': {
        if (ph !== 'thermostat-clue' || p.id !== r.giver || r.said) return;
        r.clue = this.api.clean(String(msg.clue || ''), CLUE_MAX) || '';
        r.said = true;
        this.api.ack(p);
        this.api.progress();
        return;
      }
      case 'th-dial': {
        if (ph !== 'thermostat-dial' || p.id === r.giver) return;
        const v = Number(msg.v);
        if (!Number.isFinite(v)) return;
        r.dial = Math.max(0, Math.min(100, Math.round(v * 10) / 10));
        r.by = p.id;
        r.touch[p.id] = msg.up ? 0 : this.api.now();
        r.moves += 1;
        if (!r.hands.includes(p.id)) r.hands.push(p.id);
        this.api.progress();
        return;
      }
      case 'th-lock': {
        if (ph !== 'thermostat-dial' || p.id === r.giver) return;
        if (msg.off) delete r.locks[p.id];
        else r.locks[p.id] = r.dial;
        this.api.progress();
        return;
      }
      default:
    }
  }

  // ---------- phases ----------

  _target(salt) {
    // 6..94 so every band has room to show
    return Math.round((6 + this.api.sub(`target-${salt}`)() * 88) * 10) / 10;
  }

  _mult() { return this.r.final ? 3 : 1; }

  _base() {
    const r = this.r;
    const regular = this.rounds.filter((x) => !x.final).length;
    return {
      index: r.final ? regular : this.i, count: regular, giver: r.giver, final: r.final, mult: this._mult(),
      scale: { id: r.s.id, l: r.s.l, r: r.s.r },
      ...(this.duo ? { duo: true, total: this._total(), goal: this.target } : {}),
    };
  }

  _clue() {
    const r = this.r;
    Object.assign(r, { s: r.scales[0], swapped: false, said: false, clue: '', dial: 50, by: null, touch: {}, locks: {}, moves: 0, hands: [] });
    r.target = this._target(r.s.id);
    this._enterClue(TH.clue);
  }

  _enterClue(ms) {
    const r = this.r;
    this.api.enter('thermostat-clue', ms, { ...this._base(), max: CLUE_MAX, canSwap: !!r.scales[1] && !r.swapped, swapped: r.swapped }, {
      priv: (pl) => (pl.id === r.giver ? { target: r.target, eg: r.s.eg || null } : null),
      progress: () => ({ done: { [r.giver]: r.said }, counts: {} }),
    });
  }

  _dial() {
    const r = this.r;
    const guessers = () => this.api.players.filter((p) => p.id !== r.giver);
    this.api.enter('thermostat-dial', TH.dial, { ...this._base(), clue: r.clue }, {
      priv: (pl) => (pl.id === r.giver ? { target: r.target } : null),
      progress: () => {
        const now = this.api.now();
        const holding = Object.entries(r.touch).filter(([, t]) => t && now - t < 900).map(([id]) => id);
        const done = {};
        for (const pl of this.api.players) {
          if (pl.id === r.giver) { done[pl.id] = true; continue; }
          const at = r.locks[pl.id];
          done[pl.id] = at != null && Math.abs(at - r.dial) <= LOCK_SLOP;
        }
        const g = guessers();
        return { done, counts: { locked: g.filter((pl) => done[pl.id]).length, of: g.length }, dial: r.dial, by: r.by, holding, moves: r.moves };
      },
    });
  }

  _reveal() {
    const r = this.r;
    const api = this.api;
    const m = this._mult();
    if (this.demoLand != null) { // ?demo= only: land the dial near the target for the shots
      r.dial = Math.max(0, Math.min(100, Math.round((r.target + this.demoLand) * 10) / 10));
      r.by = this.api.players.find((p) => p.id !== r.giver)?.id || null;
      this.demoLand = null;
    }
    const band = bandOf(r.dial, r.target, r.final);
    r.band = band;
    const base = band === 'cold' ? 0 : PTS[band];
    const deltas = Object.fromEntries(api.players.map((p) => [p.id, 0]));
    // co-op at two: you both score the same; otherwise the Clue-giver scores double
    for (const p of api.players) deltas[p.id] = base * m * (p.id === r.giver && !this.duo ? 2 : 1);
    api.addScores(deltas);
    const steps = { open: api.dur(1400), verdict: api.dur(3200), points: api.dur(4500) };
    api.enter('thermostat-reveal', TH.reveal, {
      ...this._base(), clue: r.clue, dial: r.dial, target: r.target, band, base, deltas, steps,
      moves: r.moves, hands: r.hands.length, scores: this._rows(),
    });
  }

  /** The pair's running total (both players hold the same score at two). */
  _total() { return this.api.players[0]?.score ?? 0; }

  _rows() {
    const rows = this.api.players.map((p) => ({ id: p.id, score: p.score })).sort((a, b) => b.score - a.score);
    let rank = 0;
    rows.forEach((row, i) => { if (i === 0 || row.score !== rows[i - 1].score) rank = i + 1; row.rank = rank; });
    return rows;
  }

  _scores() {
    const rows = this._rows();
    let giver;
    if (this.duo) {
      // at two, the turns carry on: whoever didn't give the last clue gives the hot one
      const lastGiver = this.rounds[this.rounds.length - 1].giver;
      giver = this.api.players.find((p) => p.id !== lastGiver)?.id || lastGiver;
    } else {
      const low = rows[rows.length - 1].score;
      const tied = rows.filter((x) => x.score === low);
      giver = tied[Math.floor(this.api.sub('hot')() * tied.length)].id;
    }
    this.rounds.push({ giver, scales: this.finalScales, final: true });
    this.api.enter('thermostat-scores', TH.scores, { rows, next: giver, ...(this.duo ? { duo: true, total: this._total(), goal: this.target, best: 300 * DUO.rounds } : {}) });
  }

  /** Two players: the total against Cyril's target, and his verdict on the pair. */
  _verdict() {
    const total = this._total();
    const rank = duoRank(total, this.target);
    const spots = this.rounds.filter((x) => x.band === 'spot').length;
    this.api.enter('thermostat-verdict', TH.verdict, {
      duo: true, total, goal: this.target, beat: total >= this.target, rank: rank.key, title: rank.title, sub: rank.sub,
      spots, rounds: this.rounds.length, bands: this.rounds.map((x) => x.band || 'cold'),
    });
  }

  _hotIntro() {
    const next = this.rounds[this.rounds.length - 1];
    this.api.enter('thermostat-hot', TH.hotIntro, { giver: next.giver, mult: 3, ...(this.duo ? { duo: true, total: this._total(), goal: this.target } : {}) });
  }
}
