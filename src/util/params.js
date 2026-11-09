// URL parameters. All optional. See ARCHITECTURE.md "URL parameters".
const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

function num(name, def) {
  const v = q.get(name);
  if (v === null || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function bool(name, def = false) {
  const v = q.get(name);
  if (v === null) return def;
  return v === '' || v === '1' || v === 'true' || v === 'yes';
}

export const params = {
  demo: q.get('demo') || null,            // screen id to jump to
  seed: num('seed', 0) >>> 0 || null,     // determinism
  players: Math.max(3, Math.min(8, num('players', 5))),
  me: q.get('me') === 'guest' ? 'guest' : 'host',
  freeze: bool('freeze'),                 // stop timers / engine for screenshots
  t: q.has('t') ? num('t', 0) : null,     // frozen elapsed ms within the phase
  bots: Math.max(0, Math.min(7, num('bots', 0))),
  autoplay: bool('autoplay'),             // local player plays itself (+ host auto-starts)
  autopilot: bool('autopilot'),           // local player plays itself in-game only
  speed: Math.max(0.1, num('speed', 1)),  // divides every phase duration (tests)
  room: (q.get('room') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || null,
  name: q.get('name') || null,
  transport: q.get('transport') || 'auto', // auto | peer | local
  signal: q.get('signal') || null,         // host:port of a PeerJS server (tests)
  quality: q.get('quality') || 'auto',     // auto | low | high
  fps: num('fps', 0),                      // cap render rate (0 = uncapped; automation defaults to 4)
  nosw: bool('nosw'),
  e2e: bool('e2e'),
  debug: bool('debug'),
};
