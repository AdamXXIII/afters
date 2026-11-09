// Bonce content: decks (family + Adults 18+), turn modifiers, team names. Node-safe.
import { FAMILY_DECKS } from './family.js';
import { ADULT_DECKS } from './adult.js';

/** {family: [deck], adult: [deck]}; deck = {id, name, blurb, icon, colour, cards: [40 strings]} */
export const DECKS = { family: FAMILY_DECKS, adult: ADULT_DECKS };

export const MODIFIERS = [
  { id: 'mime', name: 'Mime only', rule: 'No talking. No noises. Arms only.', not: ['telly', 'accents', 'firstdate', 'nostalgia'] },
  { id: 'oneword', name: 'One word clues', rule: 'One word at a time. No "sounds like".', not: ['accents', 'actout', 'saucytelly'] },
  { id: 'posh', name: 'Posh voices', rule: 'Every clue in your best Downton.', not: ['accents'] },
];

export const TEAMS = {
  gravy: { id: 'gravy', name: 'Team Gravy', colour: '#8C5A3C' },
  custard: { id: 'custard', name: 'Team Custard', colour: '#E0A526' },
};
