// Phone sensors for games (src/shared, used by Bonce/forehead and anything that tilts or buzzes).
//
//   import { tiltSensor, vibrate, sensorsSupported } from '../../shared/sensors.js';
//   const tilt = tiltSensor({ onTilt: (dir) => dir === 'down' ? correct() : pass() });
//   // iOS needs a user tap before motion works: call from a button's tap handler
//   button('Ready', { onClick: async () => { if (await tilt.start() !== 'granted') showTapFallback(); } });
//   ...  tilt.stop();
//
// How it works: we read gravity from `devicemotion` (accelerationIncludingGravity), normalise the
// iOS sign flip, and watch how much the SCREEN faces the floor or the ceiling compared with the pose
// at calibrate(). That works in portrait and landscape and on a forehead (screen facing out).
// Tilt "down" = screen turns towards the floor (a nod forward), "up" = towards the ceiling.
// Hysteresis: after a tilt fires, the phone must come back near neutral before the next one.
// Always give players an on-screen tap fallback: desktop, denied permission and old phones.

const IOS = typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const G = 9.81;

/** Does this browser expose motion events at all? (Not a guarantee the phone has a sensor.) */
export function sensorsSupported() {
  return typeof window !== 'undefined' && ('DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window);
}

/** True when the browser wants a permission prompt from a user tap first (iOS 13+). */
export function needsMotionPermission() {
  return typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
}

/**
 * Ask for motion permission. MUST be called inside a tap/click handler on iOS.
 * @returns {Promise<'granted'|'denied'|'unsupported'>}
 */
export async function requestMotionPermission() {
  if (!sensorsSupported()) return 'unsupported';
  if (!needsMotionPermission()) return 'granted';
  try {
    const a = await DeviceMotionEvent.requestPermission();
    if (a !== 'granted') return 'denied';
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try { await DeviceOrientationEvent.requestPermission(); } catch { /* motion alone is enough */ }
    }
    return 'granted';
  } catch {
    return 'denied';
  }
}

/**
 * Tilt detector.
 * @param {object} o
 * @param {(dir:'down'|'up')=>void} o.onTilt
 * @param {number} [o.threshold=0.55]  how far the screen must turn (in g of the facing component, ~35 deg)
 * @param {number} [o.release=0.25]    back within this of neutral re-arms the next tilt
 * @param {number} [o.cooldownMs=500]  minimum gap between tilts
 * @param {(v:{facing:number, delta:number})=>void} [o.onMove]  every sample (for a live meter)
 */
export function tiltSensor({ onTilt, threshold = 0.55, release = 0.25, cooldownMs = 500, onMove = null } = {}) {
  let neutral = null;
  let armed = true;
  let last = 0;
  let latest = null;
  let running = false;
  let gotSample = false;

  const onMotion = (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.z == null) return;
    gotSample = true;
    // facing: +1 = screen faces the ceiling, -1 = faces the floor. iOS reports gravity inverted.
    const facing = Math.max(-1, Math.min(1, (IOS ? -a.z : a.z) / G));
    latest = facing;
    if (neutral === null) neutral = facing;
    const delta = facing - neutral;
    onMove?.({ facing, delta });
    const now = performance.now();
    if (armed && Math.abs(delta) >= threshold && now - last > cooldownMs) {
      armed = false;
      last = now;
      onTilt?.(delta < 0 ? 'down' : 'up');
    } else if (!armed && Math.abs(delta) <= release) {
      armed = true;
    }
  };

  return {
    /** Ask permission if needed (call from a tap on iOS) and start listening. */
    async start() {
      const r = await requestMotionPermission();
      if (r !== 'granted') return r;
      if (!running) window.addEventListener('devicemotion', onMotion);
      running = true;
      neutral = null;
      armed = true;
      return 'granted';
    },
    stop() {
      if (running) window.removeEventListener('devicemotion', onMotion);
      running = false;
    },
    /** Take the current pose as neutral (e.g. once the phone is on the forehead). */
    calibrate() { neutral = latest; armed = true; },
    /** Has a real sensor sample arrived since start()? (false after ~1 s = show the tap fallback) */
    get live() { return gotSample; },
    get running() { return running; },
    /** For tests: feed a fake gravity z (m/s^2, Android sign). */
    _feed(z) { onMotion({ accelerationIncludingGravity: { x: 0, y: 0, z: IOS ? -z : z } }); },
  };
}

/** Buzz the phone (Android; iOS Safari ignores it). Pattern: ms or [on, off, on...]. */
export function vibrate(pattern = 30) {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) return navigator.vibrate(pattern); } catch { /* ignore */ }
  return false;
}

/** Named buzz patterns for games. */
export const BUZZ = {
  correct: [40, 40, 80],
  pass: [120],
  tick: [12],
  timeUp: [200, 80, 200, 80, 400],
};

/**
 * Best-effort landscape lock (works only in fullscreen on Android; iOS ignores it, so design
 * screens that also read fine rotated). Returns true if the lock took.
 */
export async function lockLandscape() {
  try {
    if (document.fullscreenElement == null && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    await screen.orientation?.lock?.('landscape');
    return true;
  } catch {
    return false;
  }
}

export async function unlockOrientation() {
  try { screen.orientation?.unlock?.(); } catch { /* ignore */ }
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* ignore */ }
}
