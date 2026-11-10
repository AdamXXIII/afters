// End-to-end for BONCE (forehead): real PeerJS over a local signalling server.
// Game 1: 3 phones, Everyone for themselves, the host plays through the UI (votes decks, gets ready,
// taps Got it / Pass or the forehead halves, picks the top shouter); 2 players on autopilot.
// Then a 4th phone joins at the menu and game 2 is Gravy vs Custard (1 go each) to the results.
// Fails on any console error. usage: node scripts/e2e-forehead.mjs [--speed 4] [--headed] [--keep-shots <dir>]
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
const SPEED = Number(opt('--speed', 4));
const SHOTS = opt('--keep-shots', null);
const dist = path.join(root, 'dist');
if (!existsSync(path.join(dist, 'index.html'))) { console.error('dist/ missing: run npm run build first'); process.exit(1); }
const log = (...a) => console.log(`[e2e-forehead ${(performance.now() / 1000).toFixed(1)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PEER_PORT = 9500 + Math.floor(Math.random() * 400);
const peerServer = PeerServer({ port: PEER_PORT, host: '127.0.0.1', path: '/' });
await sleep(300);
const web = await serve(dist);
const common = `transport=peer&signal=127.0.0.1:${PEER_PORT}&speed=${SPEED}&e2e=1&seed=11`;
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
const api = (p, fn, arg) => p.page.evaluate(fn, arg);
const waitFor = async (p, fn, arg, timeout = 60000) => {
  try { return await p.page.waitForFunction(fn, arg, { timeout, polling: 100 }); } catch (e) {
    const where = await p.page.evaluate(() => `${window.__afters?.screen} / ${window.__afters?.phase}`).catch(() => '?');
    throw new Error(`${p.label} waited ${timeout} ms on ${String(fn).slice(0, 90)} (at ${where})`);
  }
};
async function join(name, code) {
  const p = await phone(name);
  await p.page.goto(`${web.url}/?room=${code}&${common}`);
  await waitFor(p, () => window.__afters?.ready && window.__afters.screen === 'join');
  await p.page.fill('[data-e2e=name-input]', name);
  await p.page.click('[data-e2e=take-seat]');
  await waitFor(p, () => ['lobby', 'menu'].includes(window.__afters.screen));
  log(name, 'joined');
  return p;
}
const tryClick = async (page, sel) => { const l = page.locator(sel).first(); if (await l.count()) { await l.click({ timeout: 800, force: true }); return true; } return false; };

/** Host plays one Bonce game through the UI until the results screen. Returns screens + stats seen. */
async function playGame(host, { teams }) {
  const seen = new Set();
  const stats = { marks: 0, votes: 0, ready: 0, shouts: 0, guessed: 0, foul: 0 };
  let lastSeq = -1;
  const t0 = Date.now();
  for (;;) {
    if (Date.now() - t0 > 300000) throw new Error(`timeout; host stuck on ${await api(host, () => window.__afters.screen)}`);
    const st = await api(host, () => ({ screen: window.__afters.screen, phase: window.__afters.phase, seq: window.__afters.app.client.state.phase?.seq, me: window.__afters.app.client.state.me, g: window.__afters.app.client.state.phase?.payload?.guesserId }));
    if (!seen.has(st.screen)) {
      seen.add(st.screen);
      log('host screen:', st.screen);
    }
    if (st.seq !== lastSeq) {
      lastSeq = st.seq;
      if (SHOTS) { mkdirSync(SHOTS, { recursive: true }); await host.page.screenshot({ path: path.join(SHOTS, `${teams ? 't' : 'f'}-${String(st.seq).padStart(3, '0')}-${st.screen}.png`) }); }
    }
    if (st.screen === 'results') break;
    const page = host.page;
    try {
      if (st.screen === 'forehead-intro') {
        if (teams && await page.locator('[data-e2e=fh-mode-teams]:not(.on)').count()) {
          await page.click('[data-e2e=fh-setup-open]');
          await page.click('[data-e2e=fh-mode-teams]');
          await page.click('[data-e2e=fh-goes-1]');
          await waitFor(host, () => window.__afters.app.client.state.progress?.setup?.mode === 'teams', null, 5000);
          log('host chose Gravy vs Custard');
        }
        if (await tryClick(page, '[data-e2e=fh-go]:not([disabled])')) log('host: Bonces up!');
      } else if (st.screen === 'forehead-pick') {
        if (st.g === st.me) { if (await tryClick(page, '[data-e2e=fh-ready]:not([disabled])')) stats.ready++; }
        else if (await page.locator('[data-e2e=fh-deck][aria-pressed=true]').count() === 0) { if (await tryClick(page, '[data-e2e=fh-deck]')) stats.votes++; }
      } else if (st.screen === 'forehead-turn') {
        const counting = await page.locator('.counting').count();
        if (!counting) {
          if (st.g === st.me) { if (await tryClick(page, Math.random() < 0.75 ? '[data-e2e=fh-g-hit]' : '[data-e2e=fh-g-pass]')) { stats.marks++; stats.guessed++; } }
          else if (await tryClick(page, '[data-e2e=fh-hit]')) stats.marks++;
          else if (await tryClick(page, '[data-e2e=fh-foul]')) { stats.marks++; stats.foul++; }
        }
      } else if (st.screen === 'forehead-recap') {
        if (st.g === st.me && await tryClick(page, '[data-e2e=fh-shout]:not([disabled])')) stats.shouts++;
      }
    } catch { /* screen changed under us */ }
    await sleep(st.screen === 'forehead-turn' ? 350 : st.screen === 'forehead-pick' ? 60 : 250);
  }
  return { seen, stats };
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
  const players = [await join('Pip', code), await join('Quin', code)];
  await waitFor(host, () => window.__afters.players.length === 3);
  for (const p of players) await api(p, () => window.__afters.autopilot(true));

  await host.page.click('[data-e2e=start-show]');
  for (const p of [host, ...players]) await waitFor(p, () => window.__afters.screen === 'menu', null, 15000);
  await host.page.click('[data-e2e=dish-forehead]');
  await host.page.click('[data-e2e=serve-game]');
  log('Bonce served (3 phones, everyone for themselves)');

  // ---- game 1 ----
  const g1 = await playGame(host, { teams: false });
  const must = ['forehead-intro', 'forehead-pick', 'forehead-turn', 'forehead-recap', 'results'];
  const miss1 = must.filter((s) => !g1.seen.has(s));
  if (miss1.length) throw new Error(`game 1: host never showed ${miss1.join(', ')}`);
  for (const p of players) await waitFor(p, () => window.__afters.phase === 'results', null, 20000);
  const scores1 = await api(host, () => window.__afters.players.map((p) => `${p.name}:${p.score}`).join(', '));
  log('game 1 scores:', scores1, JSON.stringify(g1.stats));
  if (!(g1.stats.marks > 0 && g1.stats.ready > 0 && g1.stats.votes > 0)) throw new Error(`host did not get to play every part: ${JSON.stringify(g1.stats)}`);
  const total = await api(host, () => window.__afters.players.reduce((a, p) => a + p.score, 0));
  if (!(total > 0)) throw new Error('nobody scored anything');
  const hostScore = await api(host, () => window.__afters.players.find((p) => p.name === 'Hosty').score);
  if (!(hostScore >= 300)) throw new Error(`the host's own forehead taps barely counted (score ${hostScore})`);

  // ---- back to the menu, a 4th phone joins, game 2 in teams ----
  await host.page.click('[data-e2e=to-menu]');
  for (const p of [host, ...players]) await waitFor(p, () => window.__afters.phase === 'menu', null, 15000);
  const night = await api(host, () => window.__afters.players.reduce((a, p) => a + (p.night || 0), 0));
  if (!(night > 0)) throw new Error('tonight\'s table has no cherries after Bonce');
  const fourth = await join('Rue', code);
  await api(fourth, () => window.__afters.autopilot(true));
  players.push(fourth);
  await waitFor(host, () => window.__afters.players.length === 4);
  await host.page.click('[data-e2e=dish-forehead]');
  await host.page.click('[data-e2e=serve-game]');
  log('Bonce served again (4 phones, Gravy vs Custard)');
  const g2 = await playGame(host, { teams: true });
  const miss2 = must.filter((s) => !g2.seen.has(s));
  if (miss2.length) throw new Error(`game 2: host never showed ${miss2.join(', ')}`);
  for (const p of players) await waitFor(p, () => window.__afters.phase === 'results', null, 20000);
  const rows = await api(host, () => window.__afters.app.client.state.phase.payload.rows);
  const byScore = new Map();
  for (const r of rows) byScore.set(r.score, (byScore.get(r.score) || 0) + 1);
  log('game 2 rows:', JSON.stringify(rows.map((r) => [r.score, r.rank])), JSON.stringify(g2.stats));
  if ([...byScore.values()].some((n) => n !== 2) && byScore.size !== 1) throw new Error('teams: scores should come in pairs (two teams of two)');

  if (errors.length) throw new Error(`console errors:\n  ${errors.join('\n  ')}`);
  ok = true;
} catch (e) {
  console.error('[e2e-forehead] FAILED:', e.message);
  if (errors.length) console.error('console errors:\n  ' + errors.join('\n  '));
} finally {
  await browser.close();
  web.server.close();
  peerServer.close?.();
}
console.log(ok ? '[e2e-forehead] PASS: 3 phones played Bonce to the results, then 4 phones played Gravy vs Custard, no console errors.' : '[e2e-forehead] FAIL');
process.exit(ok ? 0 : 1);
