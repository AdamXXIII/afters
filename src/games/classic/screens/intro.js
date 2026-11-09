// intro: "Tonight's menu". A letterpress menu card lists the three courses (each in its round colour)
// and tonight's table in handwriting, while Cyril, standing on his brass holder with an engraved
// nameplate, welcomes the table in two bubbles. Timeline is driven by ctx.elapsed() so every phone
// (and frozen screenshots) shows the same beat.
import './intro.css';
import * as THREE from 'three';
import { h, onTap } from '../../../ui/components.js';
import { AVATARS } from '../../../game/constants.js';
import { SHOTS } from '../../../stage/Stage.js';
import { seatAngle } from '../../../stage/props.js';
import { sayLater } from '../../../screens/common.js';

SHOTS['intro-host'] ||= { pos: [0, 0.4, 2.3], target: [0, 0.6, 0] };

const COURSES = [
  { n: 'I', name: 'Plate Up', what: 'Two answers enter. One leaves.', round: 1 },
  { n: 'II', name: 'Porkies', what: 'Lie beautifully about a true fact.', round: 2 },
  { n: 'III', name: 'Last Orders', what: 'Quickfire, then swipe to judge.', round: 3 },
];

/** "Alex, Sam & Gus" as nodes, with this phone's own name circled in red ink. */
function listNames(players, meId) {
  const out = [];
  players.forEach((p, i) => {
    if (i > 0) out.push(i === players.length - 1 ? '\u00a0&\u00a0' : ', ');
    out.push(p.id === meId ? h('span.in-me', p.name) : p.name);
  });
  return out;
}

/** Start a CSS animation at the right point of the shared timeline (negative delay = already playing). */
function beat(el, atMs, elapsed) {
  el.style.animationDelay = `${Math.round(atMs - elapsed)}ms`;
  return el;
}

export default {
  id: 'intro',
  layout: 'show',
  shot: 'intro-host',
  shotDuration: 1200,
  mount({ show }, ctx) {
    const e = ctx.elapsed();
    const names = ctx.players.map((p) => p.name);

    const courses = COURSES.map((c, i) => beat(h('li.in-course', { style: { '--round': `var(--round-${c.round})` } },
      h('span.in-num', c.n),
      h('span.in-cbody', h('span.in-cname', c.name), h('span.in-cwhat', c.what)),
    ), 1150 + i * 220, e));
    let thumbs = [];
    try { thumbs = ctx.stage.thumbnails(160); } catch { /* fine without */ }
    const faces = h(`div.in-faces${ctx.players.length > 6 ? '.many' : ''}`, ctx.players.map((p, i) => beat(h('span.in-face', { style: { '--pc': AVATARS[p.avatar]?.colour || '#7A4A2A' } },
      thumbs[p.avatar] ? h('img', { src: thumbs[p.avatar], alt: '' }) : null), 1800 + i * 60, e)));


    const countdown = h('div.in-count');
    const menu = beat(h('div.in-menu', { role: 'group', 'aria-label': 'Tonight\'s menu' },
      h('div.in-eyebrow', h('i'), 'Three courses of comedy', h('i')),
      countdown,
      h('div.in-title', 'Tonight\'s menu'),
      h('ol.in-courses', courses),
      beat(h('div.in-table', h('span.in-table-k', 'Tonight\'s table'), faces, h(`span.in-table-v${names.join(', ').length > 30 ? '.long' : ''}`, listNames(ctx.players, ctx.meId))), 1750, e),
    ), 650, e);

    const plate = beat(h('div.in-plate', h('span.in-plate-k', 'Your host'), h('span.in-plate-v', 'Cyril Waxley')), 200, e);
    show.append(h('div.in-wrap', menu), plate);

    // host can move things along once the menu has landed
    let skip = null;
    if (ctx.isHost) {
      skip = h('button.in-skip', { type: 'button' }, 'Let\u2019s eat', h('span', { html: '<svg viewBox="0 0 16 16"><path d="M5 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' }));
      onTap(skip, () => ctx.client.skip());
      show.append(skip);
    }

    ctx.cyril.react('delight');

    // Tonight's table, in 3D: the guests gather either side of Cyril (two little rows each side),
    // so the faces on the menu are also sitting at the table. Restored to their seats on unmount.
    const flank = (n) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const k = Math.floor(i / 2);              // 0..3 per side
        const back = k % 2 === 1;
        const x = side * (0.26 + Math.floor(k / 2) * 0.1 + (back ? 0.05 : 0));
        out.push([x, back ? -0.22 : -0.02]);
      }
      return out;
    };
    const spots = flank(ctx.players.length);
    const seatGuests = (c, dt) => {
      const st = c.stage;
      const kk = c.frozen ? 1 : Math.min(1, dt * 5);
      c.players.forEach((p, i) => {
        const s = st.seats?.get?.(p.id);
        if (!s) return;
        const [x, z] = spots[i];
        s.group.position.x += (x - s.group.position.x) * kk;
        s.group.position.z += (z - s.group.position.z) * kk;
        s.group.rotation.y += (-x * 1.2 - s.group.rotation.y) * kk;
        const sc = s.group.scale.x;
        s.group.scale.setScalar(sc + (0.85 - sc) * kk);
      });
    };

    // the nameplate is screwed to the front of Cyril's brass holder
    const tmp = new THREE.Vector3();
    const place = (c) => {
      const g = c.cyril?.group;
      if (!g || !c.stage.project) return;
      const p = c.stage.project(g.localToWorld(tmp.set(0, 0.0, 0.13)));
      const y = Math.min((show.clientHeight || 844) - 52, p.y - 30);
      plate.style.left = `${p.x.toFixed(1)}px`;
      plate.style.top = `${y.toFixed(1)}px`;
    };
    place(ctx);
    const cancel = sayLater(ctx, ctx.line(ctx.payload.first === false ? 'introAgain' : 'intro'), { delay: 250, hold: 2000, placement: 'above' });
    const frame = (c, dt = 0.016) => {
      place(c);
      seatGuests(c, dt);
      const left = Math.max(1, Math.ceil((c.remaining?.() ?? 0) / 1000));
      const txt = `First course in ${left}`;
      if (countdown.textContent !== txt) countdown.textContent = txt;
      if (skip) skip.classList.toggle('on', c.elapsed() > 3000 / (c.phase?.speed || 1));
    };
    frame(ctx);
    return {
      frame,
      unmount: () => {
        cancel();
        for (const s of ctx.stage.seats?.values?.() || []) {
          s.group.scale.setScalar(1);
          if (s.home) { s.group.position.x = s.home.x; s.group.position.z = s.home.z; }
          if (s.seat != null) s.group.rotation.y = -seatAngle(s.seat);
        }
      },
    };
  },
};
