// Pardon? Round 2 "Hum Along": Cyril plays a public-domain tune on the speaker phone (any phone can
// tap "Play here" too); everyone taps its name from four. A music-box strip shows the notes
// passing the comb in time with the sound. Then the reveal plays it the right way round.
import { h, onTap, timerRing } from '../../../ui/components.js';
import { say, disc, colourOf, pips, NOTE, SPEAKER } from './kit.js';
import { timeline, play } from '../tune.js';

const MODE = {
  normal: null,
  wonky: { t: 'Wonky', s: 'Wrong octaves. Double points.' },
  backwards: { t: 'Backwards', s: 'Played back to front. Double points.' },
};
const KIND = { nursery: 'Nursery rhyme', carol: 'Carol', folk: 'Folk and anthems', classical: 'Classical' };

/** Hush the house band while a tune plays (speaker phone only has music anyway). */
function hushMusic(audio) {
  const bus = audio?.musicBus;
  if (!bus || !audio.ctx) return () => {};
  const keep = () => { try { bus.gain.cancelScheduledValues(audio.ctx.currentTime); bus.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.08); } catch { /* fine */ } };
  keep();
  return { keep, restore() { try { bus.gain.setTargetAtTime(audio.music?.level ?? 0.32, audio.ctx.currentTime, 0.4); } catch { /* fine */ } } };
}

/** The music-box strip: a punched paper roll sliding under a brass comb. Pure function of t (s). */
function musicBox(tl) {
  const lo = Math.min(...tl.events.map((e) => e.m));
  const hi = Math.max(...tl.events.map((e) => e.m));
  const span = Math.max(7, hi - lo);
  const PX = 64; // px per second
  const holes = tl.events.map((e) => h('i.pd-hole', { style: { left: `${e.at * PX}px`, width: `${Math.max(10, e.dur * PX - 6)}px`, bottom: `${10 + ((e.m - lo) / span) * 70}%` } }));
  const paper = h('div.pd-paper', { style: { width: `${tl.length * PX + 400}px` } }, holes);
  const el = h('div.pd-box', h('div.pd-roll', paper), h('div.pd-comb'), h('div.pd-box-glow'));
  let last = -1;
  el.at = (t) => {
    paper.style.transform = `translateX(${(-t * PX).toFixed(1)}px)`;
    // light the holes passing the comb
    const i = tl.events.findIndex((e) => t >= e.at && t < e.at + e.dur);
    if (i !== last) {
      if (last >= 0) holes[last].classList.remove('on');
      if (i >= 0) holes[i].classList.add('on');
      last = i;
      el.classList.toggle('ping', i >= 0);
    }
  };
  return el;
}

const tune = {
  id: 'pardon-tune',
  layout: 'split',
  shot: 'vote',
  rail: false,
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const tuneObj = { notes: p.notes, bpm: p.bpm };
    const tl = timeline(tuneObj, p.mode, p.seed);
    const box = musicBox(tl);
    const timer = timerRing();
    const mode = MODE[p.mode];
    const speaker = ctx.players.find((x) => x.id === ctx.settings?.speakerId);
    const iAmSpeaker = !!ctx.isSpeaker;
    let stop = null;
    const startPlay = () => {
      stop?.();
      const from = Math.max(0, (ctx.elapsed() - p.playAt) / 1000);
      if (from >= tl.length) return;
      ctx.audio.unlock?.();
      stop = play(ctx.audio, tuneObj, p.mode, p.seed, from);
    };
    // everyone at the table, greyed until they lock in, then lit with their time (never what they picked)
    const raceDiscs = new Map(ctx.players.map((pl) => [pl.id, h('span.pd-racer', { style: { '--pc': colourOf(pl) } }, disc(pl, { size: 36 }), h('b.pd-racer-n'), h('span.pd-racer-nm', pl.name), h('span.pd-racer-sc', String(p.scores?.[pl.id] ?? 0)))]));
    const race = h('div.pd-race', [...raceDiscs.values()]);
    const here = h('button.pd-here', { type: 'button', 'data-e2e': 'pd-play-here' }, h('span.ic', { html: SPEAKER }), h('span', iAmSpeaker ? 'Playing here' : 'Play here too'));
    if (!iAmSpeaker) onTap(here, () => { here.classList.add('on'); startPlay(); });
    else here.classList.add('on');
    show.append(h('div.pd-tunetop',
      h('div.pd-tunehead',
        h('div.pd-tunehead-t', h('b', mode ? mode.t : 'Name that tune'), h('span', mode ? mode.s : KIND[p.kind] || '')),
        pips(p.index, p.count)),
      box,
      h('div.pd-tunefoot', h('span.pd-from', iAmSpeaker || !speaker ? '' : `Playing on ${speaker.name}’s phone`), here),
      race));
    if (mode) show.firstChild.classList.add('weird');

    const btns = new Map();
    let picked = ctx.mine.game.id || null;
    const list = h('div.pd-opts', p.options.map((o, i) => {
      const b = h('button.pd-opt', { type: 'button', 'data-e2e': `pd-opt-${o.id}`, style: { '--d': `${i * 50}ms` } }, h('span.pd-opt-n', 'ABCD'[i]), h('span.pd-opt-t', o.title));
      onTap(b, () => {
        if (picked || ctx.elapsed() < p.playAt - 250) return;
        picked = o.id;
        ctx.client.act('pd-tune', { id: o.id }, { id: o.id, at: ctx.elapsed() });
        ctx.haptic('submit');
        render(ctx);
      }, { sound: 'select', buzz: 'select' });
      btns.set(o.id, b);
      return b;
    }));
    const status = h('div.pd-status');
    const watch = h('div.pd-watch', h('b', '0.0'), h('span', 'sec'));
    // everyone at the table, greyed until they lock in, then stamped 1st, 2nd... (not what they picked)
    sheet.append(h('div.pd-sheet.pd-in', h('div.pd-askrow', h('div.pd-ask', 'What’s the tune?'), watch), list, status));
    const render = (c) => {
      const early = c.elapsed() < p.playAt - 250;
      for (const [id, b] of btns) {
        b.setAttribute('aria-pressed', String(picked === id));
        b.disabled = !!picked || early;
        b.classList.toggle('dim', !!picked && picked !== id);
      }
      const mineAt = c.mine.game.at;
      status.textContent = picked
        ? `Locked in${mineAt ? ` at ${Math.max(0, (mineAt - p.playAt) / 1000).toFixed(1)}s` : ''}. No changing your mind.`
        : early ? 'Get ready…' : 'Tap as soon as you know it.';
      const order = c.progress.order || [];
      for (const [id, d] of raceDiscs) {
        const k = order.indexOf(id);
        d.classList.toggle('in', k >= 0);
        const sec = c.progress.secs?.[id];
        d.querySelector('.pd-racer-n').textContent = k >= 0 ? (sec != null ? `${sec.toFixed(1)}s` : 'in') : '';
        d.classList.toggle('first', k === 0);
      }
    };
    render(ctx);
    const hush = iAmSpeaker ? hushMusic(ctx.audio) : null;
    // Cyril says his line before the music starts, then gets out of the way
    const cancel = ctx.frozen ? () => {} : say(ctx, ctx.line(p.mode === 'wonky' ? 'pdTuneWonky' : p.mode === 'backwards' ? 'pdTuneBack' : 'pdTune'), { hold: 1200, compact: true }, 0);
    let playing = false;
    let lastOrder = 0;
    return {
      update(c) {
        if (c.mine.game.id) picked = c.mine.game.id;
        render(c);
        const n = (c.progress.order || []).length;
        if (n > lastOrder && !c.frozen) c.audio.sfx('pop');
        lastOrder = n;
      },
      frame(c) {
        const t = (c.elapsed() - p.playAt) / 1000;
        const mineAt = c.mine.game.at;
        const shownT = picked && mineAt ? (mineAt - p.playAt) / 1000 : t;
        watch.firstChild.textContent = Math.max(0, shownT).toFixed(1);
        watch.classList.toggle('stopped', !!picked);
        box.at(Math.max(-0.5, t));
        if (!playing && t >= 0 && !c.frozen) {
          playing = true;
          if (iAmSpeaker) startPlay();
          render(c);
          c.cyril.react('drumroll', { duration: Math.min(4000, tl.length * 1000) });
        }
        hush?.keep && t < tl.length + 0.5 && hush.keep();
      },
      unmount() { cancel(); stop?.(); hush?.restore?.(); },
    };
  },
};

const tuneReveal = {
  id: 'pardon-tune-reveal',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const t = p.tune;
    const mode = MODE[p.mode];
    const rows = ctx.players.map((pl) => ({ pl, a: p.answers[pl.id] || null }))
      .sort((x, y) => (y.a?.pts || 0) - (x.a?.pts || 0) || (x.a ? 0 : 1) - (y.a ? 0 : 1));
    const titleOf = (id) => p.options.find((o) => o.id === id)?.title || '';
    const list = h('div.pd-tr-list', rows.map(({ pl, a }, i) => h(`div.pd-tr-row${a?.ok ? '.ok' : a ? '.no' : '.skip'}${pl.id === p.first ? '.first' : ''}`, { style: { '--pc': colourOf(pl), '--d': `${1200 + i * 110}ms` } },
      disc(pl, { size: 32 }),
      h('span.nm', pl.name),
      h('span.what', a ? (a.ok ? `${a.secs.toFixed(1)}s${pl.id === p.first ? ' · first!' : ''}` : titleOf(a.id)) : 'no answer'),
      h('b.pts', a?.ok ? `+${a.pts}` : '0'))));
    const card = h('div.pd-tr-card',
      h('div.pd-tr-ic', { html: NOTE }),
      h('div.pd-tr-title', t.title),
      h('div.pd-tr-by', t.by + (mode ? ` · that was ${mode.t.toLowerCase()}` : '')));
    show.append(h('div.pd-tr', card, list));
    const all = rows.length && rows.every((r) => r.a?.ok);
    const none = !rows.some((r) => r.a?.ok);
    ctx.cyril.react(none ? 'sad' : 'delight', { duration: ctx.frozen ? 60000 : 1200 });
    let stop = null;
    if (!ctx.frozen) {
      ctx.audio.sfx(none ? 'groan' : 'truth');
      if ((p.answers[ctx.meId]?.ok)) ctx.haptic('win');
      // the speaker phone plays the real thing, the right way round, once
      if (ctx.isSpeaker && p.mode !== 'normal') setTimeout(() => { stop = play(ctx.audio, t, 'normal', 1, 0, { gain: 0.12 }); }, 900);
    }
    const cancel = say(ctx, all ? ctx.line('pdTuneAll') : none ? ctx.line('pdTuneNone') : null, { hold: 2200 }, 1600);
    return { unmount() { cancel(); stop?.(); } };
  },
};

export default [tune, tuneReveal];
