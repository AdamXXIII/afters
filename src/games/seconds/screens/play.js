// Who Had Seconds? play screens:
//  seconds-task  - the secret place card under a napkin (hold to read), then Ready.
//  seconds-count - the synced "3, 2, 1, NOW!" on every phone (driven by ctx.elapsed()), sound + haptics.
//  seconds-vote  - point at a face (live, everyone sees who points where), or wait.
import { h, onTap } from '../../../ui/components.js';
import {
  disc, typeBadge, topCard, say, TYPE_ICON, TYPE_NAME, TYPE_SHOUT, FINGER, HOLD,
  countBeep, nowHit, freezeHit, where,
} from './kit.js';

// ---------- task ----------
const task = {
  id: 'seconds-task',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const priv = ctx.priv || {};
    const top = topCard(p, 'Read your secret task', { sub: 'Hold the napkin. Keep your face still.' });
    const ready = new Map(ctx.players.map((pl) => [pl.id, disc(pl, { size: 30 })]));
    top.firstChild.append(h('div.sc-readyrow', [...ready.values()]));
    show.append(top);

    // the secret card: identical shape for the faker and everyone else
    const meta = h('div.sc-cardmeta', typeBadge(p.type),
      priv.faker
        ? h('span.sc-cat', priv.peek ? h('span', 'Peek: ', h('b', priv.peek)) : h('span', 'Category: ', h('b', '?')))
        : h('span.sc-cat', h('b', priv.cat || '')));
    const body = priv.faker
      ? h('div.sc-cardbody.faker',
        h('div.sc-secret', 'You had seconds.'),
        h('div.sc-hint', h('b', 'You’re the faker. '), 'Everyone else has a task you don’t.'),
        h('div.sc-hint', `${priv.hint} Copy the others. Don’t get caught.`),
        priv.two ? h('div.sc-hint2', 'Somebody else had seconds too.') : null)
      : h('div.sc-cardbody', h('div.sc-secret.task', priv.text || ''));
    const card = h('div.sc-secretcard', meta, body);
    const napkin = h('div.sc-napkin', h('span.ic', { html: HOLD }), h('b', 'Hold to read'), h('small', 'Let go to hide it'));
    const wrap = h('div.sc-cardwrap', { 'data-e2e': 'sc-card' }, card, napkin);
    let peeked = !!ctx.mine.game.peeked;
    if (ctx.frozen && ctx.demo) { wrap.classList.add('open'); peeked = true; } // screenshots show the card
    const go = h('button.btn.block.sc-go', { type: 'button', 'data-e2e': 'sc-ready', disabled: !peeked }, 'Got it');
    const open = (on) => {
      wrap.classList.toggle('open', on);
      if (on && !peeked) { peeked = true; ctx.client.act('sc-noop', {}, { peeked: true }); ctx.haptic('select'); render(ctx); }
    };
    wrap.addEventListener('pointerdown', (e) => { try { wrap.setPointerCapture?.(e.pointerId); } catch { /* synthetic */ } open(true); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) wrap.addEventListener(ev, () => open(false));
    wrap.addEventListener('contextmenu', (e) => e.preventDefault());
    wrap.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') open(true); });
    wrap.addEventListener('keyup', () => open(false));
    wrap.tabIndex = 0;
    onTap(go, () => {
      if (ctx.mine.game.ready) return;
      ctx.client.act('sc-ready', {}, { ready: true });
      ctx.audio.sfx('plated'); ctx.haptic('submit');
    }, { sound: null, buzz: null });
    sheet.append(h('div.sc-sheet.sc-tasksheet.sc-in', wrap, go));

    const render = (c) => {
      const me = c.mine.game;
      go.disabled = !peeked || !!me.ready;
      go.textContent = me.ready ? 'Ready. Act natural.' : peeked ? 'Got it' : 'Read it first';
      for (const [id, d] of ready) d.classList.toggle('in', !!c.progress.done[id]);
    };
    render(ctx);
    const cancel = p.task === 0 && p.turn === 0 ? say(ctx, ctx.line('scTask'), {}, 700) : () => {};
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1200 });
    return { update: render, frame(c) { top.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

// ---------- count: 3, 2, 1, NOW ----------
const count = {
  id: 'seconds-count',
  layout: 'show',
  shot: 'reveal',
  rail: false,
  mount({ show }, ctx) {
    const p = ctx.payload;
    const b = p.beats;
    const num = h('div.sc-num');
    const ring = h('div.sc-ring', { html: '<svg viewBox="0 0 120 120"><circle class="trk" cx="60" cy="60" r="54"/><circle class="arc" cx="60" cy="60" r="54" pathLength="100"/></svg>' });
    const shout = h('div.sc-shout', h('span.ic', { html: TYPE_ICON[p.type] }), h('b', TYPE_SHOUT[p.type]));
    const plate = h('div.sc-plate', ring, num, shout);
    const line = h('div.sc-countline');
    const head = h('div.sc-countwhere', where(p));
    show.append(h('div.sc-count', head, plate, line));

    const beats = [['three', 3], ['two', 2], ['one', 1]];
    const fired = new Set();
    const late = (at, t) => t - at > 450; // mounted after the beat: show it, don't replay the sound
    const fire = (key, t, at, fn) => {
      if (fired.has(key) || t < at) return;
      fired.add(key);
      if (!ctx.frozen && !late(at, t)) fn();
    };
    const run = (c) => {
      const t = c.elapsed();
      let shown = null;
      for (const [k, n] of beats) if (t >= b[k]) shown = n;
      const isNow = t >= b.now;
      const frozenBeat = t >= b.freeze;
      plate.classList.toggle('now', isNow);
      plate.classList.toggle('freeze', frozenBeat);
      if (!isNow) {
        num.textContent = shown == null ? '' : String(shown);
        const start = shown == null ? 0 : b[beats[3 - shown][0]];
        const k = shown == null ? 0 : Math.min(1, (t - start) / (b.two - b.three));
        ring.style.setProperty('--k', String(k));
        num.style.setProperty('--pop', String(shown == null ? 0 : Math.max(0, 1 - (t - start) / 260)));
        line.textContent = shown == null ? 'Get ready...' : `${TYPE_NAME[p.type]} on three`;
      } else {
        num.textContent = '';
        line.textContent = frozenBeat ? 'Freeze. Look around the table.' : 'Do it! Hold it!';
        shout.style.setProperty('--pop', String(Math.max(0, 1 - (t - b.now) / 300)));
      }
      for (const [k, n] of beats) {
        fire(k, t, b[k], () => {
          countBeep(c.audio, n); c.haptic('stamp');
          c.cyril.react(n === 1 ? 'drumroll' : 'smug', { duration: 900 });
        });
      }
      fire('now', t, b.now, () => {
        nowHit(c.audio); c.haptic('win'); c.stage.shake?.();
        c.cyril.react('shock', { duration: 1200 });
      });
      fire('freeze', t, b.freeze, () => { freezeHit(c.audio); c.haptic('tap'); });
    };
    run(ctx);
    if (ctx.frozen) ctx.cyril.react(ctx.elapsed() >= b.now ? 'shock' : 'drumroll', { duration: 60000 });
    return { frame: run };
  },
};

// ---------- vote: point at the faker ----------
const vote = {
  id: 'seconds-vote',
  layout: 'split',
  shot: 'vote',
  mount({ show, sheet }, ctx) {
    const p = ctx.payload;
    const sub = p.final
      ? 'One faker? Or are you all faking? Most votes decides.'
      : p.last
        ? 'Last task. The most-pointed-at person is accused.'
        : `${p.need} pointing at one person accuses them. Or wait.`;
    const top = topCard(p, 'Who had seconds?', { sub });
    show.append(top);
    const pick = (target) => {
      if (ctx.mine.game.target === target) return;
      ctx.client.act('sc-vote', { target }, { target });
    };
    const tiles = new Map();
    const others = ctx.players.filter((pl) => pl.id !== ctx.meId);
    const grid = h(`div.sc-suspects.n${others.length}`, others.map((pl) => {
      const who = h('span.sc-pointers');
      const n = h('span.sc-n');
      const b = h('button.sc-suspect', { type: 'button', 'data-e2e': `sc-vote-${pl.id}`, style: { '--pc': ctx.player(pl.id)?.colour || '#7A4A2A' } },
        disc(pl, { size: 54 }), h('span.nm', pl.name), n, who, h('span.sc-finger', { html: FINGER }));
      onTap(b, () => pick(pl.id), { sound: 'select', buzz: 'select' });
      tiles.set(pl.id, { b, who, n, discs: new Map() });
      return b;
    }));
    const extras = (p.options || []).map((opt) => {
      const label = opt === 'all' ? 'We’re all faking!' : 'Not sure yet';
      const who = h('span.sc-pointers');
      const b = h(`button.sc-wait.${opt}`, { type: 'button', 'data-e2e': `sc-vote-${opt}` }, h('span.lb', label), who);
      onTap(b, () => pick(opt), { sound: 'select', buzz: 'select' });
      tiles.set(opt, { b, who, n: null, discs: new Map() });
      return b;
    });
    sheet.append(h('div.sc-sheet.sc-votesheet.sc-in', grid, ...extras));
    const update = (c) => {
      const votes = c.progress.votes || {};
      const mineT = c.mine.game.target;
      for (const [id, tl] of tiles) {
        tl.b.setAttribute('aria-pressed', String(mineT === id));
        const ids = Object.keys(votes).filter((v) => votes[v] === id);
        for (const [vid, d] of tl.discs) if (!ids.includes(vid)) { d.remove(); tl.discs.delete(vid); }
        for (const vid of ids) if (!tl.discs.has(vid)) { const d = disc(c.player(vid), { size: 22, cls: '.pop' }); tl.discs.set(vid, d); tl.who.append(d); }
        if (tl.n) tl.n.textContent = ids.length ? String(ids.length) : '';
        tl.b.classList.toggle('hot', !p.last && !p.final && ids.length >= p.need - 1 && ids.length > 0);
      }
    };
    update(ctx);
    const cancel = say(ctx, ctx.line(p.last || p.final ? 'scVoteLast' : 'scVote'), {}, 600);
    ctx.cyril.react('smug', { duration: ctx.frozen ? 60000 : 1200 });
    return { update, frame(c) { top.timer.set(c.remaining(), c.duration); }, unmount: cancel };
  },
};

export default [task, count, vote];
