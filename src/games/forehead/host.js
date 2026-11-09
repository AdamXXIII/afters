// Bonce host logic (runs on the host phone only, Node-safe). See ./DESIGN.md.
// Phases: forehead-intro -> (forehead-pick -> forehead-turn -> forehead-recap) x turns -> api.finish.
import { DECKS, MODIFIERS, TEAMS } from './content/index.js';

export const FH = {
  intro: 30000,
  pick: 10000,
  countdown: 3500,
  turn: 60000,
  recap: 10000,
  cardsPerTurn: 30,
  hit: 100,
  streakBonus: 50,
  shout: 150,
};

export class ForeheadHost {
  constructor(api) {
    this.api = api;
    this.setup = null;
    this.order = [];
    this.turnIndex = -1;
    this.turn = null;
    this.votes = {};
    this.ready = false;
    this.lastMod = null;
    this.usedDecks = new Set();
    this.teamScore = { gravy: 0, custard: 0 };
    this.shout = null;
  }

  // ---------- lifecycle ----------

  start() {
    const n = this.api.players.length;
    this.setup = { mode: 'ffa', goes: n <= 4 ? 2 : 1 };
    this.go = false;
    this.api.enter('forehead-intro', FH.intro, this._introPayload(), {
      progress: () => ({ done: { [this._hostId()]: this.go }, counts: {}, setup: { ...this.setup } }),
      active: (connected) => connected.filter((p) => p.id === this._hostId()),
    });
  }

  advance(phaseId) {
    if (phaseId === 'forehead-intro') {
      this._buildOrder();
      return this._pick(0);
    }
    if (phaseId === 'forehead-pick') return this._turn();
    if (phaseId === 'forehead-turn') return this._recap();
    if (phaseId === 'forehead-recap') {
      if (this.turnIndex + 1 < this.order.length) return this._pick(this.turnIndex + 1);
      return this._finish();
    }
  }

  handle(p, msg, { fresh, isHost }) {
    if (!fresh) return;
    const ph = this.api.phase.id;
    switch (msg.type) {
      case 'fh-setup':
        if (ph !== 'forehead-intro' || !isHost) return;
        if (msg.mode === 'ffa' || (msg.mode === 'teams' && this.api.players.length >= 4)) this.setup.mode = msg.mode;
        if (msg.goes === 1 || msg.goes === 2) this.setup.goes = msg.goes;
        this.api.progress();
        return;
      case 'fh-go':
        if (ph !== 'forehead-intro' || !isHost) return;
        this.go = true;
        this.api.progress();
        return;
      case 'fh-vote':
        if (ph !== 'forehead-pick' || p.id === this.turn?.guesserId) return;
        if (!this.offer.some((d) => d.id === msg.deck)) return;
        if (this.turn.team && this._teamOf(p.id) !== this.turn.team) return; // only your team picks your poison
        this.votes[p.id] = msg.deck;
        this.api.progress();
        return;
      case 'fh-ready':
        if (ph !== 'forehead-pick' || p.id !== this.turn?.guesserId) return;
        this.ready = true;
        this.api.progress();
        return;
      case 'fh-mark':
        return this._mark(p, msg);
      case 'fh-shout':
        if (ph !== 'forehead-recap' || p.id !== this.turn?.guesserId || this.shout) return;
        if (!this._shoutable().some((x) => x.id === msg.id)) return;
        this.shout = msg.id;
        if (this.turn.team) this.teamScore[this.turn.team] += FH.shout;
        else this.api.addScores({ [msg.id]: FH.shout });
        this.api.progress();
        return;
      default:
    }
  }

  onLeave() { if (this.api.phase.id !== 'forehead-intro') this.api.progress(); }

  // ---------- setup ----------

  _hostId() { return this.api.hostPlayer?.id || this.api.players[0]?.id; }

  _introPayload() {
    return { canTeams: this.api.players.length >= 4, ids: this.api.players.map((p) => p.id), teams: TEAMS };
  }

  _buildOrder() {
    const rng = this.api.sub('order');
    const ids = this.api.players.map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    this.teams = null;
    if (this.setup.mode === 'teams') {
      this.teams = { gravy: ids.filter((_, i) => i % 2 === 0), custard: ids.filter((_, i) => i % 2 === 1) };
    }
    const one = ids.slice(); // alternating seats = alternating teams
    this.order = [];
    for (let g = 0; g < this.setup.goes; g++) this.order.push(...one);
  }

  _teamOf(id) {
    if (!this.teams) return null;
    return this.teams.gravy.includes(id) ? 'gravy' : this.teams.custard.includes(id) ? 'custard' : null;
  }

  // ---------- pick ----------

  _pick(i) {
    this.turnIndex = i;
    let guesserId = this.order[i];
    // skip anyone who left
    let guard = 0;
    while (!this.api.player(guesserId)?.connected && guard++ < this.order.length) {
      this.turnIndex += 1;
      if (this.turnIndex >= this.order.length) return this._finish();
      guesserId = this.order[this.turnIndex];
    }
    this.votes = {};
    this.ready = false;
    const rng = this.api.sub('pick');
    this.offer = this._offerDecks(rng);
    let modifier = null;
    if (this.turnIndex > 0 && this.lastMod === null && rng() < 0.4) {
      modifier = MODIFIERS[Math.floor(rng() * MODIFIERS.length)];
    }
    this.lastMod = modifier ? modifier.id : null;
    this.turn = { guesserId, team: this._teamOf(guesserId), modifier };
    this.api.enter('forehead-pick', FH.pick, {
      turn: this.turnIndex + 1, of: this.order.length, guesserId, team: this.turn.team, teams: this.teams,
      decks: this.offer.map(({ id, name, blurb, icon, colour }) => ({ id, name, blurb, icon, colour })),
      modifier, scores: this._standings(),
    }, {
      progress: () => {
        const done = {};
        for (const p of this.api.players) done[p.id] = p.id === guesserId ? this.ready : (!!this.votes[p.id] || !this._canVote(p.id));
        return { done, counts: {}, votes: { ...this.votes }, ready: this.ready };
      },
    });
  }

  _canVote(id) { return id !== this.turn.guesserId && (!this.turn.team || this._teamOf(id) === this.turn.team); }

  _offerDecks(rng) {
    const fam = DECKS.family;
    const adult = DECKS.adult;
    const fresh = (list) => {
      const f = list.filter((d) => !this.usedDecks.has(d.id));
      return f.length >= 3 ? f : list.slice();
    };
    const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    if (this.api.adult && adult.length) return [...shuffle(fresh(adult)).slice(0, 2), ...shuffle(fresh(fam)).slice(0, 1)];
    return shuffle(fresh(fam)).slice(0, 3);
  }

  // ---------- turn ----------

  _turn() {
    const tally = {};
    for (const d of Object.values(this.votes)) tally[d] = (tally[d] || 0) + 1;
    const best = Math.max(0, ...Object.values(tally));
    let pool = this.offer.filter((d) => (tally[d.id] || 0) === best);
    const rng = this.api.sub('deck');
    const deck = pool[Math.floor(rng() * pool.length)];
    this.usedDecks.add(deck.id);
    const cards = this.api.take(deck.cards.map((text, i) => ({ id: `${deck.id}-${i}`, text })), `fh-${deck.id}`, FH.cardsPerTurn, rng)
      .map((c) => c.text);
    Object.assign(this.turn, { deck: { id: deck.id, name: deck.name, icon: deck.icon, colour: deck.colour }, cards, idx: 0, results: [], streak: 0, startsAt: this.api.now(), votes: { ...this.votes } });
    const countdown = this.api.dur(FH.countdown);
    this.turn.countdown = countdown;
    this.api.enter('forehead-turn', FH.countdown + FH.turn, {
      turn: this.turnIndex + 1, of: this.order.length, guesserId: this.turn.guesserId, team: this.turn.team, teams: this.teams,
      deck: this.turn.deck, modifier: this.turn.modifier, cards, countdown, length: this.api.dur(FH.turn),
      votes: this.turn.votes,
    }, {
      progress: () => ({
        done: { [this.turn.guesserId]: this.turn.idx >= this.turn.cards.length },
        counts: {},
        idx: this.turn.idx,
        results: this.turn.results.slice(),
        streak: this.turn.streak,
      }),
      active: (connected) => connected.filter((p) => p.id === this.turn.guesserId),
    });
    this.turn.startsAt = this.api.phase.startsAt;
  }

  _mark(p, msg) {
    const t = this.turn;
    if (this.api.phase.id !== 'forehead-turn' || !t) return;
    if (msg.idx !== t.idx || t.idx >= t.cards.length) return;
    if (this.api.now() < t.startsAt + t.countdown - 150) return;
    const r = msg.r;
    const isGuesser = p.id === t.guesserId;
    const myTeam = this._teamOf(p.id);
    if (r === 'foul') {
      if (!t.team || myTeam === t.team) return;
    } else if (r === 'hit' || r === 'pass') {
      if (!isGuesser && t.team && myTeam !== t.team) return;
    } else return;
    let pts = 0;
    let bonus = 0;
    if (r === 'hit') {
      t.streak += 1;
      pts = FH.hit;
      if (t.streak % 3 === 0) bonus = FH.streakBonus;
    } else t.streak = 0;
    t.results.push({ i: t.idx, r, by: p.id, at: this.api.now() - t.startsAt, pts, bonus });
    t.idx += 1;
    this.api.progress();
  }

  // ---------- recap ----------

  _recap() {
    const t = this.turn;
    const results = t.results.map((x) => ({ text: t.cards[x.i], r: x.r, by: x.by, pts: x.pts, bonus: x.bonus }));
    if (t.idx < t.cards.length) results.push({ text: t.cards[t.idx], r: 'time', by: null, pts: 0, bonus: 0 });
    const hits = results.filter((x) => x.r === 'hit').length;
    const bonus = results.reduce((a, x) => a + x.bonus, 0);
    const points = hits * FH.hit + bonus;
    if (t.team) this.teamScore[t.team] += points;
    else this.api.addScores({ [t.guesserId]: points });
    this.shout = null;
    const last = this.turnIndex + 1 >= this.order.length;
    this.api.enter('forehead-recap', FH.recap, {
      turn: this.turnIndex + 1, of: this.order.length, guesserId: t.guesserId, team: t.team, teams: this.teams,
      deck: t.deck, modifier: t.modifier, results, hits, points, bonus, last,
      shoutable: this._shoutable().map((x) => x.id),
      nextId: last ? null : this.order[this.turnIndex + 1],
      scores: this._standings(),
    }, {
      progress: () => ({ done: {}, counts: {}, shout: this.shout, scores: this._standings() }),
      active: () => [],
    });
  }

  _shoutable() {
    const t = this.turn;
    return this.api.players.filter((p) => p.id !== t.guesserId && (!t.team || this._teamOf(p.id) === t.team));
  }

  _standings() {
    if (this.teams) return { teams: { ...this.teamScore } };
    return { players: this.api.players.map((p) => ({ id: p.id, score: p.score })).sort((a, b) => b.score - a.score) };
  }

  _finish() {
    const rows = this.api.players.map((p) => ({
      id: p.id,
      score: this.teams ? this.teamScore[this._teamOf(p.id)] ?? 0 : p.score,
    }));
    if (this.teams) for (const p of this.api.players) p.score = this.teamScore[this._teamOf(p.id)] ?? 0;
    this.api.finish(rows);
  }

  // ---------- demos ----------

  /** Demo helper: pretend the guesser has already marked some cards. */
  _demoFill(pattern = ['hit', 'hit', 'pass', 'hit', 'hit', 'hit']) {
    const t = this.turn;
    if (!t?.cards) return;
    if (t.results.length) return;
    t.startsAt = this.api.phase.startsAt;
    pattern.forEach((r, k) => {
      let pts = 0; let bonus = 0;
      if (r === 'hit') { t.streak += 1; pts = FH.hit; if (t.streak % 3 === 0) bonus = FH.streakBonus; } else t.streak = 0;
      t.results.push({ i: t.idx, r, by: t.guesserId, at: t.countdown + 3000 * (k + 1), pts, bonus });
      t.idx += 1;
    });
    this.api.progress();
  }
}
