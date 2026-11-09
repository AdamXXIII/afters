// sandbox (?demo=sandbox): a dev page for the shared game helpers in src/shared/.
// Draw on the pad, watch it replay stroke by stroke, try the forehead tilt (with the iOS permission
// tap) and the buzz patterns. Not reachable from the game; for the game teams.
import { h, button } from '../ui/components.js';
import { drawPad, drawingView, replayDuration, encodeDrawing } from '../shared/drawing.js';
import { tiltSensor, vibrate, BUZZ, sensorsSupported } from '../shared/sensors.js';

const DEMO_DRAWING = { v: 1, strokes: [
  { c: 0, s: 1, p: [300, 640, 40, -60, 60, -80, 80, -40, 90, 0, 80, 40, 60, 80, 40, 60] },
  { c: 1, s: 2, p: [420, 470, 6, 0] }, { c: 1, s: 2, p: [580, 470, 6, 0] },
  { c: 3, s: 1, p: [400, 560, 40, 30, 60, 10, 60, -10, 40, -30] },
  { c: 2, s: 3, p: [200, 860, 120, 0, 120, 0, 120, 0, 120, 0, 120, 0] },
] };

export default {
  id: 'sandbox',
  layout: 'split',
  rail: false,
  mount({ show, sheet }, ctx) {
    const view = drawingView(DEMO_DRAWING);
    view.el.style.cssText = 'width:150px;margin:calc(var(--safe-t) + 60px) auto 0';
    const info = h('div.t-body', { style: { textAlign: 'center', color: 'var(--c-linen)', marginTop: '6px' } }, 'Replay (loops)');
    show.append(view.el, info);
    let start = 0;
    const pad = drawPad({
      prompt: 'Draw: a haunted sandwich',
      onChange: (d) => { view.set(d); start = performance.now(); info.textContent = `${encodeDrawing(d).length} bytes, replay ${replayDuration(d)} ms`; },
    });
    const meter = h('div.t-body', 'Tilt: off');
    const tilt = tiltSensor({ onTilt: (dir) => { meter.textContent = `Tilt: ${dir}!`; vibrate(dir === 'down' ? BUZZ.correct : BUZZ.pass); }, onMove: ({ delta }) => { meter.dataset.d = delta.toFixed(2); } });
    const tiltBtn = button(sensorsSupported() ? 'Start tilt (tap)' : 'No motion sensors here', { kind: 'secondary', onClick: async () => { meter.textContent = `Tilt: ${await tilt.start()}`; tilt.calibrate(); } });
    sheet.append(h('div', { style: { display: 'grid', gap: '10px' } }, pad.el, h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, tiltBtn, meter)));
    return {
      frame() { const d = view.duration(); view.frame(ctx.frozen ? null : (performance.now() - start) % (d + 1500)); },
      unmount() { tilt.stop(); pad.destroy(); },
    };
  },
};
