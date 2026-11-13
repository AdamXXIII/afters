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

  // Something in the Soup: a willow-pattern tureen, lid ajar, ladle in, one suspicious green bubble.
  tureen: () => `
    ${plate(64)}
    <path d="M30 56 h100 c0 22 -14 38 -50 38 C44 94 30 78 30 56z" fill="#FBF4EA" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M34 66 h92" stroke="#2F5D7C" stroke-width="5"/>
    <g fill="none" stroke="#2F5D7C" stroke-width="2.2" stroke-linecap="round"><path d="M52 76 q 6 -6 12 0 q 6 6 12 0"/><path d="M84 76 q 6 -6 12 0 q 6 6 12 0"/></g>
    <path d="M38 84 q 6 6 14 8" stroke="#D9C6A8" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M30 60 c -12 -2 -14 14 -2 14" fill="none" stroke="${OUT}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M130 60 c 12 -2 14 14 2 14" fill="none" stroke="${OUT}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M26 56 h108" stroke="${OUT}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M38 52 C 40 38 58 30 74 31 L 72 52z" fill="#FBF4EA" stroke="${OUT}" stroke-width="3" stroke-linejoin="round" transform="rotate(-12 56 52)"/>
    <circle cx="50" cy="31" r="5" fill="#C89B3C" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M98 54 L 118 14" stroke="#C89B3C" stroke-width="5" stroke-linecap="round"/>
    <path d="M98 54 L 118 14" stroke="${OUT}" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
    <ellipse cx="121" cy="10" rx="6" ry="4" fill="#C89B3C" stroke="${OUT}" stroke-width="2.4" transform="rotate(-30 121 10)"/>
    <ellipse cx="84" cy="52" rx="20" ry="4" fill="#E0A526" stroke="${OUT}" stroke-width="2.4"/>
    <circle cx="80" cy="44" r="7" fill="#9BC08A" stroke="${OUT}" stroke-width="2.6"/>
    <circle cx="77.5" cy="41.5" r="2" fill="#fff" opacity=".85"/>
    <path d="M88 30 q -6 -6 0 -12 q 6 -6 0 -12" stroke="#FBF4EA" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>
    <path d="M66 28 q -5 -5 0 -10" stroke="#FBF4EA" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>`,

  // Who Had Seconds?: a scraped-clean plate (one pea left) and a serving spoon landing a second helping.
  seconds: () => `
    ${plate(66)}
    <path d="M44 92 q 18 -10 40 -4 q 16 4 30 -2" stroke="#C98A3E" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>
    <circle cx="104" cy="94" r="3.6" fill="#7F9A74" stroke="${OUT}" stroke-width="2"/>
    <g fill="#C98A3E"><circle cx="60" cy="97" r="1.6"/><circle cx="70" cy="99" r="1.3"/><circle cx="92" cy="98" r="1.5"/></g>
    <path d="M30 88 l 26 -10" stroke="#C89B3C" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M128 90 l -20 -12" stroke="#C89B3C" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M106 77 l -4 -3 M108 75 l -4 -3 M110 73 l -4 -3" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
    <path d="M118 24 L 150 4" stroke="#C89B3C" stroke-width="6" stroke-linecap="round"/>
    <path d="M118 24 L 150 4" stroke="${OUT}" stroke-width="1.6" stroke-linecap="round" opacity=".45"/>
    <path d="M84 30 c 0 -12 14 -18 26 -14 c 12 4 14 16 8 22 c -8 8 -30 6 -34 -8z" fill="#E6D3B8" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M90 34 c 4 -12 18 -16 26 -8 c -2 10 -18 14 -26 8z" fill="#FBF4EA" stroke="${OUT}" stroke-width="2.6"/>
    <g fill="#7F9A74" stroke="${OUT}" stroke-width="2"><circle cx="98" cy="44" r="4"/><circle cx="90" cy="51" r="3.6"/><circle cx="101" cy="54" r="3.8"/></g>
    <path d="M86 60 q 0 10 -4 16 M100 62 q 2 8 0 12" stroke="#E0A526" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-dasharray="3 5"/>
    <text x="40" y="44" font-family="Fraunces Variable, Georgia, serif" font-weight="900" font-style="italic" font-size="26" fill="#7A1E2C" stroke="${OUT}" stroke-width="1" paint-order="stroke">2</text>`,

  // Character Witness: a gavel resting across a cake stand, sound block beside it.
  gavel: () => `
    <ellipse cx="80" cy="104" rx="56" ry="9" fill="rgba(42,26,23,.28)"/>
    <path d="M70 102 h20 l -4 -10 h-12z" fill="#FBF4EA" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M75 92 h10 v -16 h-10z" fill="#FBF4EA" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="80" cy="74" rx="58" ry="10" fill="#FBF4EA" stroke="${OUT}" stroke-width="3"/>
    <path d="M28 76 q 4 6 10 4 q 6 6 12 2 q 6 6 12 2 q 6 6 12 2 q 6 6 12 2 q 6 6 12 2 q 6 6 12 2 q 6 4 12 -4" fill="none" stroke="#D9C6A8" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M30 70 q 12 -5 26 -6" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>
    <rect x="96" y="58" width="34" height="12" rx="3" fill="#7A4A2A" stroke="${OUT}" stroke-width="3"/>
    <path d="M100 62 h22" stroke="#A8724A" stroke-width="2" stroke-linecap="round"/>
    <g transform="rotate(-24 76 42)">
      <rect x="40" y="38" width="72" height="9" rx="4.5" fill="#A8724A" stroke="${OUT}" stroke-width="3"/>
      <rect x="22" y="24" width="26" height="37" rx="6" fill="#7A4A2A" stroke="${OUT}" stroke-width="3.2"/>
      <path d="M22 32 h26 M22 53 h26" stroke="#C89B3C" stroke-width="3.4"/>
      <path d="M27 28 v 8" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>
    </g>
    <path d="M118 30 l 8 -8 M126 40 l 12 -2 M110 24 l 0 -10" stroke="#E0A526" stroke-width="3" stroke-linecap="round"/>`,

  // Top Shelf: Cyril's drinks cabinet, doors open, three shelves, the gold bottle at the top.
  cabinet: () => `
    <ellipse cx="80" cy="108" rx="54" ry="8" fill="rgba(42,26,23,.28)"/>
    <path d="M48 104 v 4 M112 104 v 4" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>
    <rect x="44" y="12" width="72" height="94" rx="6" fill="#7A4A2A" stroke="${OUT}" stroke-width="3.2"/>
    <rect x="51" y="19" width="58" height="80" rx="3" fill="#3B1F18"/>
    <path d="M51 44 h58 M51 70 h58" stroke="#C89B3C" stroke-width="3.2"/>
    <path d="M44 14 l -22 6 v 84 l 22 -4z" fill="#8C5A3C" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M116 14 l 22 6 v 84 l -22 -4z" fill="#8C5A3C" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M28 30 v 60 M132 30 v 60" stroke="#C89B3C" stroke-width="2.2" opacity=".7"/>
    <circle cx="40" cy="60" r="2.4" fill="#C89B3C"/><circle cx="120" cy="60" r="2.4" fill="#C89B3C"/>
    <g stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round">
      <path d="M58 98 v -12 q 0 -4 3 -6 v -6 h4 v 6 q 3 2 3 6 v 12z" fill="#2F5D7C"/>
      <path d="M74 98 v -16 h10 v 16z" fill="#7F9A74"/>
      <path d="M90 98 v -10 q 0 -5 5 -6 q 5 1 5 6 v 10z" fill="#B0243A"/>
      <path d="M60 68 v -10 q 0 -4 4 -5 v -5 h3 v 5 q 4 1 4 5 v 10z" fill="#E2553B"/>
      <path d="M80 68 v -14 h8 v 14z" fill="#FBF4EA"/>
      <path d="M94 68 v -8 q 3 -6 6 0 v 8z" fill="#7F9A74"/>
      <path d="M74 42 v -12 q 0 -4 3 -6 v -5 h6 v 5 q 3 2 3 6 v 12z" fill="#F2C94C"/>
    </g>
    <path d="M77 30 v 8" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
    <path d="M94 26 l 2 -5 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2z" fill="#FFC86B"/>
    <path d="M60 30 l 1.5 -3.5 l 1.5 3.5 l 3.5 1.5 l -3.5 1.5 l -1.5 3.5 l -1.5 -3.5 l -3.5 -1.5z" fill="#FFC86B" opacity=".8"/>`,

  // Pardon?: a brass ear trumpet on a plate, with the words arriving muddled.
  trumpet: () => `
    ${plate(62)}
    <path d="M40 88 C 52 84 72 82 92 74" stroke="${OUT}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M40 88 C 52 84 72 82 92 74" stroke="#C89B3C" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="36" cy="89" rx="5" ry="6" fill="#9C7528" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M90 76 C 98 64 108 44 118 30 L 146 52 C 128 58 108 70 96 80z" fill="#C89B3C" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round"/>
    <ellipse cx="132" cy="41" rx="9" ry="18" fill="#3B1F18" stroke="${OUT}" stroke-width="3.2" transform="rotate(38 132 41)"/>
    <ellipse cx="132" cy="41" rx="5" ry="12" fill="#5A3424" transform="rotate(38 132 41)"/>
    <path d="M100 70 C 106 60 112 48 118 40" stroke="#F3D58A" stroke-width="3.4" fill="none" stroke-linecap="round"/>
    <path d="M88 80 l 6 -5" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
    <g fill="none" stroke="#E0A526" stroke-width="3" stroke-linecap="round">
      <path d="M144 18 q 6 6 4 14"/><path d="M152 10 q 8 10 4 24"/>
    </g>
    <text x="40" y="40" font-family="Fraunces Variable, Georgia, serif" font-weight="900" font-style="italic" font-size="24" fill="#7A1E2C" transform="rotate(-10 52 34)">eh?</text>
    <path d="M30 56 q 6 -4 12 0 t 12 0 t 12 0" stroke="#2F5D7C" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,

  // Many Happy Returns: a squat two-tier birthday cake, claret drip, five lit candles (one bent and
  // smoking), a paper party hat leaning on the plate.
  cake: () => `
    ${plate(64)}
    <path d="M36 92 V 70 h88 v22 c0 4 -88 4 -88 0z" fill="#FBF4EA" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M36 72 h88 v6 c-6 0 -6 8 -12 8 s-4 -8 -10 -8 s-6 10 -12 10 s-6 -10 -12 -10 s-6 8 -12 8 s-6 -8 -12 -8 s-6 6 -12 6 s-4 -6 -8 -6z" fill="#7A1E2C"/>
    <path d="M50 70 V 52 h60 v18" fill="#FBF4EA" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M50 54 h60 v5 c-5 0 -5 6 -10 6 s-5 -6 -10 -6 s-5 8 -10 8 s-5 -8 -10 -8 s-5 6 -10 6 s-5 -6 -10 -6z" fill="#7A1E2C"/>
    <path d="M36 70 h88" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>
    <g fill="#E0A526"><circle cx="46" cy="86" r="2"/><circle cx="66" cy="88" r="2"/><circle cx="96" cy="88" r="2"/><circle cx="114" cy="86" r="2"/></g>
    <g stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round">
      <rect x="56" y="38" width="5" height="14" rx="1.5" fill="#2F5D7C"/>
      <rect x="67" y="36" width="5" height="16" rx="1.5" fill="#E2553B"/>
      <rect x="78" y="38" width="5" height="14" rx="1.5" fill="#7F9A74"/>
      <rect x="89" y="36" width="5" height="16" rx="1.5" fill="#E0A526"/>
      <path d="M100 52 v -8 q 0 -4 5 -6 l 3 -1" fill="none" stroke="#B5527E" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g fill="#FFC86B" stroke="#E2553B" stroke-width="1.4">
      <path d="M58.5 35 c -3 -4 0 -8 0 -10 c 2 3 4 6 0 10z"/><path d="M69.5 33 c -3 -4 0 -8 0 -10 c 2 3 4 6 0 10z"/>
      <path d="M80.5 35 c -3 -4 0 -8 0 -10 c 2 3 4 6 0 10z"/><path d="M91.5 33 c -3 -4 0 -8 0 -10 c 2 3 4 6 0 10z"/>
    </g>
    <path d="M110 34 q -4 -6 2 -10 q 6 -4 2 -10" stroke="#9A8A80" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M124 96 l 10 -34 l 14 30z" fill="#2F5D7C" stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M129 80 l 13 -2 M126 89 l 18 -2" stroke="#FFC86B" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="134" cy="60" r="4" fill="#E2553B" stroke="${OUT}" stroke-width="2"/>`,

  // Odd Sock: two teal striped socks crossed on a plate, an odd tomato one with cream spots over the rim.
  socks: () => `
    ${plate(64)}
    ${[[34, 30, -8, '#FBF4EA', '#3E8E8A'], [62, 28, 6, '#FBF4EA', '#3E8E8A']].map(([x, y, r, fill, band]) => `
      <g transform="translate(${x} ${y}) rotate(${r} 10 30)">
        <path d="M0 0 h20 v34 c0 4 2 6 6 6 h12 c9 0 10 14 0 14 h-24 c-9 0 -14 -6 -14 -14z" fill="${fill}" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M0 6 h20 M0 13 h20" stroke="${band}" stroke-width="4"/>
        <path d="M0 0 h20 v4 h-20z" fill="${band}" stroke="${OUT}" stroke-width="2.4"/>
        <path d="M32 40 c 6 0 8 6 6 10" stroke="${band}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      </g>`).join('')}
    <g transform="translate(108 40) rotate(22 10 30)">
      <path d="M0 0 h20 v34 c0 4 2 6 6 6 h12 c9 0 10 14 0 14 h-24 c-9 0 -14 -6 -14 -14z" fill="#E2553B" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M0 0 h20 v4 h-20z" fill="#B83A24" stroke="${OUT}" stroke-width="2.4"/>
      <g fill="#FBF4EA"><circle cx="6" cy="12" r="2.4"/><circle cx="14" cy="22" r="2.4"/><circle cx="6" cy="31" r="2.2"/><circle cx="20" cy="46" r="2.4"/><circle cx="31" cy="47" r="2"/></g>
    </g>
    <path d="M104 26 l 4 -8 M114 30 l 8 -6 M98 22 l -2 -8" stroke="#E0A526" stroke-width="3" fill="none" stroke-linecap="round"/>`,

  // Thermostat: a brass dial on a side plate: half-moon linen face with ticks, willow-to-tomato rim,
  // an ink needle on a brass hub.
  thermostat: () => `
    ${plate(60)}
    <defs><linearGradient id="th-rim" x1="0" x2="1"><stop offset="0" stop-color="#2F5D7C"/><stop offset=".5" stop-color="#E0A526"/><stop offset="1" stop-color="#E2553B"/></linearGradient></defs>
    <path d="M30 86 a 50 50 0 0 1 100 0z" fill="#C89B3C" stroke="${OUT}" stroke-width="3.2" stroke-linejoin="round"/>
    <path d="M38 86 a 42 42 0 0 1 84 0" fill="none" stroke="url(#th-rim)" stroke-width="9"/>
    <path d="M46 86 a 34 34 0 0 1 68 0z" fill="#FBF4EA" stroke="${OUT}" stroke-width="2.4"/>
    <g stroke="${OUT}" stroke-width="2.2" stroke-linecap="round">
      <path d="M52 86 h5 M103 86 h5 M80 58 v5 M60 66 l 4 4 M100 66 l -4 4"/>
      <path d="M55 75 l 3 1.5 M105 75 l -3 1.5 M69 61 l 1.5 3 M91 61 l -1.5 3" stroke-width="1.6"/>
    </g>
    <path d="M80 84 L 98 62" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="80" cy="84" r="6" fill="#C89B3C" stroke="${OUT}" stroke-width="2.6"/>
    <path d="M36 82 q 2 -14 10 -24" stroke="#F3D58A" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
    <path d="M128 40 q 8 -4 12 -12 M134 50 l 10 -4 M22 44 q -2 -8 4 -14" stroke="#E2553B" stroke-width="3" fill="none" stroke-linecap="round"/>`,

  // Same Here: matching teacups in a row on a doily; one chipped willow-pattern cup tips off the end.
  teacups: () => `
    <ellipse cx="80" cy="104" rx="68" ry="10" fill="rgba(42,26,23,.28)"/>
    <ellipse cx="80" cy="98" rx="68" ry="13" fill="#FBF4EA" stroke="${OUT}" stroke-width="2.6"/>
    <ellipse cx="80" cy="97" rx="60" ry="9" fill="none" stroke="#D9C6A8" stroke-width="2.2" stroke-dasharray="3 4"/>
    ${[20, 50, 80].map((x) => `
      <path d="M${x} 62 h28 l -3 24 c -1 6 -21 6 -22 0z" fill="#FBF4EA" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M${x + 1} 70 h26" stroke="#3E8E8A" stroke-width="5"/>
      <path d="M${x + 28} 66 c 9 0 9 12 -1 12" fill="none" stroke="${OUT}" stroke-width="3"/>
      <ellipse cx="${x + 14}" cy="62" rx="14" ry="3" fill="#7A4A2A" stroke="${OUT}" stroke-width="2.2"/>
      <path d="M${x + 10} 52 q 5 -6 0 -12 q -5 -6 0 -12" stroke="#FBF4EA" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".85"/>`).join('')}
    <g transform="rotate(24 126 80)">
      <path d="M112 60 h28 l -3 24 c -1 6 -21 6 -22 0z" fill="#FBF4EA" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M116 70 q 4 -4 8 0 t 8 0 M117 78 h18" stroke="#2F5D7C" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M140 64 c 9 0 9 12 -1 12" fill="none" stroke="${OUT}" stroke-width="3"/>
      <path d="M121 60 l 4 6 l 4 -6" fill="#FBF4EA" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
    </g>
    <text x="134" y="44" font-family="Fraunces Variable, Georgia, serif" font-weight="900" font-style="italic" font-size="24" fill="#E0A526" stroke="${OUT}" stroke-width="1" paint-order="stroke">?</text>`,

  // Bad Taste: a fanned hand of menu cards, the top one stamped in red.
  badtaste: () => `
    ${plate(62)}
    <g stroke="${OUT}" stroke-width="2.8" stroke-linejoin="round">
      <rect x="42" y="26" width="46" height="62" rx="5" fill="#F3E6CF" transform="rotate(-18 64 88)"/>
      <rect x="56" y="22" width="46" height="62" rx="5" fill="#FBF4EA" transform="rotate(-4 78 84)"/>
      <rect x="70" y="24" width="46" height="62" rx="5" fill="#FBF4EA" transform="rotate(12 94 86)"/>
    </g>
    <g transform="rotate(12 94 86)" stroke-linecap="round">
      <path d="M78 34 h30" stroke="#7A1E2C" stroke-width="3"/>
      <path d="M80 42 h26 M80 48 h22 M80 54 h24" stroke="#D9C6A8" stroke-width="2.2"/>
      <g transform="rotate(-20 93 68)">
        <ellipse cx="93" cy="68" rx="17" ry="10" fill="none" stroke="#E2553B" stroke-width="2.8"/>
        <path d="M82 68 h22" stroke="#E2553B" stroke-width="3.2"/>
      </g>
    </g>
    <path d="M60 34 h20 M62 42 h16" transform="rotate(-4 78 84)" stroke="#D9C6A8" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M128 30 l 8 -6 M132 42 l 10 -2 M124 20 l 2 -10" stroke="#E2553B" stroke-width="3" stroke-linecap="round"/>`,

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

// small line icons for the tiles and the "How it plays" card (currentColor)
export const PEOPLE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c.6-3.6 3.2-5.6 6.2-5.6s5.6 2 6.2 5.6"/><circle cx="17" cy="9" r="2.6"/><path d="M16.4 14.5c2.6.1 4.4 1.9 4.9 4.6"/></svg>`;
export const CLOCK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3.2 2"/></svg>`;
// two people side by side, for "Good for two"
export const TWO_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="8" cy="8" r="3.2"/><circle cx="16" cy="8" r="3.2"/><path d="M2.5 20c.5-3.5 2.8-5.4 5.5-5.4 1.6 0 3 .6 4 1.8 1-1.2 2.4-1.8 4-1.8 2.7 0 5 1.9 5.5 5.4"/></svg>`;
export const BACK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`;
export const TICK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`;
export const EYE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
export const AGAIN_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L20 9.5"/><path d="M20 4.5v5h-5"/><path d="M19.5 12a7.5 7.5 0 0 1-13 5.1L4 14.5"/><path d="M4 19.5v-5h5"/></svg>`;
export const NEW_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`;

// Mood icons for the filter chips: one stroke, one weight (currentColor).
const ic = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const MOOD_ICONS = {
  all: ic('<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>'),
  fits: PEOPLE_SVG,
  loud: ic('<path d="M3.5 10v4h3l6 4V6l-6 4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
  talky: ic('<path d="M4 6.5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z"/><path d="M19 9.5h1a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-.5v2.5L17 17.5"/>'),
  sneaky: ic('<path d="M2.5 10c2.5-1 5.5-1.5 9.5-1.5s7 .5 9.5 1.5c-.5 4-2.5 6-5 6-2 0-3-1.5-4.5-1.5S9.5 16 7.5 16c-2.5 0-4.5-2-5-6z"/><circle cx="7.6" cy="11.6" r="1" fill="currentColor"/><circle cx="16.4" cy="11.6" r="1" fill="currentColor"/>'),
  clever: ic('<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2v1.5h5V16c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>'),
  drawing: ic('<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/>'),
  rude: ic('<path d="M4 18.5c7.5 1.5 13-3 14.5-10l-3.5-1.2C14 12.5 10 16 4.5 16.2c-1.5.1-1.8 2-.5 2.3z"/><path d="M16.8 7.6c-.2-1.8.6-3.4 2.7-4.1"/>'),
};

export const INVITE_SVG =`<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M3 3h7v7H3zm2 2v3h3V5zm9-2h7v7h-7zm2 2v3h3V5zM3 14h7v7H3zm2 2v3h3v-3zm9-2h2v2h-2zm2 2h2v2h-2zm2-2h3v2h-3zm-4 4h2v3h-2zm4 0h3v3h-2v-1h-1z"/></svg>`;
