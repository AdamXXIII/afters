// Entry point: fonts + design system CSS, boot the app, register the service worker.
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource-variable/caveat/index.css';
import './ui/tokens.css';
import './ui/base.css';
import './ui/components.css';
import { App } from './app.js';
import { params } from './util/params.js';

const app = new App();
window.__afters = app.debugApi();

async function start() {
  // Wait for fonts briefly so first paint uses the real type (never block more than 1.5 s).
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch { /* ignore */ }
  await app.boot();
}
start().catch((e) => {
  console.error('[afters] boot failed', e);
  document.body.classList.add('booted');
});

if ('serviceWorker' in navigator && import.meta.env.PROD && !params.nosw && !navigator.webdriver) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
