// Bonce content: decks (family + Adults 18+), turn modifiers, team names. Node-safe.
import { FAMILY_DECKS } from './family.js';
import { ADULT_DECKS } from './adult.js';

/** {family: [deck], adult: [deck]}; deck = {id, name, hint, icon, colour, cards: [64+ strings], examples: [3]} */
export const DECKS = { family: FAMILY_DECKS, adult: ADULT_DECKS };

export const MODIFIERS = [
  { id: 'mime', name: 'Mime only', rule: 'No talking. No noises. Arms only.', not: ['accents', 'music', 'telly'] },
  { id: 'oneword', name: 'One word clues', rule: 'One word at a time. No "sounds like".', not: ['accents', 'actout'] },
  { id: 'posh', name: 'Posh voices', rule: 'Every clue in your best Downton.', not: ['accents'] },
];

export const TEAMS = {
  gravy: { id: 'gravy', name: 'Team Gravy', colour: '#8C5A3C' },
  custard: { id: 'custard', name: 'Team Custard', colour: '#E0A526' },
};
