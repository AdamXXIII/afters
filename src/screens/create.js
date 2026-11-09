// create: name field + live place card + "Open the table". Cyril dollies in on the left third.
import './create.css';
import { h, button, textField } from '../ui/components.js';
import { store } from '../util/storage.js';
import { sayLater } from './common.js';
import { sheetHead, nameCard } from './create-namecard.js';

const KEY = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 11h2M11 11h2M15 11h2M8 15h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

export default {
  id: 'create',
  layout: 'split',
  shot: 'create',
  rail: false,
  mount({ sheet }, ctx) {
    const field = textField({ max: 10, placeholder: 'Your name', value: store.get('name', ''), onSubmit: () => go(), e2e: 'name-input', enterkeyhint: 'go' });
    field.input.autocapitalize = 'words';
    field.input.spellcheck = false;
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
      field,
      nameCard(field, { kicker: 'Head of the table', tilt: -2 }),
      h('p.fd-hint', h('span.fd-hint-icon', { html: KEY }),
        h('span', 'You\'ll get a ', h('b', 'four-letter code'), '. Everyone else types it on their phone.')),
      h('div.fd-actions', open),
    ));
    return { unmount: sayLater(ctx, ctx.line('create'), { delay: 500 }) };
  },
};
