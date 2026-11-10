// Pie Chart end-to-end (copy of e2e.mjs): 1 host phone + 2 player phones (separate browser contexts) over the real PeerJS
// transport against a local `peer` signalling server. The host plays through the UI (types, taps);
// players use autopilot. Lobby -> menu -> Afters Classic to the podium + end -> back to the menu ->
// serve again. Fails on any
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
const SPEED = Number(opt('--speed', 3));
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

  // 4. host wheels in the menu, picks Pie Chart and serves it
  await host.page.click('[data-e2e=start-show]');
  for (const p of [host, ...players]) await waitFor(p, () => window.__afters.screen === 'menu', null, 15000);
  log('menu: all phones at the trolley');
  await host.page.click('[data-e2e=dish-percentages]');
  await waitFor(players[0], () => document.querySelector('[data-e2e=dish-percentages]')?.classList.contains('is-focus'), null, 5000);
  log('menu: host focus synced to a guest');
  await host.page.click('[data-e2e=serve-game]');
  log('Pie Chart served');

  // 5. host plays Pie Chart through the UI until the shared results screen
  const seen = new Set();
  // record every screen in-page (fast phases can pass between two polls of a busy test loop)
  await api(host, () => { window.__seen = new Set(); setInterval(() => window.__seen.add(window.__afters.screen), 50); });
  const t0 = Date.now();
  let dragged = 0;
  for (;;) {
    if (Date.now() - t0 > 240000) throw new Error(`timeout; host stuck on ${await api(host, () => window.__afters.screen)}`);
    const screen = await api(host, () => window.__afters.screen);
    if (!seen.has(screen)) {
      seen.add(screen);
      log('host screen:', screen);
      if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await host.page.screenshot({ path: path.join(SHOTS, `${String(seen.size).padStart(2, '0')}-${screen}.png`) }); }
    }
    if (screen === 'results') break;
    const page = host.page;
    try {
      if (screen === 'percentages-dial') {
        // drag round the dish with real pointer events (12 o'clock -> ~3 o'clock), nudge, then cut
        const cut = await page.evaluate(() => {
          const pie = document.querySelector('[data-e2e=pc-pie]');
          if (!pie || document.querySelector('[data-e2e=pc-lock]')?.disabled) return null;
          const r = pie.getBoundingClientRect();
          const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
          const ev = (type, a) => pie.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, clientX: cx + Math.sin(a) * 100, clientY: cy - Math.cos(a) * 100 }));
          ev('pointerdown', 0.05);
          for (let i = 1; i <= 6; i++) ev('pointermove', (i / 6) * (Math.PI / 2));
          ev('pointerup', Math.PI / 2);
          document.querySelector('[data-e2e=pc-plus]').click();
          return pie.querySelector('.pc-num').textContent;
        });
        if (cut) {
          if (!/^2[4-7]%$/.test(cut)) throw new Error(`drag gave ${cut}, expected ~26%`);
          dragged += 1;
          await page.click('[data-e2e=pc-lock]', { timeout: 2000 });
          log('host cut the pie at', cut);
        }
      } else if (screen === 'percentages-watch') {
        const b = page.locator('[data-e2e=pc-heckle-up]:not([disabled])');
        if (await b.count()) await b.click({ timeout: 1000 });
      } else if (screen === 'percentages-bet') {
        const b = page.locator('[data-e2e=pc-bet-higher]');
        if (await b.count() && (await b.getAttribute('aria-pressed')) !== 'true') await b.click({ timeout: 1000 });
      } else if (screen === 'percentages-poll') {
        const b = page.locator('[data-e2e=pc-yes]:not([disabled])');
        if (await b.count()) await b.click({ timeout: 1000 });
      } else if (screen === 'percentages-final') {
        const serve = page.locator('[data-e2e=pc-serve]');
        if (await serve.count() && !(await serve.isDisabled())) await serve.click({ timeout: 1000 });
        else {
          const opts = page.locator('.pc-opt[aria-pressed="false"]:not([disabled])');
          if (await opts.count()) await opts.first().click({ timeout: 1000 });
        }
      }
    } catch (e) { if (/drag gave/.test(e.message)) throw e; }
    await sleep(200);
  }
  const must = ['menu', 'percentages-intro', 'percentages-poll', 'percentages-dial', 'percentages-watch', 'percentages-bet', 'percentages-sweat', 'percentages-reveal', 'percentages-scores', 'percentages-final-intro', 'percentages-final', 'percentages-final-reveal', 'results'];
  for (const x of await api(host, () => [...window.__seen])) seen.add(x);
  const missing = must.filter((s) => !seen.has(s));
  if (missing.length) throw new Error(`host never showed: ${missing.join(', ')}`);
  if (!dragged) throw new Error('host never cut the pie');

  // 6. everyone reached the results
  for (const p of players) await waitFor(p, () => window.__afters.phase === 'results', null, 20000);
  const scores = await api(host, () => window.__afters.players.map((p) => `${p.name}:${p.score}`).join(', '));
  log('final scores:', scores);
  const night = await api(host, () => window.__afters.players.reduce((a, p) => a + (p.night || 0), 0));
  if (!(night > 0)) throw new Error('tonight\'s table has no cherries after a game');

  // 7. Same again
  await host.page.click('[data-e2e=again]');
  for (const p of [host, ...players]) await waitFor(p, () => window.__afters.phase === 'percentages-intro', null, 15000);
  log('same again: all phones back at the Pie Chart intro');

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
console.log(ok ? '[e2e-percentages] PASS: 3 phones played Pie Chart to the results with no console errors.' : '[e2e-percentages] FAIL');
process.exit(ok ? 0 : 1);
