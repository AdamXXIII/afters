// Same Here play screens.
// write (one secret answer), wait (locked in, who's still writing),
// sort (the table votes on whether close answers count as the same; anyone can raise a pair).
// AI-generated (Claude, Same Here builder, 2026-11-13).
import { h, onTap, button, textField } from '../../../ui/components.js';
import { QUESTIONS } from '../content/questions.js';
import { disc, pips, questionCard, answerCard, sayLater, chairNote, nameOf } from './kit.js';

const TIPS = [
  'Say the obvious thing. The obvious thing wins.',
  'First answer that pops into your head. Go with it.',
  'Not the best answer. The most common one.',
];

const demoText = (q) => {
  const item = [...QUESTIONS.family, ...QUESTIONS.adult].find((x) => x.q === q);
  const a = item?.answers?.[0] || 'Something';
  return a.slice(0, Math.max(3, Math.ceil(a.length * 0.7)));
};

function scoreLine(ctx, p) {
  const mine = (p.standings || []).find((r) => r.id === ctx.meId)?.score ?? ctx.me?.score ?? 0;
  return h('div.sh-score', h('span.sh-score-l', `Your points: ${mine}`), pips(mine, p.target));
}

// ---------- write ----------
const write = {
  id: 'samehere-write',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    const field = textField({ max: p.max || 32, placeholder: 'Your answer', onSubmit: () => send(), e2e: 'answer-input' });
    const btn = button('Lock it in', { onClick: () => send(), e2e: 'submit' });
    function send() {
      const t = field.input.value.trim();
      if (!t) { field.error(); return; }
      ctx.audio.sfx('plated'); ctx.haptic('submit');
      ctx.client.act('sh-answer', { text: t }, { sent: t });
    }
    const tip = TIPS[(p.round || 1) % TIPS.length];
    sheet.append(h(`div.sh-sheet.sh-write.sh-in`,
      h('div.sh-row', h('span.sh-qn', `Question ${p.round}`), scoreLine(ctx, p)),
      h('div.sh-ask', h(`div.sh-sheetq${p.q.length > 44 ? '.long' : ''}`, p.q), field),
      h('div.sh-rule', tip),
      chairNote(ctx, p.chair),
      h('div.sh-actions', btn)));
    if (ctx.frozen && ctx.demo) { field.input.value = demoText(p.q); field.input.dispatchEvent(new Event('input')); }
    if (!ctx.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
    const cancel = sayLater(ctx, ctx.line('shWrite'), { delay: 700 });
    let autoSent = false;
    return {
      frame(c) {
        if (autoSent || c.frozen || !c.duration || c.remaining() > 500) return;
        autoSent = true;
        const t = field.input.value.trim();
        if (t) c.client.act('sh-answer', { text: t }, { sent: t });
      },
      unmount: cancel,
    };
  },
};

// ---------- wait ----------
const wait = {
  id: 'samehere-wait',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    const text = ctx.mine.game.sent || 'Locked in';
    const box = h('div.sh-waiting');
    let key = '';
    const sync = (c) => {
      const list = c.players.filter((pl) => !c.progress.done[pl.id] && pl.connected !== false);
      const k = list.map((x) => x.id).join(',');
      if (k === key) return;
      key = k;
      box.replaceChildren(
        h('div.sh-waiting-l', list.length ? `Still writing (${list.length})` : 'Everyone’s in.'),
        h('div.sh-waiting-row', list.map((pl, i) => h('div.sh-writer', { style: { '--i': i } }, disc(pl, { size: 40 }), h('span.nm', pl.name), h('span.sh-dots', h('i'), h('i'), h('i'))))));
    };
    sync(ctx);
    sheet.append(h('div.sh-sheet.sh-waitsheet.sh-in',
      h('div.sh-head', h('div.sh-title', 'Locked in.'), h('div.sh-sub', 'Now hope everyone else said it too.')),
      h('div.sh-waitq', p.q),
      answerCard(text, { cls: '.big.mine', seed: ctx.phase?.seed || 1, key: ctx.meId }),
      box));
    const cancel = sayLater(ctx, ctx.line('shWait'), { delay: 500 });
    return { update: sync, unmount: cancel };
  },
};

// ---------- sort: same answer or not? ----------
const sort = {
  id: 'samehere-sort',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const seed = ctx.phase?.seed || 1;
    const textOf = (gid) => p.groups.find((g) => g.gid === gid)?.text || '?';
    const mineGid = ctx.priv?.mine;

    // show layer: the question and every answer on the table (no counts yet: that's the reveal)
    const spread = h('div.sh-spread', p.groups.map((g) => answerCard(g.text, { cls: g.gid === mineGid ? '.mini.mine' : '.mini', seed, key: g.gid })));
    const qc = questionCard(p.q, { round: p.round, compact: true, timer: true });
    show.append(h('div.sh-top', qc, spread));

    const list = h('div.sh-disputes');
    const picker = h('div.sh-pairs');
    const pickHint = h('div.sh-pairs-l');
    const done = button('I’m ready', { e2e: 'sh-done', onClick: () => {
      const now = !ctx.mine.game.done;
      ctx.client.act('sh-done', { done: now }, { done: now });
    } });
    const doneN = h('div.sh-donen');
    let sel = null;
    const chips = p.groups.map((g) => {
      const b = h('button.sh-pick', { type: 'button', 'data-e2e': `sh-pair-${g.gid}`, 'aria-pressed': 'false' }, g.text);
      onTap(b, () => {
        if (!sel) { sel = g.gid; } else if (sel === g.gid) { sel = null; } else {
          ctx.client.act('sh-propose', { a: sel, b: g.gid }, {});
          sel = null;
        }
        chips.forEach((x, i) => x.setAttribute('aria-pressed', String(p.groups[i].gid === sel)));
        pickHint.textContent = sel ? `Now tap the one that matches “${textOf(sel)}”.` : 'Tap both answers.';
      }, { sound: 'select', buzz: 'select' });
      return b;
    });
    picker.append(...chips);
    pickHint.textContent = 'Tap both answers.';

    const rows = new Map();
    function row(d) {
      const same = h('button.sh-vote.same', { type: 'button', 'data-e2e': `sh-same-${d.id}`, 'aria-pressed': 'false' }, h('span.lbl', 'Same'), h('span.sh-vavs'));
      const diff = h('button.sh-vote.diff', { type: 'button', 'data-e2e': `sh-diff-${d.id}`, 'aria-pressed': 'false' }, h('span.lbl', 'Not the same'), h('span.sh-vavs'));
      const vote = (v) => {
        const votes = { ...(ctx.mine.game.votes || {}) };
        const next = votes[d.id] === v ? null : v;
        if (next === null) delete votes[d.id]; else votes[d.id] = next;
        ctx.client.act('sh-vote', { id: d.id, same: next }, { votes });
      };
      onTap(same, () => vote(true), { sound: 'select', buzz: 'select' });
      onTap(diff, () => vote(false), { sound: 'select', buzz: 'select' });
      const verdict = h('span.sh-dverdict');
      const el = h('div.sh-dispute',
        h('div.sh-dq', h('span.sh-dans', d.a), h('span.sh-deq', '='), h('span.sh-dans', d.b)),
        h('div.sh-dvotes', same, diff),
        h('div.sh-dfoot', h('span.sh-dby'), verdict));
      el.parts = { same, diff, verdict };
      return el;
    }

    const head = h('div.sh-head');
    const opener = h('button.sh-opener', { type: 'button', 'data-e2e': 'sh-open-pairs' }, 'Two other answers match?');
    const pairbox = h('div.sh-pairbox.closed', opener, pickHint, picker);
    onTap(opener, () => pairbox.classList.remove('closed'));
    sheet.append(h('div.sh-sheet.sh-sortsheet.sh-in', head, list, pairbox, h('div.sh-actions', doneN, done)));

    const sync = (c) => {
      const ds = (c.progress.disputes || []).map((d) => ({ ...d, a: textOf(d.a), b: textOf(d.b) }));
      head.replaceChildren(
        h('div.sh-title', ds.length ? 'Same answer?' : 'Any two answers the same?'),
        h('div.sh-sub', ds.length ? 'Argue out loud. Whoever didn’t write them votes.' : 'Tap both. The table then votes.'));
      if (!ds.length) pairbox.classList.remove('closed');
      for (const d of ds) {
        if (!rows.has(d.id)) { const r = row(d); rows.set(d.id, r); list.append(r); }
        const r = rows.get(d.id).parts;
        const judge = !d.judges || d.judges.includes(c.meId);
        rows.get(d.id).classList.toggle('author', !judge);
        r.same.disabled = !judge; r.diff.disabled = !judge;
        r.verdict.parentElement.querySelector('.sh-dby').textContent = judge ? (d.by ? `${nameOf(c, d.by)} says these match` : '') : 'You wrote one of these. The others decide.';
        const my = c.mine.game.votes?.[d.id];
        r.same.setAttribute('aria-pressed', String(my === true));
        r.diff.setAttribute('aria-pressed', String(my === false));
        r.same.querySelector('.sh-vavs').replaceChildren(...d.same.map((id) => disc(c.player(id), { size: 22 })));
        r.diff.querySelector('.sh-vavs').replaceChildren(...d.diff.map((id) => disc(c.player(id), { size: 22 })));
        const s = d.same.length; const n = d.diff.length;
        r.verdict.textContent = s > n ? 'So far: same' : s || n ? 'So far: different' : '';
        r.verdict.className = `sh-dverdict${s > n ? ' on' : ''}`;
      }
      list.classList.toggle('empty', !ds.length);
      const full = ds.length >= (p.maxDisputes || 5);
      picker.parentElement.classList.toggle('off', full);
      const dn = c.players.filter((pl) => c.progress.done[pl.id]).length;
      doneN.textContent = `Answers show when everyone’s ready (${dn} of ${c.players.length})`;
      done.textContent = c.mine.game.done ? 'Wait, still arguing' : 'I’m ready';
      done.classList.toggle('btn-secondary', !!c.mine.game.done);
    };
    sync(ctx);
    const cancel = sayLater(ctx, ctx.line('shSort'), { delay: 600 });
    return { update: sync, frame(c) { qc.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

export default [write, wait, sort];
