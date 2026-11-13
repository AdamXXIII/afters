// menu (v2, 2026-11-13): pick tonight's next game from a box that grows to 20+.
// Top band: Cyril and his bubble over the 3D table (nothing else lives there, so he never covers a
// game). Below, the claret bay: Invite + Family/18+, then one scrolling column: tonight's scores,
// "Same again / Something different" after a game, mood filters, and the menu itself (one line per
// game). Tapping a line opens its card: dish, players, minutes, rating, three "How it plays"
// panels and one big action (host: Serve; guest: Fancy it). Design notes: src/screens/MENU.md.
import './menu.css';
import { h, button, onTap } from '../ui/components.js';
import { avatarIcon } from '../ui/icons.js';
import { AVATARS, NIGHT_POINTS } from '../game/constants.js';
import { SHOTS } from '../stage/Stage.js';
import {
  dishSvg, CHERRY_SVG, PEOPLE_SVG, CLOCK_SVG, INVITE_SVG, BACK_SVG, TICK_SVG, EYE_SVG,
  AGAIN_SVG, NEW_SVG, MOOD_ICONS,
} from './menu-art.js';
import { qrSvg } from '../ui/qr.js';
import { sayLater } from './common.js';

SHOTS.menu = { expr: 'eager', pos: [0, 0.3, 0.95], target: [0, 0.17, 0], subject: 'cyril', maxS: 0.17 };

const gameRange = (g) => g.players || [3, 8];

/** The moods a table talks in. `adult` ones only show on the Adults 18+ menu. */
export const MOODS = [
  { id: 'loud', label: 'Loud' },
  { id: 'talky', label: 'Talky' },
  { id: 'sneaky', label: 'Sneaky' },
  { id: 'clever', label: 'Clever' },
  { id: 'drawing', label: 'Drawing' },
  { id: 'rude', label: 'Rude', adult: true },
];
// games without a `mood` field get one from their tags
const TAG_MOODS = { shouting: 'loud', loud: 'loud', acting: 'loud', music: 'loud', writing: 'clever', quiz: 'clever', guessing: 'clever', words: 'clever', bluffing: 'sneaky', 'secret roles': 'sneaky', fibbing: 'sneaky', voting: 'talky', 'about you': 'talky', polls: 'talky', drawing: 'drawing' };
export function moodsOf(g) {
  if (Array.isArray(g.mood) && g.mood.length) return g.mood;
  const out = new Set((g.tags || []).map((t) => TAG_MOODS[String(t).toLowerCase()]).filter(Boolean));
  return [...out];
}

/** Ink or linen text, whichever reads on a game colour. */
function textOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 'var(--c-ink)';
  const n = parseInt(m[1], 16);
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.2 ? 'var(--c-ink)' : 'var(--c-linen)';
}

const hash = (s) => { let x = 2166136261; for (const ch of s) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return x >>> 0; };

/**
 * "Something different": a game that fits the table, wasn't the last one, preferably not played
 * tonight and in a different mood. Deterministic from the payload, so every phone agrees.
 */
export function suggestNext(games, { lastId, history = [], n }) {
  const last = games.find((g) => g.id === lastId);
  const lastMoods = new Set(last ? moodsOf(last) : []);
  const played = new Map();
  for (const e of history) played.set(e.gameId, (played.get(e.gameId) || 0) + 1);
  const ok = games.filter((g) => !g.comingSoon && g.id !== lastId && n >= gameRange(g)[0] && n <= gameRange(g)[1]);
  const score = (g) => (played.has(g.id) ? 0 : 6) - (played.get(g.id) || 0)
    + (moodsOf(g).some((m) => lastMoods.has(m)) ? 0 : 3)
    + (hash(`${g.id}|${history.length}`) % 100) / 100;
  return ok.sort((a, b) => score(b) - score(a))[0] || null;
}

/**
 * Tonight's scores, compact: everyone when <= 5, else the leader(s) plus your own chip.
 * The leader's chip is gold with "1st"; no other rank numbers (they read as noise).
 */
export function nightStrip(ctx, rows) {
  const played = (ctx.payload?.history || []).length;
  const el = h('div.night', { 'aria-label': 'Tonight’s scores' });
  const hasAny = rows?.some((r) => r.night > 0);
  el.append(h('div.night-k', h('span.night-ic', { html: CHERRY_SVG }),
    h('span.night-k-t', 'Tonight'),
    h('span.night-n', `${played} ${played === 1 ? 'game' : 'games'} played`)));
  if (!hasAny) {
    el.append(h('div.night-empty', h('b', 'No scores yet.'), ` Win a game for ${NIGHT_POINTS[0]} cherries.`));
    return el;
  }
  const all = rows.length <= 5;
  const pick = all ? rows : rows.filter((r) => r.rank === 1 || r.id === ctx.meId);
  const list = h(`ol.night-list${all ? '.all' : ''}`);
  pick.forEach((r, i) => {
    const p = ctx.player(r.id);
    if (!p) return;
    const lead = r.rank === 1 && r.night > 0;
    const named = pick.length <= 3 || i === 0 || r.id === ctx.meId;
    list.append(h(`li.night-row${lead ? '.lead' : ''}${r.id === ctx.meId ? '.me' : ''}`,
      { style: { '--pc': AVATARS[p.avatar]?.colour, '--i': i }, title: `${p.name}: ${r.night} cherries` },
      h('span.night-av', { html: avatarIcon(p.avatar) }),
      named ? h('span.night-nm', r.id === ctx.meId ? 'You' : p.name) : null,
      h('span.night-pts', String(r.night)),
      lead && i === 0 ? h('span.night-1st', '1st') : null));
  });
  if (!all && rows.length > pick.length) list.append(h('li.night-more', `+${rows.length - pick.length}`));
  el.append(list);
  return el;
}

export default {
  id: 'menu',
  layout: 'show',
  shot: 'menu',
  shotDuration: 1000,
  rail: false,
  mount({ show }, ctx) {
    const all = ctx.games.filter((g) => !g.hidden);
    const games = [...all.filter((g) => !g.comingSoon), ...all.filter((g) => g.comingSoon)];
    const byId = new Map(games.map((g) => [g.id, g]));
    const root = h('div.mn');
    show.append(root);
    let c = ctx;
    let openId = null; // the game card open on THIS phone
    let mood = 'all';
    let fitsOnly = true; // on by default: games that don't fit drop to a labelled "Not for N of you" tail
    const hostName = () => c.player(c.state?.hostId)?.name || 'The host';
    const adultOn = () => c.rating === 'adult';
    const seated = () => c.players.filter((p) => p.connected !== false);
    const fits = (g) => { const n = seated().length; const [lo, hi] = gameRange(g); return n >= lo && n <= hi; };
    const fancyOf = (pid) => c.progress.fancy?.[pid] || null;
    const fansOf = (gid) => Object.entries(c.progress.fancy || {}).filter(([, v]) => v === gid).map(([pid]) => c.player(pid)).filter(Boolean);

    // ---------- the bay ----------
    const bay = h('div.mn-bay');
    root.append(bay);

    // bar: Invite (code) + Family / Adults 18+
    const ratingSeg = h('div.mn-rating', { role: 'radiogroup', 'aria-label': 'Content rating' });
    const fam = h('button.mn-rate', { type: 'button', role: 'radio', 'data-e2e': 'rating-family' }, 'Family');
    const adu = h('button.mn-rate.adult', { type: 'button', role: 'radio', 'data-e2e': 'rating-adult' }, 'Adults 18+');
    ratingSeg.append(fam, adu);
    const setRating = (r) => { if (c.isHost && c.rating !== r) c.client.setSettings({ rating: r }); };
    onTap(fam, () => setRating('family'));
    onTap(adu, () => setRating('adult'));
    const inviteBtn = h('button.mn-invite', { type: 'button', 'data-e2e': 'invite', 'aria-label': `Invite people. Room code ${c.room || ''}` },
      h('span.mn-invite-ic', { html: INVITE_SVG }), h('span.mn-invite-t', 'Invite'), h('b.mn-invite-code', c.room || ''));
    onTap(inviteBtn, () => openInvite());
    const nightBox = h('div.mn-night');
    bay.append(h('div.mn-bar', inviteBtn, nightBox, ratingSeg));
    // Two invisible halves over the bay: the stage framer and the bubble skip anything bigger than
    // half the screen, so without these they would happily put Cyril in a gap between menu lines.
    root.append(h('div.mn-shield.a', { 'aria-hidden': 'true' }), h('div.mn-shield.b', { 'aria-hidden': 'true' }));

    const scroll = h('div.mn-scroll');
    bay.append(scroll);
    const againBox = h('section.mn-again.in-bay', { 'aria-label': 'Play again' });
    const againSide = h('section.mn-again.side', { 'aria-label': 'Play again' }); // landscape: under Cyril
    root.append(againSide);
    const filters = h('div.mn-filters', { role: 'toolbar', 'aria-label': 'Filter games by mood' });
    const fitsRow = h('button.mn-fits', { type: 'button', 'data-e2e': 'mood-fits', role: 'switch', 'aria-checked': 'false' },
      h('i.mn-fits-ic', { html: PEOPLE_SVG }), h('span.mn-fits-t'), h('span.mn-fits-sw', h('span.mn-fits-knob')));
    onTap(fitsRow, () => { fitsOnly = !fitsOnly; paint(); });
    const list = h('ul.mn-list', { 'aria-label': 'Games' });
    const sheet = h('div.mn-sheet', fitsRow, list);
    scroll.append(againBox, filters, sheet);
    const foot = h('div.mn-foot', { 'aria-live': 'polite' });
    bay.append(foot);

    // ---------- filters ----------
    const chipEls = new Map();
    const mkChip = (id, label, icon, onPick) => {
      const b = h('button.mn-chip', { type: 'button', 'data-e2e': `mood-${id}`, 'aria-pressed': 'false' },
        h('i', { html: icon }), h('span.mn-chip-t', label), h('span.mn-chip-n'));
      onTap(b, onPick);
      chipEls.set(id, b);
      return b;
    };
    filters.append(mkChip('all', 'All', MOOD_ICONS.all, () => { mood = 'all'; paint(); }));
    for (const m of MOODS) filters.append(mkChip(m.id, m.label, MOOD_ICONS[m.id], () => { mood = mood === m.id ? 'all' : m.id; paint(); }));

    // ---------- the menu lines ----------
    const rows = new Map();
    games.forEach((g, i) => {
      const [lo, hi] = gameRange(g);
      const gc = g.colour || '#C89B3C';
      const fans = h('span.mn-fans');
      const fitTag = h('span.mn-row-need');
      const look = h('span.mn-row-look', h('i', { html: EYE_SVG }), h('span.mn-row-look-t'));
      const btn = h(`button.mn-row${g.comingSoon ? '.soon' : ''}`, {
        type: 'button', 'data-e2e': `dish-${g.id}`,
        style: { '--gc': gc, '--gt': textOn(gc), '--i': i },
      },
      h('span.mn-row-dish', { html: dishSvg(g.dish) }),
      h('span.mn-row-txt',
        h('span.mn-row-t', g.title),
        h('span.mn-row-c', g.comingSoon ? 'Coming soon' : (g.hint || g.tagline || '')),
        h('span.mn-row-m',
          h('span.mn-row-i', h('i', { html: PEOPLE_SVG }), `${lo}–${hi}`),
          h('span.mn-row-i', h('i', { html: CLOCK_SVG }), `${g.minutes || 10} min`),
          fitTag, look)),
      fans);
      onTap(btn, () => tapRow(g, btn));
      const li = h('li.mn-li', btn);
      rows.set(g.id, { g, li, btn, fans, fitTag, look });
    });
    const emptyBox = h('li.mn-empty');

    // ---------- the game card (opens over the bay) ----------
    const card = h('section.mn-card', { role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'mn-card-title', hidden: true });
    bay.append(card);
    let cardKey = '';

    function openCard(g) {
      openId = g.id;
      cardKey = '';
      if (c.isHost) c.client.focusGame(g.id);
      card.hidden = false;
      card.classList.remove('out');
      void card.offsetWidth;
      card.classList.add('in');
      paint();
      card.querySelector('.mn-card-back')?.focus({ preventScroll: true });
    }
    function closeCard() {
      if (!openId) return;
      const was = openId;
      openId = null;
      if (c.isHost && c.progress.focus === was) c.client.focusGame(null);
      card.classList.remove('in');
      card.classList.add('out');
      setTimeout(() => { if (!openId) card.hidden = true; }, c.reduced ? 0 : 220);
      paint();
      rows.get(was)?.btn.focus({ preventScroll: true });
    }

    function tapRow(g, btn) {
      if (g.comingSoon) {
        c.say(c.line('menuSoon'), { hold: 1600, compact: true });
        c.cyril.react('sad');
        btn.classList.remove('nope'); void btn.offsetWidth; btn.classList.add('nope');
        return;
      }
      c.cyril.react(c.isHost ? 'delight' : 'smug');
      openCard(g);
    }

    function fancy(g) {
      c.client.fancyGame(fancyOf(c.meId) === g.id ? null : g.id);
      c.cyril.react('smug');
      paint();
    }

    function paintCard() {
      const g = openId && byId.get(openId);
      if (!g) return;
      const n = seated().length;
      const [lo, hi] = gameRange(g);
      const ok = fits(g);
      const fans = fansOf(g.id);
      const mine = fancyOf(c.meId) === g.id;
      const key = [g.id, c.isHost, n, mine, c.rating, fans.map((p) => p.id).join(), hostName()].join('|');
      if (key === cardKey) return;
      cardKey = key;
      const gc = g.colour || '#C89B3C';
      card.style.setProperty('--gc', gc);
      card.style.setProperty('--gt', textOn(gc));

      const back = h('button.mn-card-back', { type: 'button', 'data-e2e': 'card-back' }, h('i', { html: BACK_SVG }), 'All games');
      onTap(back, closeCard);

      const need = n < lo ? `needs ${lo}` : n > hi ? `max ${hi}` : null;
      const r18 = adultOn() && g.hasAdult;
      const facts = h('ul.mn-facts',
        h(`li${ok ? '.ok' : '.no'}`, h('i', { html: ok ? TICK_SVG : PEOPLE_SVG }),
          h('span', ok ? `${lo}–${hi} players: fine for ${n}` : `${lo}–${hi} players: ${need}`)),
        h('li', h('i', { html: CLOCK_SVG }), h('span', `${g.minutes || 10} min`)),
        h(`li.rate${r18 ? '.r18' : ''}`, h('span', r18 ? 'Adults 18+' : 'Family')));

      const steps = (g.steps || [g.blurb || g.tagline || '']).slice(0, 3);
      const how = h('ol.mn-how', { 'aria-label': 'How it plays' },
        steps.map((s, i) => h('li.mn-panel', { style: { '--k': i } }, h('span.mn-panel-n', String(i + 1)), h('p', s))));

      const fanLine = fans.length
        ? h('div.mn-card-fans', h('span.mn-fans.big', fans.slice(0, 5).map((p, k) => h('span.mn-fan', { style: { '--pc': AVATARS[p.avatar]?.colour, '--k': k }, html: avatarIcon(p.avatar) }))),
          h('span', fans.length === 1 ? `${fans[0].id === c.meId ? 'You fancy' : `${fans[0].name} fancies`} this` : `${fans.length} of you fancy this`))
        : null;

      let action;
      if (c.isHost) {
        action = ok
          ? button(`Serve ${g.title}`, { e2e: 'serve-game', onClick: () => serve(g) })
          : button(n < lo ? `Needs ${lo} players` : `Max ${hi} players`, { kind: 'secondary', disabled: true, e2e: 'serve-game' });
      } else {
        action = button(mine ? 'You fancy this' : 'I fancy this', { kind: mine ? 'secondary' : 'primary', e2e: 'fancy', onClick: () => fancy(g) });
        if (mine) action.prepend(h('i.btn-ic', { html: TICK_SVG }));
      }
      const note = c.isHost
        ? (ok ? null : h('p.mn-card-note', n < lo ? `Invite ${lo - n} more to play this.` : 'Too many at the table for this one.'))
        : h('p.mn-card-note', h('b', hostName()), ' starts the game. They see what you fancy.');
      const extra = (!ok && c.isHost && n < lo) ? h('button.mn-card-inv', { type: 'button', 'data-e2e': 'card-invite' }, h('i', { html: INVITE_SVG }), 'Invite') : null;
      if (extra) onTap(extra, () => openInvite());

      card.replaceChildren(
        h('div.mn-card-top', back),
        h('div.mn-card-body',
          h('div.mn-card-head',
            h('div.mn-card-dish', { html: dishSvg(g.dish) }),
            h('div.mn-card-name',
              h('h2.mn-card-t#mn-card-title', g.title),
              h('p.mn-card-tag', g.tagline || g.hint || ''))),
          facts,
          h('h3.mn-how-h', 'How it plays'),
          how,
          fanLine),
        h('div.mn-card-act', note, h('div.mn-card-btns', extra, action)));
    }

    // ---------- play again (after a game) ----------
    let againKey = '';
    function paintAgain() {
      const history = c.payload.history || [];
      const lastId = c.payload.last || history[history.length - 1]?.gameId || null;
      const last = lastId && byId.get(lastId);
      const n = seated().length;
      const next = last ? suggestNext(games, { lastId, history, n }) : null;
      const key = [lastId, next?.id, n, c.isHost, fancyOf(c.meId)].join('|');
      if (key === againKey) return;
      againKey = key;
      if (!last) { for (const b of [againBox, againSide]) { b.hidden = true; b.replaceChildren(); } return; }
      againBox.hidden = false;
      againSide.hidden = false;
      const tile = (g, kind) => {
        if (!g) return null;
        const playable = fits(g);
        const mine = fancyOf(c.meId) === g.id;
        const gc = g.colour || '#C89B3C';
        const b = h(`button.mn-again-b.${kind}${mine ? '.mine' : ''}`, { type: 'button', 'data-e2e': `again-${kind}`, disabled: c.isHost && !playable, style: { '--gc': gc, '--gt': textOn(gc) } },
          h('span.mn-again-dish', { html: dishSvg(g.dish) }),
          h('span.mn-again-txt',
            h('span.mn-again-k', h('i', { html: kind === 'same' ? AGAIN_SVG : NEW_SVG }), kind === 'same' ? 'Same again' : 'Something new'),
            h('span.mn-again-t', g.title)),
          mine ? h('i.mn-again-tick', { html: TICK_SVG }) : null);
        onTap(b, () => (c.isHost ? serve(g) : fancy(g)));
        return b;
      };
      againBox.replaceChildren(tile(last, 'same'), tile(next, 'new'));
      againSide.replaceChildren(tile(last, 'same'), tile(next, 'new'));
    }

    // ---------- Invite: big code + QR + the join address ----------
    let inviteEl = null;
    function openInvite() {
      if (inviteEl) return;
      const code = String(c.room || '');
      const url = `${location.origin}${location.pathname}?room=${code}`;
      const shortUrl = `${location.host}${location.pathname === '/' ? '' : location.pathname}`;
      let qr = '';
      try { qr = qrSvg(url); } catch (e) { console.warn('qr', e); }
      const close = h('button.mn-inv-x', { type: 'button', 'aria-label': 'Close', 'data-e2e': 'invite-close' }, h('i', { html: BACK_SVG }), 'Back');
      const copy = button('Share the invite link', { kind: 'secondary', e2e: 'invite-copy', onClick: async () => {
        try {
          if (navigator.share) await navigator.share({ title: 'AFTERS', text: `Pull up a chair. Room code ${code}.`, url });
          else { await navigator.clipboard.writeText(url); c.toast('Invite link copied.'); }
        } catch { /* cancelled */ }
      } });
      const box = h('div.mn-inv-card', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Invite people' },
        close,
        h('h2.mn-inv-h', 'Invite people'),
        h('p.mn-inv-sub', 'Point a phone camera at this.'),
        h('div.mn-inv-qr', { html: qr }),
        h('p.mn-inv-or', 'or go to ', h('b', shortUrl), ' and type'),
        h('div.mn-inv-code', { 'aria-label': `Room code ${code.split('').join(' ')}` }, [...code].map((ch) => h('span', ch))),
        copy);
      inviteEl = h('div.mn-inv', { 'data-e2e': 'invite-sheet' }, box);
      const shut = () => { inviteEl?.remove(); inviteEl = null; };
      onTap(close, shut);
      inviteEl.addEventListener('pointerdown', (e) => { if (e.target === inviteEl) shut(); });
      root.append(inviteEl);
    }

    let served = false;
    function serve(g) {
      if (served || !fits(g)) return;
      served = true;
      c.audio.sfx('bell');
      c.cyril.react('guffaw');
      c.say(c.line('menuServe', { game: g.title }), { hold: 1400, compact: true });
      setTimeout(() => c.client.chooseGame(g.id), c.frozen ? 0 : 420);
      setTimeout(() => { served = false; }, 2500);
    }

    // ---------- paint ----------
    let lastNight = '';
    let listKey = '';
    function paint() {
      const adult = adultOn();
      if (!adult && MOODS.find((m) => m.id === mood)?.adult) mood = 'all';
      const n = seated().length;
      const focus = c.progress.focus || null;
      const live = games.filter((g) => !g.comingSoon);
      const inMood = (g) => mood === 'all' || moodsOf(g).includes(mood);

      for (const [id, b] of chipEls) {
        const m = MOODS.find((x) => x.id === id);
        if (m?.adult) b.hidden = !adult;
        const on = id === mood;
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('on', on);
        const count = live.filter((g) => (id === 'all' || moodsOf(g).includes(id)) && (!fitsOnly || fits(g))).length;
        b.querySelector('.mn-chip-n').textContent = String(count);
      }
      fitsRow.setAttribute('aria-checked', String(fitsOnly));
      fitsRow.classList.toggle('on', fitsOnly);
      fitsRow.querySelector('.mn-fits-t').replaceChildren(h('b', `Games for ${n} of us first`));

      const moodLabel = MOODS.find((m) => m.id === mood)?.label;

      // list: in-mood games; with "Good for us" on, the ones that don't fit move to a labelled tail
      const shown = games.filter((g) => (g.comingSoon ? mood === 'all' && !fitsOnly : inMood(g)));
      const main = shown.filter((g) => g.comingSoon || !fitsOnly || fits(g));
      const tail = fitsOnly ? shown.filter((g) => !g.comingSoon && !fits(g)) : [];
      const key = `${main.map((g) => g.id)}|${tail.map((g) => g.id)}|${mood}|${n}`;
      if (key !== listKey) {
        listKey = key;
        const kids = main.map((g) => rows.get(g.id).li);
        if (!main.length) {
          const b = h('button.mn-empty-b', { type: 'button' }, 'Show every game');
          onTap(b, () => { mood = 'all'; fitsOnly = false; paint(); });
          emptyBox.replaceChildren(h('p', `No ${moodLabel ? `${moodLabel.toLowerCase()} ` : ''}games for ${n} of you yet.`), b);
          kids.push(emptyBox);
        }
        if (tail.length) {
          kids.push(h('li.mn-tail-h', `Not for ${n} of you`));
          kids.push(...tail.map((g) => rows.get(g.id).li));
        }
        list.replaceChildren(...kids);
      }

      for (const [id, r] of rows) {
        const g = r.g;
        const ok = fits(g);
        const [lo, hi] = gameRange(g);
        r.btn.classList.toggle('cant', !g.comingSoon && !ok);
        r.fitTag.textContent = g.comingSoon || ok ? '' : (n < lo ? `Needs ${lo}` : `Max ${hi}`);
        r.fitTag.hidden = g.comingSoon || ok;
        r.btn.classList.toggle('is-focus', id === focus);
        r.btn.classList.toggle('is-open', id === openId);
        const lookOn = id === focus && !c.isHost;
        r.look.hidden = !lookOn;
        if (lookOn) r.look.querySelector('.mn-row-look-t').textContent = `${hostName()} is looking`;
        const fans = fansOf(id);
        const sig = fans.map((p) => p.id).join(',');
        if (r.fans.dataset.sig !== sig) {
          r.fans.dataset.sig = sig;
          r.fans.replaceChildren(...fans.slice(0, 3).map((p, k) => h('span.mn-fan', { style: { '--pc': AVATARS[p.avatar]?.colour, '--k': k }, html: avatarIcon(p.avatar) })),
            ...(fans.length > 3 ? [h('span.mn-fans-n', `+${fans.length - 3}`)] : []));
        }
        r.btn.classList.toggle('mine', fancyOf(c.meId) === id);
        r.btn.setAttribute('aria-label', `${g.title}. ${g.hint || ''}. ${lo} to ${hi} players, ${g.minutes || 10} minutes${g.comingSoon ? ', coming soon' : ok ? '' : `, not for ${n} players`}${fans.length ? `. ${fans.length} fancy it` : ''}`);
      }

      fam.setAttribute('aria-checked', String(!adult));
      adu.setAttribute('aria-checked', String(adult));
      ratingSeg.classList.toggle('locked', !c.isHost);
      root.classList.toggle('adult', adult);
      root.classList.toggle('card-open', !!openId);

      const nightRows = c.payload.night || [];
      const nightKey = JSON.stringify(nightRows.map((r) => [r.id, r.night, r.rank])) + c.players.map((p) => p.name).join() + c.meId + (c.payload.history || []).length;
      if (nightKey !== lastNight) {
        lastNight = nightKey;
        nightBox.replaceChildren(nightStrip(c, nightRows));
      }
      paintAgain();
      paintFoot();
      paintCard();
    }

    // foot: who decides, and where the host's finger is
    let footKey = '';
    function paintFoot() {
      const focus = c.progress.focus && byId.get(c.progress.focus);
      const guests = seated().filter((p) => p.id !== c.state?.hostId);
      const fancied = guests.filter((p) => fancyOf(p.id)).length;
      const tally = {};
      for (const gid of Object.values(c.progress.fancy || {})) if (gid) tally[gid] = (tally[gid] || 0) + 1;
      const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
      const topG = top && byId.get(top[0]);
      const key = [c.isHost, focus?.id, openId, fancied, guests.length, topG?.id, top?.[1], hostName(), fancyOf(c.meId)].join('|');
      if (key === footKey) return;
      footKey = key;
      let kids;
      if (c.isHost) {
        kids = topG
          ? [h('span.mn-foot-t', 'Most fancied: ', h('b', topG.title), h('span.mn-foot-n', ` ${top[1]} of ${guests.length}`))]
          : [h('span.mn-foot-t', 'Guests fancy games on their phones. ', h('b', 'You serve.'))];
        if (topG && topG.id !== openId) {
          const b = h('button.mn-foot-b', { type: 'button', 'data-e2e': 'foot-open' }, 'See it');
          onTap(b, () => openCard(topG));
          kids.push(b);
        }
      } else if (focus && focus.id !== openId) {
        kids = [h('i.mn-foot-ic', { html: EYE_SVG }), h('span.mn-foot-t', h('b', hostName()), ' is looking at ', h('b', focus.title))];
        const b = h('button.mn-foot-b', { type: 'button', 'data-e2e': 'foot-open' }, 'See it');
        onTap(b, () => openCard(focus));
        kids.push(b);
      } else {
        const mine = fancyOf(c.meId) && byId.get(fancyOf(c.meId));
        kids = [h('span.mn-foot-t', mine ? h('span', 'You fancy ', h('b', mine.title), '. ') : 'Tap a game to see it. ', h('b', hostName()), ' serves.')];
      }
      foot.replaceChildren(...kids);
    }

    paint();

    // Cyril: a greeting, or a dig at whoever's winning tonight
    const lead = (c.payload.night || []).find((r) => r.rank === 1 && r.night > 0);
    const greet = lead && c.player(lead.id) && (c.payload.history || []).length
      ? c.line('nightLead', { name: c.player(lead.id).name })
      : c.line(c.isHost ? 'menuHost' : 'menuGuest');
    const cancel = sayLater(c, greet, { delay: 700, hold: 2600, placement: 'side', compact: true });
    let lastRating = c.rating;
    let lastFocus = c.progress.focus;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (inviteEl) { inviteEl.remove(); inviteEl = null; } else closeCard();
    };
    window.addEventListener('keydown', onKey);

    return {
      update(next) {
        c = next;
        if (c.rating !== lastRating) {
          lastRating = c.rating;
          c.say(c.line(c.rating === 'adult' ? 'ratingAdult' : 'ratingFamily'), { hold: 1800, compact: true });
          c.cyril.react(c.rating === 'adult' ? 'shock' : 'smug');
        }
        if (c.progress.focus !== lastFocus) {
          lastFocus = c.progress.focus;
          if (!c.isHost && lastFocus) { c.cyril.react('delight'); c.haptic('tap'); }
        }
        paint();
      },
      unmount() { cancel?.(); inviteEl?.remove(); window.removeEventListener('keydown', onKey); },
    };
  },
};
