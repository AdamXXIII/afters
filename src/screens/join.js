// join: 4 letter tiles (auto-advance, uppercase, paste-aware) + name + live place card + "Take a seat".
import './join.css';
import { h, button, textField } from '../ui/components.js';
import { store } from '../util/storage.js';
import { sanitiseCode } from '../net/roomCode.js';
import { params } from '../util/params.js';
import { sayLater } from './common.js';
import { sheetHead } from './create-namecard.js';

const LINK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';

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
      'aria-label': `Room code letter ${i + 1}`, 'data-e2e': `code-${i}`, enterkeyhint: 'next',
    }));
    const tiles = boxes.map((b, i) => h('div.code-slot', { style: { '--tilt': `${[-2, 1.5, -1, 2][i]}deg` } }, b));
    const mark = () => {
      boxes.forEach((b, i) => tiles[i].classList.toggle('filled', !!b.value));
      row.classList.toggle('complete', boxes.every((b) => b.value));
    };
    const fill = (str, from = 0) => {
      const s = sanitiseCode(str);
      for (let k = 0; k < s.length && from + k < 4; k++) {
        boxes[from + k].value = s[k];
        const t = tiles[from + k];
        t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
      }
      mark();
      const next = Math.min(3, from + s.length);
      (boxes.find((b) => !b.value) || (from + s.length >= 4 ? name.input : boxes[next])).focus();
    };
    boxes.forEach((b, i) => {
      b.addEventListener('input', () => {
        const v = b.value;
        b.value = '';
        if (v) fill(v, i); else mark();
      });
      b.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !b.value && i > 0) { boxes[i - 1].value = ''; boxes[i - 1].focus(); e.preventDefault(); mark(); }
      });
      b.addEventListener('paste', (e) => { e.preventDefault(); fill(e.clipboardData.getData('text'), 0); });
    });
    const row = h('div.code-boxes', tiles);
    const invited = !!params.room;
    if (params.room) params.room.split('').forEach((ch, i) => { if (boxes[i]) boxes[i].value = ch; });
    mark();

    const name = textField({ max: 10, placeholder: 'Your name', value: params.name || store.get('name', ''), onSubmit: () => go(), e2e: 'name-input', enterkeyhint: 'go' });
    name.input.autocapitalize = 'words';
    name.input.spellcheck = false;
    const seat = button('Take a seat', { onClick: () => go(), e2e: 'take-seat' });
    const shake = () => { row.classList.remove('error'); void row.offsetWidth; row.classList.add('error'); };
    async function go() {
      const code = boxes.map((b) => b.value).join('');
      const nm = name.input.value.trim();
      if (code.length < 4) { shake(); boxes.find((b) => !b.value)?.focus(); ctx.haptic('error'); ctx.audio.sfx('error'); return; }
      if (!nm) { name.error(); name.input.focus(); return; }
      store.set('name', nm);
      seat.setLoading(true);
      try {
        await ctx.actions.joinTable(code, nm);
      } catch (e) {
        seat.setLoading(false);
        if (e.code === 'no-room') shake();
        ctx.toast(ERRORS[e.code] || `Couldn't join (${e.code || e.message}).`);
        ctx.audio.sfx('error');
        if (e.code === 'full') ctx.say(ctx.line('tableFull'));
      }
    }
    sheet.append(h('div.fd-page.stagger',
      sheetHead(invited ? 'You\'re invited' : 'Join a table', 'What\'s the table code?', () => ctx.go('title')),
      h('div.code-group', row,
        h('p.code-caption', invited ? 'Filled in from your invite. Just add your name.' : 'Four letters on the host\'s phone. No vowels, so nothing rude.')),
      name,
      invited ? null : h('p.fd-hint.fd-hint-mid', h('span.fd-hint-icon', { html: LINK }),
        h('span', 'Got a link from the host? Tap it and the code ', h('b', 'fills itself in'), '.')),
      h('div.fd-actions', seat),
    ));
    return { unmount: sayLater(ctx, ['Mind the step. Code on the door?'], { delay: 500 }) };
  },
};
