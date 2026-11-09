// Seeded randomness. Every shuffle/tilt that must match across phones uses these.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Derive a sub-seed so different uses of one phase seed don't correlate. */
export function subSeed(seed, label) {
  return (hashString(String(label)) ^ (seed >>> 0)) >>> 0;
}

export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

export function randRange(rng, lo, hi) {
  return lo + (hi - lo) * rng();
}

/** Seeded tilt in degrees, identical on every phone for the same (seed, key). */
export function seededTilt(seed, key, max = 3) {
  const r = mulberry32(subSeed(seed, key))();
  return (r * 2 - 1) * max;
}
