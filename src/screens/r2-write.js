// r2-write: the fact on a menu card; your porky writes itself into the gap as you type.
// Field (max 40), a Cyril tip, the price of a good lie, and "Tell a porky". Too-honest => shake + note.
import { h, button, textField } from '../ui/components.js';
import { factText, tilt } from './r2-kit.js';

export { factText };

const TIPS = [
  'Dull lies win. Nobody believes a dragon.',
  'Match the tone of the fact. Sound like a footnote.',
  'Be specific. "38 minutes" beats "quite quick".',
  'Think what the table will guess, then guess slightly to the left.',
  'If it makes you laugh, it won\'t fool anyone. Probably.',
];

export default {
  id: 'r2-write',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    const fact = factText(p.fact.text);
    const field = textField({ max: p.max || 40, placeholder: 'Type your lie here', onSubmit: () => tell() });
    const btn = button('Tell a porky', { onClick: () => tell(), e2e: 'submit' });
    const note = h('div.r2-honest', { role: 'status' });
    field.input.addEventListener('input', () => { fact.setFill(field.input.value.trim()); note.classList.remove('on'); });

    function tell() {
      const t = field.input.value.trim();
      if (!t) { field.error(); return; }
      ctx.audio.sfx('plated');
      ctx.haptic('submit');
      ctx.client.submit(t);
    }

    const tip = TIPS[Math.abs(Math.round(tilt(ctx.phase?.seed || 1, `tip${p.index}`, 1000))) % TIPS.length];
    const card = h('div.card.r2-factcard',
      h('div.r2-fc-head',
        h('span.t-eyebrow', `Fact ${p.index + 1} of ${p.count}`),
        h('span.r2-fc-true', 'True, bar the gap')),
      fact,
    );
    sheet.append(
      card,
      h('div.r2-field', field, note),
      h('div.r2-tip', h('span.q', { html: '<svg viewBox="0 0 24 24"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 .5 2 1.5 3 2.5 3 0-3-1-5.5.5-8z" fill="currentColor"/></svg>' }), h('span.tx', p.index === 0 ? 'Write a porky so convincing your own nan would believe it.' : tip), h('span.by', 'Cyril')),
      h('div.sheet-actions.r2-actions',
        h('div.r2-pay', h('span', 'Every fool'), h('b', '+500'), h('span.sep'), h('span', 'Spot the truth'), h('b', '+1000')),
        btn),
    );
    if (ctx.frozen && ctx.demo) {
      // screenshot: show the live gap-fill mid-typing
      field.input.value = 'slightly fizzy';
      field.input.dispatchEvent(new Event('input'));
    }
    const offReject = ctx.client.on('reject', (m) => {
      field.error();
      if (m?.reason === 'too-honest') {
        note.textContent = 'Too honest. That’s the real answer. Lie better.';
        note.classList.add('on');
      }
    });
    if (!ctx.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
    return { unmount() { offReject(); } };
  },
};
