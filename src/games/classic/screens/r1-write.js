// r1-write: two prompts, one at a time. Field (max 60) + "Serve it". (DESIGN 2.3)
// The prompt sits on a menu card; two plate pips show your progress; Cyril's tips live in the
// sheet so nothing ever covers the strip's timer and chips.
import './r1.css';
import { h, button, textField } from '../../../ui/components.js';
import { cyrilNote, fitText, R1_ICONS, willowPlate } from './r1-kit.js';

const TIPS = [
  'Short and daft beats long and clever. Sixty characters, tops.',
  'Nobody knows who wrote what until the votes are in. *Be brave.*',
];

export default {
  id: 'r1-write',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const prompts = ctx.priv.prompts || [];
    const max = ctx.payload.max || 60;
    const body = h('div.r1-write');
    sheet.append(body);
    let saidTen = false;
    let note = null;

    const pips = (cur) => h('div.r1-plates', prompts.map((p, i) => {
      const served = ctx.mine.submitted[p.matchupId] !== undefined;
      return h(`span.r1-plate-pip${served ? '.served' : ''}${p === cur ? '.cur' : ''}`, { 'aria-label': `Plate ${i + 1}${served ? ' served' : ''}` },
        h('i', served ? { html: '<svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' } : String(i + 1)));
    }));

    const render = (c) => {
      const left = prompts.filter((p) => c.mine.submitted[p.matchupId] === undefined);
      const cur = left[0];
      if (!cur) return;
      if (body.dataset.slot === cur.matchupId) return;
      body.dataset.slot = cur.matchupId;
      const idx = prompts.indexOf(cur);
      const field = textField({ max, placeholder: 'Write your answer…', onSubmit: () => serve() });
      field.classList.add('r1-field');
      const serveBtn = button('Serve it', { onClick: () => serve(), e2e: 'submit' });
      serveBtn.insertAdjacentHTML('afterbegin', `<span class="r1-btn-ic">${R1_ICONS.cloche}</span>`);
      const promptText = h('div.r1-prompt-text', cur.prompt);
      const card = h('div.r1-prompt-card',
        h('div.r1-prompt-head', h('span.t-eyebrow', 'Your question'), pips(cur)),
        promptText,
        h('div.r1-rival', h('span.r1-rival-ic', { html: R1_ICONS.rival }), h('span', 'A secret rival is answering this too.')));
      function serve() {
        const text = field.input.value.trim();
        if (!text) { field.error(); note?.set('An empty plate? Steady on. Write *something*.'); return; }
        c.audio.sfx('plated');
        c.haptic('submit');
        serveBtn.disabled = true;
        card.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-200px) rotate(-5deg) scale(.7)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.64,0,.78,0)', fill: 'forwards' });
        setTimeout(() => ctx.client.submit(text, cur.matchupId), 220);
      }
      note = cyrilNote(TIPS[idx % TIPS.length]);
      const rack = h('div.r1-rack', prompts.map((pp, i) => {
        const done = c.mine.submitted[pp.matchupId] !== undefined;
        return h(`div.r1-rack-slot${pp === cur ? '.cur' : ''}${done ? '.done' : ''}`,
          h('span.r1-rack-plate', { html: willowPlate() }),
          h('span.r1-rack-lbl', h('b', `Plate ${i + 1}`), h('span', done ? 'Served' : pp === cur ? 'Cooking now' : 'Up next')));
      }));
      body.replaceChildren(card, field, note, rack, h('div.r1-actions', serveBtn));
      fitText(promptText, { max: 32, min: 23, maxH: 150 });
      body.classList.remove('r1-in'); void body.offsetWidth; body.classList.add('r1-in');
      if (!c.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
    };
    render(ctx);
    return {
      update: render,
      frame(c) {
        if (!saidTen && c.duration && c.remaining() < 10000 && c.remaining() > 8000) {
          saidTen = true;
          note?.set(c.line('timer10'));
          note?.classList.add('hot');
        }
      },
    };
  },
};
