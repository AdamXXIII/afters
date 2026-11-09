// join: 4 letter boxes (auto-advance, uppercase, paste-aware) + name + "Take a seat".
import './join.css';
import { h, button, textField } from '../ui/components.js';
import { store } from '../util/storage.js';
import { sanitiseCode } from '../net/roomCode.js';
import { params } from '../util/params.js';
import { sayLater } from './common.js';

const ERRORS = {
  'no-room': 'No table with that code. Check the letters?',
  started: 'That table has already started eating. Catch the next game.',
  full: 'Table\'s full. Pull up a pouffe and wait for the next game.',
  timeout: 'Couldn\'t reach that table. Are you on the same internet as the host?',
};

export default {
  id: 'join',
  layout: 'split',
  shot: 'join',
  rail: false,
  mount({ sheet }, ctx) {
    const boxes = [0, 1, 2, 3].map((i) => h('input.code-box', {
      type: 'text', inputMode: 'text', maxLength: 1, autocomplete: 'off', autocapitalize: 'characters', spellcheck: false,
      'aria-label': `Room code letter ${i + 1}`, 'data-e2e': `code-${i}`, enterkeyhint: i === 3 ? 'next' : 'next',
    }));
    const fill = (str, from = 0) => {
      const s = sanitiseCode(str);
      for (let k = 0; k < s.length && from + k < 4; k++) boxes[from + k].value = s[k];
      const next = Math.min(3, from + s.length);
      (boxes.find((b) => !b.value) || (from + s.length >= 4 ? name.input : boxes[next])).focus();
    };
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => {
        const v = b.value;
        b.value = '';
        if (v) fill(v, i);
      });
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !b.value && i > 0) { boxes[i - 1].value = ''; boxes[i - 1].focus(); e.preventDefault(); }
      });
      b.addEventListener('paste', (e) => { e.preventDefault(); fill(e.clipboardData.getData('text'), 0); });
    });
    if (params.room) params.room.split('').forEach((ch, i) => { boxes[i].value = ch; });
    const name = textField({ max: 10, placeholder: 'Your name', value: params.name || store.get('name', ''), onSubmit: () => go(), e2e: 'name-input', enterkeyhint: 'go' });
    const seat = button('Take a seat', { onClick: () => go(), e2e: 'take-seat' });
    const back = button('Back', { kind: 'ghost', onClick: () => ctx.go('title') });
    async function go() {
      const code = boxes.map((b) => b.value).join('');
      const nm = name.input.value.trim();
      if (code.length < 4) { boxes.find((b) => !b.value)?.focus(); ctx.haptic('error'); return; }
      if (!nm) { name.error(); return; }
      store.set('name', nm);
      seat.setLoading(true);
      try {
        await ctx.actions.joinTable(code, nm);
      } catch (e) {
        seat.setLoading(false);
        ctx.toast(ERRORS[e.code] || `Couldn't join (${e.code || e.message}).`);
        ctx.audio.sfx('error');
        if (e.code === 'full') ctx.say(ctx.line('tableFull'));
      }
    }
    sheet.append(
      h('div.t-eyebrow', 'Join a table'),
      h('h2.t-heading.sheet-title', 'The code on the host\'s phone'),
      h('div.code-boxes', boxes),
      name,
      h('div.sheet-actions', seat, back),
    );
    return { unmount: sayLater(ctx, ctx.line('join'), { delay: 500 }) };
  },
};
