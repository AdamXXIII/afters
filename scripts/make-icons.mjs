// Renders public/icons/icon.svg to PNG icons (192, 512, maskable 512, apple-touch 180) with headless Chromium.
// Skips (keeps existing PNGs) if Playwright is unavailable.
import { createRequire } from 'node:module';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public/icons');
const svg = readFileSync(path.join(dir, 'icon.svg'), 'utf8');

let chromium;
try { ({ chromium } = require('playwright')); } catch {
  if (existsSync(path.join(dir, 'icon-192.png'))) { console.log('[icons] playwright missing; keeping existing PNGs'); process.exit(0); }
  console.error('[icons] playwright missing and no PNGs present'); process.exit(1);
}

const jobs = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-512.png', 512, 0.12],
  ['apple-touch-icon.png', 180, 0.04],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  const inner = Math.round(size * (1 - pad * 2));
  await page.setContent(`<html><body style="margin:0;background:#7A1E2C;display:grid;place-items:center;width:${size}px;height:${size}px">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
  const buf = await page.screenshot({ type: 'png', omitBackground: false });
  writeFileSync(path.join(dir, name), buf);
  console.log(`[icons] ${name} ${size}px`);
}
await browser.close();
