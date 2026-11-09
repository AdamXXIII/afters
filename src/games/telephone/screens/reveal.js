// telephone-reveal: one line plays back, one step at a time, in sync on every phone.
// Sentences type themselves out on place cards, drawings redraw stroke by stroke, guesses get
// a verdict ("Nailed it" / "Lost it"), and the end beat puts first vs last under a rubber stamp.
import './tp.css';
import { drawingView } from '../../../shared/drawing.js';
import { h, av, who, tilt, cordSvg, kindLabel, TP_ICONS, fitText } from './kit.js';

const TYPE_MS = 26; // per character

export default {
  id: 'telephone-reveal',
  layout: 'show',
  shot: 'reveal',
  mount({ show }, ctx) {
    const p = ctx.payload;
    const chain = p.chain;
    const steps = chain.steps;
    const owner = ctx.player(chain.ownerId);
    const seed = ctx.phase.seed;
    const flip = p.mode === 'flip';
    const quiet = ctx.frozen;
    const sfx = (n, o) => { if (!quiet) ctx.audio.sfx(n, o); };

    // header
    const header = h('div.tp-rv-head',
      h('div.tp-rv-head-l', av(owner, { size: 34 }),
        h('div', h('div.t-eyebrow', `Line ${p.index + 1} of ${p.count}`), h('div.tp-rv-title', `${owner?.name || 'Someone'}'s ${flip ? 'flipbook' : 'rumour'}`))),
      h('div.tp-rv-lines', Array.from({ length: p.count }, (_, i) => h(`i${i < p.index ? '.done' : ''}${i === p.index ? '.cur' : ''}`))));

    // the track: every avatar on this line, linked by phone cord
    const nodes = steps.map((st, i) => h('div.tp-tr-node', { style: { '--pc': ctx.player(st.authorId)?.colour } },
      av(ctx.player(st.authorId), { size: 30 }), h('span.tp-tr-k', { html: TP_ICONS[st.kind === 'draw' ? 'brush' : st.kind === 'guess' ? 'eye' : 'pencil'] }), h('span.tp-tr-v')));
    const track = h('div.tp-track', ...nodes.flatMap((n, i) => [n, i < nodes.length - 1 ? h('span.tp-tr-cord', { html: cordSvg(40, 16, { loops: 3, stroke: 2.2 }) }) : null]));
    if (steps.length > 6) track.classList.add('tight');

    const prevSlot = h('div.tp-rv-prev');
    const stageSlot = h('div.tp-rv-stage');
    const root = h('div.tp-rv', header, h('div.tp-rv-gap'), prevSlot, stageSlot, track);
    show.append(root);
    if (ctx.isHost) {
      const nx = h('button.tp-next', { type: 'button', 'data-e2e': 'tp-next' }, 'Next line', h('span', { html: TP_ICONS.send }));
      nx.addEventListener('click', () => { ctx.audio.sfx('tap'); ctx.client.act('next', {}); });
      show.append(nx);
    }

    // ---- cards
    let cur = -2; // beat index currently shown (-1 = title, beats.length = end)
    let live = null; // {kind:'text'|'draw'|'flip', ...}
    const textCard = (st, i, { big = true } = {}) => {
      const pl = ctx.player(st.authorId);
      const txt = h('div.tp-card-txt');
      const card = h(`div.tp-card.tp-card-text.k-${st.kind}${big ? '' : '.mini'}`, { style: { '--tilt': `${tilt(seed, `t${i}`, 2.4)}deg`, '--pc': pl?.colour } },
        h('div.tp-card-eyebrow', i === 0 ? 'It started as' : st.kind === 'guess' ? 'Which they guessed as' : 'They wrote'),
        txt,
        h('div.tp-stamp', av(pl, { size: 20 }), h('span', `${pl?.name || '?'} ${kindLabel(st.kind)}`), st.auto ? h('em', '(Cyril filled in)') : null));
      card.txt = txt;
      return card;
    };
    const drawCard = (st, i, { guess = null } = {}) => {
      const pl = ctx.player(st.authorId);
      const view = drawingView(st.drawing, { className: 'tp-rv-view' });
      const asked = flip ? steps[0].text : steps[i - 1]?.text;
      const card = h(`div.tp-card.tp-card-draw${guess ? '.with-guess' : ''}`, { style: { '--tilt': `${tilt(seed, `d${i}`, 1.8)}deg`, '--pc': pl?.colour } },
        !guess && asked ? h('div.tp-asked', h('span', flip ? 'Animate' : 'Draw'), h('b', asked)) : null,
        view.el,
        h('div.tp-stamp.on-paper', av(pl, { size: 20 }), h('span', `${pl?.name || '?'} drew`), st.auto ? h('em', '(Cyril\'s doodle)') : null),
        st.drawing?.strokes?.length ? null : h('div.tp-blank', 'Not a single line.'));
      card.view = view;
      return card;
    };
    const mini = (st, i) => {
      if (!st) return null;
      if (st.kind === 'draw') {
        const v = drawingView(st.drawing, { className: 'tp-mini-view' });
        requestAnimationFrame(() => v.frame());
        return h('div.tp-prev-card.draw', h('span.t-eyebrow', 'was'), v.el);
      }
      return h('div.tp-prev-card', h('span.t-eyebrow', i === 0 ? 'was' : 'was'), h('span.tp-prev-txt', st.text));
    };
    const enter = (el) => { if (!quiet) el.animate([{ transform: 'translateY(26px) rotate(var(--tilt, 0deg)) scale(.96)', opacity: 0 }, { transform: 'rotate(var(--tilt, 0deg))', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }); };

    const setTrack = (bi) => {
      nodes.forEach((n, i) => {
        n.classList.toggle('cur', i === bi);
        n.classList.toggle('past', i < bi || bi >= steps.length);
        const st = steps[i];
        const v = n.querySelector('.tp-tr-v');
        const showV = st.kind === 'guess' && (i < bi || bi >= steps.length || (i === bi && live?.verdictShown));
        v.className = `tp-tr-v${showV ? (st.match ? ' ok' : ' no') : ''}`;
      });
    };

    const showBeat = (bi, c) => {
      cur = bi;
      live = null;
      prevSlot.replaceChildren();
      if (bi === -1) {
        const card = h('div.tp-card.tp-card-title', { style: { '--tilt': '-1.2deg' } },
          h('div.tp-title-ic', { html: TP_ICONS.handset }),
          h('div.tp-title-k', `Line ${p.index + 1}`),
          h('div.tp-title-who', av(owner, { size: 28 }), h('span', `${owner?.name || 'Someone'} started this one`)),
          h('div.tp-title-n', `${steps.length} people, ${steps.filter((s) => s.kind === 'draw').length} drawings, one rumour`));
        stageSlot.replaceChildren(card); enter(card);
        if (!quiet) c.say(c.line('tpRevealStart', { n: p.index + 1 }), { hold: 1400, compact: true });
        setTrack(-1);
        return;
      }
      if (bi < p.beats.length) {
        const st = steps[bi];
        if (st.kind === 'guess' && steps[bi - 1]?.kind === 'draw') {
          const dc = drawCard(steps[bi - 1], bi - 1, { guess: true });
          const gc = textCard(st, bi);
          gc.classList.add('as-caption');
          const combo = h('div.tp-combo', dc, gc);
          stageSlot.replaceChildren(combo); enter(gc);
          requestAnimationFrame(() => dc.view.frame());
          dc.classList.add('done');
          live = { kind: 'text', card: gc, st, beat: p.beats[bi], verdictShown: false, still: dc };
          sfx('page', { up: false });
          setTrack(bi);
          return;
        }
        if (st.kind === 'draw') {
          const card = drawCard(st, bi);
          stageSlot.replaceChildren(card); enter(card);
          live = { kind: 'draw', card, beat: p.beats[bi] };
          if (!st.drawing?.strokes?.length) { c.cyril.react('sad'); if (!quiet) c.say(c.line('tpBlank'), { hold: 1200, compact: true }); }
          sfx('page', { up: true });
        } else {
          const card = textCard(st, bi);
          stageSlot.replaceChildren(card); enter(card);
          fitText(card.txt, { max: 40, min: 26, maxH: 150 });
          live = { kind: 'text', card, st, beat: p.beats[bi], verdictShown: false };
          sfx('page', { up: false });
        }
        setTrack(bi);
        return;
      }
      if (flip && bi === p.beats.length) {
        // flipbook: all frames loop
        const frames = steps.filter((s) => s.kind === 'draw');
        const views = frames.map((f) => drawingView(f.drawing, { className: 'tp-rv-view' }));
        const holder = h('div.tp-flip', ...views.map((v) => v.el));
        const strip = h('div.tp-flip-strip', frames.map((f, k) => h('span.tp-flip-fr', av(ctx.player(f.authorId), { size: 24 }), h('i', String(k + 1)))));
        const card = h('div.tp-card.tp-card-draw.tp-card-flip', { style: { '--tilt': '0deg' } }, h('div.tp-film', { html: TP_ICONS.film }, h('span', 'Roll film')), holder,
          h('div.tp-flip-cap', `“${steps[0].text}”`));
        card.append(strip);
        stageSlot.replaceChildren(card); enter(card);
        live = { kind: 'flip', views, at: p.end.flipAt };
        c.cyril.react('delight');
        if (!quiet) c.say(c.line('tpFlip'), { hold: 1600, compact: true });
        sfx('fanfare');
        setTrack(steps.length);
        return;
      }
      // end beat: first vs last on one card, verdict stamped above it
      const lastStep = steps[p.end.lastStep] || steps[steps.length - 1];
      const verdict = p.end.verdict;
      const owner0 = ctx.player(steps[0].authorId);
      const lastBy = ctx.player(lastStep.authorId);
      const lastEl = flip ? (() => { const v = drawingView(lastStep.drawing, { className: 'tp-mini-view' }); requestAnimationFrame(() => v.frame()); return v.el; })() : h('div.tp-fl-txt.last', lastStep.text);
      const stamp = h(`div.tp-verdict.${verdict}`, verdict === 'straight' ? 'Straight through!' : verdict === 'flip' ? 'That\'s a wrap' : 'Crossed wires!');
      const crosser = p.end.crossedAt > 0 ? ctx.player(steps[p.end.crossedAt].authorId) : null;
      const cap = verdict === 'crossed' && crosser ? h('div.tp-end-cap', 'Lost at step ', h('b', String(p.end.crossedAt + 1)), ' by ', who(crosser, { size: 18 })) : verdict === 'straight' ? h('div.tp-end-cap', h('b', '+300'), ' to everyone on this line') : null;
      const card = h('div.tp-card.tp-fl', { style: { '--tilt': '-1deg' } },
        h('div.tp-fl-k', h('span', 'It started as'), who(owner0, { size: 18 })),
        h('div.tp-fl-txt', steps[0].text),
        h('div.tp-fl-cord', { html: cordSvg(300, 22, { loops: 12, stroke: 2.6 }) }),
        h('div.tp-fl-k', h('span', 'It ended as'), who(lastBy, { size: 18 })),
        lastEl);
      const pair = h('div.tp-end', stamp, card, cap);
      stageSlot.replaceChildren(pair);
      if (!quiet) pair.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
      setTrack(steps.length);
      if (verdict === 'straight') { c.cyril.react('delight'); sfx('fanfare'); if (!quiet) c.say(c.line('tpStraight'), { hold: 1800, compact: true }); } else if (verdict === 'crossed') { c.cyril.react('guffaw'); sfx('stamp'); if (!quiet) c.say(c.line('tpCrossed'), { hold: 1800, compact: true }); }
      if (!quiet) c.stage.shake?.();
      c.haptic('stamp');
      if (quiet) c.say(verdict === 'straight' ? c.line('tpStraight') : c.line('tpCrossed'), { hold: 99999, compact: true });
    };

    const beatAt = (t) => {
      if (t >= p.end.at) return p.beats.length + (flip ? 1 : 0);
      if (flip && p.end.flipAt != null && t >= p.end.flipAt) return p.beats.length;
      let bi = -1;
      p.beats.forEach((b, i) => { if (t >= b.at) bi = i; });
      return bi;
    };

    const frame = (c) => {
      const t = c.elapsed();
      const bi = beatAt(t);
      if (bi !== cur) showBeat(bi, c);
      if (!live) return;
      if (live.kind === 'draw') {
        const bt = t - live.beat.at;
        live.card.view.frame(Math.max(0, bt - 150));
        live.card.classList.toggle('done', bt >= live.beat.replay);
      } else if (live.kind === 'text') {
        live.still?.view.frame();
        const bt = t - live.beat.at - 260;
        const s = live.st.text || '';
        const n = Math.max(0, Math.min(s.length, Math.floor(bt / TYPE_MS)));
        if (live.card.txt.dataset.n !== String(n)) {
          live.card.txt.dataset.n = String(n);
          live.card.txt.replaceChildren(s.slice(0, n), h('span.tp-caret', n < s.length ? '' : ''), h('span.tp-ghost', s.slice(n)));
        }
        if (live.st.kind === 'guess' && !live.verdictShown && n >= s.length && bt > s.length * TYPE_MS + 380) {
          live.verdictShown = true;
          const ok = !!live.st.match;
          live.card.append(h(`div.tp-pill.${ok ? 'ok' : 'no'}`, ok ? 'Nailed it' : 'Lost it'));
          setTrack(cur);
          const crosser = cur === p.end.crossedAt;
          if (ok) { c.cyril.react('delight'); sfx('select'); if (!quiet && c.phase.seed % 2 === cur % 2) c.say(c.line('tpNailed'), { hold: 1100, compact: true }); } else {
            c.cyril.react(crosser ? 'shock' : 'guffaw');
            sfx('nope');
            if (crosser && !quiet) c.say(c.line('tpLost', { name: c.player(live.st.authorId)?.name || 'someone' }), { hold: 1500, compact: true });
          }
          if (quiet && crosser) c.say(c.line('tpLost', { name: c.player(live.st.authorId)?.name || 'someone' }), { hold: 99999, compact: true });
        }
      } else if (live.kind === 'flip') {
        const bt = Math.max(0, t - live.at);
        const k = Math.floor(bt / 260) % live.views.length;
        live.views.forEach((v, i) => { v.el.style.opacity = i === k ? '1' : '0'; if (i === k) v.frame(); });
        stageSlot.querySelectorAll('.tp-flip-fr').forEach((f, i) => f.classList.toggle('on', i === k));
      }
    };
    frame(ctx);
    return { frame };
  },
};
