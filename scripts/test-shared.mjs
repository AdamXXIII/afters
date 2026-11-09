// Checks the shared game helpers in a real browser: draw two strokes with touch-like pointer moves on
// the sandbox pad, undo one, check the replay view updates, and feed fake tilts through the sensor.
// usage: node scripts/test-shared.mjs   (needs a build)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srv = await serve(path.join(root, 'dist'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let ok = false;
try {
  await page.goto(`${srv.url}/?demo=sandbox`);
  await page.waitForFunction(() => window.__afters?.ready && window.__afters.screen === 'sandbox');
  await page.waitForTimeout(800);
  const box = await page.locator('[data-e2e=draw-canvas]').boundingBox();
  console.log('[shared] hit:', await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.className, [box.x + box.width / 2, box.y + box.height / 2]));
  for (const [y0, y1] of [[0.3, 0.6], [0.5, 0.8]]) {
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * y0);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(box.x + box.width * (0.2 + i * 0.05), box.y + box.height * (y0 + (y1 - y0) * i / 12));
    await page.mouse.up();
  }
  const info = await page.locator('#show .t-body').textContent();
  if (!/bytes/.test(info)) throw new Error(`replay view not updated: ${info}`);
  await page.click('[data-e2e=draw-undo]');
  const after = await page.locator('#show .t-body').textContent();
  if (after === info) throw new Error('undo did not change the drawing');
  console.log('[shared] draw + undo ok:', info, '->', after);
  if (errors.length) throw new Error(errors.join('\n'));
  ok = true;
} catch (e) { console.error('[shared] FAILED:', e.message); }
await browser.close(); srv.server.close();
// tilt logic is pure enough to run in Node with a fake window
globalThis.window = { addEventListener() {}, removeEventListener() {}, DeviceMotionEvent: function DM() {} };
globalThis.DeviceMotionEvent = function DM() {};
const { tiltSensor } = await import('../src/shared/sensors.js');
const seen = [];
const t = tiltSensor({ onTilt: (d) => seen.push(d), cooldownMs: 0 });
await t.start();
for (const z of [0, 0.5, -7, -8, -1, 0, 7, 0.2, 7]) t._feed(z);
if (seen.join() !== 'down,up,up') { console.error('[shared] tilt FAILED', seen); ok = false; } else console.log('[shared] tilt ok:', seen.join(' '));
console.log(ok ? '[shared] PASS' : '[shared] FAIL');
process.exit(ok ? 0 : 1);
