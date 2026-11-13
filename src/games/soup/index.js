// Something in the Soup: hidden traitors at the dinner table. Secret Poisoners, a day task that
// grows a shared pot, a round table and a banish vote, a night that looks the same on every phone,
// and a final table: share the pot or banish again. Rules + screens: ./DESIGN.md.
// AI-generated (Claude, Soup team, 2026-11-13).
import { SoupHost } from './host.js';
import { LINES } from './content/lines.js';

const role = (ph) => ph.private?.role;
const isAlive = (ph, me) => (ph.payload?.alive || []).includes(me);
const others = (ph, me) => (ph.payload?.alive || []).filter((id) => id !== me);
const pick = (list, rng) => list[Math.floor(rng() * list.length)];

/** Demo helper: make the demo phone a Poisoner (or Faithful) whatever the seed says. */
const forceRole = (e, me, r) => {
  const h = e.game?.host;
  if (!h || h._forced) return;
  h._forced = true;
  const ids = Object.keys(h.roles);
  const pois = ids.filter((id) => h.roles[id] === 'poisoner');
  if (r === 'poisoner' && h.roles[me] !== 'poisoner') { h.roles[pois[0]] = 'faithful'; h.roles[me] = 'poisoner'; }
  if (r === 'faithful' && h.roles[me] === 'poisoner') { const f = ids.find((id) => h.roles[id] === 'faithful' && id !== me); h.roles[f] = 'poisoner'; h.roles[me] = 'faithful'; }
};
/** Demo helper: keep the demo phone alive (bots never vote for or poison it) by making it Faithful + shielded. */
const keepMe = (e, me) => { const h = e.game?.host; if (h?.shields && h.alive?.has(me)) h.shields.add(me); };
const task = (kind) => (e, me) => {
  if (e.game?.host) { e.game.host.demoTask = kind; keepMe(e, me); }
  return e.phase.id === 'soup-task' && e.phase.payload.kind === kind;
};

export default {
  id: 'soup',
  title: 'Something in the Soup',
  dish: 'cloche',
  course: 'A tureen, and a question nobody wants to ask',
  hint: 'Find the Poisoners',
  tagline: 'One of you is poisoning the soup.',
  blurb: 'Secret Poisoners sit among you. Grow the pot by day, banish a suspect at the round table, and pray you wake up in the morning.',
  players: [4, 8],
  minutes: 10,
  steps: [
    'One or two of you are secretly Poisoners. The rest are Faithful.',
    'By day, grow the pot, argue, then vote someone away from the table.',
    'By night, the Poisoners strike. Last ones standing share the pot, unless a Poisoner is among them.',
  ],
  hasAdult: true,
  colour: '#7A1E2C',
  tags: ['Bluffing', 'Secret roles', 'Voting'],
  createHost: (api) => new SoupHost(api),
  screens: () => import('./screens/index.js'),
  lines: LINES,

  bot({ ph, client, later, rand, rng, still, mode }) {
    const me = client.state.me;
    const p = ph.payload || {};
    const mine = () => client.state.mine.game || {};
    const alive = isAlive(ph, me);
    const pois = role(ph) === 'poisoner';
    const partners = ph.private?.partners || [];
    switch (ph.id) {
      case 'soup-roles':
        later(rand(1500, 5000), () => { if (still()) client.act('sp-seen', {}, { seen: true }); });
        return true;
      case 'soup-task': {
        if (!alive) return true;
        if (p.kind === 'spoons') {
          const idx = p.alive.indexOf(me);
          const n = p.alive.length;
          let v = Math.floor(p.target / n) + (idx < p.target % n ? 1 : 0);
          if (pois && rng() < 0.6) v += rng() < 0.5 ? -1 : 1;
          if (!pois && rng() < 0.15) v += 1; // honest muddle
          v = Math.max(0, Math.min(5, v));
          later(rand(3000, 12000), () => { if (still() && mine().n === undefined) client.act('sp-spoons', { n: v }, { n: v, sent: true }); });
        } else if (p.kind === 'code') {
          // bots "hear" most digits right; a Poisoner fluffs one on purpose
          const code = Array.from({ length: p.length }, (_, i) => (i === ph.private?.slot ? ph.private.digit : Math.floor(rng() * 10)));
          later(rand(5000, 15000), () => { if (still() && !mine().code) client.act('sp-code', { code: code.join('') }, { code: code.join(''), sent: true }); });
        } else if (p.kind === 'parcel' && mode !== 'instant') {
          let lastN = -1;
          const loop = () => {
            if (!still()) return;
            const pr = client.state.progress || {};
            if (pr.holder === me && pr.n !== lastN) {
              lastN = pr.n;
              const slow = pois && rng() < 0.35;
              later(slow ? 2600 : rand(350, 1500), () => { if (still() && client.state.progress?.n === lastN) client.act('sp-pass', { n: lastN }); });
            } else if (pr.holder !== me && rng() < 0.01) client.act('sp-pass', { n: pr.n }); // butterfingers
            later(150, loop);
          };
          later(300, loop);
        }
        return true;
      }
      case 'soup-table': {
        if (!alive) return true;
        const cands = others(ph, me).filter((id) => !partners.includes(id));
        if (!cands.length) return true;
        const n = mode === 'instant' ? 1 : 1 + Math.floor(rng() * 3);
        for (let i = 0; i < n; i++) later(mode === 'instant' ? 0 : rand(2000, 25000), () => { if (still()) { const to = pick(cands, rng); client.act('sp-point', { to }, { point: to }); } });
        later(mode === 'instant' ? 0 : rand(15000, 40000), () => { if (still()) client.act('sp-ready', { on: true }, { ready: true }); });
        return true;
      }
      case 'soup-vote': {
        if (!alive) {
          if ((p.seanceLeft || []).includes(me) && rng() < 0.3) {
            later(rand(2000, 8000), () => { if (still()) { const to = pick(p.alive, rng); client.act('sp-seance', { to }, { seance: to }); } });
          }
          return true;
        }
        const pts = client.state.progress?.points || {};
        let cands = others(ph, me).filter((id) => !partners.includes(id));
        if (!cands.length) cands = others(ph, me);
        // herd a little: favour whoever was pointed at most
        const score = (id) => Object.values(pts).filter((t) => t === id).length + rng() * 1.5;
        const to = cands.sort((a, b) => score(b) - score(a))[0];
        later(rand(2500, 10000), () => { if (still() && to && !mine().vote) client.act('sp-vote', { to }, { vote: to }); });
        return true;
      }
      case 'soup-night': {
        if (!alive) return true;
        const cands = others(ph, me).filter((id) => !partners.includes(id));
        later(rand(1500, 7000), () => { if (still() && cands.length && !mine().night) { const to = pick(cands, rng); client.act('sp-night', { to }, { night: to }); } });
        return true;
      }
      case 'soup-final': {
        if (!alive) return true;
        const choice = pois ? 'share' : (rng() < 0.65 ? 'share' : 'banish');
        later(rand(2000, 9000), () => { if (still() && !mine().choice) client.act('sp-final', { choice }, { choice }); });
        return true;
      }
      default:
        return false;
    }
  },

  demos: {
    'soup-intro': { match: (e) => e.phase.id === 'soup-intro', t: 3000 },
    'soup-roles': { match: (e, me) => { forceRole(e, me, 'faithful'); return e.phase.id === 'soup-roles'; }, me: 'idle', bots: 'some', t: 3000 },
    'soup-roles-poisoner': { match: (e, me) => { forceRole(e, me, 'poisoner'); return e.phase.id === 'soup-roles'; }, me: 'idle', bots: 'some', t: 3000 },
    'soup-task-spoons': { match: task('spoons'), me: 'idle', bots: 'some', t: 8000 },
    'soup-task-code': { match: task('code'), me: 'idle', bots: 'some', t: 8000 },
    'soup-task-parcel': { match: task('parcel'), me: 'idle', bots: 'act', t: 6000 },
    'soup-result': { match: (e, me) => { keepMe(e, me); return e.phase.id === 'soup-result'; }, t: 3500 },
    'soup-table': { match: (e, me) => { keepMe(e, me); return e.phase.id === 'soup-table'; }, me: 'idle', bots: 'act', t: 30000 },
    'soup-vote': { match: (e, me) => { keepMe(e, me); return e.phase.id === 'soup-vote'; }, me: 'idle', bots: 'some', t: 9000 },
    'soup-banish': { match: (e, me) => { keepMe(e, me); return e.phase.id === 'soup-banish'; }, t: (ph) => ph.payload.roleAt + 900 },
    'soup-night': { match: (e, me) => { keepMe(e, me); return e.phase.id === 'soup-night'; }, me: 'idle', bots: 'some', t: 6000 },
    'soup-morning': { match: (e, me) => { keepMe(e, me); return e.phase.id === 'soup-morning' && !!e.phase.payload.victim; }, t: 4200 },
    'soup-ghost': {
      match: (e, me) => {
        const h = e.game?.host;
        forceRole(e, me, 'faithful');
        if (h?.alive && e.phase.id === 'soup-result' && h.alive.has(me)) { h.alive.delete(me); h.ghosts.push({ id: me, how: 'poisoned', day: 1, role: 'faithful' }); }
        return e.phase.id === 'soup-vote' && !!h?.alive && !h.alive.has(me);
      },
      me: 'idle', bots: 'some', t: 6000,
    },
    'soup-final': { match: (e, me) => { keepMe(e, me); return e.phase.id === 'soup-final' && e.game.host.alive.has(me); }, me: 'idle', bots: 'some', t: 8000 },
    'soup-final-reveal': { match: (e) => e.phase.id === 'soup-final-reveal', t: (ph) => ph.payload.verdictAt + 900 },
    'soup-end': { match: (e) => e.phase.id === 'soup-end', t: 6000 },
  },
};
