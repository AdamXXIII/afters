// Box screen registry (title, create, join, lobby, menu, results + overlays). ONE FILE PER SCREEN.
// Game screens live in src/games/<id>/screens/ and are registered by the game module.
import title from './title.js';
import create from './create.js';
import join from './join.js';
import lobby from './lobby.js';
import menu from './menu.js';
import results from './results.js';
import reconnect from './reconnect.js';
import settings from './settings.js';

export const SCREENS = [title, create, join, lobby, menu, results];

export const OVERLAYS = [reconnect, settings];
