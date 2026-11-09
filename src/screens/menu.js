// menu: Cyril's dessert trolley. After the lobby (and after every game) the host wheels in the
// trolley and picks tonight's next game. Every phone sees the same trolley: the host's finger
// (focus) glows on every phone, guests tap the dish they fancy and their avatar pops onto it.
// Tonight's table (cherries per game placing) runs across the top all night.
import './menu.css';
import { h, button, onTap } from '../ui/components.js';
import { avatarIcon } from '../ui/icons.js';
import { AVATARS, NIGHT_POINTS } from '../game/constants.js';
import { SHOTS } from '../stage/Stage.js';
import { dishSvg, DOME_SVG, CHERRY_SVG } from './menu-art.js';
import { sayLater } from './common.js';

SHOTS.menu ||= { expr: 'eager', pos: [0, 0.3, 0.95], target: [0, 0.17, 0], subject: 'cyril', maxS: 0.2 };

const gameRange = (g) => g.players || [3, 8];

/** Tonight's table: the running leaderboard (cherries), shared with the results screen. */
export function nightStrip(ctx, rows, { big = false } = {}) {
  const played = (ctx.payload?.history || []).length;
  const el = h(`div.night${big ? '.big' : ''}`, { 'aria-label': 'Tonight\'s table' });
  const hasAny = rows?.some((r) => r.night > 0);
  el.append(h('div.night-k', h('span.night-ic', { html: CHERRY_SVG }), h('span', 'Tonight\'s table'),
    played ? h('span.night-n', `${played} ${played === 1 ? 'dish' : 'dishes'} down`) : null));
  if (!hasAny) {
    el.append(h('div.night-empty', `No cherries yet. Win a game for ${NIGHT_POINTS[0]}, second gets ${NIGHT_POINTS[1]}, third ${NIGHT_POINTS[2]}.`));
    return el;
  }
  const list = h('ol.night-list');
  const max = 2;
  rows.slice(0, max).forEach((r, i) => {
    const p = ctx.player(r.id);
    if (!p) return;
    const li = h(`li.night-row${r.rank === 1 ? '.lead' : ''}${r.id === ctx.meId ? '.me' : ''}`, { style: { '--pc': AVATARS[p.avatar]?.colour, '--i': i } },
      h('span.night-av', { html: avatarIcon(p.avatar) }),
      h('span.night-nm', p.name),
      h('span.night-pts', String(r.night)),
      r.delta > 0 && big ? h('span.night-d', `+${r.delta}`) : null);
    list.append(li);
  });
  if (rows.length > max) list.append(h('li.night-more', `+${rows.length - max}`));
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
    const games = ctx.games.filter((g) => !g.hidden);
    const root = h('div.mn');
    show.append(root);
    let c = ctx;
    let local = null; // host: dish under the finger before the focus round-trips

    // ---------- header ----------
    const ratingSeg = h('div.mn-rating', { role: 'radiogroup', 'aria-label': 'Content rating' });
    const fam = h('button.mn-rate', { type: 'button', role: 'radio', 'data-e2e': 'rating-family' }, 'Family');
    const adu = h('button.mn-rate.adult', { type: 'button', role: 'radio', 'data-e2e': 'rating-adult' }, 'Adults 18+');
    ratingSeg.append(fam, adu);
    const setRating = (r) => { if (c.isHost && c.rating !== r) c.client.setSettings({ rating: r }); };
    onTap(fam, () => setRating('family'));
    onTap(adu, () => setRating('adult'));

    const head = h('header.mn-head',
      h('div.mn-eyebrow', h('span.mn-code', 'Room', h('b', c.room || ''))),
      h('h1.mn-title', 'What\'s for', h('br'), h('em', 'afters'), '?'),
      ratingSeg);
    const nightBox = h('div.mn-night');
    root.append(head, nightBox);

    // ---------- the trolley ----------
    const dishes = new Map();
    const shelves = [h('div.mn-shelf.top'), h('div.mn-shelf.bottom')];
    games.forEach((g, i) => {
      const fans = h('div.mn-fans');
      const btn = h(`button.mn-dish${g.comingSoon ? '.soon' : ''}`, {
        type: 'button', 'data-e2e': `dish-${g.id}`, 'aria-label': `${g.title}${g.comingSoon ? ', coming soon' : ''}`,
        style: { '--gc': g.colour || '#C89B3C', '--i': i },
      },
      h('div.mn-plate', { html: dishSvg(g.dish) + (g.comingSoon ? DOME_SVG : '') }),
      g.comingSoon ? h('span.mn-stamp', 'Coming soon') : null,
      h('div.mn-tag', h('span.mn-tag-t', g.title), h('span.mn-tag-c', g.tagline)),
      fans);
      onTap(btn, () => tapDish(g));
      dishes.set(g.id, { g, btn, fans });
      shelves[i < Math.ceil(games.length / 2) ? 0 : 1].append(btn);
    });
    const trolley = h('div.mn-trolley',
      h('div.mn-handle'),
      shelves[0], h('div.mn-rail'), shelves[1], h('div.mn-rail.low'),
      h('div.mn-wheels', h('span.mn-wheel'), h('span.mn-wheel')));
    root.append(trolley);

    // ---------- detail + action ----------
    const detail = h('section.mn-detail', { 'aria-live': 'polite' });
    root.append(detail);

    const focusId = () => (c.isHost ? (local || c.progress.focus) : c.progress.focus) || null;
    const myFancy = () => c.progress.fancy?.[c.meId] || null;
    const shown = () => {
      const id = focusId() || (!c.isHost && myFancy()) || null;
      return dishes.get(id)?.g || null;
    };

    function tapDish(g) {
      c.haptic('tap');
      if (g.comingSoon) {
        c.say(c.line('menuSoon'), { hold: 1600, compact: true });
        c.cyril.react('sad');
      }
      if (c.isHost) {
        local = g.id;
        c.client.focusGame(g.id);
        if (!g.comingSoon) c.cyril.react('delight');
      } else if (!g.comingSoon) {
        c.client.fancyGame(myFancy() === g.id ? null : g.id);
        c.cyril.react('smug');
      }
      paint();
    }

    let lastDetail = '';
    function paintDetail() {
      const g = shown();
      const n = c.players.filter((p) => p.connected !== false).length;
      const key = `${g?.id}|${c.isHost}|${n}|${myFancy()}|${c.rating}`;
      if (key === lastDetail) return;
      lastDetail = key;
      detail.replaceChildren();
      if (!g) {
        detail.append(h('div.mn-hint', c.isHost
          ? h('span', h('b', 'Pick a dish'), ' off the trolley. Everyone can see where you point.')
          : h('span', h('b', `${c.player(c.state?.hostId)?.name || 'The host'} is choosing.`), ' Tap the dish you fancy to sway them.')));
        return;
      }
      const [lo, hi] = gameRange(g);
      const okCount = n >= lo && n <= hi;
      detail.style.setProperty('--gc', g.colour || '#C89B3C');
      detail.append(
        h('div.mn-d-top',
          h('div.mn-d-plate', { html: dishSvg(g.dish) }),
          h('div.mn-d-txt',
            h('div.mn-d-course', g.course || ''),
            h('h2.mn-d-title', g.title),
            h('div.mn-d-meta', h('span', `${lo}-${hi} players`), h('span', `${g.minutes || 10} min`), ...(g.tags || []).slice(0, 1).map((t) => h('span', t))))),
        h('p.mn-d-blurb', g.blurb || g.tagline || ''));
      let action;
      if (c.isHost) {
        action = g.comingSoon
          ? button('Still in the oven', { kind: 'secondary', disabled: true })
          : !okCount
            ? button(n < lo ? `Needs ${lo} players` : `Max ${hi} players`, { kind: 'secondary', disabled: true })
            : button(`Serve ${g.title}`, { e2e: 'serve-game', onClick: () => serve(g) });
      } else {
        const fancied = myFancy() === g.id;
        action = g.comingSoon
          ? button('Coming soon', { kind: 'secondary', disabled: true })
          : button(fancied ? 'Told Cyril \u2713 (tap to take it back)' : 'I fancy this one', { kind: 'primary', e2e: 'fancy', onClick: () => tapDish(g) });
      }
      detail.append(h('div.mn-d-act', action));
    }

    let served = false;
    function serve(g) {
      if (served) return;
      served = true;
      c.audio.sfx('bell');
      c.cyril.react('guffaw');
      c.say(c.line('menuServe', { game: g.title }), { hold: 1400, compact: true });
      setTimeout(() => c.client.chooseGame(g.id), c.frozen ? 0 : 420);
      setTimeout(() => { served = false; }, 2500);
    }

    let lastNight = '';
    function paint() {
      const fid = focusId();
      const fancy = c.progress.fancy || {};
      for (const [id, d] of dishes) {
        d.btn.classList.toggle('is-focus', id === fid);
        d.btn.setAttribute('aria-pressed', String(id === fid || (!c.isHost && myFancy() === id)));
        const who = Object.entries(fancy).filter(([, gid]) => gid === id).map(([pid]) => c.player(pid)).filter(Boolean);
        const sig = who.map((p) => p.id).join(',');
        if (d.fans.dataset.sig !== sig) {
          d.fans.dataset.sig = sig;
          d.fans.replaceChildren(...who.slice(0, 3).map((p, k) => h('span.mn-fan', { style: { '--pc': AVATARS[p.avatar]?.colour, '--k': k }, title: p.name, html: avatarIcon(p.avatar) })),
            ...(who.length ? [h('span.mn-fans-n', `${who.length} fancy this`)] : []));
          d.btn.classList.toggle('fancied', who.length > 0);
        }
      }
      trolley.classList.toggle('has-focus', !!fid);
      fam.setAttribute('aria-checked', String(c.rating !== 'adult'));
      adu.setAttribute('aria-checked', String(c.rating === 'adult'));
      ratingSeg.classList.toggle('locked', !c.isHost);
      const nightRows = c.payload.night || [];
      const nightKey = JSON.stringify(nightRows.map((r) => [r.id, r.night])) + c.players.map((p) => p.name).join();
      if (nightKey !== lastNight) {
        lastNight = nightKey;
        nightBox.replaceChildren(nightStrip(c, nightRows));
      }
      paintDetail();
    }
    paint();

    // Cyril: a greeting, or a dig at whoever's winning tonight
    const lead = (c.payload.night || []).find((r) => r.rank === 1 && r.night > 0);
    const greet = lead && c.player(lead.id) && (c.payload.history || []).length
      ? c.line('nightLead', { name: c.player(lead.id).name })
      : c.line(c.isHost ? 'menuHost' : 'menuGuest');
    const cancel = sayLater(c, greet, { delay: 700, hold: 2600, placement: 'side' });
    let lastRating = c.rating;
    let lastFocus = c.progress.focus;

    return {
      update(next) {
        c = next;
        if (c.rating !== lastRating) {
          lastRating = c.rating;
          c.say(c.line(c.rating === 'adult' ? 'ratingAdult' : 'ratingFamily'), { hold: 1800, compact: true });
          c.cyril.react(c.rating === 'adult' ? 'shock' : 'smug');
          root.classList.toggle('adult', c.rating === 'adult');
        }
        if (c.progress.focus !== lastFocus) {
          lastFocus = c.progress.focus;
          if (c.isHost && local === lastFocus) local = null;
          if (!c.isHost && lastFocus) { c.cyril.react('delight'); c.haptic('tap'); }
        }
        paint();
      },
      unmount() { cancel?.(); },
    };
  },
};
