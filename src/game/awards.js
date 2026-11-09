// Comedic awards on the bill (DESIGN 2.6.1). One per player, priority order, no duplicates.

export const AWARDS = [
  { key: 'cleanPlate', title: 'Clean Plate', blurb: 'Most clean plates served', stat: 'cleanPlates' },
  { key: 'silverTongue', title: 'Silver Tongue', blurb: 'Fooled the most people', stat: 'fooled' },
  { key: 'bloodhound', title: 'Bloodhound', blurb: 'Sniffed out the truth', stat: 'truths' },
  { key: 'chatterbox', title: 'Chatterbox', blurb: 'Most Last Orders answers', stat: 'r3Answers' },
  { key: 'diplomat', title: 'The Diplomat', blurb: 'Most dead heats', stat: 'ties' },
  { key: 'late', title: 'Fashionably Late', blurb: 'Last to plate up, most often', stat: 'lastSubmits' },
  { key: 'heckler', title: 'Heckler', blurb: 'Threw the most bread rolls', stat: 'reactions' },
];
export const FALLBACK_AWARD = { key: 'quiet', title: 'Quietly Brilliant', blurb: 'Said little. Meant it.' };

/** @param players [{id, stats}] -> {playerId: award} */
export function computeAwards(players) {
  const out = {};
  const left = new Set(players.map((p) => p.id));
  for (const a of AWARDS) {
    let best = null;
    let bestN = 0;
    for (const p of players) {
      if (!left.has(p.id)) continue;
      const n = p.stats?.[a.stat] || 0;
      if (n > bestN) { best = p; bestN = n; }
    }
    if (best) {
      out[best.id] = { key: a.key, title: a.title, blurb: a.blurb, n: bestN };
      left.delete(best.id);
    }
  }
  for (const id of left) out[id] = { ...FALLBACK_AWARD, n: 0 };
  return out;
}
