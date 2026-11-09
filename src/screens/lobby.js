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
SHOTS['lobby-seats'] ||= { pos: [0, 0.45, 2.5], target: [0, 0.4, -0.6] };

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
      h('div.lc-head', h('span.lc-eyebrow', 'Table code'), h('span.lc-hint', 'Tap to copy')),
      h('div.lc-row', tiles, invite),
    );
    const tagsLayer = h('div.lc-tags', { 'aria-hidden': 'true' });
    show.append(tagsLayer, placard);

    // ---------- sheet ----------
    let thumbs = [];
    try { thumbs = ctx.stage.thumbnails(160); } catch (e) { console.warn('thumbs', e); }
    const grid = h('div.lb-grid', { role: 'radiogroup', 'aria-label': 'Pick your seat' });
    const cells = AVATARS.map((a, i) => {
      const owner = h('span.lb-owner');
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
    const commitName = () => {
      const v = input.value.trim();
      if (v && v !== ctx.me?.name) ctx.client.setProfile({ name: v });
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commitName(); input.blur(); } });
    input.addEventListener('change', commitName);
    input.addEventListener('blur', commitName);
    const updCount = () => { nameCount.textContent = `${input.value.length}/10`; };
    input.addEventListener('input', updCount);
    updCount();
    const nameCard = h('label.lb-namecard',
      h('span.lb-swatch', { html: avatarIcon(ctx.me?.avatar ?? 0) }),
      h('span.lb-namecol', h('span.lb-name-label', 'Your place card'), input),
      h('span.lb-pen', { html: '<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.6L15.8 4.8a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M13.5 7l3.5 3.5" stroke="currentColor" stroke-width="1.8"/></svg>' }),
      nameCount);

    // the 8-seat tally
    const seatsLabel = h('span.lb-seats-count');
    const seatsNote = h('span.lb-seats-note');
    const seatsRow = h('div.lb-seats');
    const seatEls = Array.from({ length: MAX_PLAYERS }, () => h('span.lb-seat'));
    seatsRow.append(...seatEls);
    const seatsBox = h('div.lb-seatsbox', h('div.lb-seats-head', seatsLabel, seatsNote), seatsRow);

    // host controls: two compact pills
    const adultPill = h('button.lb-pill', { type: 'button', 'aria-pressed': 'false' }, h('span.lb-pill-k', 'Adult table'), h('span.lb-pill-v'));
    onTap(adultPill, () => ctx.client.setSettings({ adult: !ctx.app.client.state.settings.adult }));
    const speakerPill = h('button.lb-pill', { type: 'button' }, h('span.lb-pill-ic', { html: ICONS.speaker }), h('span.lb-pill-k', 'Music from'), h('span.lb-pill-v'));
    onTap(speakerPill, () => {
      const ps = ctx.app.client.state.players;
      const i = ps.findIndex((p) => p.id === ctx.app.client.state.settings.speakerId);
      ctx.client.setSettings({ speakerId: ps[(i + 1) % ps.length].id });
    });
    const hostRow = h('div.lb-hostrow', adultPill, speakerPill);

    const startBtn = button('Start the show', { onClick: () => ctx.client.start(), e2e: 'start-show' });
    startBtn.classList.add('lb-start');
    const waitCard = h('div.lb-wait', h('span.lb-wait-flame', { html: ICONS.flame }), h('span.lb-wait-txt'), h('span.lb-dots', h('i'), h('i'), h('i')));
    const leave = h('button.lb-leave', { type: 'button' }, 'Leave');
    onTap(leave, () => ctx.actions.leave());

    sheet.classList.add('lb-sheet');
    sheet.append(...[
      h('div.lb-top', h('span.lb-title', 'Pick your seat'), leave),
      grid,
      nameCard,
      seatsBox,
      ctx.isHost ? hostRow : null,
      h('div.lb-action', ctx.isHost ? startBtn : waitCard),
    ].filter(Boolean));

    // ---------- place cards over the 3D avatars ----------
    const tagEls = new Map();
    const emptyEls = Array.from({ length: MAX_PLAYERS }, () => {
      const e = h('span.lc-empty', h('span.lc-empty-ring'));
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
      const showH = show.clientHeight || 0;
      const n2 = order.length;
      order.forEach((id, i) => {
        const el = tagEls.get(id);
        if (!el) return;
        const s = st.seats?.get?.(id);
        if (!s) return;
        tmp.set(s.group.position.x, TABLE_Y, s.group.position.z);
        const p = st.project(tmp);
        if (!p || p.behind || p.y > showH + 40) { el.style.opacity = '0'; return; }
        el.style.opacity = '';
        // a place card standing on the cloth in front of its guest; two staggered rows when crowded
        const drop = n2 > 4 && (i % 2 === 1) ? 30 : 0;
        const half = (el.offsetWidth || 70) / 2;
        const x = Math.max(half + 6, Math.min((show.clientWidth || 390) - half - 6, p.x));
        el.style.transform = `translate(${x.toFixed(1)}px, ${(p.y + 2 + drop).toFixed(1)}px) translate(-50%, 0)`;
      });
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
        cell.owner.textContent = owner && !mine ? owner.name : '';
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
        if (sw.dataset.av !== String(me.avatar)) { sw.dataset.av = String(me.avatar); sw.innerHTML = avatarIcon(me.avatar); }
        if (document.activeElement !== input && input.value !== me.name) { input.value = me.name; updCount(); }
      }

      // seat tally
      seatEls.forEach((el, i) => {
        const p = ps[i];
        el.classList.toggle('filled', !!p);
        el.classList.toggle('needed', !p && i < MIN_PLAYERS);
        el.style.setProperty('--pc', p ? (AVATARS[p.avatar]?.colour || '#7A4A2A') : '');
        const k = p ? `${p.id}|${p.avatar}` : (i < MIN_PLAYERS ? 'need' : 'free');
        if (el.dataset.k !== k) {
          el.dataset.k = k;
          el.innerHTML = p ? avatarIcon(p.avatar) : '';
          el.title = p ? p.name : 'Free seat';
          if (p && lastCount >= 0 && !c.frozen) el.animate([{ transform: 'scale(.4)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        }
      });
      const n = ps.length;
      seatsLabel.textContent = `${n} of ${MAX_PLAYERS} seats taken`;
      seatsNote.textContent = n < MIN_PLAYERS ? `${MIN_PLAYERS - n} more to start` : n >= MAX_PLAYERS ? 'Table full' : 'Room for more';
      seatsNote.classList.toggle('warn', n < MIN_PLAYERS);

      // host controls
      const st = c.settings || {};
      adultPill.setAttribute('aria-pressed', String(!!st.adult));
      adultPill.querySelector('.lb-pill-v').textContent = st.adult ? 'On' : 'Off';
      const spk = ps.find((p) => p.id === st.speakerId);
      speakerPill.querySelector('.lb-pill-v').textContent = spk?.id === meId ? 'My phone' : (spk?.name || 'Nobody');

      startBtn.disabled = n < MIN_PLAYERS;
      startBtn.textContent = n < MIN_PLAYERS ? `Need ${MIN_PLAYERS - n} more to start` : `Start the show · ${n} guests`;
      const host = ps.find((p) => p.id === hostId);
      waitCard.querySelector('.lb-wait-txt').textContent = n < MIN_PLAYERS
        ? `Waiting for ${MIN_PLAYERS - n} more guest${MIN_PLAYERS - n > 1 ? 's' : ''}`
        : `${host?.name || 'The host'} starts the show`;

      if (n !== lastCount) {
        if (lastCount >= 0 && n > lastCount) c.audio.sfx('join');
        lastCount = n;
        c.say(c.line(n >= MAX_PLAYERS ? 'lobbyFull' : n < MIN_PLAYERS ? 'lobbyWaiting' : 'lobbyReady'), { hold: 4000, placement: 'above', compact: true });
      }
    };
    update(ctx);
    return {
      update,
      frame: (c, dt) => placeTags(c, dt),
      unmount: () => {
        for (const s of ctx.stage.seats?.values?.() || []) {
          s.group.scale.setScalar(1);
          if (s.home) { s.group.position.x = s.home.x; s.group.position.z = s.home.z; }
          if (s.seat != null) s.group.rotation.y = -seatAngle(s.seat);
        }
      },
    };
  },
};
