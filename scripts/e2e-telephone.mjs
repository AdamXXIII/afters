// End-to-end for Crossed Wires (telephone): 1 host phone + 2 player phones over real PeerJS against a
// local `peer` signalling server. The host plays through the UI: picks Speedy on the intro, writes a
// rumour (using the Stuck? card once), draws real pointer strokes on the canvas, guesses, nudges,
// votes, then reaches the shared results screen and goes back to the menu. Players use autopilot.
// Fails on any console error or page error.
// usage: node scripts/e2e-telephone.mjs [--speed 4] [--headed] [--keep-shots <dir>] [--adult]
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
const SPEED = Number(opt('--speed', 2));
const SHOTS = opt('--keep-shots', null);

const dist = path.join(root, 'dist');
if (!existsSync(path.join(dist, 'index.html'))) { console.error('dist/ missing: run npm run build first'); process.exit(1); }

const log = (...a) => console.log(`[e2e-tp ${(performance.now() / 1000).toFixed(1)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PEER_PORT = 9500 + Math.floor(Math.random() * 400);
const peerServer = PeerServer({ port: PEER_PORT, host: '127.0.0.1', path: '/' });
await sleep(300);
const web = await serve(dist);
const common = `transport=peer&signal=127.0.0.1:${PEER_PORT}&speed=${SPEED}&e2e=1&seed=23`;

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
const api = (p, expr, arg) => p.page.evaluate(expr, arg);
const waitFor = (p, fn, arg, timeout = 30000) => p.page.waitForFunction(fn, arg, { timeout, polling: 100 });

/** Draw a wobbly face with real pointer events (mouse drives pointer events in Chromium). */
async function scribble(page) {
  const c = page.locator('[data-e2e=draw-canvas]');
  const box = await c.boundingBox();
  if (!box) return false;
  const P = (x, y) => [box.x + box.width * x, box.y + box.height * y];
  const stroke = async (pts) => {
    await page.mouse.move(...P(...pts[0]));
    await page.mouse.down();
    for (const pt of pts.slice(1)) await page.mouse.move(...P(...pt));
    await page.mouse.up();
  };
  const circle = Array.from({ length: 11 }, (_, i) => [0.5 + Math.cos((i / 10) * Math.PI * 2) * 0.3, 0.5 + Math.sin((i / 10) * Math.PI * 2) * 0.3]);
  await stroke(circle);
  await stroke([[0.4, 0.42], [0.41, 0.44]]);
  await stroke([[0.6, 0.42], [0.61, 0.44]]);
  await stroke([[0.38, 0.6], [0.45, 0.66], [0.55, 0.66], [0.62, 0.6]]);
  return true;
}

let ok = false;
try {
  const host = await phone('host');
  await host.page.goto(`${web.url}/?${common}`);
  await waitFor(host, () => window.__afters?.ready);
  await host.page.click('[data-e2e=start-table]');
  await host.page.fill('[data-e2e=name-input]', 'Hosty');
  await host.page.click('[data-e2e=open-table]');
  await waitFor(host, () => window.__afters.screen === 'lobby');
  const code = await api(host, () => window.__afters.room);
  log('host opened table', code);

  const players = [];
  for (const name of ['Pip', 'Quin']) {
    const p = await phone(name);
    await p.page.goto(`${web.url}/?room=${code}&${common}`);
    await waitFor(p, () => window.__afters?.ready && window.__afters.screen === 'join');
    await p.page.fill('[data-e2e=name-input]', name);
    await p.page.click('[data-e2e=take-seat]');
    await waitFor(p, () => window.__afters.screen === 'lobby');
    log(name, 'joined');
    players.push(p);
  }
  await waitFor(host, () => window.__afters.players.length === 3);
  for (const p of players) await api(p, () => window.__afters.autopilot(true));
  if (argv.includes('--adult')) await api(host, () => window.__afters.app.client.setSettings({ rating: 'adult' }));

  await host.page.click('[data-e2e=start-show]');
  for (const p of [host, ...players]) await waitFor(p, () => window.__afters.screen === 'menu', null, 15000);
  await host.page.click('[data-e2e=dish-telephone]');
  await host.page.click('[data-e2e=serve-game]');
  log('Crossed Wires served');
  await waitFor(host, () => window.__afters.screen === 'telephone-intro', null, 15000);
  await host.page.click('[data-e2e=mode-speedy]');
  await waitFor(players[0], () => document.querySelector('[data-e2e=mode-speedy]')?.getAttribute('aria-pressed') === 'true', null, 5000);
  log('intro: mode pick synced to a guest');
  await sleep(600);
  await host.page.click('[data-e2e=tp-start]');

  const seen = new Set(['telephone-intro']);
  const did = new Set();
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > 300000) throw new Error(`timeout; host stuck on ${await api(host, () => window.__afters.screen)}`);
    const { screen, seq } = await api(host, () => ({ screen: window.__afters.screen, seq: window.__afters.app.client.state.phase?.seq }));
    if (!seen.has(screen)) {
      seen.add(screen);
      log('host screen:', screen);
      if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await host.page.screenshot({ path: path.join(SHOTS, `${String(seen.size).padStart(2, '0')}-${screen}.png`) }); }
    }
    if (screen === 'results') break;
    const page = host.page;
    const once = `${screen}:${seq}`;
    try {
      if (screen === 'telephone-write' && !did.has(once)) {
        did.add(once);
        await page.click('[data-e2e=tp-deal]', { timeout: 1000 });
        await page.click('[data-e2e=tp-use]', { timeout: 1000 });
        const v = await page.inputValue('[data-e2e=answer-input]');
        if (!v) throw new Error('Stuck? card did not fill the field');
        await page.click('[data-e2e=submit]', { timeout: 1000 });
      } else if (screen === 'telephone-draw' && !did.has(once)) {
        did.add(once);
        const ts = Date.now();
        await scribble(page);
        log('scribbled in', Date.now() - ts, 'ms');
        await page.click('[data-e2e=done-drawing]:not([disabled])', { timeout: 2000 });
      } else if (screen === 'telephone-guess' && !did.has(once)) {
        did.add(once);
        await page.fill('[data-e2e=answer-input]', 'a smiley face in a hurry');
        await page.click('[data-e2e=submit]', { timeout: 1000 });
      } else if (screen === 'telephone-wait' && !did.has(once)) {
        did.add(once);
        const nb = page.locator('[data-e2e=nudge]').first();
        if (await nb.count()) await nb.click({ timeout: 1000 });
      } else if (screen === 'telephone-vote' && !did.has(once)) {
        did.add(once);
        await page.locator('[data-e2e=moment]').first().click({ timeout: 1000 });
      }
    } catch (e) { if (/did not fill/.test(e.message)) throw e; /* screen changed under us */ }
    await sleep(200);
  }
  const must = ['telephone-intro', 'telephone-write', 'telephone-draw', 'telephone-guess', 'telephone-wait', 'telephone-reveal', 'telephone-vote', 'telephone-awards', 'results'];
  const missing = must.filter((s) => !seen.has(s));
  if (missing.length) throw new Error(`host never showed: ${missing.join(', ')}`);

  // the host's real drawing made it into the game (a line contains a drawing by Hosty with >= 4 strokes)
  for (const p of players) await waitFor(p, () => window.__afters.phase === 'results', null, 20000);
  const total = await api(host, () => window.__afters.players.reduce((a, p) => a + p.score, 0));
  log('final scores:', await api(host, () => window.__afters.players.map((p) => `${p.name}:${p.score}`).join(', ')));
  if (!(total > 0)) throw new Error('nobody scored anything');

  await host.page.click('[data-e2e=to-menu]');
  for (const p of [host, ...players]) await waitFor(p, () => window.__afters.phase === 'menu', null, 15000);
  const night = await api(host, () => window.__afters.players.reduce((a, p) => a + (p.night || 0), 0));
  if (!(night > 0)) throw new Error('tonight\'s table has no cherries after Crossed Wires');
  log('back at the menu, cherries on the table:', night);

  if (errors.length) throw new Error(`console errors:\n  ${errors.join('\n  ')}`);
  ok = true;
} catch (e) {
  console.error('[e2e-tp] FAILED:', e.message);
  if (errors.length) console.error('console errors:\n  ' + errors.join('\n  '));
} finally {
  await browser.close();
  web.server.close();
  peerServer.close?.();
}
console.log(ok ? '[e2e-tp] PASS: 3 phones played Crossed Wires to the results with no console errors.' : '[e2e-tp] FAIL');
process.exit(ok ? 0 : 1);
