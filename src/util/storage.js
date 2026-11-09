// localStorage that never throws (private mode, blocked storage, previews).
export const store = {
  get(key, def = null) {
    try {
      const v = localStorage.getItem('afters:' + key);
      return v === null ? def : JSON.parse(v);
    } catch { return def; }
  },
  set(key, value) {
    try { localStorage.setItem('afters:' + key, JSON.stringify(value)); } catch { /* ignore */ }
  },
  del(key) {
    try { localStorage.removeItem('afters:' + key); } catch { /* ignore */ }
  },
};
