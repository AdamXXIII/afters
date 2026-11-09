// Afters Classic: the original three-course show, as the first game in the box.
import { ClassicHost } from './host.js';
import { classicBot } from './bot.js';
import { CLASSIC_DEMOS } from './demos.js';

export default {
  id: 'classic',
  title: 'Afters Classic',
  dish: 'trifle',               // menu illustration (src/screens/menu-art.js)
  course: 'The house trifle',   // the line under the title on the menu card
  hint: 'Write, fib, vote',
  tagline: 'Three courses of quick wit, porkies and last orders.',
  blurb: 'Write the funniest answer, fib your way through true facts, then swipe for the toast of the table.',
  players: [3, 8],
  minutes: 15,
  colour: '#E0A526',
  tags: ['Writing', 'Voting', 'Fibbing'],
  createHost: (api) => new ClassicHost(api),
  bot: classicBot,
  screens: () => import('./screens/index.js'),
  demos: CLASSIC_DEMOS,
  /** Phone-specific screen for a phase (null = the phase id). */
  resolveScreen(state) {
    const ph = state.phase;
    const mine = state.mine;
    if (ph.id === 'r1-write') {
      const mineSlots = ph.private?.prompts?.length ?? 2;
      return Object.keys(mine.submitted).length >= mineSlots || state.progress.done[state.me] ? 'r1-wait' : 'r1-write';
    }
    if (ph.id === 'r2-write') return mine.submitted.only !== undefined || state.progress.done[state.me] ? 'r2-wait' : 'r2-write';
    return null;
  },
};
