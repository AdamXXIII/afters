// Synthesised WebAudio SFX (DESIGN 3.9). No downloaded assets.
// One AudioContext, unlocked on first tap. Master -> compressor -> destination.
import { store } from '../util/storage.js';
import { Music } from './music.js';

const semis = (n) => 2 ** (n / 12);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.settings = { music: true, sfx: true, ...store.get('audio', {}) };
    this.speaker = false; // only the speaker phone plays music + babble
    this.music = null;
    this._noise = null;
    this.uiLevel = 0.6; // every phone plays its own UI SFX at 60%
  }

  /** Call inside a user gesture (first tap). Safe to call repeatedly. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC({ latencyHint: 'interactive' });
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      comp.connect(this.ctx.destination);
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(comp);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.settings.sfx ? this.uiLevel : 0;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);
      // A small dining-room reverb (generated impulse, ~1.1 s): one ConvolverNode shared by every
      // sound via two send buses, so dry SFX stay crisp but nothing sounds like it's in a cupboard.
      try {
        this.verb = this.ctx.createConvolver();
        this.verb.buffer = this._roomImpulse(1.1);
        const verbOut = this.ctx.createGain();
        verbOut.gain.value = 0.9;
        this.verb.connect(verbOut).connect(this.master);
        this.sfxSend = this.ctx.createGain();
        this.sfxSend.gain.value = 0.16;
        this.sfxBus.connect(this.sfxSend).connect(this.verb);
        this.musicSend = this.ctx.createGain();
        this.musicSend.gain.value = 0.22;
        this.musicBus.connect(this.musicSend).connect(this.verb);
      } catch { this.verb = null; }
      this.music = new Music(this);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
      });
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this._syncMusic();
  }

  get ready() { return !!this.ctx && this.ctx.state === 'running'; }

  /** Exponentially decaying stereo noise, darker as it fades (wood-panelled room, not a cathedral). */
  _roomImpulse(sec) {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len;
        const a = 0.25 + 0.7 * k; // low-pass coefficient rises: highs die first
        lp += (Math.random() * 2 - 1 - lp) * (1 - a);
        d[i] = lp * (1 - k) ** 2.6 * (i < c.sampleRate * 0.008 ? i / (c.sampleRate * 0.008) : 1);
      }
    }
    return b;
  }

  set(key, value) {
    this.settings[key] = value;
    store.set('audio', this.settings);
    if (!this.ctx) return;
    if (key === 'sfx') this.sfxBus.gain.value = value ? this.uiLevel : 0;
    this._syncMusic();
  }

  setSpeaker(on) { this.speaker = !!on; this._syncMusic(); }

  _syncMusic() {
    if (!this.music) return;
    if (this.settings.music && this.speaker && this._wantMusic) this.music.start();
    else this.music.stop();
  }

  /** Screens/app say whether the music bed should run (in-game). */
  wantMusic(on) { this._wantMusic = on; this._syncMusic(); }

  noiseBuffer() {
    if (!this._noise) {
      const len = this.ctx.sampleRate * 2;
      const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noise = b;
    }
    return this._noise;
  }

  // ---------- primitives ----------

  tone(freq, { type = 'sine', when = 0, attack = 0.004, decay = 0.2, gain = 0.3, freqEnd = null, glide = null, out = this.sfxBus, detune = 0 } = {}) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + (glide ?? decay));
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
    return { o, g, t };
  }

  noise({ when = 0, dur = 0.1, gain = 0.3, type = 'bandpass', freq = 2000, q = 1, freqEnd = null, attack = 0.002, out = this.sfxBus } = {}) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuffer();
    s.loop = true;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random());
    s.stop(t + attack + dur + 0.05);
    return { s, f, g, t };
  }

  // ---------- named SFX ----------

  /** Play a named effect. Never throws (audio is optional). */
  sfx(name, opts = {}) {
    if (!this.ctx || !this.settings.sfx) return;
    try { this[`_${name}`]?.(opts); } catch (e) { console.warn('[audio]', name, e); }
  }

  _tap() {
    // DESIGN: sine 880 -> 660 over 40 ms + 2 kHz click, two pitch variants. A touch of body
    // (a quiet octave-down) makes it a wooden "tock" rather than a beep.
    const k = Math.random() < 0.5 ? semis(2) : semis(-2);
    this.tone(880 * k, { freqEnd: 660 * k, decay: 0.04, gain: 0.22 });
    this.tone(440 * k, { freqEnd: 330 * k, decay: 0.03, gain: 0.08 });
    this.noise({ dur: 0.005, freq: 2000, gain: 0.12 });
  }

  /** Paper card sliding over linen: screen change. Up = sheet rising, down = settling. */
  _page({ up = true } = {}) {
    this.noise({ dur: 0.16, freq: up ? 900 : 2200, freqEnd: up ? 2600 : 800, q: 0.8, gain: 0.16, attack: 0.04 });
    this.noise({ dur: 0.05, when: 0.13, type: 'lowpass', freq: 700, gain: 0.12 });
  }

  /** Course change: a soft EP swell under the lights dipping. */
  _curtain() {
    [53, 57, 60, 64, 67].forEach((m, i) => this._ep(440 * 2 ** ((m + 12 - 69) / 12), i * 0.03, 1.6, 0.03));
    this.noise({ dur: 0.7, freq: 400, freqEnd: 1800, q: 0.6, gain: 0.035, attack: 0.3 });
  }

  /** Small upward pop (someone finished, chip lit). */
  _pop() { this.tone(660, { freqEnd: 990, glide: 0.05, decay: 0.07, gain: 0.16 }); }

  /** Reaction thrown: a short airy toss. */
  _throw() { this.noise({ dur: 0.22, freq: 500, freqEnd: 1800, q: 1.4, gain: 0.2, attack: 0.05 }); }

  /** Rate-limited / not allowed: a muted wooden knock. */
  _nope() { this.tone(240, { freqEnd: 200, decay: 0.06, gain: 0.25, type: 'triangle' }); }

  _plated() {
    [[2093, 0.6], [3136, 0.4], [4186, 0.25]].forEach(([f, d]) => this.tone(f, { decay: d, gain: 0.14 }));
    this.tone(180, { decay: 0.06, gain: 0.3 });
  }

  _select() { this.tone(520, { freqEnd: 780, glide: 0.06, decay: 0.08, gain: 0.3 }); }

  _tick({ last = false } = {}) {
    if (last) {
      this.tone(600, { decay: 0.08, gain: 0.35 });
      this.noise({ dur: 0.25, type: 'highpass', freq: 6000, gain: 0.08 });
    } else {
      // woodblock: resonant knock, loud enough to cut through chatter (it is the countdown)
      this.noise({ dur: 0.05, freq: 1200, q: 8, gain: 0.9 });
      this.tone(1200, { decay: 0.05, gain: 0.3 });
      this.tone(1800, { decay: 0.025, gain: 0.08 });
    }
  }

  _drumroll({ duration = 1.6 } = {}) {
    const n = Math.floor(duration * 22);
    for (let i = 0; i < n; i++) {
      const k = i / n;
      this.noise({ when: i / 22, dur: 0.05, freq: 2500, q: 0.9, gain: 0.04 + 0.16 * k });
    }
    this.noise({ when: duration, dur: 1.2, type: 'highpass', freq: 4000, gain: 0.25 });
  }

  _stamp() {
    this.tone(90, { freqEnd: 45, decay: 0.18, gain: 0.5 });
    this.noise({ dur: 0.04, type: 'lowpass', freq: 1500, gain: 0.4 });
  }

  _countup({ ticks = 12 } = {}) {
    for (let i = 0; i < ticks; i++) this.tone(1500 * semis(Math.floor(i / 4)), { when: i / 25, decay: 0.015, gain: 0.08 });
    const end = ticks / 25;
    this.tone(1760, { when: end, decay: 0.5, gain: 0.12 });
    this.tone(2637, { when: end, decay: 0.5, gain: 0.08 });
  }

  _fanfare() {
    const notes = [349.23, 440, 523.25, 698.46];
    notes.forEach((f, i) => {
      const last = i === notes.length - 1;
      for (const d of [-7, 0, 7]) {
        const { o, g } = this.tone(f, { type: 'sawtooth', when: i * 0.11, decay: last ? 0.6 : 0.11, gain: 0.05, detune: d });
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400;
        o.disconnect(); o.connect(lp).connect(g);
      }
    });
    this._clink({ step: 0, when: 0.45 });
    this._clink({ step: 4, when: 0.55 });
  }

  _oink() {
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(220 * semis(-4), t + 0.28);
    const lfo = c.createOscillator();
    lfo.frequency.value = 25;
    const lg = c.createGain();
    lg.gain.value = 40;
    lfo.connect(lg).connect(o.frequency);
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(f).connect(g).connect(this.sfxBus);
    o.start(t); lfo.start(t); o.stop(t + 0.32); lfo.stop(t + 0.32);
  }

  _truth() {
    [174.61, 220, 261.63, 329.63, 392].forEach((f) => this.tone(f, { attack: 0.25, decay: 1.6, gain: 0.07 }));
    for (let i = 0; i < 8; i++) this.tone(2000 + Math.random() * 2000, { when: 0.2 + i * 0.07, decay: 0.3, gain: 0.05 });
  }

  _clink({ step = 0, when = 0 } = {}) {
    const k = semis(step);
    this.tone(2400 * k * (1 + (Math.random() - 0.5) * 0.06), { when, decay: 0.8, gain: 0.12 });
    this.tone(3600 * k * (1 + (Math.random() - 0.5) * 0.06), { when, decay: 0.6, gain: 0.08 });
  }

  _swipe({ dir = 'right' } = {}) {
    const [a, b] = dir === 'right' ? [600, 2500] : [2500, 600];
    this.noise({ dur: 0.18, freq: a, freqEnd: b, q: 1.2, gain: 0.6, attack: 0.03 });
  }

  _fwump() { this.noise({ dur: 0.08, type: 'lowpass', freq: 400, gain: 0.9 }); this.tone(110, { freqEnd: 70, decay: 0.08, gain: 0.25 }); }

  _flutter() {
    for (let i = 0; i < 6; i++) this.noise({ when: i / 30, dur: 0.02, freq: 3000, gain: 0.12 });
  }

  _applause() { for (let i = 0; i < 14; i++) this.noise({ when: Math.random() * 0.5, dur: 0.02, freq: 1800 + Math.random() * 1500, q: 2, gain: 0.08 }); }

  _groan() { this.tone(180, { type: 'triangle', freqEnd: 120, decay: 0.45, gain: 0.12, attack: 0.08 }); }

  _join() { this._ep(698.46, 0, 0.5, 0.12); this._ep(587.33, 0.22, 0.8, 0.12); }

  _error() {
    for (const [f, w] of [[220, 0], [174.61, 0.1]]) {
      const { o, g } = this.tone(f, { type: 'square', when: w, decay: 0.09, gain: 0.08 });
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200;
      o.disconnect(); o.connect(lp).connect(g);
    }
  }

  _bell() {
    for (const strike of [0, 0.55]) {
      [1, 2.76, 5.4, 8.93].forEach((r, i) => this.tone(520 * r, { when: strike, decay: 2.2 / (1 + i * 0.6), gain: 0.12 / (1 + i) }));
    }
  }

  /** Electric-piano-ish FM note (shared with the music bed). */
  _ep(freq, when = 0, dur = 0.8, gain = 0.1, out = this.sfxBus) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const car = c.createOscillator(); car.frequency.value = freq;
    const mod = c.createOscillator(); mod.frequency.value = freq * 14;
    const mg = c.createGain();
    mg.gain.setValueAtTime(freq * 0.8, t);
    mg.gain.exponentialRampToValueAtTime(1, t + 1.2);
    mod.connect(mg).connect(car.frequency);
    const mod2 = c.createOscillator(); mod2.frequency.value = freq;
    const mg2 = c.createGain(); mg2.gain.value = freq * 1.5;
    mg2.gain.setValueAtTime(freq * 1.5, t);
    mg2.gain.exponentialRampToValueAtTime(freq * 0.2, t + dur);
    mod2.connect(mg2).connect(car.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(g).connect(out);
    for (const o of [car, mod, mod2]) { o.start(t); o.stop(t + dur + 0.05); }
  }

  /** One babble syllable for Cyril (speaker phone only). */
  babble({ question = false } = {}) {
    if (!this.ctx || !this.speaker || !this.settings.sfx) return;
    const c = this.ctx;
    const t = c.currentTime;
    const dur = 0.06 + Math.random() * 0.05;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    const f0 = 140 + (Math.random() - 0.5) * 60;
    o.frequency.setValueAtTime(f0, t);
    if (question) o.frequency.exponentialRampToValueAtTime(f0 * semis(3), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);
    const mix = c.createGain(); mix.gain.value = 1;
    // vowel-ish formant pairs (F1 600-800, F2 1000-1600 as DESIGN 3.9) so the mumble has shape
    const V = [[730, 1090], [660, 1600], [610, 1300], [700, 1220], [640, 1020]];
    const [f1, f2] = V[Math.floor(Math.random() * V.length)];
    for (const [fq, q] of [[f1 * (0.97 + Math.random() * 0.06), 6], [f2 * (0.97 + Math.random() * 0.06), 8]]) {
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q;
      o.connect(f).connect(mix);
    }
    mix.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.06);
    this.music?.duck(dur + 0.1);
  }
}

export const audio = new AudioEngine();
