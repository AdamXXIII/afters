// Pardon? Round 3 "Mishearing": write your own misheard version of a famous line, vote the
// funniest (anonymous), then the verdict: cards in order of votes, author stamps, the winner last.
import { h, onTap, textField, timerRing } from '../../../ui/components.js';
import { say, disc, colourOf, srand } from './kit.js';

function lineCard(p, { timer = null } = {}) {
  return h('div.pd-line', timer, h('div.pd-line-q', `“${p.line}”`), h('div.pd-line-from', p.from));
}

const write = {
  id: 'pardon-write',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    let sent = ctx.mine.game.text || null;
    const field = textField({ max: p.max, placeholder: 'What did you hear?', e2e: 'pd-write', onSubmit: (v) => submit(v) });
    const btn = h('button.btn.block', { type: 'button', 'data-e2e': 'pd-send' }, 'Send my mishearing');
    const done = h('div.pd-done');
    const submit = (v) => {
      const text = String(v || '').trim();
      if (sent) return;
      if (!text) { field.error(); return; }
      if (text.toLowerCase().replace(/[^a-z]/g, '') === p.line.toLowerCase().replace(/[^a-z]/g, '')) { field.error(); ctx.say(['That’s the actual line. Mishear it, please.'], { hold: 2000 }); return; }
      sent = text;
      ctx.client.act('pd-write', { text }, { text });
      ctx.audio.sfx('plated'); ctx.haptic('submit');
      render(ctx);
    };
    onTap(btn, () => submit(field.input.value));
    const form = h('div.pd-form', field, btn);
    const example = p.eg ? h('div.pd-eg', h('span', 'For example: '), h('i', p.eg)) : null;
    sheet.append(h('div.pd-sheet.pd-in.pd-writesheet',
      h('div.pd-ask', 'The real line'),
      lineCard(p),
      example,
      form,
      done));
    const render = (c) => {
      form.hidden = !!sent;
      if (example) example.hidden = !!sent;
      if (sent) {
        const waiting = c.players.filter((x) => !c.progress.done?.[x.id]).map((x) => x.name);
        done.replaceChildren(h('div.pd-done-card', h('div.pd-done-t', `“${sent}”`), h('div.pd-done-s', waiting.length ? `Sent. Waiting on ${waiting.join(', ')}.` : 'Sent. That’s everyone.')));
      }
    };
    render(ctx);
    const cancel = say(ctx, ctx.line('pdWrite'), { hold: 2400 }, 400);
    return { update(c) { if (c.mine.game.text) sent = c.mine.game.text; render(c); }, unmount: cancel };
  },
};

const vote = {
  id: 'pardon-vote',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const mine = ctx.priv?.mine || [];
    const timer = timerRing();
    show.append(h('div.pd-top', lineCard(p, { timer })));
    const btns = new Map();
    const list = h('div.pd-votes', p.entries.map((e, i) => {
      const own = mine.includes(e.key);
      const b = h(`button.pd-ventry${own ? '.own' : ''}`, { type: 'button', disabled: own, 'data-e2e': own ? 'pd-vote-mine' : `pd-vote-${e.key}`, style: { '--t': `${(srand(ctx.phase.seed, e.key) - 0.5) * 2.4}deg`, '--d': `${i * 60}ms` } },
        own ? h('span.pd-yours', 'Yours') : null,
        h('span.pd-ventry-t', e.text));
      if (!own) onTap(b, () => { ctx.client.act('pd-vote', { key: e.key }, { key: e.key }); }, { sound: 'select', buzz: 'select' });
      btns.set(e.key, b);
      return b;
    }));
    const count = h('div.pd-status');
    const canVote = p.entries.some((e) => !mine.includes(e.key));
    sheet.append(h('div.pd-sheet.pd-in', h('div.pd-ask', canVote ? 'Which is funniest?' : 'Everyone else is voting'), list, h('div.pd-sheet-foot', count)));
    const render = (c) => {
      for (const [k, b] of btns) b.setAttribute('aria-pressed', String(c.mine.game.key === k));
      const n = c.progress.counts?.votes || 0;
      count.textContent = c.mine.game.key ? `Voted. You can still change it. ${n} in.` : `${n} vote${n === 1 ? '' : 's'} in`;
    };
    render(ctx);
    const cancel = say(ctx, ctx.line('pdVote'), { hold: 2200 }, 500);
    return { update: render, frame(c) { timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

const verdict = {
  id: 'pardon-verdict',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const cards = p.entries.map((e, i) => {
      const authors = e.authors.map((id) => ctx.player(id));
      const stamp = e.house
        ? h('div.pd-vauthor.house', h('span', 'Cyril’s own'))
        : h('div.pd-vauthor', authors.map((a) => disc(a, { size: 26 })), h('span', authors.map((a) => a?.name).join(' & ')), h('b', `+${e.pts}`));
      const el = h(`div.pd-vcard${e.top ? '.top' : ''}`, { style: { '--t': `${(srand(ctx.phase.seed, `v${e.key}`) - 0.5) * 3}deg`, '--pc': colourOf(authors[0]) } },
        e.top ? h('div.pd-vwin', 'Funniest') : null,
        h('div.pd-vtext', e.text),
        h('div.pd-vfoot', h('span.pd-voters', e.voters.map((id) => disc(ctx.player(id), { size: 22 }))), h('span.pd-vn', `${e.voters.length} vote${e.voters.length === 1 ? '' : 's'}`), stamp));
      return { e, el, at: p.start + i * p.per };
    });
    show.append(h('div.pd-verdict', h('div.pd-verdict-line', `“${p.line}”`), h('div.pd-vlist', cards.slice().reverse().map((c) => c.el))));
    const quiet = ctx.frozen;
    const fired = new Set();
    const cancel = say(ctx, ctx.line('pdVerdict'), { hold: 2000 }, 200);
    const run = (c) => {
      const t = c.elapsed();
      for (const cd of cards) {
        if (t >= cd.at && !fired.has(cd.e.key)) {
          fired.add(cd.e.key);
          cd.el.classList.add('in');
          if (!quiet) {
            ctx.audio.sfx(cd.e.top ? 'fanfare' : 'stamp');
            if (cd.e.top) { ctx.stage.shake?.(); if (cd.e.authors.includes(ctx.meId)) ctx.haptic('win'); } else ctx.haptic('stamp');
          }
          if (cd.e.top) ctx.cyril.react('guffaw', { duration: quiet ? 60000 : 1000 });
        }
      }
    };
    run(ctx);
    return { frame: run, unmount: cancel };
  },
};

export default [write, vote, verdict];
