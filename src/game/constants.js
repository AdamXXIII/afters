// Shared game constants (DESIGN section 2). Durations in ms at speed 1.

export const MIN_PLAYERS = 2; // two can play (2026-11-13); each game sets its own range in `players`
export const MAX_PLAYERS = 8;

// Afters Classic durations, tightened 2026-11-09 after Adam's "kind of boring" playtest:
// shorter writing windows, quicker votes, snappier scoreboards and intros.
export const DUR = {
  intro: 4500,
  'r1-intro': 5500,
  'r1-write': 60000,
  'r1-vote': 12000,
  'r1-reveal': 6500,
  'r1-scores': 6000,
  'r2-intro': 6000,
  'r2-write': 35000,
  'r2-pick': 15000,
  'r2-scores': 6000,
  'r3-intro': 6000,
  'r3-write': 45000,
  'r3-card': 3500,       // per swipe card
  'r3-swipe-max': 65000,
  'r3-reveal-card': 2800,
  'r3-reveal-toast': 3600,
  podium: 15500,      // +2.5 s for the Last Orders swing before the cake
  'early-grace': 800,   // pause after everyone has acted before the phase ends
  'skip-after': 1500,   // host can skip intros after this
  squeeze: 10000,       // all but one done writing: the clock drops to this
};

// Tonight's table: cherries per finishing place in each game (4th and below get 1 for turning up).
export const NIGHT_POINTS = [5, 3, 2];

export const LIMITS = {
  name: 10,
  r1: 60,
  r2: 40,
  r3: 45,
  r3Answers: 4,
  glasses: 5,
  deckCap: 20,
  reactMs: 400,
};

export const EMPTY_PLATE = '[sent out an empty plate]';

export const ROUND_COLOURS = { 1: 'mustard', 2: 'claret', 3: 'tomato' };

export const PALETTE = {
  linen: '#FBF4EA', tablecloth: '#F3E6D3', beeswax: '#F3E6CF', crumb: '#E6D3B8',
  candle: '#FFC86B', mustard: '#E0A526', brass: '#C89B3C', tomato: '#E2553B',
  claret: '#7A1E2C', willow: '#2F5D7C', sage: '#7F9A74', toffee: '#7A4A2A',
  ink: '#2A1A17', mahogany: '#3B1F18', oak: '#5A3424',
};

// Avatar index -> fixed colour + name (DESIGN 3.5 / 3.2). Index is the identity.
export const AVATARS = [
  { key: 'jelly', name: 'Jelly', colour: '#E2553B', colourName: 'Tomato' },
  { key: 'sprout', name: 'Sprout', colour: '#2F5D7C', colourName: 'Willow' },
  { key: 'teacup', name: 'Teacup', colour: '#E0A526', colourName: 'Mustard' },
  { key: 'cheese', name: 'Cheese Wedge', colour: '#7F9A74', colourName: 'Sage' },
  { key: 'peppermill', name: 'Pepper Mill', colour: '#B5527E', colourName: 'Damson' },
  { key: 'pudding', name: 'Pudding', colour: '#3E8E8A', colourName: 'Teal Teapot' },
  { key: 'egg', name: 'Egg', colour: '#8C5A3C', colourName: 'Gravy' },
  { key: 'bourbon', name: 'Bourbon', colour: '#5B6ABF', colourName: 'Cornflower' },
];

export const REACTIONS = ['roll', 'rose', 'applause', 'groan'];

// Engine phase ids, in show order.
export const PHASES = [
  'lobby', 'menu', 'intro',
  'r1-intro', 'r1-write', 'r1-vote', 'r1-reveal', 'r1-scores',
  'r2-intro', 'r2-write', 'r2-pick', 'r2-reveal', 'r2-scores',
  'r3-intro', 'r3-write', 'r3-swipe', 'r3-reveal',
  'podium', 'end', 'results',
];

// Every screen id (DESIGN section 4). Client screens are derived from phases + personal state.
export const SCREEN_IDS = [
  'title', 'create', 'join', 'lobby', 'menu', 'results', 'intro',
  'r1-intro', 'r1-write', 'r1-wait', 'r1-vote', 'r1-reveal', 'r1-scores',
  'r2-intro', 'r2-write', 'r2-wait', 'r2-pick', 'r2-reveal', 'r2-scores',
  'r3-intro', 'r3-write', 'r3-swipe', 'r3-reveal',
  'podium', 'end', 'reconnect', 'settings',
];
