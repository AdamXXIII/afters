// Pardon? tunes: parse the note lists, apply the hard modes, and play them on the house EP synth.
// parse/transform/length are Node-safe (the host uses tuneLength); play() needs the AudioEngine.
const NOTE = /^(R|([A-G])(#|b)?(\d))(?:\/(\d+(?:\.\d+)?))?$/;
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'C4 G4/2 R/0.5' -> [{m: 60, beats: 1}, {m: 67, beats: 2}, {m: null, beats: 0.5}] */
export function parseNotes(str) {
  return String(str).trim().split(/\s+/).map((tok) => {
    const x = NOTE.exec(tok);
    if (!x) throw new Error(`bad note ${tok}`);
    const beats = x[5] ? Number(x[5]) : 1;
    if (x[1] === 'R') return { m: null, beats };
    const m = 12 * (Number(x[4]) + 1) + STEP[x[2]] + (x[3] === '#' ? 1 : x[3] === 'b' ? -1 : 0);
    return { m, beats };
  });
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hard modes. wonky: the same tune with notes thrown into the wrong octave (seeded, same on every
 * phone) and a slightly lazy tempo; backwards: the notes in reverse order, rhythm reversed too.
 */
export function arrange(tune, mode = 'normal', seed = 1) {
  let notes = parseNotes(tune.notes);
  let bpm = tune.bpm;
  if (mode === 'backwards') notes = notes.slice().reverse();
  if (mode === 'wonky') {
    const r = mulberry(seed);
    notes = notes.map((n, i) => (n.m === null || i === 0 ? n : { ...n, m: n.m + (r() < 0.4 ? (r() < 0.5 ? 12 : -12) : 0) }));
    bpm = Math.round(bpm * 0.92);
  }
  return { notes, bpm };
}

export function tuneLength(tune, mode = 'normal') {
  const { notes, bpm } = arrange(tune, mode);
  return notes.reduce((s, n) => s + n.beats, 0) * (60 / bpm);
}

/** Timeline [{at, dur, m}] in seconds for drawing and playing. */
export function timeline(tune, mode, seed) {
  const { notes, bpm } = arrange(tune, mode, seed);
  const beat = 60 / bpm;
  let at = 0;
  const out = [];
  for (const n of notes) {
    if (n.m !== null) out.push({ at, dur: n.beats * beat, m: n.m });
    at += n.beats * beat;
  }
  return { events: out, length: at };
}

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

/**
 * Play from `from` seconds into the tune (so a phone that joins late stays in time).
 * Returns stop(). The voice: the house electric piano (DESIGN 3.9) doubled by a soft sine an
 * octave down, a touch of swing-free legato so the melody line is easy to follow.
 */
export function play(audio, tune, mode, seed, from = 0, { gain = 0.16 } = {}) {
  if (!audio?.ctx) return () => {};
  const { events } = timeline(tune, mode, seed);
  const c = audio.ctx;
  const out = c.createGain();
  out.gain.value = 1;
  out.connect(audio.sfxBus);
  for (const e of events) {
    if (e.at + 0.02 < from) continue;
    const when = e.at - from + 0.05;
    const f = mtof(e.m);
    audio._ep(f, when, Math.max(0.35, e.dur * 1.6), gain, out);
    audio.tone(f / 2, { when, attack: 0.012, decay: Math.max(0.2, e.dur * 0.9), gain: gain * 0.45, out });
  }
  return () => {
    try { out.gain.setTargetAtTime(0, c.currentTime, 0.03); setTimeout(() => out.disconnect(), 300); } catch { /* gone */ }
  };
}
