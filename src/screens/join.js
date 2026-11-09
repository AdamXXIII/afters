// join: 4 letter tiles (auto-advance, uppercase, paste-aware) + name + live place card + "Take a seat".
import './join.css';
import { h, button, textField } from '../ui/components.js';
import { store } from '../util/storage.js';
import { sanitiseCode } from '../net/roomCode.js';
import { params } from '../util/params.js';
import { sayLater } from './common.js';
import { sheetHead, nameCard } from './create-namecard.js';

const LINK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="4.2" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.9"/><path d="M12.2 12H21M17.5 12v3M20.5 12v2.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';

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
    let page = null;
    const boxes = [0, 1, 2, 3].map((i) => h('input.code-box', {
      type: 'text', inputMode: 'text', maxLength: 1, autocomplete: 'off', autocapitalize: 'characters', spellcheck: false,
      'aria-label': `Room code letter ${i + 1}`, 'data-e2e': `code-${i}`, enterkeyhint: 'next',
    }));
    const tiles = boxes.map((b, i) => h('div.code-slot', { style: { '--tilt': `${[-2, 1.5, -1, 2][i]}deg` } }, b));
    const mark = () => {
      boxes.forEach((b, i) => tiles[i].classList.toggle('filled', !!b.value));
      const first = boxes.findIndex((b) => !b.value);
      tiles.forEach((t, i) => t.classList.toggle('current', i === first));
      row.classList.toggle('complete', first === -1);
      page?.classList.toggle('code-pending', first !== -1);
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
    if (!ctx.frozen) setTimeout(() => (invited ? name.input : boxes.find((b) => !b.value) || name.input).focus({ preventScroll: true }), 650);

    const name = textField({ max: 10, placeholder: 'Your name', value: params.name || store.get('name', ''), onSubmit: () => go(), e2e: 'name-input', enterkeyhint: 'go' });
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
    sheet.append(page = h('div.fd-page.stagger',
      sheetHead(invited ? 'You\'re invited' : 'Join a table', 'What\'s the table code?', () => ctx.go('title')),
      h('div.code-group', row,
        h('p.fd-hint.code-caption', h('span.fd-hint-icon', { html: LINK }),
          h('span', invited ? 'Filled in from your invite. Just add your name.' : h('span', 'Four letters. ', h('b', 'No vowels'), ', so nothing rude.')))),
      h('div.fd-mid', nameCard(name, { kicker: 'Reserved for', tilt: 1.5 })),
      h('div.fd-actions', seat),
    ));
    mark();
    return { unmount: sayLater(ctx, ['Mind the step. Code on the door?'], { delay: 500 }) };
  },
};
