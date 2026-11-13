// Bad Taste decks, by rating. Stable ids: api.take remembers them all night.
import * as family from './family.js';
import * as adult from './adult.js';

export const PROMPTS = { family: family.PROMPTS, adult: adult.PROMPTS };
export const ANSWERS = { family: family.ANSWERS, adult: adult.ANSWERS };

const BLANK = /_{3,}/;

/** Capitalise the first letter of a card for display on its own. */
export const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);

/**
 * Split a prompt around its blank: { before, after }. An answer that opens the sentence is
 * capitalised; a trailing full stop on a written answer is dropped when the prompt has its own.
 */
export function splitPrompt(prompt) {
  const m = prompt.match(BLANK);
  if (!m) return { before: `${prompt} `, after: '' };
  return { before: prompt.slice(0, m.index), after: prompt.slice(m.index + m[0].length) };
}

export function fillText(prompt, answer) {
  const { before, after } = splitPrompt(prompt);
  let a = answer.trim();
  if (/^[.?!]/.test(after)) a = a.replace(/[.?!]+$/, '');
  if (!before.trim() || /[.?!]\s*$/.test(before)) a = cap(a);
  return { before, answer: a, after };
}
