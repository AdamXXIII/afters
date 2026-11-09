// Mid-transition frames (feel team). Loads a demo screen unfrozen, waits for the real phase change
// to the next screen, then pauses every CSS/WAAPI animation and seeks it to fixed times so each
// frame is deterministic. Writes <out>/<from>__<to>@<ms>.png.
// usage: node scripts/feel-transitions.mjs --out shots/feel/trans [--times 60,160,280,420] [--only intro]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const arg = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const out = path.resolve(arg('--out', path.join(root, 'shots/feel/trans')));
const times = arg('--times', '60,160,280,420').split(',').map(Number);
const only = arg('--only', null);

// [demo to start on, screen we expect next, speed]
const PAIRS = [
  ['intro', 'r1-intro', 2],      // show -> show, course dip
  ['r1-intro', 'r1-write', 2],   // show -> input (sheet rises, strip arrives)
  ['r1-vote', 'r1-reveal', 3],   // split -> show (sheet leaves)
  ['r1-scores', 'r2-intro', 2],  // board -> course card
  ['r2-write', 'r2-pick', 4],    // input -> split
].filter(([f]) => !only || f === only);

if (!existsSync(path.join(root, 'dist/index.html'))) { console.error('build first'); process.exit(1); }
const srv = await serve(path.join(root, 'dist'));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [from, to, speed] of PAIRS) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  try {
    await page.goto(`${srv.url}/?demo=${from}&seed=7&players=5&me=host&speed=${speed}&fps=8`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__afters?.ready, null, { timeout: 30000 });
    await page.waitForFunction((t) => window.__afters.screen === t, to, { timeout: 90000, polling: 10 });
    // freeze the world the instant the router has swapped screens
    await page.evaluate(() => {
      window.__afters.app.stage.stop();
      const eng = window.__afters.engine();
      if (eng) eng.paused = true;
      for (const b of window.__afters.app.bots || []) if (b.brain) b.brain.enabled = false;
      window.__feelAnims = document.getAnimations();
      window.__feelAnims.forEach((an) => an.pause());
    });
    const cdp = await context.newCDPSession(page);
    for (const t of times) {
      await page.evaluate((ms) => {
        document.getAnimations().forEach((an) => { try { an.pause(); an.currentTime = ms; } catch { /* finished */ } });
      }, t);
      await page.waitForTimeout(30);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const f = path.join(out, `${from}__${to}@${t}.png`);
      writeFileSync(f, Buffer.from(data, 'base64'));
      console.log('ok', f);
    }
  } catch (e) { console.log('FAIL', from, '->', to, e.message); }
  if (errs.length) console.log('  errors:', errs.join(' | '));
  await context.close();
}
await browser.close();
srv.server.close();
