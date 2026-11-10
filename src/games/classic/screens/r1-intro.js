// r1-intro: "Course One - Plate Up" presented as a restaurant menu card with dotted-leader
// "prices" for the rules. Cyril says ONE short line (done typing by ~2 s of a 5.5 s phase). Host may skip after 3 s.
import './r1.css';
import { h } from '../../../ui/components.js';
import { sayLater, hostSkip, coursePips, R1_ICONS, R1_LINES } from './r1-kit.js';
import { DUR } from '../../../game/constants.js';

const MENU = [
  { icon: 'pen', dish: 'Answer two questions', price: `${Math.round(DUR['r1-write'] / 1000)} sec` },
  { icon: 'rival', dish: 'Each against a rival', price: '1 on 1' },
  { icon: 'fork', dish: 'The table votes', price: '1000 pts' },
];

export default {
  id: 'r1-intro',
  layout: 'show',
  shot: 'intro',
  rail: false, // nothing to react to on a rules card; gives Cyril's face room above the menu
  mount({ show }, ctx) {
    const card = h('div.r1-menu',
      h('div.r1-menu-band', h('span', 'Course One'), coursePips(1, 3)),
      h('div.r1-menu-title', 'Plate Up'),
      h('div.r1-menu-sub', 'Funniest answer wins the table.'),
      h('ul.r1-menu-items', MENU.map((m) => h('li',
        h('span.ic', { html: R1_ICONS[m.icon] }),
        h('span.dish', m.dish),
        h('span.lead'),
        h('span.price', m.price)))),
      h('div.r1-menu-foot', h('span', 'Win ', h('i', 'every'), ' vote?'), h('span.r1-menu-seal', 'Bonus ', h('b', '+250'))),
    );
    const wrap = h('div.r1-intro-wrap', card);
    show.append(wrap);
    if (ctx.frozen) card.classList.add('settled');
    else card.classList.add('enter');
    const skip = hostSkip(ctx, show);
    const cancel = sayLater(ctx, R1_LINES.intro, { delay: 600, hold: 3000, placement: 'above' });
    return { frame: (c) => skip?.frame(c), unmount: cancel };
  },
};
