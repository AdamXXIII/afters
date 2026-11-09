// end: Same again / New table (host), Leave (everyone).
import { h, button } from '../ui/components.js';
import { sayLater } from './common.js';

export default {
  id: 'end',
  layout: 'split',
  shot: 'end',
  mount({ sheet }, ctx) {
    ctx.stage.setPodium(null);
    const host = ctx.player(ctx.state.hostId);
    const leave = button('Leave', { kind: 'ghost', onClick: () => ctx.actions.leave(), e2e: 'leave' });
    if (ctx.isHost) {
      sheet.append(
        h('div.t-eyebrow', 'That\'s dessert'),
        h('h2.t-heading.sheet-title', 'Another round?'),
        h('div.sheet-actions',
          button('Same again', { onClick: () => ctx.client.again(), e2e: 'again' }),
          button('New table', { kind: 'secondary', onClick: () => ctx.client.newTable(), e2e: 'new-table' }),
          leave));
    } else {
      sheet.append(
        h('div.t-eyebrow', 'That\'s dessert'),
        h('div.waiting-card', h('div.t-heading', `Waiting for ${host?.name || 'the host'} to pour another round.`)),
        h('div.sheet-actions', leave));
    }
    return { unmount: sayLater(ctx, ctx.line(ctx.isHost ? 'end' : 'endGuest'), { delay: 500, hold: 4000 }) };
  },
};
