// lobby: the table is being laid. Show layer = the room code on a menu-card placard over the table,
// with a handwritten place card floating above every seated guest (and a waiting setting for each
// empty seat). Sheet = pick your seat (2x4 avatars), name your place card, the 8-seat tally, host
// controls and one primary action in the thumb zone.
import './lobby.css';
import * as THREE from 'three';
import { h, button, onTap } from '../ui/components.js';
import { ICONS, avatarIcon } from '../ui/icons.js';
import { store } from '../util/storage.js';
import { MIN_PLAYERS, MAX_PLAYERS, AVATARS } from '../game/constants.js';
import { SHOTS } from '../stage/Stage.js';
import { TABLE_Y, seatAngle } from '../stage/props.js';

// Own camera: lower and further back than the shared 'lobby' shot, so the far arc of chairs sits
// in the middle of the show strip under the code placard instead of hiding behind it.
SHOTS['lobby-seats'] ||= { pos: [0, 0.45, 2.5], target: [0, 0.425, -0.6] };

const LOBBY_SCALE = 1.75;

/** x/z table positions for n guests: a shallow smile in front of Cyril, a gap in the middle for him. */
function lobbySlots(n) {
  const left = Math.ceil(n / 2);
  const right = n - left;
  const step = 0.165;
  const out = [];
  for (let i = 0; i < left; i++) out.push(-(0.225 + (left - 1 - i) * step));
  for (let i = 0; i < right; i++) out.push(0.225 + i * step);
  return out.map((x) => [x, 0.55 - 0.30 * (Math.abs(x) / 0.72) ** 2]);
}
// Where the free places glow: the remaining spots of a full table, outermost first.
const FULL = lobbySlots(8);
const FREE_SLOTS = [FULL[3], FULL[4], FULL[2], FULL[5], FULL[1], FULL[6], FULL[0], FULL[7]];
const AVATAR_NAMES = ['Jelly', 'Sprout', 'Teacup', 'Cheese', 'Pepper', 'Pudding', 'Egg', 'Bourbon'];
const CYRIL_SCALE = 1.15;

// Cyril greets each new arrival by name (his voice: short, dry, never mean to a player).
const JOIN_LINES = [
  'Ah, {name}. Do sit. Napkin on the lap, please.',
  '{name}! I\'ll fetch another fork.',
  'Welcome, {name}. Mind the candle. That\'s me.',
  '{name}. Splendid. The good chair\'s gone, I\'m afraid.',
  'Evening, {name}. Elbows off the table. Eventually.',
];
function joinLine(p) {
  let x = 0;
  for (const ch of String(p.id)) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return JOIN_LINES[x % JOIN_LINES.length].replace('{name}', p.name);
}

function shareIcon() { return ICONS.share; }

export default {
  id: 'lobby',
  layout: 'split',
  shot: 'lobby-seats',
  shotDuration: 1100,
  rail: false,
  mount({ show, sheet }, ctx) {
    const code = String(ctx.room || '----');

    // ---------- show layer: code placard ----------
    const tiles = h('div.lc-tiles', { role: 'text', 'aria-label': `Table code ${code.split('').join(' ')}` },
      [...code].map((ch, i) => h('span.lc-tile', { style: { '--i': i } }, ch)));
    onTap(tiles, async () => {
      try { await navigator.clipboard.writeText(code); ctx.toast(`Code ${code} copied. Read it out nice and slowly.`); } catch { /* ignore */ }
    });
    const invite = h('button.lc-invite', { type: 'button', 'aria-label': 'Share an invite link' },
      h('span.ic', { html: shareIcon() }), h('span', 'Invite'));
    onTap(invite, async () => {
      const url = `${location.origin}${location.pathname}?room=${code}`;
      try {
        if (navigator.share) await navigator.share({ title: 'AFTERS', text: `Pull up a chair. Table code ${code}.`, url });
        else { await navigator.clipboard.writeText(url); ctx.toast('Invite copied. Pass it round the table.'); }
      } catch { /* cancelled */ }
    });
    const placard = h('div.lc-placard',
      h('div.lc-head', h('span.lc-eyebrow', 'Table code'), h('span.lc-hint', 'Type it in to join')),
      h('div.lc-row', tiles, invite),
    );
    const tagsLayer = h('div.lc-tags', { 'aria-hidden': 'true' });
    show.append(tagsLayer, placard);

    // ---------- sheet ----------
    let thumbs = [];
    try { thumbs = ctx.stage.thumbnails(160); } catch (e) { console.warn('thumbs', e); }
    const grid = h('div.lb-grid', { role: 'radiogroup', 'aria-label': 'Pick your seat' });
    const cells = AVATARS.map((a, i) => {
      const owner = h('span.lb-owner');  // a tilted place card across a taken seat: "Sam's"
      const b = h('button.lb-cell', { type: 'button', role: 'radio', 'aria-label': AVATAR_NAMES[i], style: { '--pc': a.colour }, 'data-e2e': `avatar-${i}` },
        h('span.lb-plate'),
        thumbs[i] ? h('img', { src: thumbs[i], alt: '', draggable: false }) : h('span.lb-glyph', { html: avatarIcon(i) }),
        h('span.lb-label', AVATAR_NAMES[i]),
        owner,
        h('span.lb-tick', { html: ICONS.tick }));
      b.owner = owner;
      onTap(b, () => {
        if (b.disabled || b.classList.contains('mine')) return;
        store.set('avatar', i);
        ctx.client.setProfile({ avatar: i });
        b.animate([{ transform: 'scale(.9)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      }, { sound: 'select', buzz: 'select' });
      grid.append(b);
      return b;
    });

    // name: a place card you write on
    const input = h('input.lb-name-input', {
      type: 'text', maxLength: 10, placeholder: 'Your name', value: ctx.me?.name || '', autocomplete: 'off',
      autocapitalize: 'words', spellcheck: false, enterkeyhint: 'done', 'data-e2e': 'lobby-name', 'aria-label': 'Name on your place card',
    });
    const nameCount = h('span.lb-name-count');
    const thumbFor = (i) => (thumbs[i] ? h('img', { src: thumbs[i], alt: '', draggable: false }) : h('span', { html: avatarIcon(i) }));
    const commitName = () => {
      const v = input.value.trim();
      if (v && v !== ctx.me?.name) ctx.client.setProfile({ name: v });
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commitName(); input.blur(); } });
    input.addEventListener('change', commitName);
    input.addEventListener('blur', commitName);
    const updCount = () => { const n = input.value.length; nameCount.textContent = n >= 8 ? `${n}/10` : ''; };
    input.addEventListener('input', updCount);
    updCount();
    const nameCard = h('label.lb-namecard',
      h('span.lb-swatch', thumbFor(ctx.me?.avatar ?? 0)),
      h('span.lb-namecol', h('span.lb-name-label', 'Your place card'), input),
      h('span.lb-pen', { html: '<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.6L15.8 4.8a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.5 7l3.5 3.5" stroke="currentColor" stroke-width="1.8"/></svg>' }),
      nameCount);

    // seat count lives in the sheet header
    const seatsCount = h('span.lb-count');

    // host controls: two compact pills
    const adultPill = h('button.lb-pill.lb-switchpill', { type: 'button', role: 'switch', 'aria-checked': 'false' },
      h('span.lb-pill-txt', h('span.lb-pill-k', 'Adult table'), h('span.lb-pill-s', 'Clean words')), h('span.lb-switch', h('i')));
    onTap(adultPill, () => ctx.client.setSettings({ adult: !ctx.app.client.state.settings.adult }));
    const speakerPill = h('button.lb-pill', { type: 'button', 'aria-label': 'Choose which phone plays the music' },
      h('span.lb-pill-ic', { html: ICONS.speaker }), h('span.lb-pill-txt', h('span.lb-pill-k', 'Music from'), h('span.lb-pill-v')));
    onTap(speakerPill, () => {
      const ps = ctx.app.client.state.players;
      const i = ps.findIndex((p) => p.id === ctx.app.client.state.settings.speakerId);
      ctx.client.setSettings({ speakerId: ps[(i + 1) % ps.length].id });
    });
    const hostRow = h('div.lb-hostrow', adultPill, speakerPill);

    const startBtn = button('Start the show', { onClick: () => ctx.client.start(), e2e: 'start-show' });
    startBtn.classList.add('lb-start');
    const waitAv = h('span.lb-wait-av');
    const waitCard = h('div.lb-wait', waitAv,
      h('span.lb-wait-col', h('span.lb-wait-txt'), h('span.lb-wait-sub')),
      h('span.lb-dots', h('i'), h('i'), h('i')));
    const leave = h('button.lb-leave', { type: 'button' }, 'Leave');
    onTap(leave, () => ctx.actions.leave());

    sheet.classList.add('lb-sheet');
    sheet.append(...[
      h('div.lb-top', h('span.lb-title', 'Pick your seat'), seatsCount, h('span.lb-gap'), leave),
      grid,
      nameCard,
      ctx.isHost ? hostRow : null,
      h('div.lb-action', ctx.isHost ? startBtn : waitCard),
    ].filter(Boolean));

    // ---------- place cards over the 3D avatars ----------
    const tagEls = new Map();
    const emptyEls = Array.from({ length: MAX_PLAYERS }, () => {
      const e = h('span.lc-empty', h('i'));
      tagsLayer.append(e);
      return e;
    });
    const tmp = new THREE.Vector3();
    let shown = false;
    const placeTags = (c, dt = 0.016) => {
      const st = c.stage;
      if (!st?.avatarScreen) return;
      // Group photo: guests gather in a smile-shaped row in front of Cyril, with a gap for him in
      // the middle. They shuffle along (spring-ish lerp) to make room when someone new arrives.
      const order = c.players.map((p) => p.id);
      const slots = lobbySlots(order.length);
      const k = c.frozen ? 1 : Math.min(1, dt * 7);
      order.forEach((id, i) => {
        const s = st.seats?.get?.(id);
        if (!s) return;
        const [x, z] = slots[i];
        s.group.position.x += (x - s.group.position.x) * k;
        s.group.position.z += (z - s.group.position.z) * k;
        s.group.rotation.y += (-x * 0.35 - s.group.rotation.y) * k;
        const sc = s.group.scale.x;
        s.group.scale.setScalar(sc + (LOBBY_SCALE - sc) * k);
      });
      const cs = c.cyril?.group?.scale;
      if (cs) cs.setScalar(cs.x + (CYRIL_SCALE - cs.x) * k);
      const showH = show.clientHeight || 0;
      const showW = show.clientWidth || 390;
      // Place cards stand on the cloth in front of their guest. Greedy row packing: each card takes
      // the first row where it clears its left neighbour, so no card ever covers another's name.
      const items = [];
      order.forEach((id) => {
        const el = tagEls.get(id);
        const s = st.seats?.get?.(id);
        if (!el || !s) return;
        tmp.set(s.group.position.x, TABLE_Y, s.group.position.z);
        const p = st.project(tmp);
        if (!p || p.behind || p.y > showH + 40) { el.style.opacity = '0'; return; }
        const w = el.offsetWidth || 70;
        items.push({ el, w, x: Math.max(w / 2 + 6, Math.min(showW - w / 2 - 6, p.x)), y: p.y });
      });
      items.sort((a, b) => a.x - b.x);
      const rowEnd = [];
      for (const it of items) {
        // two rows; if both are blocked, nudge the card along the row with the most room
        let row = [0, 1].find((r) => rowEnd[r] == null || it.x - it.w / 2 >= rowEnd[r] + 4);
        if (row == null) {
          row = rowEnd[0] <= rowEnd[1] ? 0 : 1;
          it.x = Math.min(showW - it.w / 2 - 4, rowEnd[row] + 4 + it.w / 2);
        }
        rowEnd[row] = it.x + it.w / 2;
        it.el.style.opacity = '';
        it.el.style.zIndex = String(20 - row);
        it.el.style.transform = `translate(${it.x.toFixed(1)}px, ${(it.y - 6 + row * 23).toFixed(1)}px) translate(-50%, 0)`;
      }
      const n = c.players.length;
      emptyEls.forEach((el, i) => {
        if (i < n || c.reduced) { el.style.display = 'none'; return; }
        el.style.display = '';
        const free = FREE_SLOTS[i];
        tmp.set(free[0], TABLE_Y + 0.004, free[1]);
        const p = st.project(tmp);
        el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`;
      });
      if (!shown) { shown = true; tagsLayer.classList.add('on'); }
    };

    let lastCount = -1;
    let lastIds = new Set();
    const update = (c) => {
      const ps = c.players;
      const hostId = c.state?.hostId;
      const meId = c.meId;
      const taken = new Map(ps.map((p) => [p.avatar, p]));
      cells.forEach((cell, i) => {
        const owner = taken.get(i);
        const mine = owner?.id === meId;
        cell.classList.toggle('mine', mine);
        cell.classList.toggle('taken', !!owner && !mine);
        cell.setAttribute('aria-checked', String(mine));
        cell.disabled = !!owner && !mine;
        cell.owner.textContent = owner && !mine ? (owner.name.length > 5 ? owner.name : `${owner.name}\u2019s`) : '';
      });

      // place-card tags
      const ids = new Set(ps.map((p) => p.id));
      for (const [id, el] of tagEls) if (!ids.has(id)) { el.remove(); tagEls.delete(id); }
      ps.forEach((p) => {
        let el = tagEls.get(p.id);
        const colour = AVATARS[p.avatar]?.colour || '#7A4A2A';
        const key = `${p.name}|${p.avatar}|${p.id === hostId}|${p.id === meId}|${p.connected !== false}`;
        if (!el) {
          el = h('span.lc-tag');
          tagsLayer.append(el);
          tagEls.set(p.id, el);
          if (lastIds.size && !lastIds.has(p.id) && !c.frozen) el.classList.add('arrive');
        }
        if (el.dataset.key !== key) {
          el.dataset.key = key;
          el.style.setProperty('--pc', colour);
          el.classList.toggle('me', p.id === meId);
          el.classList.toggle('away', p.connected === false);
          el.replaceChildren(...[
            p.id === hostId ? h('span.lc-crown', { html: ICONS.crown }) : null,
            h('span.lc-tag-name', p.name),
          ].filter(Boolean));
        }
      });
      lastIds = ids;

      // name card swatch follows my avatar
      const me = ps.find((p) => p.id === meId);
      if (me) {
        nameCard.style.setProperty('--pc', AVATARS[me.avatar]?.colour || '#7A4A2A');
        const sw = nameCard.querySelector('.lb-swatch');
        if (sw.dataset.av !== String(me.avatar)) { sw.dataset.av = String(me.avatar); sw.replaceChildren(thumbFor(me.avatar)); }
        if (document.activeElement !== input && input.value !== me.name) { input.value = me.name; updCount(); }
      }

      const n = ps.length;
      seatsCount.textContent = `${n}/${MAX_PLAYERS} seated`;
      seatsCount.classList.toggle('warn', n < MIN_PLAYERS);

      // host controls
      const st = c.settings || {};
      adultPill.setAttribute('aria-checked', String(!!st.adult));
      adultPill.querySelector('.lb-pill-s').textContent = st.adult ? 'Filter off' : 'Clean words';
      const spk = ps.find((p) => p.id === st.speakerId);
      speakerPill.querySelector('.lb-pill-v').textContent = spk?.id === meId ? 'My phone' : (spk?.name || 'Nobody');

      startBtn.disabled = n < MIN_PLAYERS;
      startBtn.textContent = n < MIN_PLAYERS ? `Need ${MIN_PLAYERS - n} more for a party` : `Ring the bell \u00b7 ${n} at the table`;
      const host = ps.find((p) => p.id === hostId);
      waitCard.querySelector('.lb-wait-txt').textContent = n < MIN_PLAYERS
        ? `${MIN_PLAYERS - n} more guest${MIN_PLAYERS - n > 1 ? 's' : ''} needed`
        : `Waiting on ${host?.name || 'the host'}`;
      waitCard.querySelector('.lb-wait-sub').textContent = n < MIN_PLAYERS
        ? 'Share the code. Fold a napkin swan.'
        : 'They\u2019ll ring the bell. Sit tight.';
      if (host && waitAv.dataset.av !== String(host.avatar)) {
        waitAv.dataset.av = String(host.avatar);
        waitAv.style.setProperty('--pc', AVATARS[host.avatar]?.colour || '#7A4A2A');
        waitAv.replaceChildren(thumbFor(host.avatar));
      }

      if (n !== lastCount) {
        const arrived = lastCount >= 0 && n > lastCount ? ps[ps.length - 1] : null;
        if (arrived) c.audio.sfx('join');
        lastCount = n;
        const line = n >= MAX_PLAYERS ? c.line('lobbyFull')
          : arrived && arrived.id !== meId ? [joinLine(arrived)]
            : n < MIN_PLAYERS ? c.line('lobbyWaiting')
              : c.isHost ? ['A proper table at last. Ring the bell when you\'re ready.']
                : [`We're waiting on ${host?.name || 'the host'}. No pressure. Some pressure.`];
        c.say(line, { hold: 4000, placement: 'above', compact: true });
      }
    };
    update(ctx);
    return {
      update,
      frame: (c, dt) => placeTags(c, dt),
      unmount: () => {
        ctx.cyril?.group?.scale.setScalar(1);
        for (const s of ctx.stage.seats?.values?.() || []) {
          s.group.scale.setScalar(1);
          if (s.home) { s.group.position.x = s.home.x; s.group.position.z = s.home.z; }
          if (s.seat != null) s.group.rotation.y = -seatAngle(s.seat);
        }
      },
    };
  },
};
