// Perf probe (feel team): per screen, WebGL draw calls / triangles / programs / textures from
// renderer.info, DOM size, live animations, and how many elements use expensive CSS
// (backdrop-filter, filter, mix-blend-mode). Budget (DESIGN 3.6): <= 60 calls, <= 150k tris.
// usage: node scripts/feel-perf.mjs [--screens title,lobby,...]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2);
const i = a.indexOf('--screens');
const screens = (i >= 0 ? a[i + 1] : 'title,lobby,r1-write,r1-vote,r1-reveal,r2-pick,r3-swipe,podium').split(',');
const srv = await serve(path.join(root, 'dist'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
console.log('screen      calls  tris    progs tex  dom   anims  backdrop filter blend');
for (const id of screens) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(`${srv.url}/?demo=${id}&seed=7&players=8&me=host&freeze=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__afters?.ready, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const st = window.__afters.app.stage;
    st.renderer.info.autoReset = false; st.renderer.info.reset();
    st.renderer.render(st.scene, st.camera);
    const inf = st.renderer.info;
    let backdrop = 0; let filter = 0; let blend = 0;
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if ((cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none')) backdrop++;
      if (cs.filter && cs.filter !== 'none') filter++;
      if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') blend++;
    }
    return { calls: inf.render.calls, tris: inf.render.triangles, progs: inf.programs?.length ?? 0, tex: inf.memory.textures, dom: document.getElementsByTagName('*').length, anims: document.getAnimations().filter((x) => x.playState === 'running').length, backdrop, filter, blend };
  });
  console.log(`${id.padEnd(11)} ${String(r.calls).padEnd(6)} ${String(r.tris).padEnd(7)} ${String(r.progs).padEnd(5)} ${String(r.tex).padEnd(4)} ${String(r.dom).padEnd(5)} ${String(r.anims).padEnd(6)} ${String(r.backdrop).padEnd(8)} ${String(r.filter).padEnd(6)} ${r.blend}`);
  await ctx.close();
}
await browser.close();
srv.server.close();
