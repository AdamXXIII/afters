// r1-write: two prompts. Field (max 60) + "Serve it". (DESIGN 2.3)
// The prompt sits on a menu card on a mustard field; the plate rack at the bottom shows both
// plates and is tappable, so you can hop between unserved prompts (each keeps its own draft).
// Any half-typed draft is served automatically in the last half-second so it is never lost.
// Cyril's tips live in the sheet so nothing ever covers the strip's timer and chips.
import './r1.css';
import { h, button, textField, onTap } from '../../../ui/components.js';
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
    const drafts = {};          // matchupId -> text typed so far
    let active = null;          // matchupId the player picked from the rack
    let field = null;
    let curId = null;
    let saidTen = false;
    let autoSent = false;
    let hurried = false;
    let note = null;

    const served = (c, p) => c.mine.submitted[p.matchupId] !== undefined;
    const saveDraft = () => { if (field && curId) drafts[curId] = field.input.value; };

    const pips = (c, cur) => h('div.r1-plates', prompts.map((p, i) => {
      const done = served(c, p);
      return h(`span.r1-plate-pip${done ? '.served' : ''}${p === cur ? '.cur' : ''}`, { 'aria-label': `Plate ${i + 1}${done ? ' served' : ''}` },
        h('i', done ? { html: '<svg viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' } : String(i + 1)));
    }));

    const render = (c, force = false) => {
      const left = prompts.filter((p) => !served(c, p));
      const cur = left.find((p) => p.matchupId === active) || left[0];
      if (!cur) return;
      if (!force && body.dataset.slot === cur.matchupId) return;
      saveDraft();
      body.dataset.slot = cur.matchupId;
      curId = cur.matchupId;
      const idx = prompts.indexOf(cur);
      field = textField({ max, placeholder: 'Write your answer…', value: drafts[cur.matchupId] || '', onSubmit: () => serve() });
      field.classList.add('r1-field');
      field.input.addEventListener('input', () => { drafts[cur.matchupId] = field.input.value; });
      const serveBtn = button('Serve it', { onClick: () => serve(), e2e: 'submit' });
      serveBtn.insertAdjacentHTML('afterbegin', `<span class="r1-btn-ic">${R1_ICONS.cloche}</span>`);
      const promptText = h('div.r1-prompt-text', cur.prompt);
      const card = h('div.r1-prompt-card',
        h('div.r1-prompt-head', h('span.t-eyebrow', `Plate ${idx + 1} of ${prompts.length}`), pips(c, cur)),
        promptText,
        h('div.r1-rival', h('span.r1-rival-ic', { html: R1_ICONS.rival }), h('span', 'A secret rival is answering this too.')));
      function serve() {
        const text = field.input.value.trim();
        if (!text) { field.error(); note?.set('An empty plate? Steady on. Write *something*.'); return; }
        c.audio.sfx('plated');
        c.haptic('submit');
        serveBtn.disabled = true;
        drafts[cur.matchupId] = '';
        card.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-200px) rotate(-5deg) scale(.7)', opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.64,0,.78,0)', fill: 'forwards' });
        setTimeout(() => ctx.client.submit(text, cur.matchupId), 220);
      }
      note = cyrilNote(hurried ? 'Everyone else has plated. *Chop chop.*' : TIPS[idx % TIPS.length], { tone: hurried ? '.hot' : '' });
      const rack = h('div.r1-rack', prompts.map((pp, i) => {
        const done = served(c, pp);
        const isCur = pp === cur;
        const hasDraft = !done && !isCur && (drafts[pp.matchupId] || '').trim();
        const slot = h(`button.r1-rack-slot${isCur ? '.cur' : ''}${done ? '.done' : ''}`, {
          type: 'button', disabled: done || isCur, 'aria-label': `Plate ${i + 1}: ${done ? 'served' : isCur ? 'writing now' : 'switch to this question'}`,
        },
        h('span.r1-rack-plate', { html: willowPlate() }),
        h('span.r1-rack-lbl', h('b', `Plate ${i + 1}`), h('span', done ? 'Served' : isCur ? 'Writing now' : hasDraft ? 'Draft saved' : 'Tap to switch')));
        if (!done && !isCur) onTap(slot, () => { saveDraft(); active = pp.matchupId; render(ctx, true); });
        return slot;
      }));
      body.replaceChildren(card, field, note, rack, h('div.r1-actions', serveBtn));
      fitText(promptText, { max: 36, min: 24, maxH: 170 });
      body.classList.remove('r1-in'); void body.offsetWidth; body.classList.add('r1-in');
      if (!c.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
    };
    render(ctx);
    return {
      update(c) {
        render(c);
        // the lead's straggler call-out: if it's me, Cyril leans on me in the sheet
        if (!hurried && c.progress?.straggler && c.progress.straggler === c.meId) {
          hurried = true;
          note?.set('Everyone else has plated. *Chop chop.*');
          note?.classList.add('hot');
        }
      },
      frame(c) {
        if (!c.duration) return;
        const rem = c.remaining();
        if (!saidTen && rem < 10000 && rem > 8000) {
          saidTen = true;
          note?.set(c.line('timer10'));
          note?.classList.add('hot');
        }
        // last half-second: serve any non-empty draft so a half-typed answer isn't lost
        if (!autoSent && !c.frozen && rem < 500) {
          autoSent = true;
          saveDraft();
          for (const p of prompts) {
            const t = (drafts[p.matchupId] || '').trim().slice(0, max);
            if (t && !served(c, p)) c.client.submit(t, p.matchupId);
          }
        }
      },
    };
  },
};
