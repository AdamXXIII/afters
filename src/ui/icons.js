// Hand-made SVG icons (DESIGN 3.4 / 3.5). White glyphs for avatar bubbles; currentColor elsewhere.
const svg = (body, vb = '0 0 24 24', extra = '') => `<svg viewBox="${vb}" aria-hidden="true" ${extra}>${body}</svg>`;

export const AVATAR_ICONS = [
  // 0 jelly: fluted dome on a plate
  svg('<path d="M5 18c0-6 2.6-11 7-11s7 5 7 11z" fill="#fff"/><path d="M8.5 18c.2-4 .9-8 2-10M15.5 18c-.2-4-.9-8-2-10M12 18V8" stroke="rgba(0,0,0,.18)" stroke-width="1.2" fill="none"/><rect x="3" y="18" width="18" height="2" rx="1" fill="#fff"/><circle cx="10" cy="13" r="1" fill="#2A1A17"/><circle cx="14" cy="13" r="1" fill="#2A1A17"/>'),
  // 1 sprout
  svg('<circle cx="12" cy="13.5" r="6.5" fill="#fff"/><path d="M12 7c-1.5-2.5-4-3-5.5-2.5M12 7c1.5-2.5 4-3 5.5-2.5M6.5 11c1.5 1 3 1.4 4 1M17.5 11c-1.5 1-3 1.4-4 1" stroke="rgba(0,0,0,.2)" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="10" cy="14.5" r="1" fill="#2A1A17"/><circle cx="14" cy="14.5" r="1" fill="#2A1A17"/>'),
  // 2 teacup
  svg('<path d="M4.5 8h12l-1.2 7.2A3 3 0 0 1 12.3 18h-3.6a3 3 0 0 1-3-2.8z" fill="#fff"/><path d="M16.3 9.5h1.5a2.3 2.3 0 0 1 0 4.6h-2.2" stroke="#fff" stroke-width="1.8" fill="none"/><rect x="3" y="18.5" width="15" height="1.8" rx=".9" fill="#fff"/><circle cx="8.6" cy="12" r="1" fill="#2A1A17"/><circle cx="12.4" cy="12" r="1" fill="#2A1A17"/>'),
  // 3 cheese wedge
  svg('<path d="M3 17.5 20 9.5v8z" fill="#fff"/><path d="M3 17.5 13 7l7 2.5" fill="#fff" opacity=".75"/><circle cx="16.5" cy="14.5" r="1.2" fill="rgba(0,0,0,.18)"/><circle cx="9" cy="15.6" r=".8" fill="rgba(0,0,0,.18)"/><circle cx="12" cy="14.5" r="1" fill="#2A1A17"/><circle cx="15" cy="12.2" r="1" fill="#2A1A17" opacity="0"/><circle cx="14.5" cy="13.4" r="1" fill="#2A1A17"/>'),
  // 4 pepper mill
  svg('<circle cx="12" cy="3.6" r="1.5" fill="#fff"/><path d="M9 5.5h6l-.6 3 1 4.5-1.2 6.5H9.8L8.6 13l1-4.5z" fill="#fff"/><rect x="8.8" y="11.6" width="6.4" height="1.6" fill="rgba(0,0,0,.18)"/><circle cx="10.8" cy="9" r=".9" fill="#2A1A17"/><circle cx="13.2" cy="9" r=".9" fill="#2A1A17"/>'),
  // 5 pudding
  svg('<path d="M4.5 18a7.5 7.5 0 0 1 15 0z" fill="#fff"/><path d="M6 12.5c1.5-3 3.6-4.2 6-4.2s4.5 1.2 6 4.2c-1 .8-1.6-.6-2.4.4s-1.3-.6-2.2.2-1.5-.5-2.4.3-1.5-.6-2.4.2-1.6-.7-2.6-1.1z" fill="rgba(0,0,0,.15)"/><path d="M10 6.5c.8-1.6 2.2-1.6 2-3M14 6.5c-.8-1.6-2.2-1.6-2-3" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/><circle cx="12" cy="6.6" r="1.1" fill="#fff"/><circle cx="10" cy="15" r="1" fill="#2A1A17"/><circle cx="14" cy="15" r="1" fill="#2A1A17"/>'),
  // 6 egg in cup
  svg('<ellipse cx="12" cy="10" rx="5" ry="6.3" fill="#fff"/><path d="M6.5 13.5h11l-1.5 3.5h-8z" fill="#fff" opacity=".8"/><rect x="10.5" y="17" width="3" height="2" fill="#fff"/><rect x="8" y="19" width="8" height="1.6" rx=".8" fill="#fff"/><circle cx="10.2" cy="9.6" r="1" fill="#2A1A17"/><circle cx="13.8" cy="9.6" r="1" fill="#2A1A17"/>'),
  // 7 bourbon biscuit
  svg('<rect x="3" y="7" width="18" height="4.2" rx="1.2" fill="#fff"/><rect x="3" y="12.8" width="18" height="4.2" rx="1.2" fill="#fff"/><rect x="4" y="11.1" width="16" height="1.8" fill="#fff" opacity=".6"/><circle cx="7" cy="9.1" r=".7" fill="rgba(0,0,0,.2)"/><circle cx="17" cy="9.1" r=".7" fill="rgba(0,0,0,.2)"/><circle cx="10.2" cy="14.9" r="1" fill="#2A1A17"/><circle cx="13.8" cy="14.9" r="1" fill="#2A1A17"/>'),
];

export const ICONS = {
  gear: svg('<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.2 4.9-.1-2.8 2-1.6-2-3.4-2.4.8a8 8 0 0 0-2.4-1.4L14.8 2.5h-4l-.5 2.5a8 8 0 0 0-2.4 1.4l-2.4-.8-2 3.4 2 1.6a8.4 8.4 0 0 0 0 2.8l-2 1.6 2 3.4 2.4-.8a8 8 0 0 0 2.4 1.4l.5 2.5h4l.5-2.5a8 8 0 0 0 2.4-1.4l2.4.8 2-3.4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
  crown: svg('<path d="M1 11 2.5 3l4 3.5L8 1l1.5 5.5 4-3.5L15 11z" fill="currentColor"/>', '0 0 16 12'),
  speaker: svg('<path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'),
  plug: svg('<path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'),
  tick: svg('<path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  share: svg('<path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  roll: svg('<ellipse cx="16" cy="18" rx="12.5" ry="8.6" fill="#C98A4B" stroke="#2A1A17" stroke-width="1.6"/><path d="M5.5 16c1.5-6 7-9.5 10.5-9.5S25 10 26.5 16" fill="#E0A526" stroke="#2A1A17" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 10.5c1.4 1.6 1.6 3.6.8 5.6M16 8.6c1.5 2 1.6 4.6.6 7M21 10.5c1.2 1.6 1.4 3.6.6 5.6" stroke="#7A4A2A" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M9 12.5c1.6-2.2 3.6-3.4 5.4-3.6" stroke="#FFC86B" stroke-width="1.6" fill="none" stroke-linecap="round"/>', '0 0 32 32'),
  rose: svg('<path d="M16 19.5V29" stroke="#2A1A17" stroke-width="2.6" stroke-linecap="round"/><path d="M16 19.5V29" stroke="#7F9A74" stroke-width="1.2" stroke-linecap="round"/><path d="M16 25c-3.4-.3-5.8-2.4-6.4-5.2 3.4.1 5.8 2.1 6.4 5.2z" fill="#7F9A74" stroke="#2A1A17" stroke-width="1.4" stroke-linejoin="round"/><path d="M8.5 11.5C8.5 6.8 12 4 16 4s7.5 2.8 7.5 7.5c0 4.6-3.4 8.2-7.5 8.2s-7.5-3.6-7.5-8.2z" fill="#7A1E2C" stroke="#2A1A17" stroke-width="1.6"/><path d="M16 7.5c-2.8.6-4.2 2.8-3.4 5.2.9 2.4 4.6 2.6 5.9.5 1-1.7.1-3.6-1.6-3.9" stroke="#E2553B" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M10.5 9.5c.6-1.8 1.8-3 3.2-3.6" stroke="#FBF4EA" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".7"/>', '0 0 32 32'),
  applause: svg('<path d="M9.5 23.5 6.6 13.4a1.9 1.9 0 0 1 3.5-1.3l2 4.2-2.4-7.8a1.9 1.9 0 0 1 3.6-1l2.4 6.8-1.1-4a1.9 1.9 0 0 1 3.6-1l2 6.4c1.3 4.1-1 8.2-5.1 9.2-3 .7-5.2-.8-6-1.4z" fill="#E0A526" stroke="#2A1A17" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 12.6c.3-1.1.9-2 1.6-2.4" stroke="#FFC86B" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M22.5 6.5 24.6 3M25.8 10l3.4-1.2M24.6 14l3.4.6" stroke="#C89B3C" stroke-width="2" stroke-linecap="round"/>', '0 0 32 32'),
  groan: svg('<circle cx="16" cy="17" r="11.5" fill="#F3E6CF" stroke="#2A1A17" stroke-width="1.6"/><path d="M10.5 15c1.2-.9 2.6-.9 3.6 0M18 15c1.2-.9 2.6-.9 3.6 0" stroke="#2A1A17" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M11.5 23c2.8-2.2 6.2-2.2 9 0" stroke="#7A1E2C" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M6 6.5c1.5.4 2.8 1.4 3.6 2.8" stroke="#2F5D7C" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M24.5 4.5c.5 1.4 1.6 2.4 2.6 2.4-1.6 1-2.1 2.6-1.8 4" stroke="#7A4A2A" stroke-width="1.5" fill="none" stroke-linecap="round"/>', '0 0 32 32'),
  glass: svg('<path d="M8 3h16l-1.5 10a6.5 6.5 0 0 1-13 0z" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M16 19.5V28M11 29h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>', '0 0 32 32'),
  glassFull: svg('<path d="M8 3h16l-1.5 10a6.5 6.5 0 0 1-13 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.9 9h14.2l-.6 4a6.5 6.5 0 0 1-13 0z" fill="#7A1E2C"/><path d="M16 19.5V28M11 29h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>', '0 0 32 32'),
  snout: svg('<ellipse cx="16" cy="16" rx="12" ry="9" fill="#E9A3A8" stroke="#B5527E" stroke-width="2"/><ellipse cx="11.5" cy="16" rx="2.4" ry="3.4" fill="#7A1E2C"/><ellipse cx="20.5" cy="16" rx="2.4" ry="3.4" fill="#7A1E2C"/>', '0 0 32 32'),
  flame: svg('<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 .5 2 1.5 3 2.5 3 0-3-1-5.5.5-8z" fill="currentColor"/>'),
  candleStub: svg('<rect x="2" y="6" width="6" height="14" rx="1.2" fill="#F3E6CF"/><path d="M5 1c.8 1.5 2 2.2 2 3.6A2 2 0 0 1 3 4.6C3 3.3 4.4 2.6 5 1z" fill="#FFC86B"/>', '0 0 10 22'),
};

export function avatarIcon(i) { return AVATAR_ICONS[((i % 8) + 8) % 8]; }
