// r2-write: one bright linen menu card on the claret sheet. The fact sits on top with its blank,
// and you write your porky straight onto the card underneath (one place, never twice).
// Cyril's tip, the prices as two tiles, and a gold "Tell a porky". Too-honest => shake + note.
import { h, button, textField } from '../../../ui/components.js';
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
    const max = p.max || 40;
    const fact = factText(p.fact.text);
    const field = textField({ max, placeholder: 'Write your lie here', onSubmit: () => tell() });
    const btn = button('Tell a porky', { onClick: () => tell(), e2e: 'submit' });
    const note = h('div.r2-honest', { role: 'status' });
    const hurry = h('div.r2-hurry', { role: 'status' });
    field.input.addEventListener('input', () => { note.classList.remove('on'); fact.gap.classList.toggle('typing', !!field.input.value.trim()); });

    function tell() {
      const t = field.input.value.trim();
      if (!t) { field.error(); return; }
      ctx.audio.sfx('plated');
      ctx.haptic('submit');
      ctx.client.submit(t);
    }

    const tip = TIPS[Math.abs(Math.round(tilt(ctx.phase?.seed || 1, `tip${p.index}`, 1000))) % TIPS.length];
    const card = h(`div.card.r2-factcard${p.fact.text.length > 90 ? '.long' : ''}`,
      h('div.r2-fc-head',
        h('span.t-eyebrow', `Fact ${p.index + 1} of ${p.count}`),
        h('span.r2-fc-true', 'True, bar the gap')),
      fact,
      h('div.r2-fc-pen',
        h('span.r2-fc-lbl', 'Your porky'),
        h('div.r2-field', field)),
      note,
    );
    sheet.append(
      hurry,
      card,
      h('div.r2-tip', h('span.q', '“'), h('span.tx', p.index === 0 ? 'Write a porky so convincing your own nan would believe it.' : tip), h('span.by', 'Cyril')),
      h('div.r2-pay',
        h('div.r2-pay-i', h('b', '+500'), h('span', 'per friend fooled')),
        h('div.r2-pay-i.gold', h('b', '+1000'), h('span', 'if you spot the truth'))),
      h('div.sheet-actions.r2-actions', btn),
    );
    if (ctx.frozen && ctx.demo) {
      // screenshot: mid-typing
      field.input.value = 'slightly fizzy';
      field.input.dispatchEvent(new Event('input'));
    }
    const offReject = ctx.client.on('reject', (m) => {
      field.error();
      if (m?.reason === 'too-honest') {
        note.replaceChildren(h('b', 'That’s the truth!'), ' Now lie to them.');
        note.classList.add('on');
      }
    });
    if (!ctx.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);

    let hurried = false; let autoSent = false;
    const setHurry = (c) => {
      if (hurried || !c.progress?.straggler || c.progress.straggler !== c.meId) return;
      hurried = true;
      hurry.textContent = 'Everyone’s waiting on you. Lie faster!';
      hurry.classList.add('on');
      c.haptic?.('tick');
    };
    setHurry(ctx);
    return {
      update: setHurry,
      frame(c) {
        // last half-second: send a half-typed porky rather than lose it
        if (autoSent || c.frozen || !c.duration || c.remaining() > 500) return;
        autoSent = true;
        const t = field.input.value.trim().slice(0, max);
        if (t) c.client.submit(t);
      },
      unmount() { offReject(); },
    };
  },
};
