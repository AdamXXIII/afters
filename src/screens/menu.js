// menu: pick tonight's next game. After the lobby (and after every game) everyone sees the same
// menu: the host taps a game and starts it; guests vote with the big button and their avatar pops
// onto that game's tile. Layout: Cyril + title + Invite over the 3D table, then a candlelit bay with
// tonight's scores, the game tiles (players, length, 18+) and ONE "How it plays" card + action.
import './menu.css';
import { h, button, onTap } from '../ui/components.js';
import { avatarIcon } from '../ui/icons.js';
import { AVATARS, NIGHT_POINTS } from '../game/constants.js';
import { SHOTS } from '../stage/Stage.js';
import { dishSvg, CHERRY_SVG, PEOPLE_SVG, CLOCK_SVG, INVITE_SVG } from './menu-art.js';
import { qrSvg } from '../ui/qr.js';
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
 * Tonight's scores, compact: everyone when <= 5, else the leader(s) plus your own chip.
 * The leader's chip is gold with "1st"; no other rank numbers (they read as noise).
 */
export function nightStrip(ctx, rows) {
  const played = (ctx.payload?.history || []).length;
  const el = h('div.night', { 'aria-label': 'Tonight’s scores' });
  const hasAny = rows?.some((r) => r.night > 0);
  el.append(h('div.night-k', h('span.night-ic', { html: CHERRY_SVG }),
    h('span.night-k-t', 'Tonight’s scores'),
    h('span.night-n', `Games played: ${played}`)));
  if (!hasAny) {
    el.append(h('div.night-empty', h('b', 'No scores yet.'), ` Win a game for ${NIGHT_POINTS[0]} cherries (2nd ${NIGHT_POINTS[1]}, 3rd ${NIGHT_POINTS[2]}).`));
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
    // playable games first, coming-soon after (stable)
    const all = ctx.games.filter((g) => !g.hidden);
    const games = [...all.filter((g) => !g.comingSoon), ...all.filter((g) => g.comingSoon)];
    const root = h('div.mn');
    show.append(root);
    let c = ctx;
    let local = null; // host: game under the finger before the focus round-trips
    let lastTapped = null; // guest: the game this phone last tapped
    const hostName = () => c.player(c.state?.hostId)?.name || 'The host';
    const adultOn = () => c.rating === 'adult';

    // ---------- header: title, Invite, Family / 18+ ----------
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

    const head = h('header.mn-head',
      h('h1.mn-title', 'What\'s for', h('br'), h('em', 'afters'), '?'),
      h('div.mn-head-row', inviteBtn, ratingSeg));
    root.append(head);

    // ---------- the bay: tonight's scores, the game tiles, then the "How it plays" card ----------
    const nightBox = h('div.mn-night');
    const dishes = new Map();
    const liveGames = games.filter((g) => !g.comingSoon);
    const soonGames = games.filter((g) => g.comingSoon);
    const live = liveGames.length;
    const picks = h('div.mn-shelf.top.mn-picks', { role: 'group', 'aria-label': 'Games' });
    const soonList = soonGames.length ? h('div.mn-shelf.bottom.mn-soon-list') : null;
    games.forEach((g, i) => {
      const fans = h('span.mn-fans');
      const gc = g.colour || '#C89B3C';
      const [lo, hi] = gameRange(g);
      const adultTag = h('span.mn-tag-18', '18+');
      const btn = h(`button.mn-dish${g.comingSoon ? '.soon' : '.live'}`, {
        type: 'button', 'data-e2e': `dish-${g.id}`,
        'aria-label': `${g.title}, ${lo} to ${hi} players, ${g.minutes || 10} minutes${g.comingSoon ? ', coming soon' : ''}`,
        style: { '--gc': gc, '--gt': textOn(gc), '--i': i },
      },
      h('div.mn-tag',
        h('span.mn-tag-t', g.title),
        g.comingSoon ? h('span.mn-tag-c', 'Coming soon') : h('span.mn-tag-c', g.hint || g.tagline),
        g.comingSoon ? null : h('span.mn-tag-m',
          h('span.mn-tag-i', h('i', { html: PEOPLE_SVG }), `${lo}–${hi}`),
          h('span.mn-tag-i', h('i', { html: CLOCK_SVG }), `${g.minutes || 10} min`),
          g.hasAdult ? adultTag : null,
          fans)));
      onTap(btn, () => tapDish(g, btn));
      dishes.set(g.id, { g, btn, fans, adultTag });
      if (g.comingSoon) soonList.append(btn);
      else picks.append(btn);
    });
    const soonRow = soonList ? h('div.mn-soon', h('div.mn-soon-k', h('span', 'Coming soon')), soonList) : null;
    const trolley = h(`div.mn-trolley.live-${Math.min(live, 4)}`, picks, soonRow);

    const statusSlot = h('div.mn-status-slot');
    const topSlot = h('div.mn-d-top');
    const howSlot = h('div.mn-how');
    const actSlot = h('div.mn-d-act');
    const card = h('div.mn-d-card', topSlot, howSlot, statusSlot, actSlot);
    const detail = h('section.mn-detail', { 'aria-live': 'polite' }, card);
    const bay = h('div.mn-bay', nightBox, trolley, detail);
    root.append(bay);

    // ---------- Invite: big code + QR + the join address ----------
    let inviteEl = null;
    function openInvite() {
      if (inviteEl) return;
      c.haptic('tap');
      const code = String(c.room || '');
      const url = `${location.origin}${location.pathname}?room=${code}`;
      const shortUrl = `${location.host}${location.pathname === '/' ? '' : location.pathname}`;
      let qr = '';
      try { qr = qrSvg(url); } catch (e) { console.warn('qr', e); }
      const close = h('button.mn-inv-x', { type: 'button', 'aria-label': 'Close', 'data-e2e': 'invite-close' }, '×');
      const copy = button('Copy invite link', { kind: 'secondary', e2e: 'invite-copy', onClick: async () => {
        try {
          if (navigator.share) await navigator.share({ title: 'AFTERS', text: `Pull up a chair. Room code ${code}.`, url });
          else { await navigator.clipboard.writeText(url); c.toast('Invite link copied.'); }
        } catch { /* cancelled */ }
      } });
      const box = h('div.mn-inv-card', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Invite people' },
        close,
        h('h2.mn-inv-h', 'Invite people'),
        h('p.mn-inv-sub', 'Late to the table? Scan this with your phone camera.'),
        h('div.mn-inv-qr', { html: qr }),
        h('div.mn-inv-or', 'or go to'),
        h('div.mn-inv-url', shortUrl),
        h('div.mn-inv-or', 'and type the room code'),
        h('div.mn-inv-code', { 'aria-label': `Room code ${code.split('').join(' ')}` }, [...code].map((ch) => h('span', ch))),
        copy);
      inviteEl = h('div.mn-inv', { 'data-e2e': 'invite-sheet' }, box);
      const shut = () => { inviteEl?.remove(); inviteEl = null; };
      onTap(close, shut);
      inviteEl.addEventListener('pointerdown', (e) => { if (e.target === inviteEl) shut(); });
      root.append(inviteEl);
    }

    const focusId = () => (c.isHost ? (local || c.progress.focus) : c.progress.focus) || null;
    const myFancy = () => c.progress.fancy?.[c.meId] || null;
    const shown = () => {
      const id = c.isHost ? focusId() : (lastTapped || myFancy() || focusId());
      const g = dishes.get(id)?.g;
      return g && !g.comingSoon ? g : (liveGames[0] || null);
    };

    function tapDish(g, btn) {
      c.haptic('tap');
      if (g.comingSoon) {
        c.say(c.line('menuSoon'), { hold: 1600, compact: true });
        c.cyril.react('sad');
        btn.classList.remove('nope'); void btn.offsetWidth; btn.classList.add('nope');
        return;
      }
      if (c.isHost) {
        local = g.id;
        c.client.focusGame(g.id);
        c.cyril.react('delight');
      } else {
        // a guest's tap only shows the card; the vote is the big button (no accidental votes)
        lastTapped = g.id;
        c.cyril.react('smug');
      }
      paint();
    }
    function voteBtn(g) {
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
      const key = `${g?.id}|${c.isHost}|${n}|${myFancy()}|${c.rating}|${fid}|${JSON.stringify(fancy)}|${hostName()}`;
      if (key === lastDetail) return;
      lastDetail = key;
      if (!g) {
        detail.replaceChildren(h('div.mn-hint', c.isHost
          ? h('span', h('b', 'No games yet.'), ' New ones are still in the oven.')
          : h('span', h('b', `${hostName()} is choosing.`), ' Hang tight.')));
        return;
      }
      const [lo, hi] = gameRange(g);
      const okCount = n >= lo && n <= hi;
      const gc = g.colour || '#C89B3C';
      detail.style.setProperty('--gc', gc);
      detail.style.setProperty('--gt', textOn(gc));

      // top: small dish, name, players / length / 18+
      topSlot.replaceChildren(
        h('div.mn-d-plate', { html: dishSvg(g.dish) }),
        h('div.mn-d-txt',
          h('h2.mn-d-title', g.title),
          h('div.mn-d-meta',
            h('span', h('i', { html: PEOPLE_SVG }), `${lo}–${hi} players`),
            h('span', h('i', { html: CLOCK_SVG }), `${g.minutes || 10} min`),
            g.hasAdult && adultOn() ? h('span.r18', '18+') : null)));
      const steps = g.steps || [g.blurb || g.tagline || ''];
      howSlot.replaceChildren(h('div.mn-how-k', 'How it plays'),
        h('ol.mn-how-list', steps.slice(0, 3).map((s, i) => h('li', h('span.mn-how-n', String(i + 1)), h('span', s)))));

      // status: who votes, who starts
      const guests = players.filter((p) => p.id !== c.state?.hostId);
      const voted = guests.filter((p) => fancy[p.id]).length;
      const tally = {};
      Object.values(fancy).forEach((gid) => { if (gid) tally[gid] = (tally[gid] || 0) + 1; });
      const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
      const votesHere = tally[g.id] || 0;
      let status;
      if (c.isHost) {
        status = h('div.mn-status',
          h('span.mn-status-t', voted
            ? h('span', 'Most votes: ', h('b', dishes.get(top[0])?.g.title || ''))
            : 'Guests vote on their phones. You start the game.'),
          guests.length ? h('span.mn-status-n', `${voted} of ${guests.length} voted`) : null);
      } else {
        const mine = myFancy();
        const fg = dishes.get(fid)?.g;
        status = h('div.mn-status',
          h('span.mn-status-t', mine
            ? h('span', 'You voted. ', h('b', hostName()), ' starts the game.')
            : h('span', 'Vote for a game. ', h('b', hostName()), ' starts it.')),
          votesHere ? h('span.mn-status-n', `${votesHere} ${votesHere === 1 ? 'vote' : 'votes'}`) : (fg && fg.id !== g.id ? h('span.mn-status-n.soft', `${hostName()} is on ${fg.title}`) : null));
      }
      statusSlot.replaceChildren(status);

      let action;
      if (c.isHost) {
        action = !okCount
          ? button(n < lo ? `Needs ${lo} players` : `Max ${hi} players`, { kind: 'secondary', disabled: true })
          : button(`Start ${g.title}`, { e2e: 'serve-game', onClick: () => serve(g) });
      } else {
        const votedThis = myFancy() === g.id;
        action = button(votedThis ? `Voted for ${g.title} ✓` : `Vote for ${g.title}`, { kind: votedThis ? 'secondary' : 'primary', e2e: 'fancy', onClick: () => voteBtn(g) });
      }
      actSlot.replaceChildren(action);
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
        d.btn.classList.toggle('is-sel', id === sid);
        d.btn.setAttribute('aria-pressed', String(id === sid));
        d.adultTag.hidden = !adultOn();
        const who = Object.entries(fancy).filter(([, gid]) => gid === id).map(([pid]) => c.player(pid)).filter(Boolean);
        const sig = who.map((p) => p.id).join(',');
        if (d.fans.dataset.sig !== sig) {
          d.fans.dataset.sig = sig;
          d.fans.title = who.length ? `Votes: ${who.map((p) => p.name).join(', ')}` : '';
          d.fans.replaceChildren(...who.slice(0, 3).map((p, k) => h('span.mn-fan', { style: { '--pc': AVATARS[p.avatar]?.colour, '--k': k }, html: avatarIcon(p.avatar) })),
            ...(who.length > 3 ? [h('span.mn-fans-n', `+${who.length - 3}`)] : []));
          d.btn.classList.toggle('fancied', who.length > 0);
        }
      }
      fam.setAttribute('aria-checked', String(!adultOn()));
      adu.setAttribute('aria-checked', String(adultOn()));
      ratingSeg.classList.toggle('locked', !c.isHost);
      root.classList.toggle('adult', adultOn());
      const nightRows = c.payload.night || [];
      const nightKey = JSON.stringify(nightRows.map((r) => [r.id, r.night, r.rank])) + c.players.map((p) => p.name).join() + c.meId + (c.payload.history || []).length;
      if (nightKey !== lastNight) {
        lastNight = nightKey;
        nightBox.replaceChildren(nightStrip(c, nightRows));
      }
      paintDetail();
    }

    // host: nothing (or a coming-soon game) focused -> point at the first playable one so Start
    // is ready at second 0
    if (c.isHost && (!c.progress.focus || dishes.get(c.progress.focus)?.g.comingSoon)) {
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
      unmount() { cancel?.(); inviteEl?.remove(); },
    };
  },
};
