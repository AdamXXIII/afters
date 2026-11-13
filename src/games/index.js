// THE GAME BOX. One line per game; the menu shows them in this order.
// To add a game: make src/games/<id>/index.js (see ARCHITECTURE "How to add a game") and add a line.
import classic from './classic/index.js';
import forehead from './forehead/index.js';
import telephone from './telephone/index.js';
import example from './example/index.js';
import badtaste from './badtaste/index.js';
import returns from './returns/index.js';
import samehere from './samehere/index.js';
import oddsock from './oddsock/index.js';
import thermostat from './thermostat/index.js';
import soup from './soup/index.js';
import witness from './witness/index.js';
import topshelf from './topshelf/index.js';
import pardon from './pardon/index.js';

export const GAMES = [
  classic,
  forehead,
  telephone,
  soup,
  witness,
  topshelf,
  pardon,
  badtaste, // batch 2 (hidden until finished)
  returns, // batch 2 (hidden until finished)
  samehere, // batch 2 (hidden until finished)
  oddsock, // batch 2 (hidden until finished)
  thermostat, // batch 2 (hidden until finished)
  example, // hidden: true - the documented example, not on the menu
];

export const gameById = (id, list = GAMES) => list.find((g) => g.id === id) || null;
