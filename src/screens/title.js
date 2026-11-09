// title: orbiting table, Cyril idle, AFTERS logo with a flame over the first A. (DESIGN 4)
// Menu-card lockup: "Cyril Waxley presents" above, a brass-ruled tagline below, the two
// actions in the thumb zone on a warm scrim, and a quiet "what is this" line under them.
import './title.css';
import { h, button } from '../ui/components.js';
import { sayLater } from './common.js';

// Our own flame (taller, two-tone, with a hot core) rather than the small shared glyph.
const FLAME = `<svg viewBox="0 0 24 40" aria-hidden="true">
  <defs>
    <radialGradient id="tf-g" cx="50%" cy="72%" r="62%">
      <stop offset="0" stop-color="#FFF4D6"/><stop offset=".45" stop-color="#FFC86B"/><stop offset="1" stop-color="#E2553B"/>
    </radialGradient>
  </defs>
  <path d="M12 1.5c1.4 6.2 9.5 11.6 9.5 22.3A9.5 9.5 0 0 1 2.5 23.8C2.5 15.6 8 12.4 9.2 6.8c1.6 2.4 1.6 5 1.2 7.3C12.6 11.6 13 6.4 12 1.5z" fill="url(#tf-g)"/>
  <path d="M12 21c.8 3 4.6 5 4.6 9a4.6 4.6 0 0 1-9.2 0c0-3.6 3.8-5.4 4.6-9z" fill="#FFF8E6" opacity=".95"/>
</svg>`;

const RULE = (side) => h(`span.title-rule.${side}`, { 'aria-hidden': 'true' }, h('i'), h('b'));

export default {
  id: 'title',
  layout: 'show',
  shot: 'title',
  rail: false,
  mount({ show }, ctx) {
    const logo = h('h1.title-logo', { 'aria-label': 'Afters' },
      h('span.title-a', 'A',
        h('span.title-halo', { 'aria-hidden': 'true' }),
        h('span.title-flame', { html: FLAME, 'aria-hidden': 'true' })),
      h('span.title-rest', { 'aria-hidden': 'true' }, 'FTERS'));
    const top = h('div.title-top',
      h('p.title-presents', 'Cyril Waxley presents'),
      logo,
      h('p.title-tag', RULE('l'), h('span', 'A party game for after dinner'), RULE('r')),
    );
    const actions = h('div.title-actions',
      button('Start a table', { onClick: () => ctx.go('create'), e2e: 'start-table' }),
      button('Join a table', { kind: 'secondary', onClick: () => ctx.go('join'), e2e: 'join-table' }),
      h('p.title-meta', h('span', '3–8 players'), h('i', { 'aria-hidden': 'true' }), h('span', '20 minutes'), h('i', { 'aria-hidden': 'true' }), h('span', 'no TV needed')),
    );
    show.append(h('div.title-scrim', { 'aria-hidden': 'true' }), top, actions);
    return { unmount: sayLater(ctx, ctx.line('title'), { delay: 1400, hold: 3200 }) };
  },
};
