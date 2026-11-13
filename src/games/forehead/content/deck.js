// Bonce deck helper: cards are written as one '|'-separated list so a deck reads like a list.
// The first three cards are the deck's examples on the picker.
export const deck = (id, name, hint, icon, colour, list) => {
  const cards = list.split('|').map((c) => c.trim()).filter(Boolean);
  return { id, name, hint, icon, colour, cards, examples: cards.slice(0, 3) };
};
