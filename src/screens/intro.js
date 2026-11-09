// intro: Cyril welcomes the table in two bubbles.
import { h } from '../ui/components.js';
import { sayLater } from './common.js';

export default {
  id: 'intro',
  layout: 'show',
  shot: 'intro',
  mount({ show }, ctx) {
    show.append(h('div.show-top', h('div.t-eyebrow.on-dark.center', 'Tonight\'s host')));
    ctx.cyril.react('delight');
    return { unmount: sayLater(ctx, ctx.line('intro'), { delay: 500, hold: 2000 }) };
  },
};
