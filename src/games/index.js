// THE GAME BOX. One line per game; the menu shows them in this order.
// To add a game: make src/games/<id>/index.js (see ARCHITECTURE "How to add a game") and add a line.
import classic from './classic/index.js';
import forehead from './forehead/index.js';
import telephone from './telephone/index.js';
import percentages from './percentages/index.js';

export const GAMES = [
  classic,
  forehead,
  telephone,
  percentages,
];

export const gameById = (id, list = GAMES) => list.find((g) => g.id === id) || null;
