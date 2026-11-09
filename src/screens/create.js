// create: name field + live place card + "Open the table". Cyril dollies in on the left third.
import './create.css';
import { h, button, textField } from '../ui/components.js';
import { store } from '../util/storage.js';
import { sayLater } from './common.js';
import { sheetHead, nameCard } from './create-namecard.js';

// a ticket stub with four letters
const KEY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-2a2.5 2.5 0 0 0 0-5z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.7"/><path d="M8 12h1.2M11.4 12h1.2M14.8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

export default {
  id: 'create',
  layout: 'split',
  shot: 'create',
  rail: false,
  mount({ sheet }, ctx) {
    const field = textField({ max: 10, placeholder: 'Your name', value: store.get('name', ''), onSubmit: () => go(), e2e: 'name-input', enterkeyhint: 'go' });
    const open = button('Open the table', { onClick: () => go(), e2e: 'open-table' });
    async function go() {
      const name = field.input.value.trim();
      if (!name) { field.error(); field.input.focus(); return; }
      store.set('name', name);
      open.setLoading(true);
      try {
        await ctx.actions.createTable(name);
      } catch (e) {
        open.setLoading(false);
        ctx.toast(`Couldn't open a table (${e.code || e.message}). Check your connection and try again.`);
      }
    }
    sheet.append(h('div.fd-page.stagger',
      sheetHead('New table', 'What shall the table call you?', () => ctx.go('title')),
      h('div.fd-mid',
        nameCard(field, { kicker: 'Head of the table', tilt: -1.5 }),
        h('p.fd-hint', h('span.fd-hint-icon', { html: KEY }),
          h('span', 'You\'ll get a ', h('b', 'four-letter code'), '. Everyone else types it on their phone.'))),
      h('div.fd-actions', open),
    ));
    return { unmount: sayLater(ctx, ctx.line('create'), { delay: 500 }) };
  },
};
