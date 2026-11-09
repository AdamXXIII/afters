// menu: Cyril's dessert trolley. After the lobby (and after every game) the host wheels in the
// trolley and picks tonight's next game. Every phone sees the same trolley: the host's finger
// (focus) glows on every phone, guests tap the dish they fancy and their avatar pops onto it.
// Layout: Cyril + title over the 3D table, then a deep claret "trolley bay" holding tonight's
// table, the dishes (each live game in its own saturated colour; coming-soon ones sit back
// under a dome) and the cream detail card with the one big action.
import './menu.css';
import { h, button, onTap } from '../ui/components.js';
import { avatarIcon } from '../ui/icons.js';
import { AVATARS, NIGHT_POINTS } from '../game/constants.js';
import { SHOTS } from '../stage/Stage.js';
import { dishSvg, DOME_SVG, CHERRY_SVG } from './menu-art.js';
import { sayLater } from './common.js';

SHOTS.menu ||= { expr: 'eager', pos: [0, 0.3, 0.95], target: [0, 0.17, 0], subject: 'cyril', maxS: 0.2 };

const gameRange = (g) => g.players || [3, 8];

/** Ink or linen text, whichever reads on a game colour. */
function textOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 'var(--c-ink)';
  const n = parseInt(m[1], 16);
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.2 ? 'var(--c-ink)' : 'var(--c-linen)';
}

/**
 * Tonight's table, compact: the leader plus your own row (rank badges); everyone when <= 5.
 * Names show on the leader's and your chip; the rest are avatar + rank + cherries.
 */
export function nightStrip(ctx, rows) {
  const played = (ctx.payload?.history || []).length;
  const el = h('div.night', { 'aria-label': 'Tonight\'s table' });
  const hasAny = rows?.some((r) => r.night > 0);
  el.append(h('div.night-k', h('span.night-ic', { html: CHERRY_SVG }),
    h('span.night-k-t', 'Tonight\u2019s table'),
    h('span.night-n', played ? `${played} ${played === 1 ? 'dish' : 'dishes'} down` : 'no dishes yet')));
  if (!hasAny) {
    el.append(h('div.night-empty', h('b', `Win a dish: ${NIGHT_POINTS[0]} cherries.`), ` 2nd ${NIGHT_POINTS[1]}, 3rd ${NIGHT_POINTS[2]}.`));
    return el;
  }
  const all = rows.length <= 5;
  const pick = all ? rows : rows.filter((r, i) => i === 0 || r.id === ctx.meId);
  const list = h(`ol.night-list${all ? '.all' : ''}`);
  pick.forEach((r, i) => {
    const p = ctx.player(r.id);
    if (!p) return;
    const named = !all || i === 0 || r.id === ctx.meId || rows.length <= 3;
    list.append(h(`li.night-row${r.rank === 1 ? '.lead' : ''}${r.id === ctx.meId ? '.me' : ''}${named ? '.named' : ''}`, { style: { '--pc': AVATARS[p.avatar]?.colour, '--i': i }, title: p.name },
      h('span.night-av', { html: avatarIcon(p.avatar) }, h('span.night-rk', String(r.rank))),
      named ? h('span.night-nm', r.id === ctx.meId && r.rank !== 1 ? 'You' : p.name) : null,
      h('span.night-pts', String(r.night))));
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
    // playable dishes first, coming-soon after (stable)
    const all = ctx.games.filter((g) => !g.hidden);
    const games = [...all.filter((g) => !g.comingSoon), ...all.filter((g) => g.comingSoon)];
    const root = h('div.mn');
    show.append(root);
    let c = ctx;
    let local = null; // host: dish under the finger before the focus round-trips
    let lastTapped = null; // guest: the dish this phone last tapped

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
    root.append(head);

    // ---------- the trolley bay ----------
    const nightBox = h('div.mn-night');
    const dishes = new Map();
    const live = games.filter((g) => !g.comingSoon).length;
    const shelves = [h('div.mn-shelf.top'), h('div.mn-shelf.bottom')];
    // shelves: with 1-2 live games they get the top shelf to themselves and the coming-soon
    // dishes sit smaller underneath; otherwise split evenly (playables first)
    const soonCount = games.length - live;
    const split = live > 0 && live <= 2 && soonCount > 0 ? live : Math.ceil(games.length / 2);
    games.forEach((g, i) => {
      const fans = h('div.mn-fans');
      const gc = g.colour || '#C89B3C';
      const btn = h(`button.mn-dish${g.comingSoon ? '.soon' : '.live'}`, {
        type: 'button', 'data-e2e': `dish-${g.id}`, 'aria-label': `${g.title}${g.comingSoon ? ', coming soon' : ''}`,
        style: { '--gc': gc, '--gt': textOn(gc), '--i': i },
      },
      h('div.mn-plate', { html: dishSvg(g.dish) + (g.comingSoon ? DOME_SVG : '') }),
      h('div.mn-tag', h('span.mn-tag-t', g.title), h('span.mn-tag-c', g.comingSoon ? 'Coming soon' : (g.hint || g.tagline))),
      fans);
      onTap(btn, () => tapDish(g));
      dishes.set(g.id, { g, btn, fans });
      shelves[i < split ? 0 : 1].append(btn);
    });
    const trolley = h(`div.mn-trolley.live-${Math.min(live, 4)}${split === live && soonCount > 0 ? '.tiered' : ''}`,
      shelves[0], h('div.mn-rail'), shelves[1], h('div.mn-rail.low'),
      h('div.mn-wheels', h('span.mn-wheel'), h('span.mn-wheel')));

    const detail = h('section.mn-detail', { 'aria-live': 'polite' });
    const bay = h('div.mn-bay', nightBox, trolley, detail);
    root.append(bay);

    const focusId = () => (c.isHost ? (local || c.progress.focus) : c.progress.focus) || null;
    const myFancy = () => c.progress.fancy?.[c.meId] || null;
    const shown = () => {
      const id = c.isHost ? focusId() : (lastTapped || myFancy() || focusId());
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
      } else {
        lastTapped = g.id; // the detail card follows this phone's finger, not the host's
        if (!g.comingSoon) {
          c.client.fancyGame(myFancy() === g.id ? null : g.id);
          c.cyril.react('smug');
        }
      }
      paint();
    }
    function fancyBtn(g) {
      lastTapped = g.id;
      c.haptic('tap');
      c.client.fancyGame(myFancy() === g.id ? null : g.id);
      c.cyril.react('smug');
      paint();
    }

    let lastDetail = '';
    function paintDetail() {
      const g = shown();
      const players = c.players.filter((p) => p.connected !== false);
      const n = players.length;
      const fancy = c.progress.fancy || {};
      const fid = focusId();
      const key = `${g?.id}|${c.isHost}|${n}|${myFancy()}|${c.rating}|${fid}|${JSON.stringify(fancy)}`;
      if (key === lastDetail) return;
      lastDetail = key;
      detail.replaceChildren();
      if (!g) {
        detail.append(h('div.mn-hint', c.isHost
          ? h('span', h('b', 'Pick a dish'), ' off the trolley. Everyone sees where you point.')
          : h('span', h('b', `${c.player(c.state?.hostId)?.name || 'The host'} is choosing.`), ' Tap the dish you fancy to sway them.')));
        return;
      }
      const [lo, hi] = gameRange(g);
      const okCount = n >= lo && n <= hi;
      const gc = g.colour || '#C89B3C';
      detail.style.setProperty('--gc', gc);
      detail.style.setProperty('--gt', textOn(gc));
      detail.classList.toggle('soon', !!g.comingSoon);

      // the slim line above the card: who's pointing / what's fancied
      let note = null;
      if (c.isHost) {
        const tally = {};
        Object.values(fancy).forEach((gid) => { if (gid) tally[gid] = (tally[gid] || 0) + 1; });
        const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
        const guests = Math.max(1, players.filter((p) => p.id !== c.meId).length);
        note = top && dishes.get(top[0])
          ? h('div.mn-note', h('span.mn-note-k', 'Most fancied'), h('b', dishes.get(top[0]).g.title), h('span.mn-note-n', `${top[1]} of ${guests}`))
          : h('div.mn-note', h('span.mn-note-k', 'Most fancied'), h('span', 'nobody’s said yet'));
      } else {
        const fg = dishes.get(fid)?.g;
        const hostName = c.player(c.state?.hostId)?.name || 'Host';
        note = fg
          ? h('div.mn-note', h('span.mn-note-k', `${hostName} is pointing at`), h('b', fg.title), fg.id === g.id ? h('span.mn-note-n', 'this one') : null)
          : h('div.mn-note', h('span.mn-note-k', `${hostName} is choosing`));
      }

      const fanCount = Object.values(fancy).filter((x) => x === g.id).length;
      detail.append(
        note,
        h('div.mn-d-card',
          h('div.mn-d-top',
            h('div.mn-d-plate', { html: dishSvg(g.dish) }),
            h('div.mn-d-txt',
              h('div.mn-d-course', g.comingSoon ? 'Still in the oven' : (g.course || '')),
              h('h2.mn-d-title', g.title),
              h('div.mn-d-meta', h('span', `${lo}–${hi} players`), h('span', `${g.minutes || 10} min`),
                fanCount ? h('span.fan', `${fanCount} fancy it`) : null))),
          h('p.mn-d-blurb', g.blurb || g.tagline || '')));
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
          : button(fancied ? `You fancy ${g.title} ✓` : `I fancy ${g.title}`, { kind: fancied ? 'secondary' : 'primary', e2e: 'fancy', onClick: () => fancyBtn(g) });
      }
      detail.querySelector('.mn-d-card').append(h('div.mn-d-act', action));
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
      const sid = shown()?.id;
      for (const [id, d] of dishes) {
        d.btn.classList.toggle('is-focus', id === fid);
        d.btn.classList.toggle('is-shown', !c.isHost && id === sid && id !== fid);
        d.btn.setAttribute('aria-pressed', String(id === fid || (!c.isHost && myFancy() === id)));
        const who = Object.entries(fancy).filter(([, gid]) => gid === id).map(([pid]) => c.player(pid)).filter(Boolean);
        const sig = who.map((p) => p.id).join(',');
        if (d.fans.dataset.sig !== sig) {
          d.fans.dataset.sig = sig;
          d.fans.replaceChildren(...who.slice(0, 3).map((p, k) => h('span.mn-fan', { style: { '--pc': AVATARS[p.avatar]?.colour, '--k': k }, title: p.name, html: avatarIcon(p.avatar) })),
            ...(who.length > 3 ? [h('span.mn-fans-n', `+${who.length - 3}`)] : []));
          d.btn.classList.toggle('fancied', who.length > 0);
        }
      }
      trolley.classList.toggle('has-focus', !!fid);
      fam.setAttribute('aria-checked', String(c.rating !== 'adult'));
      adu.setAttribute('aria-checked', String(c.rating === 'adult'));
      ratingSeg.classList.toggle('locked', !c.isHost);
      root.classList.toggle('adult', c.rating === 'adult');
      const nightRows = c.payload.night || [];
      const nightKey = JSON.stringify(nightRows.map((r) => [r.id, r.night, r.rank])) + c.players.map((p) => p.name).join() + c.meId;
      if (nightKey !== lastNight) {
        lastNight = nightKey;
        nightBox.replaceChildren(nightStrip(c, nightRows));
      }
      paintDetail();
    }

    // host: nothing focused yet -> point at the first playable dish so Serve is ready at second 0
    if (c.isHost && !c.progress.focus) {
      const first = games.find((g) => !g.comingSoon);
      if (first) { local = first.id; c.client.focusGame(first.id); }
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
