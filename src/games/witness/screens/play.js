// Character Witness play screens.
// dock    (defendant writes the truth, may plead the fifth once)
// write   (everyone else fakes the defendant's answer in their voice)
// wait    (statement taken, who's still writing)
// pick    (find the one the defendant wrote; cross-examination: two cards, double points)
// sweat   (the defendant watches the jury decide)
// choose / recess (cross-examination: the defendant keeps one fake beside their answer)
import { h, onTap, button, textField } from '../../../ui/components.js';
import { ICONS } from '../../../ui/icons.js';
import { disc, dock, dockCard, statement, seal, sayLater, LETTERS, tilt } from './kit.js';

const nameOf = (ctx, id) => ctx.player(id)?.name || 'Someone';
const TICK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const TIPS = [
  'Steal their phrases. How would they actually say it?',
  'Small and specific beats big and silly.',
  'Write it in their words, not yours.',
  'Think what they’d say, then what they’d say on a good day.',
  'Lower case and no full stop. Real people text like that.',
];

/** Shared writing sheet for the dock (truth) and the jury (fakes). */
function writeSheet(sheet, ctx, { defendant }) {
  const p = ctx.payload;
  const def = ctx.player(p.defendant);
  const name = def?.name || 'Someone';
  const max = p.max || 50;
  let fifth = false;
  const field = textField({
    max,
    placeholder: defendant ? 'The truth, the whole truth' : `As ${name} would put it`,
    onSubmit: () => send(),
    e2e: 'answer-input',
  });
  const btn = button(defendant ? 'Swear to it' : 'Send my fake', { onClick: () => send(), e2e: 'submit' });
  const q = h(`div.wt-sheetq${p.q.length > 60 ? '.long' : ''}`, p.q);

  function send() {
    const t = field.input.value.trim();
    if (!t) { field.error(); return; }
    ctx.audio.sfx('plated'); ctx.haptic('submit');
    ctx.client.act('wt-answer', { text: t, fifth }, { sent: t, fifth });
  }

  let fifthRow = null;
  if (defendant && p.fifthLeft) {
    const sw = h('button.wt-fifth', { type: 'button', 'aria-pressed': 'false', 'data-e2e': 'wt-fifth' },
      h('span.wt-fifth-sw', h('i')),
      h('span.wt-fifth-t', h('b', 'Plead the fifth'), h('small', 'Once a game. Write a lie instead. Nobody will know.')));
    onTap(sw, () => {
      fifth = !fifth;
      sw.setAttribute('aria-pressed', String(fifth));
      field.input.placeholder = fifth ? 'A lie, in your own words' : 'The truth, the whole truth';
      btn.textContent = fifth ? 'Lie under oath' : 'Swear to it';
      sheetEl.classList.toggle('fifth', fifth);
    }, { sound: 'select', buzz: 'select' });
    fifthRow = sw;
  }

  const head = defendant
    ? h('div.wt-head', dock(def, { size: 50 }), h('div.wt-head-t', h('div.wt-title', p.final ? 'You’re on the stand' : 'You’re in the dock'), h('div.wt-sub', p.final ? 'Answer honestly. Triple points.' : 'Answer honestly. They’re about to fake it.')))
    : h('div.wt-head', dock(def, { size: 50 }), h('div.wt-head-t', h('div.wt-title', `Be ${name}`), h('div.wt-sub', `Write what ${name} would say. Fool the table.`)));
  const pay = defendant
    ? h('div.wt-pay.one', h('div.wt-pay-i', h('b', `+${p.final ? 1000 : 250 * (p.mult || 1)}`), h('span', 'for every juror who picks a fake')))
    : h('div.wt-pay', h('div.wt-pay-i', h('b', `+${500 * (p.mult || 1)}`), h('span', 'per person fooled')), h('div.wt-pay-i.gold', h('b', `+${1000 * (p.mult || 1)}`), h('span', 'for finding the real one')));
  const tip = defendant ? h('div.wt-tip', 'Honest, but not obvious. That\u2019s the trick.') : h('div.wt-tip', TIPS[Math.abs(Math.round(tilt(ctx.phase?.seed || 1, 'tip', 100))) % TIPS.length]);
  const sheetEl = h(`div.wt-sheet.wt-write.wt-in${defendant ? '.dockside' : ''}${p.final ? '.final' : ''}`,
    head,
    h('div.wt-ask', q, h('div.wt-field', field)),
    fifthRow, pay, tip,
    h('div.wt-actions', btn));
  sheet.append(sheetEl);
  if (ctx.frozen && ctx.demo) {
    field.input.value = defendant ? 'my nan’s old ' : 'the photo alb';
    field.input.dispatchEvent(new Event('input'));
  }
  if (!ctx.frozen) setTimeout(() => field.input.focus({ preventScroll: true }), 450);
  const firstDouble = p.mult === 2 && p.index === Math.ceil((p.count || 1) / 2);
  const cancel = sayLater(ctx, ctx.line(firstDouble ? 'wtDouble' : defendant ? 'wtDock' : 'wtWrite', { name }), { delay: 700 });
  let autoSent = false;
  return {
    frame(c) {
      if (autoSent || c.frozen || !c.duration || c.remaining() > 500) return;
      autoSent = true;
      const t = field.input.value.trim().slice(0, max);
      if (t) c.client.act('wt-answer', { text: t, fifth }, { sent: t, fifth });
    },
    unmount: cancel,
  };
}

const dockScreen = {
  id: 'witness-dock',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) { return writeSheet(sheet, ctx, { defendant: true }); },
};

const writeScreen = {
  id: 'witness-write',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) { return writeSheet(sheet, ctx, { defendant: false }); },
};

// ---------- wait ----------
const wait = {
  id: 'witness-wait',
  layout: 'input',
  shot: 'write',
  mount({ sheet }, ctx) {
    const p = ctx.payload;
    const isDef = p.defendant === ctx.meId;
    const text = ctx.mine.game.sent || '';
    const fifth = !!ctx.mine.game.fifth;
    const card = statement(text || 'Sealed', { cls: '.big', seed: ctx.phase?.seed || 1, key: ctx.meId });
    card.append(seal(isDef ? (fifth ? 'Fifth' : 'Sworn') : 'Fake', isDef ? '' : '.fake'));
    const box = h('div.wt-waiting');
    let key = '';
    const sync = (c) => {
      const list = c.players.filter((pl) => !c.progress.done[pl.id] && pl.connected !== false);
      const k = list.map((x) => x.id).join(',');
      if (k === key) return;
      key = k;
      box.replaceChildren(
        h('div.wt-waiting-l', list.length ? `Still writing (${list.length})` : 'Everyone’s in. Here we go.'),
        h('div.wt-waiting-row', list.map((pl, i) => h('div.wt-writer', { style: { '--i': i } }, disc(pl, { size: 44 }), h('span.nm', pl.id === p.defendant ? `${pl.name} (dock)` : pl.name), h('span.wt-dots', h('i'), h('i'), h('i'))))));
    };
    sync(ctx);
    sheet.append(h('div.wt-sheet.wt-waitsheet.wt-in',
      h('div.wt-head.center', h('div.wt-head-t', h('div.wt-title', isDef ? (fifth ? 'Fifth pleaded.' : 'Sworn.') : 'Fake filed.'), h('div.wt-sub', isDef ? 'Now keep a straight face.' : `Let’s see if ${nameOf(ctx, p.defendant)} sounds like that.`))),
      card,
      box));
    return { update: sync };
  },
};

// ---------- pick (and the cross-examination pick) ----------
function pickedRow(ctx) {
  const jury = ctx.players.filter((pl) => pl.id !== ctx.payload.defendant);
  const avs = new Map(jury.map((pl) => [pl.id, disc(pl, { size: 34 })]));
  const lbl = h('span.wt-picked-l');
  const el = h('div.wt-picked', lbl, h('span.wt-picked-avs', [...avs.values()]));
  el.sync = (c) => {
    let n = 0;
    for (const [id, d] of avs) { const on = !!c.progress.done[id]; d.classList.toggle('in', on); if (on) n++; }
    lbl.textContent = n === avs.size ? 'Everyone’s picked' : `${n} of ${avs.size} picked`;
  };
  el.sync(ctx);
  return el;
}

const pick = {
  id: 'witness-pick',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const own = ctx.priv?.ownOptionId;
    const echo = !!ctx.priv?.echo;
    const name = nameOf(ctx, p.defendant);
    const card = dockCard(ctx, p);
    const row = pickedRow(ctx);
    show.append(h('div.wt-top', card, row));
    const btns = p.options.map((o, i) => {
      const mine = o.id === own;
      const b = h(`button.wt-opt${mine ? '.mine' : ''}`, { type: 'button', disabled: mine, 'aria-pressed': 'false', 'data-e2e': mine ? 'choice-mine' : `wt-opt-${o.id}` },
        h('span.wt-opt-l', LETTERS[i]),
        h(`span.wt-opt-t${o.text.length > 32 ? '.long' : ''}`, o.text),
        mine ? h('span.wt-opt-yours', echo ? 'Theirs too' : 'Yours') : h('span.wt-opt-tick', { html: TICK }));
      if (!mine) onTap(b, () => ctx.client.act('wt-pick', { optionId: o.id }, { pick: o.id }), { sound: 'select', buzz: 'select' });
      return b;
    });
    const hint = h('div.wt-hint');
    sheet.append(h(`div.wt-sheet.wt-picksheet.wt-in${p.final ? '.final' : ''}${p.options.length > 5 ? '.many' : ''}`,
      h('div.wt-pickhead',
        h('div.wt-title', `Which one did ${name} write?`),
        h('div.wt-sub', `${p.options.length} answers. One is real.${p.mult > 1 ? ` Points ×${p.mult}.` : ''}`)),
      echo ? h('div.wt-echo', h('b', 'You wrote exactly what they wrote.'), ' +750 for that. Now pick from the rest.') : null,
      h('div.wt-opts', btns),
      hint));
    const sync = (c) => {
      const mine = c.mine.game.pick;
      btns.forEach((b, i) => b.setAttribute('aria-pressed', String(mine === p.options[i].id)));
      const i = p.options.findIndex((o) => o.id === mine);
      hint.textContent = i >= 0 ? `Locked in on ${LETTERS[i]}. Change it till time’s up.` : `Fastest to the real one gets +${250 * (p.mult || 1)}.`;
      hint.classList.toggle('locked', i >= 0);
      row.sync(c);
    };
    sync(ctx);
    const cancel = sayLater(ctx, ctx.line(p.final ? 'wtCross' : 'wtPick', { name }), { delay: 600 });
    return { update: sync, frame(c) { card.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

const sweat = {
  id: 'witness-sweat',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const own = ctx.priv?.ownOptionId;
    const card = dockCard(ctx, p);
    const row = pickedRow(ctx);
    show.append(h('div.wt-top', card, row));
    const list = p.options.map((o, i) => h(`div.wt-opt.view${o.id === own ? '.mine' : ''}`,
      h('span.wt-opt-l', LETTERS[i]),
      h(`span.wt-opt-t${o.text.length > 32 ? '.long' : ''}`, o.text),
      o.id === own ? h('span.wt-opt-yours', 'Yours') : null));
    const count = h('span.wt-sweatn');
    sheet.append(h('div.wt-sheet.wt-picksheet.wt-in.sweat',
      h('div.wt-pickhead', h('div.wt-title', 'The jury is out'), h('div.wt-sub', 'Keep a straight face. Every wrong pick pays you.')),
      h('div.wt-opts', list),
      h('div.wt-hint.locked', count)));
    const sync = (c) => { row.sync(c); count.textContent = `${c.progress.counts?.picked ?? 0} of ${c.progress.counts?.of ?? ctx.players.length - 1} have picked`; };
    sync(ctx);
    const cancel = sayLater(ctx, ctx.line('wtSweat'), { delay: 600 });
    return { update: sync, frame(c) { card.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

// ---------- cross-examination: choose the lie ----------
const choose = {
  id: 'witness-choose',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const card = dockCard(ctx, p);
    show.append(h('div.wt-top', card));
    const truth = statement(p.truth, { cls: '.truthmini', seed: ctx.phase?.seed || 1, key: 'truth' });
    truth.append(seal('Yours'));
    const btns = p.fakes.map((o, i) => {
      const b = h('button.wt-opt', { type: 'button', 'aria-pressed': 'false', 'data-e2e': `wt-keep-${o.id}` },
        h('span.wt-opt-l', LETTERS[i]),
        h(`span.wt-opt-t${o.text.length > 32 ? '.long' : ''}`, o.text),
        o.house ? h('span.wt-opt-yours', 'Cyril’s') : null,
        h('span.wt-opt-tick', { html: TICK }));
      onTap(b, () => {
        // tap to keep, tap again to drop; the oldest drops when you pick one too many
        let k = (ctx.mine.game.kept || []).slice();
        if (k.includes(o.id)) k = k.filter((x) => x !== o.id);
        else { k.push(o.id); if (k.length > need) k.shift(); }
        if (k.length) ctx.client.act('wt-keep', { ids: k }, { kept: k });
        else { ctx.mine.game.kept = []; sync(ctx); }
      }, { sound: 'select', buzz: 'select' });
      return b;
    });
    const need = p.keep || 1;
    const hint = h('div.wt-hint');
    sheet.append(h('div.wt-sheet.wt-picksheet.wt-choosesheet.wt-in.final',
      h('div.wt-pickhead', h('div.wt-title', need > 1 ? 'Keep two lies' : 'Keep one lie'), h('div.wt-sub', 'They stand beside your answer. Pick the ones that sound like you.')),
      truth,
      h('div.wt-opts', btns),
      hint));
    const sync = (c) => {
      const k = c.mine.game.kept || [];
      btns.forEach((b, i) => b.setAttribute('aria-pressed', String(k.includes(p.fakes[i].id))));
      hint.textContent = k.length >= need ? 'Kept. You can still change your mind.' : k.length ? `Pick ${need - k.length} more.` : 'Every juror you fool pays you +1000.';
      hint.classList.toggle('locked', k.length >= need);
    };
    sync(ctx);
    const cancel = sayLater(ctx, ctx.line('wtChoose'), { delay: 600 });
    return { update: sync, frame(c) { card.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

const recess = {
  id: 'witness-recess',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const name = nameOf(ctx, p.defendant);
    const card = dockCard(ctx, p);
    show.append(h('div.wt-top', card));
    sheet.append(h('div.wt-sheet.wt-recess.wt-in',
      h('div.wt-head.center', h('div.wt-head-t', h('div.wt-title', 'Short recess'), h('div.wt-sub', `${name} is keeping two fakes to stand beside the truth.`))),
      h('div.wt-recess-art', dock(ctx.player(p.defendant), { size: 88 }), h('span.wt-dots.big', h('i'), h('i'), h('i'))),
      h('div.wt-recess-n', `${p.fakes.length} fakes on the table. ${Math.min(2, p.fakes.length)} survive.`)));
    const cancel = sayLater(ctx, ctx.line('wtRecess', { name }), { delay: 600 });
    return { frame(c) { card.timer?.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

export default [dockScreen, writeScreen, wait, pick, sweat, choose, recess];
export { ICONS };
