// title: orbiting table, Cyril idle, AFTERS logo with a flame over the first A. (DESIGN 4)
import './title.css';
import { h, button } from '../ui/components.js';
import { ICONS } from '../ui/icons.js';
import { sayLater } from './common.js';

export default {
  id: 'title',
  layout: 'show',
  shot: 'title',
  rail: false,
  mount({ show }, ctx) {
    const logo = h('h1.logo.t-title-xl', { 'aria-label': 'Afters' },
      h('span.logo-a', 'A', h('span.logo-flame', { html: ICONS.flame })), 'FTERS');
    const tag = h('p.tagline', 'A party game for after dinner.');
    const actions = h('div.title-actions.stagger',
      button('Start a table', { onClick: () => ctx.go('create'), e2e: 'start-table' }),
      button('Join a table', { kind: 'secondary', onClick: () => ctx.go('join'), e2e: 'join-table' }),
    );
    show.append(h('div.title-top', logo, tag), actions);
    return { unmount: sayLater(ctx, ctx.line('title'), { delay: 1200, hold: 3000 }) };
  },
};
