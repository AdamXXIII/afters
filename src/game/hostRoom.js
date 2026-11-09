// Wires a HostEngine to one or more host transports and runs its clock.
import { HostEngine } from './HostEngine.js';
import { MultiHostTransport } from '../net/Transport.js';
import { makeRoomCode } from '../net/roomCode.js';

/**
 * @param {object} o
 * @param {()=>import('../net/Transport.js').TransportBase[]} o.makeTransports  fresh host transports per attempt
 * @param {string} [o.code]   fixed code (tests/demo); otherwise generated, retried if taken
 * @returns {Promise<{engine:HostEngine, transport, code:string, close():void}>}
 */
export async function openHostRoom({ makeTransports, code = null, seed, speed = 1, now, tickMs = 50 }) {
  let lastErr = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const c = code || makeRoomCode();
    const list = makeTransports();
    const transport = list.length === 1 ? list[0] : new MultiHostTransport(list);
    try {
      await transport.connect(c);
    } catch (e) {
      transport.close();
      lastErr = e;
      if (e.code === 'taken' && !code) continue;
      throw e;
    }
    const engine = new HostEngine({ send: (m, to) => transport.send(m, to), seed, speed, room: c, now });
    transport.onMessage((m, from) => engine.handle(from, m));
    transport.onPeer((pid, ev) => { if (ev === 'leave') engine.onPeerLeave(pid); });
    const timer = setInterval(() => engine.tick(), tickMs);
    return {
      engine,
      transport,
      code: c,
      close() { clearInterval(timer); transport.close(); },
    };
  }
  throw lastErr || new Error('Could not open a table');
}
