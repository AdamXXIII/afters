// telephone-reveal: the album. One rumour at a time, page by page, the host turning the pages and
// every phone in step. Every page stays on the party line (a curly cord down the left), so the table
// can scroll back and watch the sentence drift. The newest page types itself out or redraws itself
// stroke by stroke; descriptions get a "Nailed it" / "Lost it" stamp; the last page is the verdict.
import './tp.css';
import { drawingView } from '../../../shared/drawing.js';
import { h, av, who, tilt, cordSvg, TP_ICONS, ICONS } from './kit.js';

const TYPE_MS = 26; // per character
const ANYONE_AFTER = 15000; // matches host.js: guests may turn the page once the host goes quiet

const verbOf = (st, flip, s) => (s === 0 ? 'wrote' : st.kind === 'draw' ? (flip ? `drew frame ${s}` : 'drew it') : 'described it as');

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
    const total = steps.length + 1; // pages + the verdict
    const sfx = (n, o) => { if (!quiet) ctx.audio.sfx(n, o); };
    const hostP = ctx.players.find((x) => x.isHost);

    // ---- header: whose rumour, which page
    const pageNo = h('span.tp-al-pg');
    const pips = h('div.tp-al-pips', Array.from({ length: total }, (_, i) => h(`i${i === total - 1 ? '.end' : ''}`)));
    // Cyril sits as a small badge during the album: the book gets the whole screen
    const cy = h('div.tp-al-cy-txt');
    const cyril = h('div.tp-al-cy', h('span.tp-al-cy-badge', { html: ICONS.flame }), cy);
    const say = (lines) => {
      const t = [].concat(lines || []).join(' ');
      if (!t) return;
      cy.textContent = t;
      if (!quiet && !ctx.reduced) cy.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
    };
    const header = h('div.tp-al-head',
      av(owner, { size: 36 }),
      h('div.tp-al-head-t',
        // the sentence it started as stays pinned, so every page plays against it
        h('div.tp-al-title', `“${steps[0].text}”`),
        h('div.tp-al-sub', h('span', `${owner?.name || 'Someone'} · ${p.index + 1} of ${p.count}`), pips, pageNo)),
      cyril);

    // ---- the feed
    const list = h('div.tp-al-list');
    const feed = h('div.tp-al-feed', list);

    // ---- the bar: host turns pages; guests see who is turning them
    const nextLbl = h('span.tp-al-next-l', 'Next page');
    const nextBtn = h('button.tp-al-next', { type: 'button', 'data-e2e': 'tp-next' }, nextLbl, h('span.tp-al-next-ic', { html: TP_ICONS.send }));
    const waitNote = h('div.tp-al-wait', av(hostP, { size: 26 }), h('span', `${hostP?.name || 'The host'} is turning the pages`));
    const bar = h('div.tp-al-bar', ctx.isHost ? nextBtn : waitNote);
    let shownPage = -1;
    nextBtn.addEventListener('click', () => {
      if (nextBtn.disabled) return;
      ctx.audio.sfx('tap'); ctx.haptic('select');
      nextBtn.disabled = true;
      ctx.client.act('next', { page: shownPage });
      setTimeout(() => { nextBtn.disabled = false; }, 500);
    });

    const topBtn = h('button.tp-al-top', { type: 'button', 'data-e2e': 'tp-top' }, 'Read it from the top');
    topBtn.addEventListener('click', () => { ctx.audio.sfx('tap'); feed.scrollTo({ top: 0, behavior: ctx.reduced ? 'auto' : 'smooth' }); });
    const root = h('div.tp-al', header, feed, topBtn, bar);
    show.append(root);

    // ---- pages
    const rows = [];
    const pageAt = (c) => c.elapsed() - (c.progress?.pageT || 0);

    const textCard = (st, s, live) => {
      const txt = h('div.tp-pg-txt');
      const k = (st.text || '').length;
      txt.style.setProperty('--fs', `${k > 52 ? 25 : k > 34 ? 29 : 33}px`);
      const card = h(`div.tp-pg-card.k-${st.kind}`, { style: { '--tilt': `${tilt(seed, `t${s}`, 1.6)}deg` } }, txt);
      if (st.auto) card.append(h('div.tp-pg-auto', 'Cyril filled this in'));
      card.txt = txt;
      if (!live) txt.textContent = st.text;
      return card;
    };
    const drawCard = (st, s) => {
      const view = drawingView(st.drawing, { className: 'tp-pg-view' });
      const card = h('div.tp-pg-card.k-draw', { style: { '--tilt': `${tilt(seed, `d${s}`, 1.4)}deg` } }, view.el);
      if (!st.drawing?.strokes?.length) card.append(h('div.tp-pg-blank', 'Not a single line.'));
      else if (st.auto) card.append(h('div.tp-pg-auto', 'Cyril doodled this'));
      card.view = view;
      return card;
    };
    const stampFor = (st) => h(`div.tp-pg-stamp.${st.match ? 'ok' : 'no'}`, st.match ? 'Nailed it' : 'Lost it');

    const addPage = (s, live) => {
      const st = steps[s];
      const pl = ctx.player(st.authorId);
      const card = st.kind === 'draw' ? drawCard(st, s) : textCard(st, s, live);
      const row = h(`div.tp-pg.k-${st.kind}${s === 0 ? '.first' : ''}`, { style: { '--pc': pl?.colour } },
        h('div.tp-pg-rail', av(pl, { size: 34 })),
        h('div.tp-pg-body',
          h('div.tp-pg-by', h('b', pl?.name || 'Someone'), ` ${verbOf(st, flip, s)}`),
          card));
      if (!live) {
        if (st.kind === 'draw') requestAnimationFrame(() => card.view.frame());
        if (st.kind === 'guess') card.append(stampFor(st));
      }
      list.append(row);
      rows[s] = { row, card, st, s, live, stamped: !live };
      return rows[s];
    };

    const addEnd = (live) => {
      const lastStep = steps[p.end.lastStep] || steps[steps.length - 1];
      const verdict = p.end.verdict;
      const first = ctx.player(steps[0].authorId);
      const lastBy = ctx.player(lastStep.authorId);
      let card;
      let views = null;
      if (flip) {
        const frames = steps.filter((x) => x.kind === 'draw');
        views = frames.map((f) => drawingView(f.drawing, { className: 'tp-pg-view' }));
        card = h('div.tp-end-card.flip',
          h('div.tp-end-stamp', 'Roll film'),
          h('div.tp-end-film', ...views.map((v) => v.el)),
          h('div.tp-end-txt', steps[0].text),
          h('div.tp-end-foot', `${frames.length} frames, ${frames.length} pairs of hands`));
      } else {
        const crosser = p.end.crossedAt > 0 ? ctx.player(steps[p.end.crossedAt].authorId) : null;
        // the drawing that got misread: the page just before it went wrong
        const dst = p.end.crossedAt > 0 ? steps[p.end.crossedAt - 1] : null;
        const culprit = dst?.kind === 'draw' && dst.drawing?.strokes?.length ? { st: dst, view: drawingView(dst.drawing, { className: 'tp-end-did-view' }) } : null;
        if (culprit) requestAnimationFrame(() => culprit.view.frame());
        card = h(`div.tp-end-card.${verdict}`,
          h('div.tp-end-stamp', verdict === 'straight' ? 'Straight through!' : 'Crossed wires!'),
          h('div.tp-end-k', 'Started as', who(first, { size: 18 })),
          h('div.tp-end-txt', steps[0].text),
          h('div.tp-end-cord', { html: cordSvg(300, 20, { loops: 12, stroke: 2.4 }) }),
          h('div.tp-end-k', 'Ended as', who(lastBy, { size: 18 })),
          h('div.tp-end-txt.last', lastStep.text),
          culprit ? h('div.tp-end-did', culprit.view.el, h('span', who(ctx.player(culprit.st.authorId), { size: 16 }), ' drew this. ', h('b', ctx.player(steps[p.end.crossedAt].authorId)?.name || 'Someone'), ' called it ', h('q', steps[p.end.crossedAt].text))) : null,
          verdict === 'crossed' && crosser && !culprit ? h('div.tp-end-foot', h('span', 'It went wrong on ', h('b', `page ${p.end.crossedAt + 1}`), ', thanks to'), who(crosser, { size: 18 }))
            : verdict === 'straight' ? h('div.tp-end-foot', h('b', '+300'), ' to everyone on this one') : null);
      }
      const row = h('div.tp-pg.end', h('div.tp-pg-rail', h('span.tp-pg-bell', { html: TP_ICONS.handset })), h('div.tp-pg-body', card));
      list.append(row);
      rows[steps.length] = { row, card, end: true, views, live };
      if (live) {
        if (flip) { ctx.cyril.react('delight'); sfx('fanfare'); say(ctx.line('tpFlip')); } else if (verdict === 'straight') { ctx.cyril.react('delight'); sfx('fanfare'); say(ctx.line('tpStraight')); } else { ctx.cyril.react('guffaw'); sfx('stamp'); say(ctx.line('tpCrossed')); }
        if (!quiet) ctx.stage.shake?.();
        ctx.haptic('stamp');
      }
      if (!live && !flip) say(verdict === 'straight' ? ctx.line('tpStraight') : ctx.line('tpCrossed'));
    };

    const scrollDown = (smooth) => {
      requestAnimationFrame(() => {
        const to = feed.scrollHeight - feed.clientHeight;
        if (smooth && !quiet && !ctx.reduced) feed.scrollTo({ top: to, behavior: 'smooth' }); else feed.scrollTop = to;
      });
    };

    const enter = (el) => {
      if (quiet || ctx.reduced) return;
      el.animate([{ transform: 'translateY(28px)', opacity: 0, filter: 'blur(3px)' }, { transform: 'none', opacity: 1, filter: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
    };

    function settle(r) {
      r.live = false;
      if (r.st?.kind === 'draw') r.card.view.frame();
      else if (r.st) {
        r.card.txt.textContent = r.st.text;
        if (r.st.kind === 'guess' && !r.stamped) { r.stamped = true; r.card.append(stampFor(r.st)); }
      }
    }

    const showTo = (page, c) => {
      if (page <= shownPage) return;
      for (let s = shownPage + 1; s <= page; s++) {
        const live = s === page;
        rows.forEach((r) => { if (r && r.live && r.st) settle(r); }); // anything still animating finishes now
        if (s < steps.length) {
          const r = addPage(s, live);
          if (live) {
            enter(r.row);
            sfx('page', { up: r.st.kind === 'draw' });
            if (s === 0) say(c.line('tpRevealStart', { n: p.index + 1 }));
            if (r.st.kind === 'draw' && !r.st.drawing?.strokes?.length) { c.cyril.react('sad'); say(c.line('tpBlank')); }
          }
        } else {
          addEnd(live);
          if (live) enter(rows[steps.length].row);
        }
      }
      shownPage = page;
      pageNo.textContent = page >= steps.length ? (flip ? 'the film' : 'verdict') : `page ${page + 1}`;
      [...pips.children].forEach((pip, i) => { pip.classList.toggle('on', i <= page); pip.classList.toggle('cur', i === page); });
      nextLbl.textContent = page >= steps.length ? 'Vote for the best bit' : page === steps.length - 1 ? (flip ? 'Roll the film' : 'Show the verdict') : 'Next page';
      root.classList.toggle('last', page >= steps.length);
      scrollDown(shownPage > 0);
      requestAnimationFrame(() => requestAnimationFrame(clearTop));
    };

    // the cord starts at the first page and runs down the whole book
    const clearTop = () => {
      const first = rows.find(Boolean)?.row;
      list.style.setProperty('--spine-top', `${first ? first.offsetTop + 17 : 34}px`);
    };
    feed.addEventListener('scroll', clearTop, { passive: true });

    const tick = (c) => {
      const page = Math.min(total - 1, c.progress?.page ?? 0);
      if (page !== shownPage) showTo(page, c);
      const r = rows[shownPage];
      const t = Math.max(0, pageAt(c));
      if (r && r.live && !r.end) {
        if (r.st.kind === 'draw') {
          const rep = p.pages[r.s]?.replay || 0;
          r.card.view.frame(Math.max(0, t - 200));
          if (t >= rep + 200) r.live = false;
        } else {
          const s = r.st.text || '';
          const n = Math.max(0, Math.min(s.length, Math.floor((t - 300) / TYPE_MS)));
          if (r.card.txt.dataset.n !== String(n)) {
            r.card.txt.dataset.n = String(n);
            r.card.txt.replaceChildren(s.slice(0, n), h('span.tp-caret'), h('span.tp-ghost', s.slice(n)));
          }
          if (n >= s.length && t > s.length * TYPE_MS + 700) {
            if (r.st.kind === 'guess' && !r.stamped) {
              r.stamped = true;
              r.card.append(stampFor(r.st));
              if (!r.st.match) {
                c.cyril.react(r.s === p.end.crossedAt ? 'shock' : 'guffaw'); sfx('nope');
                if (r.s === p.end.crossedAt) say(c.line('tpLost', { name: c.player(r.st.authorId)?.name || 'someone' }));
              } else { c.cyril.react('delight'); sfx('select'); }
            }
            r.card.txt.textContent = s;
            r.live = false;
          }
        }
      } else if (r?.end && r.views?.length) {
        const k = Math.floor(t / 260) % r.views.length;
        r.views.forEach((v, i) => { v.el.style.opacity = i === k ? '1' : '0'; if (i === k) v.frame(); });
      }
      // guests: if the host goes quiet, anyone may turn the page
      if (!c.isHost && !quiet) {
        const late = t > ANYONE_AFTER / (c.phase.speed || 1);
        if (late && bar.firstChild !== nextBtn) bar.replaceChildren(nextBtn);
        else if (!late && bar.firstChild === nextBtn) bar.replaceChildren(waitNote);
      }
    };

    tick(ctx);
    return { frame: tick, update: tick };
  },
};
