// Room codes: 4 letters, consonants only (no accidental words), small blocklist (DESIGN 2.7).
export const CODE_LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';
const BLOCKLIST = new Set(['FCKK', 'FKKK', 'SHTT', 'CNTT', 'KKKK', 'NGGR', 'FCKS', 'PSSS', 'XXXX', 'DMMN', 'TWTT', 'WNKR', 'PRCK']);

export function makeRoomCode(rng = Math.random) {
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += CODE_LETTERS[Math.floor(rng() * CODE_LETTERS.length)];
    if (!BLOCKLIST.has(c)) return c;
  }
}

export function isValidCode(code) {
  return typeof code === 'string' && code.length === 4 && [...code].every((ch) => CODE_LETTERS.includes(ch));
}

export function sanitiseCode(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
}
