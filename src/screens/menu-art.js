// Hand-made SVG dishes for the menu trolley (DESIGN 3: warm, chunky outlines, no gradients that
// read as "stock"). One per game: dish keys are named in each game's index.js (`dish`).
// Every dish sits on a 160x120 viewBox, plate centred at y=96.

const OUT = '#3B1F18';
const plate = (w = 66) => `
  <ellipse cx="80" cy="100" rx="${w + 6}" ry="13" fill="rgba(42,26,23,.28)"/>
  <ellipse cx="80" cy="96" rx="${w}" ry="14" fill="#FBF4EA" stroke="${OUT}" stroke-width="3"/>
  <ellipse cx="80" cy="94" rx="${w - 14}" ry="8.5" fill="none" stroke="#D9C6A8" stroke-width="2"/>
  <path d="M${80 - w + 10} 92 q 12 -5 26 -6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>`;

const DISHES = {
  // Afters Classic: a proper trifle in a footed glass bowl, layers you can count.
  trifle: () => `
    ${plate(58)}
    <path d="M66 94h28l-3 -8h-22z" fill="#F3E6CF" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 30h80c0 30-10 52-40 56C50 82 40 60 40 30z" fill="#FFF6E6" fill-opacity=".55" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round"/>
    <clipPath id="trifle-bowl"><path d="M41.5 31h77c0 29-10 50-38.5 54C51.5 81 41.5 60 41.5 31z"/></clipPath>
    <g clip-path="url(#trifle-bowl)">
      <rect x="30" y="66" width="100" height="24" fill="#E6B566"/>
      <g fill="#C98A3E"><circle cx="54" cy="74" r="4"/><circle cx="78" cy="78" r="5"/><circle cx="102" cy="73" r="4"/></g>
      <path d="M30 66 q 12 -5 25 0 t 25 0 t 25 0 t 25 0 V54 H30z" fill="#E2553B"/>
      <rect x="30" y="44" width="100" height="12" fill="#F2C94C"/>
      <path d="M30 44 q 10 -6 20 0 t 20 0 t 20 0 t 20 0 t 20 0 V30 H30z" fill="#FBF4EA"/>
    </g>
    <path d="M44 34 q 2 26 16 40" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M38 30 q 10 -14 22 -6 q 8 -12 20 -4 q 12 -10 22 0 q 12 -6 20 8" fill="#FBF4EA" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="80" cy="14" r="8" fill="#B0243A" stroke="${OUT}" stroke-width="3"/>
    <path d="M80 7 q 4 -8 12 -9" stroke="${OUT}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="77" cy="12" r="2.2" fill="#fff" opacity=".85"/>
    <g fill="#E0A526"><rect x="56" y="22" width="3" height="6" rx="1" transform="rotate(-30 57 25)"/><rect x="100" y="20" width="3" height="6" rx="1" transform="rotate(40 101 23)"/><rect x="66" y="18" width="3" height="5" rx="1" transform="rotate(10 67 20)"/></g>`,

  // Bonce: a wobbly red jelly that has very clearly been worn as a hat.
  jelly: () => `
    ${plate(60)}
    <path d="M44 92 C40 70 46 40 54 30 h52 c8 10 14 40 10 62z" fill="#E2553B" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M54 30 q 26 -10 52 0" fill="#F07A5E" stroke="${OUT}" stroke-width="3"/>
    <path d="M62 34 v54 M80 32 v58 M98 34 v54" stroke="#B83A24" stroke-width="3" opacity=".55"/>
    <path d="M52 40 q -4 22 0 46" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>
    <path d="M60 34 q 4 -2 10 -2" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
    <g fill="${OUT}"><circle cx="70" cy="58" r="3.6"/><circle cx="92" cy="58" r="3.6"/></g>
    <path d="M72 70 q 9 7 18 0" stroke="${OUT}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M30 54 q -8 -4 -10 -12 M130 54 q 8 -4 10 -12 M34 40 q -6 -6 -6 -14 M126 40 q 6 -6 6 -14" stroke="#E0A526" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="80" cy="22" r="6" fill="#FBF4EA" stroke="${OUT}" stroke-width="2.6"/>`,

  // Crossed Wires: a plate of spaghetti that turns into a curly phone cord and a handset.
  spaghetti: () => `
    ${plate(64)}
    <path d="M40 90 C 30 70 60 56 80 60 C 104 64 130 72 120 90z" fill="#F2C94C" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <g fill="none" stroke="#C98A3E" stroke-width="2.6" stroke-linecap="round">
      <path d="M48 84 q 10 -18 24 -10 t 22 -4 t 20 8"/>
      <path d="M52 76 q 14 -12 28 -2 t 26 2"/>
      <path d="M58 88 q 12 -10 22 -2 t 26 -2"/>
    </g>
    <g fill="#B0243A" stroke="${OUT}" stroke-width="2.4"><circle cx="66" cy="70" r="6"/><circle cx="94" cy="72" r="6.5"/><circle cx="80" cy="82" r="5.5"/></g>
    <path d="M104 64 c 4 -8 10 -6 8 -12 c -2 -6 8 -8 6 -14 c -2 -6 8 -8 6 -14 c -2 -5 6 -8 8 -10" fill="none" stroke="#2F5D7C" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M118 10 c 6 -4 18 -2 22 6 l -6 6 c -4 -4 -8 -5 -12 -4z" fill="#2F5D7C" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M118 10 l -6 8 c 2 4 6 6 10 6 l 2 -6" fill="#2F5D7C" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M40 46 q 6 -8 14 -6 M30 32 q 10 -10 22 -6" stroke="#E0A526" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>`,

  // Pie Chart: a golden pie with a slice already out and a little percentage flag.
  pie: () => `
    ${plate(64)}
    <path d="M28 82 C 28 60 52 50 80 50 C 108 50 132 60 132 82 C 132 96 108 102 80 102 C 52 102 28 96 28 82z" fill="#C98A3E" stroke="${OUT}" stroke-width="3.2"/>
    <path d="M32 74 C 34 58 56 50 80 50 C 104 50 126 58 128 74 C 120 82 104 86 80 86 C 56 86 40 82 32 74z" fill="#E6B566" stroke="${OUT}" stroke-width="3"/>
    <path d="M80 70 L 128 74 C 126 80 120 84 112 86z" fill="#7A1E2C" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <g stroke="#B8813A" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M52 66 q 8 -4 14 0"/><path d="M78 58 q 8 -4 14 0"/><path d="M58 78 q 8 -4 14 0"/></g>
    <g fill="#E6B566" stroke="${OUT}" stroke-width="2.6">
      <path d="M132 64 l 22 -6 l 4 22 l -22 6 z"/>
    </g>
    <path d="M134 86 l 4 16" stroke="${OUT}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M120 22 v 34" stroke="${OUT}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M120 22 h 26 l -6 7 l 6 7 h -26z" fill="#FBF4EA" stroke="${OUT}" stroke-width="2.6" stroke-linejoin="round"/>
    <text x="131" y="33.5" text-anchor="middle" font-family="Bricolage Grotesque Variable, sans-serif" font-weight="800" font-size="10" fill="#7A1E2C">%</text>`,

  // Fallback for a new game that hasn't drawn its own dish yet: a covered plate.
  cloche: () => `
    ${plate(60)}
    <path d="M34 90 C 34 50 54 32 80 32 C 106 32 126 50 126 90z" fill="#C89B3C" stroke="${OUT}" stroke-width="3.2"/>
    <path d="M46 80 C 46 58 58 44 74 40" stroke="#F3D58A" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="80" cy="28" r="7" fill="#C89B3C" stroke="${OUT}" stroke-width="3"/>`,
};

/** SVG markup for a dish (by key), sized by CSS. */
export function dishSvg(key) {
  const art = (DISHES[key] || DISHES.cloche)();
  return `<svg viewBox="0 0 160 120" aria-hidden="true" class="dish-svg">${art}</svg>`;
}

/** A glass dome over a dish (coming soon). */
export const DOME_SVG = `<svg viewBox="0 0 160 120" aria-hidden="true" class="dome-svg">
  <path d="M18 98 C 18 40 46 8 80 8 C 114 8 142 40 142 98z" fill="rgba(255,246,230,.16)" stroke="rgba(251,244,234,.85)" stroke-width="2.6"/>
  <path d="M34 80 C 32 52 46 28 66 18" stroke="rgba(255,255,255,.75)" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M120 40 q 8 12 10 26" stroke="rgba(255,255,255,.45)" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="80" cy="6" r="6" fill="rgba(251,244,234,.9)" stroke="#3B1F18" stroke-width="2"/>
</svg>`;

/** A cherry, for tonight's table. */
export const CHERRY_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" class="cherry-svg">
  <path d="M12 3 q 2 6 -4 11 M12 3 q 3 7 6 12" stroke="#3B1F18" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M12 3 q 5 -2 8 1 q -4 2 -8 -1z" fill="#7F9A74" stroke="#3B1F18" stroke-width="1.2"/>
  <circle cx="8" cy="16" r="5" fill="#B0243A" stroke="#3B1F18" stroke-width="1.6"/>
  <circle cx="17.5" cy="17" r="4.6" fill="#B0243A" stroke="#3B1F18" stroke-width="1.6"/>
  <circle cx="6.5" cy="14.5" r="1.4" fill="#fff" opacity=".8"/><circle cx="16" cy="15.6" r="1.2" fill="#fff" opacity=".8"/>
</svg>`;
