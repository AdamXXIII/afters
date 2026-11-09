// reconnect (overlay): dimmed stage, Cyril's "wandered off" line, Reconnecting... + Retry.
import './overlays.css';
import { h, button } from '../ui/components.js';

export default {
  id: 'reconnect',
  overlay: true,
  mount({ overlay }, ctx) {
    const status = h('p.t-body.on-dark.center', 'Reconnecting...');
    const retry = button('Retry', { onClick: () => ctx.client?.retry(), e2e: 'retry' });
    const leave = button('Leave the table', { kind: 'ghost', onClick: () => { ctx.actions.closeOverlay(); ctx.actions.leave(); } });
    leave.classList.add('on-dark');
    overlay.append(h('div.dim', h('div.reconnect-box', h('div.t-heading.on-dark.center', ctx.line('disconnect')[0]), status, retry, leave)));
    const update = (c) => {
      const st = c.client?.state.status;
      status.textContent = st === 'lost' ? 'Lost the table. Tap Retry, or leave.' : 'Reconnecting... (tap Retry to try now)';
    };
    update(ctx);
    return { update };
  },
};
