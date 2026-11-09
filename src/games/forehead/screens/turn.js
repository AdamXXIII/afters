// forehead-turn: 3.5 s countdown + 60 s. The guesser's phone is the landscape forehead card;
// every other phone shows the same card big, with Got it / Pass (or FOUL! for the other team).
import './forehead.css';
import { h, timerRing } from '../../../ui/components.js';
import { ICONS } from '../../../ui/icons.js';
import { CYRIL_BADGE, deckIcon, disc, fit, teamOf, TEAMS, getTilt, setTiltHandler, vibrate, BUZZ } from './kit.js';


const firstLine = (lines) => (Array.isArray(lines) ? lines[0] : lines) || '';

function state(ctx) {
  const p = ctx.payload;
  const prog = ctx.progress || {};
  const results = prog.results || [];
  const idx = Math.max(prog.idx ?? 0, results.length);
  const el = ctx.elapsed();
  return { p, results, idx, el, counting: el < p.countdown, left: Math.max(0, p.countdown + p.length - el) };
}

export default {
  id: 'forehead-turn',
  layout: 'show',
  shot: 'reveal',
  rail: false,
  mount({ show }, ctx) {
    return ctx.payload.guesserId === ctx.meId ? mountGuesser(show, ctx) : mountTable(show, ctx);
  },
};

// ----------------------------------------------------------------- everyone else
function mountTable(show, ctx0) {
  let ctx = ctx0;
  const p = ctx.payload;
  const g = ctx.player(p.guesserId);
  const myTeam = teamOf(p.teams, ctx.meId);
  const foulOnly = !!p.team && myTeam !== p.team;
  const ring = timerRing({ big: true });
  const hitsN = h('b.fh-hits-n', '0');
  const tray = h('div.fh-tray');
  const word = h('div.fh-word');
  const cardNo = h('span.fh-card-no');
  const card = h('div.fh-card', { style: { '--dc': p.deck.colour } },
    h('div.fh-card-band', h('i', { html: deckIcon(p.deck.icon) }), h('span', p.deck.name), cardNo),
    h('div.fh-card-face', word),
    h('div.fh-card-foot', p.modifier ? h('span.fh-card-mod', p.modifier.name, h('small', p.modifier.rule)) : h('span.fh-card-hint', 'Shout it, act it, hum it')));
  const stack = h('div.fh-stack', h('div.fh-card-ghost.g2', { style: { '--dc': p.deck.colour } }), h('div.fh-card-ghost', { style: { '--dc': p.deck.colour } }), card);
  const count = h('div.fh-count', h('small', 'Phone on your bonce'), h('b', '3'));
  const quip = h('div.fh-quip', h('i', { html: CYRIL_BADGE }), h('span'));
  const teamTag = p.team ? h('span.fh-team-tag', { style: { '--tc': TEAMS[p.team].colour } }, TEAMS[p.team].name) : null;

  const top = h('div.fh-top',
    h('div.fh-top-ring', ring),
    h('div.fh-top-who', disc(g, { size: 40 }), h('div', h('div.fh-eyebrow-dark', foulOnly ? 'Watch them' : 'Shout at'), h('div.fh-top-name', `${g?.name || '?'}'s bonce`), teamTag)));
  const hitsBox = h('div.fh-top-hits', hitsN, h('small', 'got'));

  let btns;
  const send = (r) => {
    const s = state(ctx);
    if (s.counting || s.left <= 0 || ctx.mine.game.marked === s.idx || s.idx >= p.cards.length) return;
    ctx.client.act('fh-mark', { idx: s.idx, r }, { marked: s.idx });
    ctx.haptic(r === 'hit' ? 'submit' : 'select');
  };
  if (foulOnly) {
    const foul = h('button.fh-slab.foul', { type: 'button', 'data-e2e': 'fh-foul' }, h('b', 'FOUL!'), h('small', 'They said the word'));
    foul.addEventListener('pointerdown', () => send('foul'));
    btns = h('div.fh-slabs', foul);
  } else {
    const pass = h('button.fh-slab.pass', { type: 'button', 'data-e2e': 'fh-pass' }, h('i', { html: '<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>' }), h('b', 'Pass'));
    const hit = h('button.fh-slab.hit', { type: 'button', 'data-e2e': 'fh-hit' }, h('i', { html: ICONS.tick }), h('b', 'Got it!'));
    pass.addEventListener('pointerdown', () => send('pass'));
    hit.addEventListener('pointerdown', () => send('hit'));
    btns = h('div.fh-slabs', pass, hit);
  }

  const root = h(`div.fh-turn${foulOnly ? '.foul-mode' : ''}`, { style: { '--dc': p.deck.colour } }, top, h('div.fh-mid', stack, count), quip, h('div.fh-tally', hitsBox, tray), btns);
  show.append(root);

  let shownIdx = -1;
  let seen = state(ctx).results.length;
  let lastSecond = null;
  let saidGo = false; let saidTime = false; let said10 = false;
  const setQuip = (text) => { if (!text) return; quip.lastChild.textContent = text; quip.classList.remove('in'); void quip.offsetWidth; quip.classList.add('in'); };
  const trayToken = (r, animate) => {
    const t = h(`span.fh-tok.${r.r}`, { html: r.r === 'hit' ? ICONS.tick : r.r === 'foul' ? '!' : '' });
    if (!animate) t.classList.add('still');
    tray.append(t);
    while (tray.children.length > 14) tray.firstChild.remove();
  };
  state(ctx).results.forEach((r) => trayToken(r, false));
  hitsN.textContent = String(state(ctx).results.filter((x) => x.r === 'hit').length);

  const paintCard = (s, animate) => {
    if (s.idx === shownIdx) return;
    shownIdx = s.idx;
    word.textContent = s.idx < p.cards.length ? p.cards[s.idx] : 'Out of cards!';
    cardNo.textContent = `#${s.idx + 1}`;
    fit(word, { max: 64, min: 30, maxW: 300, maxH: 210 });
    if (animate && !ctx.frozen) card.animate([{ transform: 'translateY(40px) rotateX(70deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  };

  const flyOut = (r) => {
    if (ctx.frozen) return;
    const ghost = card.cloneNode(true);
    ghost.classList.add('fh-fly', r.r);
    ghost.append(h('div.fh-stamp', r.r === 'hit' ? 'Got it!' : r.r === 'foul' ? 'Foul!' : 'Pass'));
    stack.append(ghost);
    const dx = r.r === 'hit' ? 0 : r.r === 'foul' ? 0 : -1;
    ghost.animate([
      { transform: 'none', opacity: 1 },
      { transform: 'scale(1.06) rotate(-2deg)', opacity: 1, offset: 0.35 },
      { transform: r.r === 'hit' ? 'translateY(420px) rotate(8deg) scale(.6)' : `translate(${dx * 460}px, -60px) rotate(-18deg)`, opacity: 0 },
    ], { duration: 720, easing: 'cubic-bezier(.64,0,.78,0)', fill: 'forwards' }).onfinish = () => ghost.remove();
  };

  const onResult = (r, s) => {
    trayToken(r, true);
    flyOut(r);
    hitsN.textContent = String(s.results.filter((x) => x.r === 'hit').length);
    hitsN.animate([{ transform: 'scale(1.5)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    if (r.r === 'hit') {
      ctx.audio.sfx('plated');
      if (r.bonus) { ctx.audio.sfx('fanfare'); setQuip(firstLine(ctx.line('fhStreak', {}, { seed: ctx.phase.seed + s.results.length }))); ctx.cyril.react('delight'); }
    } else if (r.r === 'foul') {
      ctx.audio.sfx('nope'); ctx.haptic('error'); setQuip(firstLine(ctx.line('fhFoul'))); ctx.stage.shake?.();
    } else ctx.audio.sfx('swipe');
  };

  const frame = (c) => {
    ctx = c;
    const s = state(c);
    ring.set(s.counting ? p.length : s.left, p.length);
    root.classList.toggle('counting', s.counting);
    root.classList.toggle('over', s.left <= 0);
    if (s.counting) {
      const n = Math.max(1, Math.ceil((p.countdown - 500 - s.el) / ((p.countdown - 500) / 3)));
      const label = s.el > p.countdown - 500 ? 'Go!' : String(n);
      if (count.lastChild.textContent !== label) {
        count.lastChild.textContent = label;
        if (!c.frozen) { count.lastChild.animate([{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' }); c.audio.sfx('tick'); }
      }
      count.firstChild.textContent = `Phone on your bonce, ${g?.name || 'you'}!`;
      word.textContent = '';
      return;
    }
    if (!saidGo) { saidGo = true; setQuip(firstLine(c.line('fhGo'))); if (!c.frozen) c.audio.sfx('bell'); }
    paintCard(s, seen > 0 || s.idx > 0);
    if (s.results.length > seen) { for (const r of s.results.slice(seen)) onResult(r, s); seen = s.results.length; }
    const sec = Math.ceil(s.left / 1000);
    if (sec !== lastSecond) {
      lastSecond = sec;
      root.classList.toggle('hurry', sec <= 10 && sec > 0);
      if (sec <= 10 && !said10 && sec > 0) { said10 = true; setQuip('Ten seconds! Louder!'); }
      if (sec <= 3 && sec > 0 && !c.frozen) { c.audio.sfx('tick'); c.haptic('tick'); }
      if (sec === 0 && !saidTime) { saidTime = true; setQuip(firstLine(c.line('fhTimeUp'))); if (!c.frozen) c.audio.sfx('bell'); }
    }
  };
  frame(ctx);
  return { frame, update: (c) => frame(c) };
}

// ----------------------------------------------------------------- the guesser (forehead)
function mountGuesser(show, ctx0) {
  let ctx = ctx0;
  const p = ctx.payload;
  const word = h('div.fh-g-word');
  const hits = h('b', '0');
  const bar = h('i');
  const status = h('div.fh-g-status', h('span.fh-g-deck', h('i', { html: deckIcon(p.deck.icon) }), p.deck.name), p.modifier ? h('span.fh-g-mod', p.modifier.name) : null, h('span.fh-g-hits', hits, ' got'));
  const flash = h('div.fh-g-flash');
  const count = h('div.fh-g-count', h('small', 'Phone on your forehead. Screen out.'), h('b', '3'));
  const hintL = h('div.fh-g-half.left', { 'data-e2e': 'fh-g-pass' }, h('span', 'Tap: pass'));
  const hintR = h('div.fh-g-half.right', { 'data-e2e': 'fh-g-hit' }, h('span', 'Tap: got it'));
  const inner = h('div.fh-g-inner', status, h('div.fh-g-card', word), h('div.fh-g-bar', bar), count, flash, hintL, hintR);
  const root = h('div.fh-guess', { style: { '--dc': p.deck.colour } }, inner);
  show.append(root);
  document.body.classList.add('fh-guessing');

  let shownIdx = -1;
  let seen = state(ctx).results.length;
  let calibrated = false;
  let lastSecond = null;
  const tilt = getTilt();
  if (!tilt.running) tilt.start().catch(() => {});
  const send = (r) => {
    const s = state(ctx);
    if (s.counting || s.left <= 0 || ctx.mine.game.marked === s.idx || s.idx >= p.cards.length) return;
    ctx.client.act('fh-mark', { idx: s.idx, r }, { marked: s.idx });
    showFlash(r);
  };
  setTiltHandler((dir) => send(dir === 'down' ? 'hit' : 'pass'));
  hintL.addEventListener('pointerdown', () => send('pass'));
  hintR.addEventListener('pointerdown', () => send('hit'));
  const liveCheck = setTimeout(() => root.classList.toggle('no-sensor', !tilt.live), 1600);

  let flashFor = -1;
  function showFlash(r) {
    const s = state(ctx);
    if (flashFor === s.idx) return;
    flashFor = s.idx;
    flash.className = `fh-g-flash ${r}`;
    flash.textContent = r === 'hit' ? 'Got it!' : r === 'foul' ? 'Foul!' : 'Pass';
    if (!ctx.frozen) flash.animate([{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 1, transform: 'none', offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
    vibrate(r === 'hit' ? BUZZ.correct : BUZZ.pass);
    ctx.audio.sfx(r === 'hit' ? 'plated' : r === 'foul' ? 'nope' : 'swipe');
  }

  const frame = (c) => {
    ctx = c;
    const s = state(c);
    root.classList.toggle('counting', s.counting);
    root.classList.toggle('over', s.left <= 0);
    bar.style.transform = `scaleX(${s.counting ? 1 : s.left / p.length})`;
    if (s.counting) {
      const n = Math.max(1, Math.ceil((p.countdown - 500 - s.el) / ((p.countdown - 500) / 3)));
      const label = s.el > p.countdown - 500 ? 'Go!' : String(n);
      if (count.lastChild.textContent !== label) { count.lastChild.textContent = label; if (!c.frozen) { c.audio.sfx('tick'); vibrate(BUZZ.tick); } }
      return;
    }
    if (!calibrated) { calibrated = true; tilt.calibrate(); }
    if (s.idx !== shownIdx) {
      shownIdx = s.idx;
      word.textContent = s.idx < p.cards.length ? p.cards[s.idx] : 'Out of cards!';
      const vw = Math.max(window.innerWidth, window.innerHeight);
      const vh = Math.min(window.innerWidth, window.innerHeight);
      fit(word, { max: 120, min: 40, maxW: vw * 0.86, maxH: vh * 0.56 });
    }
    if (s.results.length > seen) { const r = s.results[s.results.length - 1]; if (r.by !== c.meId) showFlash(r.r); seen = s.results.length; }
    hits.textContent = String(s.results.filter((x) => x.r === 'hit').length);
    const sec = Math.ceil(s.left / 1000);
    if (sec !== lastSecond) {
      lastSecond = sec;
      root.classList.toggle('hurry', sec <= 10 && sec > 0);
      if (sec <= 3 && sec > 0 && !c.frozen) { c.audio.sfx('tick'); vibrate(BUZZ.tick); }
      if (sec === 0) { flash.className = 'fh-g-flash time'; flash.textContent = 'Time!'; flash.style.opacity = '1'; if (!c.frozen) vibrate(BUZZ.timeUp); }
    }
  };
  frame(ctx);
  return {
    frame,
    update: (c) => frame(c),
    unmount() { clearTimeout(liveCheck); setTiltHandler(null); document.body.classList.remove('fh-guessing'); },
  };
}
