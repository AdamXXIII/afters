// Top Shelf content: nine categories (plus Bedroom on Adults 18+ tables), each a bottle in Cyril's cabinet.
// Questions are 'Question|Right|Wrong|Wrong|Wrong' strings; a leading '!' marks a hard one for the Last Drop.
// Family and adult tables share the questions; adult tables add the Bedroom bottle.
import pop from './pop.js';
import music from './music.js';
import telly from './telly.js';
import film from './film.js';
import odd from './odd.js';
import sport from './sport.js';
import words from './words.js';
import science from './science.js';
import history from './history.js';
import bedroom from './bedroom.js';

// colour = the bottle's glass; note = the label's small print, in Cyril's voice
const META = [
  { id: 'pop', name: 'Pop culture', note: 'Toys, comics, heroes', glass: '#B5527E', raw: pop },
  { id: 'music', name: 'Music', note: 'Hum along quietly', glass: '#2F5D7C', raw: music },
  { id: 'telly', name: 'Telly', note: 'Off the box', glass: '#3E8E8A', raw: telly },
  { id: 'film', name: 'Film', note: 'Big screen, small print', glass: '#5B6ABF', raw: film },
  { id: 'odd', name: 'Odd facts', note: 'True. Somehow.', glass: '#8C5A3C', raw: odd },
  { id: 'sport', name: 'Sport', note: 'Rules of the game', glass: '#7F9A74', raw: sport },
  { id: 'words', name: 'Words', note: 'Books and spelling', glass: '#7A1E2C', raw: words },
  { id: 'science', name: 'Science and nature', note: 'Stars, beasts, atoms', glass: '#E0A526', raw: science },
  { id: 'history', name: 'History', note: 'Kings, wars, dates', glass: '#C89B3C', raw: history },
];
const BEDROOM_META = { id: 'bedroom', name: 'Bedroom', note: 'Adults only. Behave.', glass: '#E2553B', raw: bedroom, adult: true };

function hash(s) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
  return (x >>> 0).toString(36);
}

export function parse(cat, line) {
  const hard = line.startsWith('!');
  const parts = (hard ? line.slice(1) : line).split('|');
  return { id: `${cat}-${hash(parts[0])}`, q: parts[0], a: parts.slice(1, 5), hard, cat };
}

function build(m) {
  const qs = m.raw.map((l) => parse(m.id, l));
  return { id: m.id, name: m.name, note: m.note, glass: m.glass, adult: !!m.adult, qs };
}

export const CATEGORIES = META.map(build);
export const BEDROOM = build(BEDROOM_META);
export const ALL = [...CATEGORIES, BEDROOM];
export const CAT_INFO = Object.fromEntries(ALL.map((c) => [c.id, { id: c.id, name: c.name, note: c.note, glass: c.glass, adult: c.adult }]));

const decks = new Map();
/** {family, adult} deck for api.take: normal questions, or the hard ones for the Last Drop. */
export function questionDeck(catId, hard = false) {
  const k = `${catId}:${hard}`;
  if (!decks.has(k)) {
    const c = ALL.find((x) => x.id === catId) || CATEGORIES[0];
    const list = c.qs.filter((q) => q.hard === hard);
    decks.set(k, { family: list, adult: list });
  }
  return decks.get(k);
}
