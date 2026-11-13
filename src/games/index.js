// THE GAME BOX. One line per game; the menu shows them in this order.
// To add a game: make src/games/<id>/index.js (see ARCHITECTURE "How to add a game") and add a line.
import classic from './classic/index.js';
import forehead from './forehead/index.js';
import telephone from './telephone/index.js';
import percentages from './percentages/index.js';
import example from './example/index.js';
import soup from './soup/index.js';
import seconds from './seconds/index.js';
import witness from './witness/index.js';
import topshelf from './topshelf/index.js';
import pardon from './pardon/index.js';

export const GAMES = [
  classic,
  forehead,
  telephone,
  percentages,
  soup, // batch 1 (hidden until finished)
  seconds, // batch 1 (hidden until finished)
  witness, // batch 1 (hidden until finished)
  topshelf, // batch 1 (hidden until finished)
  pardon, // batch 1 (hidden until finished)
  example, // hidden: true - the documented example, not on the menu
];

export const gameById = (id, list = GAMES) => list.find((g) => g.id === id) || null;
