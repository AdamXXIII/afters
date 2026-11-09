// Pure scoring functions (DESIGN 2.3 - 2.5). No side effects; easy to unit test.

/**
 * Round 1 matchup scoring.
 * @param {object} m {authors:[idA,idB], empty:[boolA,boolB], votes:{voterId:'A'|'B'}, house:null|'A'|'B'}
 * @returns {{points:[n,n], bonus:[n,n], outcome:string, counts:[n,n]}}
 */
export function scoreMatchup({ empty, votes, house }) {
  const counts = [0, 0];
  for (const v of Object.values(votes)) counts[v === 'A' ? 0 : 1] += 1;
  const voters = counts[0] + counts[1];
  const weighted = [counts[0] + (house === 'A' ? 0.5 : 0), counts[1] + (house === 'B' ? 0.5 : 0)];
  const total = weighted[0] + weighted[1];
  let points = [0, 0];
  const bonus = [0, 0];
  let outcome = 'normal';

  if (empty[0] && empty[1]) {
    outcome = 'empty';
  } else if (empty[0] || empty[1]) {
    const winner = empty[0] ? 1 : 0;
    points[winner] = 1000;
    outcome = 'empty';
  } else if (voters === 0) {
    outcome = 'novotes';
  } else if (weighted[0] === weighted[1]) {
    points = [500, 500];
    outcome = 'tie';
  } else {
    points = [Math.round((1000 * weighted[0]) / total), Math.round((1000 * weighted[1]) / total)];
    for (const i of [0, 1]) {
      if (counts[i] === voters && voters >= 2) {
        bonus[i] = 250;
        outcome = 'clean';
      }
    }
  }
  return { points, bonus, outcome, counts };
}

/**
 * Round 2 fact scoring.
 * @param options [{id, kind:'porky'|'truth'|'house', authors:[ids]}]
 * @param picks {playerId: optionId}
 * @returns {deltas:{id:n}, pickers:{optionId:[ids]}}
 */
export function scoreFact(options, picks) {
  const deltas = {};
  const pickers = {};
  for (const o of options) pickers[o.id] = [];
  for (const [pid, oid] of Object.entries(picks)) if (pickers[oid]) pickers[oid].push(pid);
  const add = (id, n) => { deltas[id] = (deltas[id] || 0) + n; };
  for (const o of options) {
    const ps = pickers[o.id];
    if (o.kind === 'truth') ps.forEach((p) => add(p, 1000));
    else if (o.kind === 'porky') o.authors.forEach((a) => add(a, 500 * ps.length));
  }
  return { deltas, pickers };
}

/**
 * Round 3 scoring.
 * @param cards [{id, authorId}]
 * @param cheers {cardId: [voterIds]}
 */
export function scoreLastOrders(cards, cheers) {
  const deltas = {};
  const add = (id, n) => { deltas[id] = (deltas[id] || 0) + n; };
  let max = 0;
  for (const c of cards) {
    const n = (cheers[c.id] || []).length;
    add(c.authorId, 200 * n);
    max = Math.max(max, n);
  }
  const toastIds = max > 0 ? cards.filter((c) => (cheers[c.id] || []).length === max).map((c) => c.id) : [];
  for (const id of toastIds) add(cards.find((c) => c.id === id).authorId, 1000);
  return { deltas, toastIds, max };
}
