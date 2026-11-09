// r2-wait: "Porky told. Keep a straight face." + fidget.
import { waitCard, waitingNames } from './common.js';

export default {
  id: 'r2-wait',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const card = waitCard(ctx, { title: 'Porky told. Keep a straight face.', waitingOn: waitingNames(ctx) });
    sheet.append(card);
    return { update: (c) => card.setNames(waitingNames(c)) };
  },
};
