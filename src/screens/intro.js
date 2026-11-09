// intro: "Tonight's menu". A letterpress menu card lists the three courses (each in its round colour)
// and tonight's table in handwriting, while Cyril, standing on his brass holder with an engraved
// nameplate, welcomes the table in two bubbles. Timeline is driven by ctx.elapsed() so every phone
// (and frozen screenshots) shows the same beat.
import './intro.css';
import * as THREE from 'three';
import { h } from '../ui/components.js';
import { SHOTS } from '../stage/Stage.js';
import { sayLater } from './common.js';

SHOTS['intro-host'] ||= { pos: [0, 0.4, 2.3], target: [0, 0.6, 0] };

const COURSES = [
  { n: 'I', name: 'Plate Up', what: 'Two answers enter. One leaves.', round: 1 },
  { n: 'II', name: 'Porkies', what: 'Fib about a true, odd fact.', round: 2 },
  { n: 'III', name: 'Last Orders', what: 'Quickfire answers, then swipe.', round: 3 },
];

function listNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')}\u00a0&\u00a0${names[names.length - 1]}`;
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
    ), 650 + i * 260, e));

    const menu = beat(h('div.in-menu', { role: 'group', 'aria-label': 'Tonight\'s menu' },
      h('div.in-eyebrow', h('i'), 'Three courses of comedy', h('i')),
      h('div.in-title', 'Tonight\'s menu'),
      h('ol.in-courses', courses),
      beat(h('div.in-table', h('span.in-table-k', 'Tonight\'s table'), h(`span.in-table-v${names.join(', ').length > 30 ? '.long' : ''}`, listNames(names))), 1500, e),
    ), 0, e);

    const plate = beat(h('div.in-plate', h('span.in-plate-k', 'Your host'), h('span.in-plate-v', 'Cyril Waxley')), 350, e);
    show.append(h('div.in-wrap', menu), plate);

    ctx.cyril.react('delight');

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
    const cancel = sayLater(ctx, ctx.line('intro'), { delay: 700, hold: 2000, placement: 'above' });
    return { frame: (c) => place(c), unmount: cancel };
  },
};
