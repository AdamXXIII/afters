// Audio probe (feel team): renders every named SFX (and 8 s of the music bed) through the real
// AudioEngine into an OfflineAudioContext inside Chromium, and prints peak / RMS / errors, so
// levels can be balanced without speakers. usage: node scripts/feel-audio.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srv = await serve(path.join(root, 'dist'));
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(`${srv.url}/?nosw=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__afters?.ready, null, { timeout: 30000 });
const NAMES = ['tap', 'select', 'plated', 'tick', 'tickLast', 'drumroll', 'stamp', 'countup', 'fanfare', 'oink', 'truth', 'clink', 'swipe', 'fwump', 'flutter', 'applause', 'groan', 'join', 'error', 'bell', 'page', 'curtain', 'pop', 'throw', 'nope', 'babble', 'music'];
const res = await page.evaluate(async (names) => {
  let eng = null;
  try { eng = window.__afters.app.ctx().audio; } catch { /* no ctx on title */ }
  if (!eng) throw new Error('no audio engine reachable');
  const out = [];
  const Real = window.AudioContext;
  for (const n of names) {
    const sr = 44100;
    const secs = n === 'music' ? 8 : 3;
    window.AudioContext = function () { const c = new OfflineAudioContext(2, sr * secs, sr); c.resume = () => Promise.resolve(); return c; };
    eng.ctx = null; eng._noise = null; eng.music = null;
    try {
      eng.unlock();
      eng.speaker = true;
      if (n === 'music') { eng._wantMusic = true; eng.settings.music = true; eng.music.playing = true; eng.musicBus.gain.value = eng.music.level; let t = 0.05; let step = 0; while (t < secs - 0.5) { eng.music._play(step, t); t += (60 / 92 / 2) * 2 * (step % 2 === 0 ? 0.58 : 0.42); step = (step + 1) % 64; if (step === 0) eng.music.loops++; } eng.music.loops = 1; }
      else if (n === 'babble') { for (let i = 0; i < 6; i++) eng.babble(); }
      else if (n === 'tickLast') eng.sfx('tick', { last: true });
      else eng.sfx(n);
      const buf = await eng.ctx.startRendering();
      let peak = 0; let sum = 0; let bad = 0;
      for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < d.length; i++) { const v = d[i]; if (!Number.isFinite(v)) bad++; else { peak = Math.max(peak, Math.abs(v)); sum += v * v; } } }
      out.push({ n, peak: +peak.toFixed(3), rms: +Math.sqrt(sum / (buf.length * 2)).toFixed(4), bad });
    } catch (e) { out.push({ n, err: String(e) }); }
  }
  window.AudioContext = Real;
  return out;
}, NAMES);
for (const r of res) console.log(r.err ? `${r.n.padEnd(10)} ERROR ${r.err}` : `${r.n.padEnd(10)} peak ${String(r.peak).padEnd(6)} rms ${String(r.rms).padEnd(7)} ${r.bad ? `NaN x${r.bad}` : ''}`);
if (errs.length) console.log('page errors:', errs.join(' | '));
await browser.close();
srv.server.close();
