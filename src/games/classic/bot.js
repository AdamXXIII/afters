// Afters Classic bot brain: how a bot (or autopilot phone) plays each classic phase.
// b = { ph, client, later(ms, fn), rand(lo, hi), rng(), still(), answer(), mode, speed }
export function classicBot(b) {
  const { ph, client, later, rand, rng, still, answer } = b;
  switch (ph.id) {
    case 'r1-write': {
      const prompts = ph.private?.prompts || [];
      prompts.forEach((pr, i) => {
        later(rand(1500, 6000) + i * 2500, () => {
          if (still() && client.state.mine.submitted[pr.matchupId] === undefined) client.submit(answer(), pr.matchupId);
        });
      });
      return true;
    }
    case 'r1-vote':
      if (ph.private?.role === 'voter') later(rand(1200, 5000), () => { if (still() && !client.state.mine.vote) client.vote(rng() < 0.5 ? 'A' : 'B'); });
      return true;
    case 'r2-write': {
      const send = () => {
        if (!still() || client.state.mine.submitted.only !== undefined) return;
        client.submit(answer().toLowerCase().slice(0, 40));
      };
      later(rand(1500, 7000), send);
      const off = client.on('reject', () => { if (still()) later(600, send); else off(); });
      const offP = client.on('phase', () => { off(); offP(); });
      return true;
    }
    case 'r2-pick': {
      const own = ph.private?.ownOptionId;
      const opts = ph.payload.options.filter((o) => o.id !== own);
      later(rand(1500, 6000), () => { if (still() && !client.state.mine.pick) client.pick(opts[Math.floor(rng() * opts.length)].id); });
      return true;
    }
    case 'r3-write':
      [0, 1].forEach((i) => later(rand(1500, 4000) + i * 3000, () => { if (still() && client.state.mine.r3.length < 4) client.submit(answer().slice(0, 45)); }));
      return true;
    case 'r3-swipe': {
      const own = new Set(ph.private?.ownCardIds || []);
      const per = ph.payload.perCard;
      let used = 0;
      ph.payload.deck.forEach((card, i) => {
        if (own.has(card.id)) return;
        const cheers = used < ph.payload.glasses && rng() < 0.4;
        if (cheers) used += 1;
        const delay = b.mode === 'instant' ? 0 : i * per * b.speed + rand(400, 2400);
        later(delay, () => { if (still()) client.swipe(card.id, cheers); });
      });
      return true;
    }
    default:
      return false;
  }
}
