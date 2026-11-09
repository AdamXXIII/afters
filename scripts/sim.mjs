// Headless full-game simulation in Node: host engine + N bots over LocalTransport.
// usage: node scripts/sim.mjs [players=5] [speed=50] [game=classic]
// lobby -> menu (host bot picks the game) -> full game -> end; then checks tonight's table.
import { openHostRoom } from '../src/game/hostRoom.js';
import { LocalTransport } from '../src/net/LocalTransport.js';
import { createBot } from '../src/bots.js';

const N = Number(process.argv[2] || 5);
const speed = Number(process.argv[3] || 50);
const room = await openHostRoom({ makeTransports: () => [new LocalTransport({ role: 'host' })], code: 'SIMM', seed: 42, speed, tickMs: 10 });
const bots = [];
for (let i = 0; i < N; i++) {
  if (i === 0) {
    // first bot is the "host phone" player
    const t = new LocalTransport({ role: 'client' });
    room.engine.setHostPeer(t.id);
    bots.push(await createBot({ code: 'SIMM', index: i, seed: 42, speed, makeTransport: () => t, chooser: true, game: process.argv[4] || 'classic' }));
  } else bots.push(await createBot({ code: 'SIMM', index: i, seed: 42, speed }));
}
const seen = [];
bots[0].client.on('phase', (p) => seen.push(p.id));
const t0 = Date.now();
bots[0].client.start();
await new Promise((resolve, reject) => {
  const iv = setInterval(() => {
    const id = room.engine.phase.id;
    if (id === 'end' || id === 'results') { clearInterval(iv); resolve(); }
    if (Date.now() - t0 > 120000) { clearInterval(iv); reject(new Error('timeout in ' + id)); }
  }, 20);
});
const rows = room.engine.publicPlayers().sort((a, b) => b.score - a.score);
console.log('phases:', seen.join(' > '));
console.log('final:', rows.map((r) => `${r.name}:${r.score} (night ${r.night})`).join(', '));
if (!seen.includes('menu')) throw new Error('never saw the menu');
if (!rows.some((r) => r.night > 0)) throw new Error('tonight\'s table not updated');
console.log(`ok in ${Date.now() - t0} ms`);
room.close();
process.exit(0);
