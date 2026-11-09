// PeerJS WebRTC transport (DESIGN 6). Host peer id = `afters-<CODE>-host`.
// Uses the free public PeerJS signalling server by default; pass `signal: 'host:port'`
// (or ?signal=127.0.0.1:9000) to use a local `peer` server in tests.
import { Peer } from 'peerjs';
import { TransportBase, TransportError } from './Transport.js';

export const hostPeerId = (code) => `afters-${code}-host`;

function peerOptions(signal) {
  const opts = { debug: 0 };
  if (signal) {
    const [host, port] = signal.split(':');
    Object.assign(opts, { host, port: Number(port || 9000), path: '/', secure: false, config: { iceServers: [] } });
  }
  return opts;
}

export class PeerTransport extends TransportBase {
  constructor({ role, signal = null, timeout = 15000 } = {}) {
    super({ role });
    this.signal = signal;
    this.timeout = timeout;
    this.peer = null;
    this.conns = new Map(); // host: peerId -> DataConnection
    this.hostConn = null;
  }

  connect(code) {
    this.code = code;
    return this.role === 'host' ? this._openHost(code) : this._join(code);
  }

  _openHost(code) {
    return new Promise((resolve, reject) => {
      const peer = new Peer(hostPeerId(code), peerOptions(this.signal));
      this.peer = peer;
      const timer = setTimeout(() => reject(new TransportError('timeout', 'Signalling server did not answer')), this.timeout);
      peer.on('open', (id) => { clearTimeout(timer); this.id = id; resolve(); });
      peer.on('error', (err) => {
        clearTimeout(timer);
        if (err.type === 'unavailable-id') reject(new TransportError('taken', 'Room code in use'));
        else if (!this.id) reject(new TransportError(err.type || 'error', err.message));
        else console.warn('[peer] host error', err.type, err.message);
      });
      peer.on('disconnected', () => { if (!this.closed) try { peer.reconnect(); } catch { /* ignore */ } });
      peer.on('connection', (conn) => {
        conn.on('open', () => {
          this.conns.set(conn.peer, conn);
          this._emitPeer(conn.peer, 'join');
        });
        conn.on('data', (data) => this._emitMessage(typeof data === 'string' ? JSON.parse(data) : data, conn.peer));
        const gone = () => {
          if (this.conns.get(conn.peer) === conn) {
            this.conns.delete(conn.peer);
            this._emitPeer(conn.peer, 'leave');
          }
        };
        conn.on('close', gone);
        conn.on('error', gone);
      });
    });
  }

  _join(code) {
    return new Promise((resolve, reject) => {
      const peer = new Peer(undefined, peerOptions(this.signal));
      this.peer = peer;
      let settled = false;
      const fail = (e) => { if (!settled) { settled = true; clearTimeout(timer); reject(e); } };
      const timer = setTimeout(() => fail(new TransportError('timeout', 'Could not reach that table')), this.timeout);
      peer.on('error', (err) => {
        if (err.type === 'peer-unavailable') fail(new TransportError('no-room', 'No table with that code'));
        else if (!settled) fail(new TransportError(err.type || 'error', err.message));
        else console.warn('[peer] client error', err.type, err.message);
      });
      peer.on('open', (id) => {
        this.id = id;
        const conn = peer.connect(hostPeerId(code), { reliable: true, serialization: 'json' });
        this.hostConn = conn;
        conn.on('open', () => { settled = true; clearTimeout(timer); resolve(); });
        conn.on('data', (data) => this._emitMessage(typeof data === 'string' ? JSON.parse(data) : data, 'host'));
        conn.on('close', () => this._emitPeer('host', 'leave'));
        conn.on('error', () => this._emitPeer('host', 'leave'));
      });
    });
  }

  send(msg, to) {
    if (this.closed) return;
    if (this.role === 'client') {
      if (this.hostConn?.open) this.hostConn.send(msg);
      return;
    }
    if (to) {
      const c = this.conns.get(to);
      if (c?.open) c.send(msg);
    } else {
      for (const c of this.conns.values()) if (c.open) c.send(msg);
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try { this.hostConn?.close(); } catch { /* ignore */ }
    for (const c of this.conns.values()) try { c.close(); } catch { /* ignore */ }
    try { this.peer?.destroy(); } catch { /* ignore */ }
  }
}
