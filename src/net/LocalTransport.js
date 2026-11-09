// In-memory transport for demos, bots and tests. Optionally bridged across tabs of the
// same browser profile with BroadcastChannel (handy for dev: open two tabs, ?transport=local).
import { TransportBase, TransportError } from './Transport.js';

const rooms = new Map(); // code -> { host: LocalTransport|null, clients: Map<id, LocalTransport> }
const PAGE_ID = Math.random().toString(36).slice(2, 9);
let nextId = 1;
const channels = new Map(); // code -> BroadcastChannel (one per page per room)

function room(code) {
  if (!rooms.has(code)) rooms.set(code, { host: null, clients: new Map() });
  return rooms.get(code);
}

const clone = typeof structuredClone === 'function' ? structuredClone : (o) => JSON.parse(JSON.stringify(o));

function channelFor(code) {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!channels.has(code)) {
    const bc = new BroadcastChannel(`afters-${code}`);
    bc.onmessage = (ev) => {
      const e = ev.data;
      if (!e || e.page === PAGE_ID) return;
      const r = room(code);
      if (e.to === 'host') {
        if (!r.host) return;
        if (e.kind === 'join') { r.host._remote.add(e.from); r.host._emitPeer(e.from, 'join'); }
        else if (e.kind === 'leave') { r.host._remote.delete(e.from); r.host._emitPeer(e.from, 'leave'); }
        else r.host._emitMessage(e.msg, e.from);
      } else if (e.to === '*') {
        for (const c of r.clients.values()) c._fromHost(e.msg, e.kind);
      } else if (r.clients.has(e.to)) {
        r.clients.get(e.to)._fromHost(e.msg, e.kind);
      } else if (e.kind === 'probe' && r.host) {
        bc.postMessage({ page: PAGE_ID, to: e.from, kind: 'probe-ok' });
      }
    };
    channels.set(code, bc);
  }
  return channels.get(code);
}

export class LocalTransport extends TransportBase {
  /** @param {{role:'host'|'client', latency?:number, bridge?:boolean, id?:string}} o */
  constructor({ role, latency = 0, bridge = false, id } = {}) {
    super({ role });
    this.latency = latency;
    this.bridge = bridge;
    this.id = id || `L${PAGE_ID}-${nextId++}`;
    this.code = null;
    this._remote = new Set(); // host: peer ids that live in other tabs
    this._probeOk = null;
  }

  _later(fn) {
    if (this.latency > 0) setTimeout(fn, this.latency);
    else queueMicrotask(fn);
  }

  async connect(code) {
    this.code = code;
    const r = room(code);
    if (this.role === 'host') {
      if (r.host && !r.host.closed) throw new TransportError('taken', 'Room code in use');
      r.host = this;
      if (this.bridge) channelFor(code);
      return;
    }
    // client
    if (!r.host && this.bridge && channelFor(code)) {
      const ok = await this._probe(code);
      if (!ok) throw new TransportError('no-room', 'No table with that code');
      this._viaBridge = true;
      r.clients.set(this.id, this);
      channelFor(code).postMessage({ page: PAGE_ID, from: this.id, to: 'host', kind: 'join' });
      return;
    }
    if (!r.host) throw new TransportError('no-room', 'No table with that code');
    r.clients.set(this.id, this);
    const host = r.host;
    this._later(() => host._emitPeer(this.id, 'join'));
  }

  _probe(code) {
    return new Promise((resolve) => {
      const bc = channelFor(code);
      const r = room(code);
      r.clients.set(this.id, { _fromHost: (m, kind) => { if (kind === 'probe-ok') { r.clients.delete(this.id); resolve(true); } } });
      bc.postMessage({ page: PAGE_ID, from: this.id, kind: 'probe', to: 'probe' });
      setTimeout(() => { r.clients.delete(this.id); resolve(false); }, 400);
    });
  }

  _fromHost(msg, kind) {
    if (kind === 'leave') { this._emitPeer('host', 'leave'); return; }
    if (msg) this._emitMessage(msg, 'host');
  }

  send(msg, to) {
    if (this.closed) return;
    const r = room(this.code);
    const data = clone(msg);
    if (this.role === 'client') {
      if (this._viaBridge) { channelFor(this.code).postMessage({ page: PAGE_ID, from: this.id, to: 'host', kind: 'msg', msg: data }); return; }
      const host = r.host;
      if (host && !host.closed) this._later(() => host._emitMessage(data, this.id));
      return;
    }
    // host
    if (to) {
      const c = r.clients.get(to);
      if (c && !c._viaBridge && !c.closed) this._later(() => c._emitMessage(data, 'host'));
      else if (this._remote.has(to)) channelFor(this.code)?.postMessage({ page: PAGE_ID, to, kind: 'msg', msg: data });
    } else {
      for (const c of r.clients.values()) if (!c._viaBridge && !c.closed) this._later(() => c._emitMessage(clone(data), 'host'));
      if (this._remote.size) channelFor(this.code)?.postMessage({ page: PAGE_ID, to: '*', kind: 'msg', msg: data });
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    const r = rooms.get(this.code);
    if (!r) return;
    if (this.role === 'host') {
      if (r.host === this) r.host = null;
      for (const c of r.clients.values()) if (!c._viaBridge) this._later(() => c._emitPeer('host', 'leave'));
      if (this._remote.size) channelFor(this.code)?.postMessage({ page: PAGE_ID, to: '*', kind: 'leave' });
    } else {
      r.clients.delete(this.id);
      if (this._viaBridge) channelFor(this.code)?.postMessage({ page: PAGE_ID, from: this.id, to: 'host', kind: 'leave' });
      else if (r.host) { const h = r.host; this._later(() => h._emitPeer(this.id, 'leave')); }
    }
  }
}

/** True if a LocalTransport host for this code exists in this page. */
export function localRoomExists(code) {
  return !!rooms.get(code)?.host;
}
