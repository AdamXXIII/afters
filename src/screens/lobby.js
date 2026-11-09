// lobby: room code tiles on the show layer; avatar picker, name, chips and host controls in the sheet.
import './lobby.css';
import { h, button, codeTiles, chip, textField, toggle, onTap, iconButton } from '../ui/components.js';
import { store } from '../util/storage.js';
import { MIN_PLAYERS, MAX_PLAYERS, AVATARS } from '../game/constants.js';

export default {
  id: 'lobby',
  layout: 'split',
  shot: 'lobby',
  rail: false,
  mount({ show, sheet }, ctx) {
    const code = ctx.room;
    const share = iconButton('share', {
      label: 'Share the code',
      onClick: async () => {
        const url = `${location.origin}${location.pathname}?room=${code}`;
        try {
          if (navigator.share) await navigator.share({ title: 'AFTERS', text: `Join my table: ${code}`, url });
          else { await navigator.clipboard.writeText(url); ctx.toast('Link copied. Send it round the table.'); }
        } catch { /* cancelled */ }
      },
    });
    const tiles = codeTiles(code);
    onTap(tiles, async () => { try { await navigator.clipboard.writeText(code); ctx.toast(`Code ${code} copied.`); } catch { /* ignore */ } });
    show.append(h('div.lobby-top', h('div.t-eyebrow.on-dark', 'Table code'), h('div.row.lobby-code', tiles, share)));

    // avatar picker (3D thumbnails rendered once from the stage)
    let thumbs = [];
    try { thumbs = ctx.stage.thumbnails(160); } catch (e) { console.warn('thumbs', e); }
    const grid = h('div.avatar-grid');
    const cells = AVATARS.map((a, i) => {
      const b = h('button.avatar-cell', { type: 'button', 'aria-label': a.name, style: { '--pc': a.colour }, 'data-e2e': `avatar-${i}` },
        thumbs[i] ? h('img', { src: thumbs[i], alt: '' }) : h('span', a.name));
      onTap(b, () => { if (!b.disabled) { store.set('avatar', i); ctx.client.setProfile({ avatar: i }); } }, { sound: 'select', buzz: 'select' });
      grid.append(b);
      return b;
    });

    const name = textField({ max: 10, placeholder: 'Your name', value: ctx.me?.name || '', e2e: 'lobby-name', enterkeyhint: 'done', onSubmit: (v) => { ctx.client.setProfile({ name: v }); name.input.blur(); } });
    name.input.addEventListener('change', () => ctx.client.setProfile({ name: name.input.value }));
    const chipsEl = h('div.lobby-chips');
    const count = h('div.t-eyebrow.lobby-count');
    const startBtn = button('Start the show', { onClick: () => ctx.client.start(), e2e: 'start-show' });
    const waitNote = h('p.t-body.t-muted.center.lobby-wait');
    const hostBox = h('div.lobby-host');
    const adult = toggle('Adult table (turns off the word filter)', { checked: !!ctx.settings.adult, onChange: (v) => ctx.client.setSettings({ adult: v }) });
    const speakerBtn = button('', { kind: 'ghost', block: false, onClick: () => {
      const ps = ctx.app.client.state.players;
      const i = ps.findIndex((p) => p.id === ctx.app.client.state.settings.speakerId);
      ctx.client.setSettings({ speakerId: ps[(i + 1) % ps.length].id });
    } });
    const addBot = button('Add a pretend guest', { kind: 'ghost', block: false, onClick: () => ctx.actions.addBot() });
    hostBox.append(adult, h('div.row.lobby-tools', speakerBtn, addBot));

    sheet.append(
      h('div.t-eyebrow', 'Pick your seat'),
      grid,
      name,
      count,
      chipsEl,
      ctx.isHost ? hostBox : null,
      h('div.sheet-actions', ctx.isHost ? startBtn : waitNote, button('Leave', { kind: 'ghost', onClick: () => ctx.actions.leave() })),
    );

    let lastCount = -1;
    const update = (c) => {
      const ps = c.players;
      const taken = new Map(ps.map((p) => [p.avatar, p]));
      cells.forEach((cell, i) => {
        const owner = taken.get(i);
        cell.classList.toggle('mine', owner?.id === c.meId);
        cell.disabled = !!owner && owner.id !== c.meId;
      });
      chipsEl.replaceChildren(...ps.map((p) => chip(p, { host: p.id === c.state.hostId, speaker: p.id === c.settings.speakerId })));
      count.textContent = `${ps.length} of ${MAX_PLAYERS} seats taken`;
      startBtn.disabled = ps.length < MIN_PLAYERS;
      startBtn.textContent = ps.length < MIN_PLAYERS ? `Need ${MIN_PLAYERS - ps.length} more` : 'Start the show';
      const host = ps.find((p) => p.id === c.state.hostId);
      waitNote.textContent = `Waiting for ${host?.name || 'the host'} to start the show.`;
      const spk = ps.find((p) => p.id === c.settings.speakerId);
      speakerBtn.textContent = `Speaker: ${spk?.name || 'nobody'}`;
      adult.querySelector('input').checked = !!c.settings.adult;
      addBot.style.display = ps.length >= MAX_PLAYERS ? 'none' : '';
      if (ps.length !== lastCount) {
        if (lastCount >= 0 && ps.length > lastCount) c.audio.sfx('join');
        lastCount = ps.length;
        c.say(c.line(ps.length >= MAX_PLAYERS ? 'lobbyFull' : ps.length < MIN_PLAYERS ? 'lobbyWaiting' : 'lobbyReady'), { hold: 4000 });
      }
    };
    update(ctx);
    return { update };
  },
};
