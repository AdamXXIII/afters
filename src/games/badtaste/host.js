// Call It host logic. Runs on the host phone only; talks to phones ONLY through `api`.
const ROUNDS = 3;
const DUR = { call: 8000, reveal: 3000 };

export class Host {
  constructor(api) { this.api = api; this.round = 0; this.calls = {}; }

  start() { this.round = 0; this._call(); }

  // called when a phase's timer ends (or everyone is done, or the host skips an *-intro phase)
  advance(phaseId) {
    if (phaseId === 'badtaste-call') return this._reveal();
    if (phaseId === 'badtaste-reveal') {
      if (this.round + 1 < ROUNDS) { this.round += 1; return this._call(); }
      return this.api.finish(this.api.players.map((p) => ({ id: p.id, score: p.score })));
    }
  }

  // messages from phones: client.act('call', {side}) arrives as {type:'call', side, seq}
  handle(p, msg, { fresh }) {
    if (!fresh || msg.type !== 'call' || this.api.phase.id !== 'badtaste-call') return;
    if (msg.side !== 'heads' && msg.side !== 'tails') return;
    this.calls[p.id] = msg.side;
    this.api.progress(); // re-sends progress; ends the phase early once everyone is done
  }

  _call() {
    this.calls = {};
    this.api.enter('badtaste-call', DUR.call, { round: this.round + 1, of: ROUNDS }, {
      progress: () => {
        const done = {};
        for (const p of this.api.players) done[p.id] = !!this.calls[p.id];
        return { done, counts: {} };
      },
    });
  }

  _reveal() {
    const side = this.api.sub('coin')() < 0.5 ? 'heads' : 'tails';
    const deltas = {};
    for (const p of this.api.players) deltas[p.id] = this.calls[p.id] === side ? 100 : 0;
    this.api.addScores(deltas);
    this.api.enter('badtaste-reveal', DUR.reveal, { side, calls: this.calls, deltas, round: this.round + 1, of: ROUNDS });
  }
}
