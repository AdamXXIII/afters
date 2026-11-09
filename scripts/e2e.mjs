// End-to-end: 1 host phone + 2 player phones (separate browser contexts) over the real PeerJS
// transport against a local `peer` signalling server. The host plays through the UI (types, taps);
// players use autopilot. Plays a full game to the podium + end, then "Same again". Fails on any
// console error or page error.
// usage: node scripts/e2e.mjs [--speed 6] [--headed] [--keep-shots <dir>]
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PeerServer } from 'peer';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const SPEED = Number(opt('--speed', 6));
const SHOTS = opt('--keep-shots', null);

const dist = path.join(root, 'dist');
if (!existsSync(path.join(dist, 'index.html'))) { console.error('dist/ missing: run npm run build first'); process.exit(1); }

const log = (...a) => console.log(`[e2e ${(performance.now() / 1000).toFixed(1)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. signalling + static server
const PEER_PORT = 9000 + Math.floor(Math.random() * 500);
const peerServer = PeerServer({ port: PEER_PORT, host: '127.0.0.1', path: '/' });
await sleep(300);
const web = await serve(dist);
const SIGNAL = `127.0.0.1:${PEER_PORT}`;
const common = `transport=peer&signal=${SIGNAL}&speed=${SPEED}&e2e=1&seed=11`;

const browser = await chromium.launch({
  headless: !argv.includes('--headed'),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--disable-features=WebRtcHideLocalIpsWithMdns', '--autoplay-policy=no-user-gesture-required'],
});

const errors = [];
async function phone(label) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${label}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${label}: pageerror ${e.message}`));
  return { label, context, page };
}
const api = (p, expr) => p.page.evaluate(expr);
const waitFor = (p, fn, arg, timeout = 30000) => p.page.waitForFunction(fn, arg, { timeout, polling: 100 });

let ok = false;
try {
  // 2. host opens a table through the UI
  const host = await phone('host');
  await host.page.goto(`${web.url}/?${common}`);
  await waitFor(host, () => window.__afters?.ready);
  await host.page.click('[data-e2e=start-table]');
  await host.page.fill('[data-e2e=name-input]', 'Hosty');
  await host.page.click('[data-e2e=open-table]');
  await waitFor(host, () => window.__afters.screen === 'lobby');
  const code = await api(host, () => window.__afters.room);
  log('host opened table', code);

  // 3. two players join through the UI (code prefilled from ?room=)
  const players = [];
  for (const name of ['Pip', 'Quin']) {
    const p = await phone(name);
    await p.page.goto(`${web.url}/?room=${code}&${common}`);
    await waitFor(p, () => window.__afters?.ready && window.__afters.screen === 'join');
    log(name, 'page ready');
    await p.page.fill('[data-e2e=name-input]', name);
    await p.page.click('[data-e2e=take-seat]');
    await waitFor(p, () => window.__afters.screen === 'lobby');
    log(name, 'joined');
    players.push(p);
  }
  await waitFor(host, () => window.__afters.players.length === 3);
  for (const p of players) await api(p, () => window.__afters.autopilot(true));

  // 4. host starts the show
  await host.page.click('[data-e2e=start-show]');
  log('show started');

  // 5. host plays through the UI until the end screen
  const seen = new Set();
  const t0 = Date.now();
  let typed = 0;
  for (;;) {
    if (Date.now() - t0 > 240000) throw new Error(`timeout; host stuck on ${await api(host, () => window.__afters.screen)}`);
    const screen = await api(host, () => window.__afters.screen);
    if (!seen.has(screen)) {
      seen.add(screen);
      log('host screen:', screen);
      if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await host.page.screenshot({ path: path.join(SHOTS, `${String(seen.size).padStart(2, '0')}-${screen}.png`) }); }
    }
    if (screen === 'end') break;
    const page = host.page;
    try {
      if (screen === 'r1-write' || screen === 'r2-write' || screen === 'r3-write') {
        const input = page.locator('[data-e2e=answer-input]:not([disabled])').first();
        const btn = page.locator('[data-e2e=submit]:not([disabled])').first();
        if (await input.count() && await btn.count()) {
          await input.fill(`e2e answer ${++typed}`);
          await btn.click({ timeout: 1000 });
        }
      } else if (screen === 'r1-vote') {
        const b = page.locator('[data-e2e=vote-A]');
        if (await b.count() && (await b.getAttribute('aria-pressed')) !== 'true') await b.click({ timeout: 1000 });
      } else if (screen === 'r2-pick') {
        const b = page.locator('[data-e2e=pick]').first();
        if (await b.count() && (await b.getAttribute('aria-pressed')) !== 'true') await b.click({ timeout: 1000 });
      } else if (screen === 'r3-swipe') {
        const b = page.locator('[data-e2e=cheers]:not([disabled])');
        if (await b.count()) await b.click({ timeout: 1000 });
      } else if (/intro$/.test(screen)) {
        // let it play
      }
    } catch { /* screen changed under us; carry on */ }
    await sleep(250);
  }
  const must = ['intro', 'r1-intro', 'r1-write', 'r1-vote', 'r1-reveal', 'r1-scores', 'r2-intro', 'r2-write', 'r2-pick', 'r2-reveal', 'r2-scores', 'r3-intro', 'r3-write', 'r3-swipe', 'r3-reveal', 'podium', 'end'];
  const missing = must.filter((s) => !seen.has(s));
  if (missing.length) throw new Error(`host never showed: ${missing.join(', ')}`);

  // 6. everyone reached the end
  for (const p of players) await waitFor(p, () => window.__afters.phase === 'end', null, 20000);
  const scores = await api(host, () => window.__afters.players.map((p) => `${p.name}:${p.score}`).join(', '));
  log('final scores:', scores);
  const total = await api(host, () => window.__afters.players.reduce((a, p) => a + p.score, 0));
  if (!(total > 0)) throw new Error('nobody scored anything');

  // 7. "Same again" restarts with the same players
  await host.page.click('[data-e2e=again]');
  for (const p of [host, ...players]) await waitFor(p, () => window.__afters.phase === 'intro', null, 15000);
  log('same again: all phones back at intro');

  if (errors.length) throw new Error(`console errors:\n  ${errors.join('\n  ')}`);
  ok = true;
} catch (e) {
  console.error('[e2e] FAILED:', e.message);
  if (errors.length) console.error('console errors:\n  ' + errors.join('\n  '));
} finally {
  await browser.close();
  web.server.close();
  peerServer.close?.();
}
console.log(ok ? '[e2e] PASS: 3 phones played a full game to the podium with no console errors.' : '[e2e] FAIL');
process.exit(ok ? 0 : 1);
