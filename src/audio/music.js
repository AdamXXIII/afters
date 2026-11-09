// "Late Supper": a looping 92 BPM swung jazz bed (DESIGN 3.9). Speaker phone only.
// ii-V-I-vi in F: Gm9 - C13 - Fmaj9 - Dm9, 2 bars each. EP chords, walking bass, brushes, ride.

const BPM = 92;
const BEAT = 60 / BPM;
const SWING = 0.58;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

// chord voicings (MIDI) + bass walking notes per bar (4 quarters)
const CHORDS = [
  { v: [55, 58, 62, 65, 69], bass: [[43, 46, 50, 49], [43, 50, 46, 47]] }, // Gm9
  { v: [52, 58, 62, 64, 69], bass: [[48, 52, 55, 52], [48, 46, 45, 44]] }, // C13
  { v: [53, 57, 60, 64, 67], bass: [[41, 45, 48, 45], [41, 48, 47, 46]] }, // Fmaj9
  { v: [53, 57, 60, 62, 64], bass: [[38, 41, 45, 41], [38, 45, 44, 43]] }, // Dm9
];

export class Music {
  constructor(engine) {
    this.e = engine;
    this.playing = false;
    this.step = 0; // eighth-note index
    this.nextTime = 0;
    this.timer = null;
    this.intensityMode = 'normal'; // normal | write | hurry
    this.level = 0.32;
  }

  start() {
    if (this.playing || !this.e.ctx) return;
    this.playing = true;
    const c = this.e.ctx;
    this.e.musicBus.gain.cancelScheduledValues(c.currentTime);
    this.e.musicBus.gain.setTargetAtTime(this.level, c.currentTime, 0.4);
    this.nextTime = c.currentTime + 0.1;
    this.timer = setInterval(() => this._schedule(), 25);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    const c = this.e.ctx;
    this.e.musicBus.gain.setTargetAtTime(0, c.currentTime, 0.3);
  }

  setIntensity(mode) { this.intensityMode = mode; }

  /** Duck under babble / reveals (sidechain-style, 120 ms). */
  duck(sec = 0.6) {
    if (!this.playing) return;
    const c = this.e.ctx;
    const g = this.e.musicBus.gain;
    g.cancelScheduledValues(c.currentTime);
    g.setTargetAtTime(0.18, c.currentTime, 0.04);
    g.setTargetAtTime(this.level, c.currentTime + sec, 0.12);
  }

  _schedule() {
    const c = this.e.ctx;
    while (this.nextTime < c.currentTime + 0.12) {
      this._play(this.step, this.nextTime);
      const eighth = BEAT / 2;
      const swingOff = this.step % 2 === 0 ? eighth * 2 * SWING : eighth * 2 * (1 - SWING);
      this.nextTime += swingOff;
      this.step = (this.step + 1) % 64; // 8 bars x 8 eighths
    }
  }

  _play(step, t) {
    const e = this.e;
    const out = e.musicBus;
    const bar = Math.floor(step / 8);
    const chord = CHORDS[Math.floor(bar / 2) % 4];
    const beatInBar = Math.floor((step % 8) / 2);
    const onBeat = step % 2 === 0;
    const when = t - e.ctx.currentTime;

    // EP comping: on beat 1 and the "and" of 2
    if ((step % 8 === 0) || (step % 8 === 3)) {
      chord.v.forEach((m, i) => e._ep(mtof(m + 12), when + i * 0.008, step % 8 === 0 ? 1.4 : 0.6, 0.035, out));
    }
    // walking bass on quarters (dominant pedal when hurrying)
    if (onBeat) {
      let m = chord.bass[bar % 2][beatInBar];
      if (this.intensityMode === 'hurry') m = 48;
      e.tone(mtof(m), { type: 'triangle', when, attack: 0.005, decay: 0.32, gain: 0.22, out });
      e.tone(mtof(m - 12), { type: 'sine', when, attack: 0.005, decay: 0.25, gain: 0.12, out });
    }
    // brushes on 2 and 4
    if (onBeat && (beatInBar === 1 || beatInBar === 3)) e.noise({ when, dur: 0.28, freq: 3000, q: 0.7, gain: 0.05, attack: 0.03, out });
    // ride on every eighth, quiet
    e.noise({ when, dur: 0.03, type: 'highpass', freq: 7000, gain: onBeat ? 0.035 : 0.02, out });
    // writing phases: shaker 16ths
    if (this.intensityMode !== 'normal') {
      e.noise({ when, dur: 0.02, type: 'highpass', freq: 8000, gain: 0.03, out });
      e.noise({ when: when + BEAT / 4, dur: 0.02, type: 'highpass', freq: 8000, gain: 0.02, out });
    }
    // hurry: heartbeat kick on beats 1 and 3
    if (this.intensityMode === 'hurry' && onBeat && (beatInBar === 0 || beatInBar === 2)) {
      e.tone(120, { freqEnd: 55, glide: 0.14, when, decay: 0.14, gain: 0.35, out });
    }
  }
}
