// Haptics (DESIGN 3.8). Android: navigator.vibrate. iOS: optional <input switch> trick for tap/submit.
import { store } from '../util/storage.js';

const PATTERNS = {
  tap: [8], select: [12], submit: [18, 40, 12], tick: [6], stamp: [30],
  win: [20, 60, 20, 60, 60], fooled: [50, 30, 50], error: [40, 40, 40],
};

let enabled = store.get('haptics', true);
let iosSwitch = null;

function iosTick() {
  // iOS 18+: toggling a native switch inside a user gesture gives a light system haptic.
  try {
    if (!iosSwitch) {
      const label = document.createElement('label');
      label.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.body.appendChild(label);
      iosSwitch = label;
    }
    iosSwitch.click();
  } catch { /* ignore */ }
}

const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
const isIOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent);

export function haptic(name) {
  if (!enabled) return;
  const p = PATTERNS[name];
  if (!p) return;
  if (canVibrate) { try { navigator.vibrate(p); } catch { /* ignore */ } return; }
  if (isIOS && (name === 'tap' || name === 'submit')) iosTick();
}

export function setHaptics(on) { enabled = !!on; store.set('haptics', enabled); }
export function hapticsEnabled() { return enabled; }
