// Something in the Soup: the day task (Count the ..., Safe Hands, Pass the Parcel) and its result.
import { h, onTap } from '../../../ui/components.js';
import { header, seats, say, tureen, money, nameOf, disc, isGhost, ghostRibbon, easeOut, PARCEL, SHIELD, SPOON } from './kit.js';

const TITLES = { spoons: (p) => `Count the ${p.item?.t || 'Spoons'}`, code: () => 'Safe Hands', parcel: () => 'Pass the Parcel' };
const LINES = {
  spoons: (p) => `Hit ${p.target} exactly. Agree out loud, then put yours in secretly.`,
  code: (p) => `Open the safe in the ${p.room?.t || 'study'}. Say your digit aloud, in seat order.`,
  parcel: () => 'Got it? Tap fast. Not yours? Hands off. Fumbles cost money.',
};

function ghostSheet(ctx) {
  return h('div.sp-sheet.sp-ghostsheet.sp-in', ghostRibbon(ctx), h('div.sp-ghost-b', 'The living are playing for the pot. Watch closely. Who is not really trying?'));
}

// ---------- Count the ... ----------
function spoonsSheet(ctx) {
  const p = ctx.payload;
  let pick = ctx.mine.game.n;
  const tiles = [];
  const btn = h('button.btn.block', { type: 'button', 'data-e2e': 'sp-spoons-send', disabled: pick === undefined }, 'Put them in');
  for (let n = 0; n <= p.max; n++) {
    const t = h('button.sp-num', { type: 'button', 'data-e2e': `sp-n-${n}` }, h('b', String(n)), h('span.sp-stack', Array.from({ length: n }, (_, i) => h('i', { style: { '--i': i }, html: SPOON }))));
    onTap(t, () => { if (ctx.mine.game.sent) return; pick = n; render(); }, { sound: 'select', buzz: 'select' });
    tiles.push(t);
  }
  const note = h('div.sp-hint');
  const render = () => {
    const sent = !!ctx.mine.game.sent;
    tiles.forEach((t, n) => { t.setAttribute('aria-pressed', String(n === pick)); t.disabled = sent && n !== pick; });
    btn.disabled = pick === undefined || sent;
    btn.textContent = sent ? `${pick} in. Nobody saw.` : pick === undefined ? 'Pick how many' : `Put in ${pick}`;
    note.textContent = sent ? 'Only the total is shown. Keep a straight face.' : `Your share of ${p.target}. Between 0 and ${p.max}.`;
  };
  onTap(btn, () => { if (pick === undefined) return; ctx.client.act('sp-spoons', { n: pick }, { n: pick, sent: true }); ctx.audio.sfx('plated'); ctx.haptic('submit'); render(); });
  render();
  const el = h('div.sp-sheet.sp-in', h('div.sp-ask', 'How many do you put in?'), h('div.sp-nums', tiles), note, btn);
  el.update = render;
  return el;
}

// ---------- Safe Hands ----------
function codeSheet(ctx) {
  const p = ctx.payload;
  const pr = ctx.priv || {};
  let entry = ctx.mine.game.code ? ctx.mine.game.code.split('') : [];
  const slots = p.alive.map((id, i) => h(`div.sp-slot${i === pr.slot ? '.me' : ''}`, h('b', ''), h('span.nm', i === pr.slot ? 'You' : nameOf(ctx, id))));
  const mine = h('div.sp-mydigit', 'Your digit is ', h('b', String(pr.digit ?? '?')), '. Say it when it’s your turn.');
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'ok'];
  const pad = h('div.sp-pad');
  const okBtn = h('button.sp-key.ok', { type: 'button', 'data-e2e': 'sp-code-send' }, 'Open');
  for (const k of keys) {
    if (k === 'ok') { pad.append(okBtn); continue; }
    const b = h(`button.sp-key${k === 'del' ? '.del' : ''}`, { type: 'button', 'data-e2e': `sp-key-${k}`, 'aria-label': k === 'del' ? 'Delete' : String(k) }, k === 'del' ? h('span', { html: '<svg viewBox="0 0 24 24"><path d="M9 5h11v14H9l-6-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9l5 6M17 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' }) : String(k));
    onTap(b, () => {
      if (ctx.mine.game.sent) return;
      if (k === 'del') entry.pop(); else if (entry.length < p.length) entry.push(String(k));
      render();
    }, { sound: 'tap', buzz: 'tap' });
    pad.append(b);
  }
  onTap(okBtn, () => {
    if (entry.length !== p.length || ctx.mine.game.sent) return;
    const code = entry.join('');
    ctx.client.act('sp-code', { code }, { code, sent: true });
    ctx.audio.sfx('plated'); ctx.haptic('submit'); render();
  });
  const note = h('div.sp-hint');
  const render = () => {
    const sent = !!ctx.mine.game.sent;
    slots.forEach((s, i) => { s.querySelector('b').textContent = entry[i] ?? ''; s.classList.toggle('cur', !sent && i === entry.length); });
    okBtn.disabled = sent || entry.length !== p.length;
    pad.classList.toggle('sent', sent);
    note.textContent = sent ? 'Locked in. Let’s hope everyone told the truth.' : '';
  };
  render();
  const el = h('div.sp-sheet.sp-codesheet.sp-in', mine, h('div.sp-slots', { style: { '--n': p.length } }, slots), note, pad);
  el.update = render;
  return el;
}

// ---------- Pass the Parcel ----------
function parcelSheet(ctx) {
  const btn = h('button.sp-parcel', { type: 'button', 'data-e2e': 'sp-pass' },
    h('span.sp-parcel-art', { html: PARCEL }), h('span.sp-parcel-t'), h('span.sp-parcel-s'), h('i.sp-parcel-fuse'));
  const t = btn.querySelector('.sp-parcel-t');
  const s = btn.querySelector('.sp-parcel-s');
  const fuse = btn.querySelector('.sp-parcel-fuse');
  const stats = h('div.sp-pstats', h('div', h('b.ps'), h('span', 'passes')), h('div', h('b.pd'), h('span', 'drops')), h('div', h('b.pf'), h('span', 'fumbles')), h('div.net', h('b.pn'), h('span', 'this round')));
  let lastN = -1;
  onTap(btn, () => {
    const pr = ctx.client.state.progress || {};
    ctx.client.act('sp-pass', { n: pr.n });
    if (pr.holder !== ctx.meId) { ctx.haptic('error'); btn.classList.remove('oops'); void btn.offsetWidth; btn.classList.add('oops'); }
  }, { sound: 'pop', buzz: 'tap' });
  const el = h('div.sp-sheet.sp-parcelsheet.sp-in', btn, stats);
  el.update = (c) => {
    const pr = c.progress || {};
    const mine = pr.holder === c.meId;
    btn.classList.toggle('mine', mine);
    t.textContent = mine ? 'Pass it!' : `${nameOf(c, pr.holder)} has it`;
    s.textContent = mine ? 'Tap, quick' : 'Hands off';
    if (pr.n !== lastN) { lastN = pr.n; if (mine && !c.frozen) { c.haptic('stamp'); c.audio.sfx('pop'); } }
    stats.querySelector('.ps').textContent = String(pr.passes || 0);
    stats.querySelector('.pd').textContent = String((pr.drops || []).length);
    stats.querySelector('.pf').textContent = String((pr.fumbles || []).length);
    const net = pr.net || 0;
    stats.querySelector('.pn').textContent = `${net < 0 ? '−' : '+'}${money(Math.abs(net))}`;
    stats.querySelector('.net').classList.toggle('neg', net < 0);
  };
  el.frame = (c) => {
    const pr = c.progress || {};
    const win = c.payload.window || 2400;
    const left = pr.until ? Math.max(0, pr.until - c.now()) : win;
    fuse.style.transform = `scaleX(${Math.min(1, left / win).toFixed(3)})`;
  };
  return el;
}

const task = {
  id: 'soup-task',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const hd = header(ctx, { title: TITLES[p.kind](p), line: LINES[p.kind](p) });
    const st = seats(ctx, { size: 26, done: (c, id) => c.progress.done?.[id] });
    let feed = null;
    if (p.kind === 'parcel') {
      feed = h('div.sp-feed');
      show.append(h('div.sp-top', hd, feed));
    } else show.append(h('div.sp-top', hd, st));
    const ghost = isGhost(ctx);
    const body = ghost ? ghostSheet(ctx) : p.kind === 'spoons' ? spoonsSheet(ctx) : p.kind === 'code' ? codeSheet(ctx) : parcelSheet(ctx);
    if (ghost && p.kind === 'parcel') body.append(parcelSheet(ctx));
    sheet.append(body);
    const parcel = p.kind === 'parcel' ? (ghost ? body.lastChild : body) : null;
    if (parcel && ghost) parcel.querySelector('.sp-parcel').disabled = true;
    const key = { spoons: 'spSpoons', code: 'spCode', parcel: 'spParcel' }[p.kind];
    const cancel = say(ctx, ctx.line(key, { item: (p.item?.t || 'spoons').toLowerCase() }), {}, 500);
    const seenF = new Set();
    const update = (c) => {
      st.sync(c);
      body.update?.(c);
      parcel?.update?.(c);
      if (feed) {
        const pr = c.progress || {};
        const evs = [...(pr.drops || []).map((d) => ({ k: `d${d.n}`, id: d.id, t: 'dropped it', cls: 'drop' })), ...(pr.fumbles || []).map((f) => ({ k: `f${f.n}`, id: f.id, t: 'grabbed it', cls: 'fumble' }))];
        for (const e of evs) {
          if (seenF.has(e.k)) continue;
          seenF.add(e.k);
          const tag = h(`div.sp-ev.${e.cls}`, disc(c, e.id, { size: 22 }), h('b', nameOf(c, e.id)), ` ${e.t}`, h('span.m', e.cls === 'drop' ? `−£${c.payload.values?.drop}` : `−£${c.payload.values?.fumble}`));
          feed.prepend(tag);
          while (feed.children.length > 3) feed.lastChild.remove();
        }
      }
    };
    update(ctx);
    return { update, frame(c) { hd.timer.set(c.remaining(), c.duration); parcel?.frame?.(c); }, unmount: cancel };
  },
};

// ---------- result ----------
const result = {
  id: 'soup-result',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const pot = tureen({ size: 170 });
    pot.set(p.before);
    const gain = p.gain;
    let detail;
    if (p.kind === 'spoons') detail = p.off === 0 ? `${p.total} ${p.item?.t?.toLowerCase() || 'spoons'}. Spot on.` : `${p.total} ${p.item?.t?.toLowerCase() || 'spoons'}. The target was ${p.target}.`;
    else if (p.kind === 'code') detail = `${p.right} of ${p.of} opened the safe. The code was ${p.code}.`;
    else detail = `${p.passes} passes, ${p.drops} dropped, ${p.fumbles} fumbled.`;
    const gainEl = h(`div.sp-gain${gain > 0 ? '.up' : gain < 0 ? '.down' : '.none'}`, gain > 0 ? `+${money(gain)}` : gain < 0 ? `−${money(-gain)}` : 'Nothing');
    let clue = null;
    if (p.kind === 'spoons' && p.hands?.length) clue = h('div.sp-clue', h('span.k', 'What went in'), h('span.hands', p.hands.map((n) => h('b', String(n)))), h('span.s', 'Anonymous. Somebody knows which one was theirs.'));
    else if (p.kind === 'code' && p.wrongSeat) clue = h('div.sp-clue', h('span.k', 'Most-missed digit'), h('span.who', disc(ctx, p.wrongSeat, { size: 24 }), h('b', `${nameOf(ctx, p.wrongSeat)}’s`)), h('span.s', `${p.wrongN} of ${p.typed} got that one wrong. Misheard, or lied?`));
    else if (p.kind === 'parcel' && p.dropIds?.length) clue = h('div.sp-clue', h('span.k', 'Dropped it'), h('span.who', [...new Set(p.dropIds)].map((id) => [disc(ctx, id, { size: 24 }), h('b', nameOf(ctx, id))])), h('span.s', 'Slow hands, or sabotage?'));
    const card = h('div.sp-card.sp-result',
      h('div.sp-result-t', TITLES[p.kind](p)),
      pot, gainEl, h('div.sp-result-d', detail), clue);
    const priv = ctx.priv || {};
    const shield = priv.newShield ? h('div.sp-psst', h('span', { html: SHIELD }), h('span', h('b', 'Psst. '), 'You found a Shield. It saves you from one poisoning. Tell nobody. Or everybody.')) : null;
    show.append(h('div.sp-dim'), h('div.sp-cardwrap', card));
    if (shield) show.append(shield);
    const line = gain >= 800 ? 'spGood' : gain > 0 ? 'spMeh' : 'spBad';
    const cancel = say(ctx, ctx.line(line), { hold: 2600 }, 1900);
    let counted = false;
    return {
      frame(c) {
        const t = c.elapsed();
        const k = easeOut((t - 700) / 1400);
        pot.set(p.before + (p.pot - p.before) * k);
        gainEl.classList.toggle('on', t > 600);
        if (!counted && t > 700 && !c.frozen) { counted = true; c.audio.sfx(gain > 0 ? 'countup' : 'nope'); c.cyril.react(gain >= 800 ? 'delight' : gain > 0 ? 'smug' : 'sad'); if (priv.newShield) c.haptic('win'); }
      },
      unmount: cancel,
    };
  },
};

export default [task, result];
