// ?demo=<screen> entries for Afters Classic (merged into src/demo.js DEMOS).
// match(engine, meId) -> bool; me/bots: 'idle' | 'act' | 'some'; t: frozen elapsed ms.
const meIsAuthor = (eng, meId) => {
  const r1 = eng.g?.r1;
  if (!r1) return false;
  return r1.matchups[r1.order[r1.index]].authors.includes(meId);
};

export const CLASSIC_DEMOS = {
  intro: { match: (e) => e.phase.id === 'intro', t: 2500 },
  'r1-intro': { match: (e) => e.phase.id === 'r1-intro', t: 3200 },
  'r1-write': { match: (e) => e.phase.id === 'r1-write', me: 'idle', bots: 'some', t: 24000 },
  'r1-wait': { match: (e) => e.phase.id === 'r1-write', me: 'act', bots: 'some', t: 31000 },
  'r1-vote': { match: (e, me) => e.phase.id === 'r1-vote' && !meIsAuthor(e, me), me: 'idle', bots: 'some', t: 5200 },
  'r1-vote-author': { match: (e, me) => e.phase.id === 'r1-vote' && meIsAuthor(e, me), me: 'idle', bots: 'some', t: 5200 },
  'r1-reveal': { match: (e, me) => e.phase.id === 'r1-reveal' && !meIsAuthor(e, me), t: 4300 },
  'r1-scores': { match: (e) => e.phase.id === 'r1-scores', t: 2600 },
  'r2-intro': { match: (e) => e.phase.id === 'r2-intro', t: 3200 },
  'r2-write': { match: (e) => e.phase.id === 'r2-write', me: 'idle', bots: 'some', t: 14000 },
  'r2-wait': { match: (e) => e.phase.id === 'r2-write', me: 'act', bots: 'some', t: 22000 },
  'r2-pick': { match: (e) => e.phase.id === 'r2-pick', me: 'act', bots: 'some', t: 6500 },
  'r2-reveal': { match: (e) => e.phase.id === 'r2-reveal', t: (p) => { const s = p.payload.steps.find((x) => x.kind === 'truth'); return s ? s.at + 1600 : 4000; } },
  'r2-scores': { match: (e) => e.phase.id === 'r2-scores', t: 2600 },
  'r3-intro': { match: (e) => e.phase.id === 'r3-intro', t: 3200 },
  'r3-write': { match: (e) => e.phase.id === 'r3-write', me: 'act', bots: 'act', t: 21000 },
  'r3-swipe': { match: (e) => e.phase.id === 'r3-swipe', me: 'idle', bots: 'act', t: (p) => Math.round(p.payload.perCard * 1.4) },
  'r3-reveal': { match: (e) => e.phase.id === 'r3-reveal', t: (p) => p.payload.toastAt + 1800 },
  podium: { match: (e) => e.phase.id === 'podium', t: 11000 },
  end: { match: (e) => e.phase.id === 'end', t: 1500 },
  reconnect: { match: (e, me) => e.phase.id === 'r1-vote' && !meIsAuthor(e, me), me: 'idle', bots: 'idle', t: 5200, after: 'reconnect' },
};
