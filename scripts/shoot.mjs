// Screenshot harness: renders ?demo=<screen> at 390x844 @2x and writes PNGs.
// usage: node scripts/shoot.mjs --screens title,lobby|all --out <dir> [--wait 2500] [--seed 7] [--players 5] [--landscape (844x390)]
//        [--me host|guest] [--no-freeze] [--extra "&t=4000"] [--base http://host:port] [--no-build-check]
//        [--click "[data-e2e=invite]"] (tap something before the shot)
import { createRequire } from 'node:module';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const ALL_SCREENS = ['title', 'create', 'join', 'lobby', 'menu', 'menu-first', 'menu-adult', 'results', 'intro', 'r1-intro', 'r1-write', 'r1-wait', 'r1-vote', 'r1-reveal', 'r1-scores', 'r2-intro', 'r2-write', 'r2-wait', 'r2-pick', 'r2-reveal', 'r2-scores', 'r3-intro', 'r3-write', 'r3-swipe', 'r3-reveal', 'podium', 'end', 'reconnect', 'settings'];

function args() {
  const a = process.argv.slice(2);
  const o = { screens: 'all', out: path.join(root, 'shots'), wait: 2500, seed: 7, players: 5, me: 'host', freeze: true, extra: '', base: null };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    const v = a[i + 1];
    if (k === '--screens') { o.screens = v; i++; } else if (k === '--out') { o.out = path.resolve(v); i++; } else if (k === '--wait') { o.wait = Number(v); i++; } else if (k === '--seed') { o.seed = Number(v); i++; } else if (k === '--players') { o.players = Number(v); i++; } else if (k === '--me') { o.me = v; i++; } else if (k === '--extra') { o.extra = v; i++; } else if (k === '--base') { o.base = v; i++; } else if (k === '--click') { o.click = v; i++; } else if (k === '--no-freeze') o.freeze = false; else if (k === '--landscape') o.landscape = true;
  }
  o.list = o.screens === 'all' ? ALL_SCREENS : o.screens.split(',').map((s) => s.trim()).filter(Boolean);
  return o;
}

export const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'];

const o = args();
let srv = null;
let base = o.base;
if (!base) {
  const dist = path.join(root, 'dist');
  if (!existsSync(path.join(dist, 'index.html'))) { console.error('dist/ missing: run npm run build first'); process.exit(1); }
  srv = await serve(dist);
  base = srv.url;
}
mkdirSync(o.out, { recursive: true });
const browser = await chromium.launch({ args: GL_ARGS });
const results = [];
let failed = 0;
for (const id of o.list) {
  const context = await browser.newContext({ viewport: o.landscape ? { width: 844, height: 390 } : { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 AFTERS-shoot' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  const url = `${base}/?demo=${encodeURIComponent(id)}&seed=${o.seed}&players=${o.players}&me=${o.me}${o.freeze ? '&freeze=1' : ''}${o.extra}`;
  let stats = null;
  const T = [Date.now()];
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    T.push(Date.now());
    await page.waitForFunction(() => window.__afters && window.__afters.ready, null, { timeout: 30000, polling: 100 });
    T.push(Date.now());
    await page.waitForTimeout(o.wait);
    if (o.click) { await page.click(o.click); await page.waitForTimeout(500); }
    T.push(Date.now());
    // Stop the render loop (one last frame is rendered by stats()) so the capture is instant.
    stats = await page.evaluate(() => { window.__afters.app.stage.stop(); return window.__afters.stats(); });
    T.push(Date.now());
    await page.waitForTimeout(60);
    const screen = await page.evaluate(() => window.__afters.screen);
    const file = path.join(o.out, `${id}.png`);
    // CDP capture is ~10x faster than page.screenshot() under software GL.
    const cdp = await context.newCDPSession(page);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(file, Buffer.from(data, 'base64'));
    T.push(Date.now());
    const blank = !stats || stats.std < 4 || stats.mean < 3;
    if (blank || errors.length) failed++;
    results.push({ id, screen, file, stats, blank, errors });
    console.log(`${blank ? 'BLANK' : 'ok   '} ${id.padEnd(10)} screen=${screen} gl(mean=${stats?.mean} std=${stats?.std}) -> ${file} [${T.slice(1).map((t, i) => t - T[i]).join('/')} ms]${errors.length ? `\n      console errors:\n        ${errors.join('\n        ')}` : ''}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${id}: ${e.message}${errors.length ? `\n      console errors:\n        ${errors.join('\n        ')}` : ''}`);
  }
  await context.close();
}
await browser.close();
srv?.server.close();
console.log(`\n${results.length}/${o.list.length} screens shot, ${failed} with problems. Output: ${o.out}`);
process.exit(failed ? 1 : 0);
