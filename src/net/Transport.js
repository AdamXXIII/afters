// Transport interface (DESIGN 6). Every transport implements this shape.
//
//   const t = new SomeTransport({ role: 'host' | 'client', ... });
//   await t.connect(code)      host: opens room `code` (rejects {code:'taken'}); client: joins it (rejects {code:'no-room'})
//   t.send(msg, toPeerId?)     host: to one peer, or broadcast when omitted. client: always to the host.
//   t.onMessage((msg, fromPeerId) => {})
//   t.onPeer((peerId, 'join' | 'leave') => {})   client sees peerId 'host'
//   t.close()
//   t.id                       this end's peer id
//
// Messages are plain JSON-safe objects. Transports must deliver asynchronously and in order per peer.

export class TransportBase {
  constructor({ role }) {
    this.role = role;
    this.id = null;
    this._msg = new Set();
    this._peer = new Set();
    this.closed = false;
  }
  onMessage(fn) { this._msg.add(fn); return () => this._msg.delete(fn); }
  onPeer(fn) { this._peer.add(fn); return () => this._peer.delete(fn); }
  _emitMessage(msg, from) {
    for (const fn of this._msg) {
      try { fn(msg, from); } catch (e) { console.error('[transport] handler error', e); }
    }
  }
  _emitPeer(peerId, ev) {
    for (const fn of this._peer) {
      try { fn(peerId, ev); } catch (e) { console.error('[transport] peer handler error', e); }
    }
  }
}

export class TransportError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

/** Host side that fans one engine out to several transports (local bots + PeerJS phones). */
export class MultiHostTransport extends TransportBase {
  constructor(transports) {
    super({ role: 'host' });
    this.transports = transports;
    this.owner = new Map();
    for (const t of transports) {
      t.onMessage((msg, from) => { this.owner.set(from, t); this._emitMessage(msg, from); });
      t.onPeer((pid, ev) => {
        if (ev === 'join') this.owner.set(pid, t);
        this._emitPeer(pid, ev);
        if (ev === 'leave') this.owner.delete(pid);
      });
    }
  }
  async connect(code) {
    this.id = 'host';
    await Promise.all(this.transports.map((t) => t.connect(code)));
  }
  send(msg, to) {
    if (to) this.owner.get(to)?.send(msg, to);
    else for (const t of this.transports) t.send(msg);
  }
  close() { this.closed = true; for (const t of this.transports) t.close(); }
}
