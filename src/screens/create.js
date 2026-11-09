// create: name field + "Open the table". Cyril dollies in on the left third.
import { h, button, textField } from '../ui/components.js';
import { store } from '../util/storage.js';
import { sayLater } from './common.js';

export default {
  id: 'create',
  layout: 'split',
  shot: 'create',
  rail: false,
  mount({ sheet }, ctx) {
    const field = textField({ max: 10, placeholder: 'Your name', value: store.get('name', ''), onSubmit: () => go(), e2e: 'name-input', enterkeyhint: 'go' });
    const open = button('Open the table', { onClick: () => go(), e2e: 'open-table' });
    const back = button('Back', { kind: 'ghost', onClick: () => ctx.go('title') });
    async function go() {
      const name = field.input.value.trim();
      if (!name) { field.error(); return; }
      store.set('name', name);
      open.setLoading(true);
      try {
        await ctx.actions.createTable(name);
      } catch (e) {
        open.setLoading(false);
        ctx.toast(`Couldn't open a table (${e.code || e.message}). Check your connection and try again.`);
      }
    }
    sheet.append(
      h('div.t-eyebrow', 'New table'),
      h('h2.t-heading.sheet-title', 'What shall the table call you?'),
      field,
      h('div.sheet-actions', open, back),
    );
    return { unmount: sayLater(ctx, ctx.line('create'), { delay: 500 }) };
  },
};
