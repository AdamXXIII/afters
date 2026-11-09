// r1-wait: "Plated. Waiting on: ..." + spin-the-plate fidget.
import { waitCard, waitingNames } from './common.js';

export default {
  id: 'r1-wait',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const card = waitCard(ctx, { title: 'Plated.', waitingOn: waitingNames(ctx) });
    sheet.append(card);
    return { update: (c) => card.setNames(waitingNames(c)) };
  },
};
