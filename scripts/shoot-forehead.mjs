// Bonce screenshots incl. the guesser's LANDSCAPE forehead card (shoot.mjs is portrait only).
// usage: node scripts/shoot-forehead.mjs --out <dir> [--players 5] [--screens a,b] [--landscape (every screen at 844x390)]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const out = path.resolve(opt('--out', path.join(root, 'shots')));
const players = Number(opt('--players', 5));
const only = opt('--screens', null);
const LAND = argv.includes('--landscape');
mkdirSync(out, { recursive: true });
const SHOTS = [
  ['forehead-intro', 390, 844, ''], ['forehead-intro-guest', 390, 844, '&me=guest', 'forehead-intro'],
  ['forehead-pick', 390, 844, ''], ['forehead-pick-guesser', 390, 844, ''],
  ['forehead-countdown', 390, 844, ''], ['forehead-turn', 390, 844, ''], ['forehead-turn-teams', 390, 844, ''],
  ['forehead-turn-adult', 390, 844, ''], ['forehead-turn-guesser', 844, 390, '', 'forehead-turn-guesser'],
  ['forehead-recap', 390, 844, ''], ['forehead-recap-guesser', 390, 844, ''],
].filter((s) => !only || only.split(',').includes(s[0]));
const srv = await serve(path.join(root, 'dist'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let bad = 0;
for (const [name, w0, h0, extra, demo] of SHOTS) {
  const w = LAND ? Math.max(w0, h0) : w0;
  const hgt = LAND ? Math.min(w0, h0) : h0;
  const context = await browser.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 AFTERS-shoot' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${srv.url}/?demo=${demo || name}&seed=7&players=${players}&freeze=1${extra}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__afters?.ready, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { window.__afters.app.stage.stop(); return window.__afters.stats(); });
  const cdp = await context.newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(path.join(out, `${name}.png`), Buffer.from(data, 'base64'));
  if (errors.length) bad++;
  console.log(`${errors.length ? 'ERR ' : 'ok  '} ${name} ${w}x${hgt}${errors.length ? `\n   ${errors.join('\n   ')}` : ''}`);
  await context.close();
}
await browser.close();
srv.server.close();
process.exit(bad ? 1 : 0);
