// K-HR icon set — SVG tự vẽ (currentColor), port từ prototype.
// Dùng: <Icon name="users" />

const S =
  'stroke="currentColor" stroke-width="1.85" fill="none" stroke-linecap="round" stroke-linejoin="round"';
const PF = 'fill="currentColor"';

export const ICONS: Record<string, string> = {
  logo: `<svg viewBox="0 0 24 24" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V7l8-4 8 4v13"/><path d="M9 20v-6h6v6"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" ${S}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>`,
  users: `<svg viewBox="0 0 24 24" ${S}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6"/><path d="M17.5 14.3A5.5 5.5 0 0 1 20.5 20"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" ${S}><rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><circle cx="8.5" cy="14" r="1" ${PF} stroke="none"/><circle cx="12" cy="14" r="1" ${PF} stroke="none"/></svg>`,
  wallet: `<svg viewBox="0 0 24 24" ${S}><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 14.5h2"/></svg>`,
  userplus: `<svg viewBox="0 0 24 24" ${S}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M18 8.5v5M15.5 11h5"/></svg>`,
  user: `<svg viewBox="0 0 24 24" ${S}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>`,
  userminus: `<svg viewBox="0 0 24 24" ${S}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M15.5 11h5"/></svg>`,
  target: `<svg viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" ${PF} stroke="none"/></svg>`,
  chart: `<svg viewBox="0 0 24 24" ${S}><path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 20v-6M12.5 20V9M17 20v-9"/></svg>`,
  search: `<svg viewBox="0 0 24 24" ${S}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" ${S}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" ${S}><path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" ${S}><path d="M12 5v14M5 12h14"/></svg>`,
  check: `<svg viewBox="0 0 24 24" ${S}><path d="m5 13 4 4L19 7"/></svg>`,
  x: `<svg viewBox="0 0 24 24" ${S}><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  chev: `<svg viewBox="0 0 24 24" ${S}><path d="m9 6 6 6-6 6"/></svg>`,
  download: `<svg viewBox="0 0 24 24" ${S}><path d="M12 4v11m0 0 4-4m-4 4-4-4"/><path d="M5 19h14"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" ${S}><path d="M4 5h16l-6 8v5l-4 2v-7Z"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="3.1"/><path d="M19.4 13a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03Z"/></svg>`,
  up: `<svg viewBox="0 0 24 24" ${S}><path d="M5 15l7-7 7 7"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" ${S}><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>`,
  building: `<svg viewBox="0 0 24 24" ${S}><rect x="4" y="3" width="11" height="18" rx="2"/><path d="M15 8h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3M8 7h3M8 11h3M8 15h3"/></svg>`,
  tree: `<svg viewBox="0 0 24 24" ${S}><rect x="9" y="3" width="6" height="4" rx="1"/><rect x="3" y="17" width="6" height="4" rx="1"/><rect x="15" y="17" width="6" height="4" rx="1"/><path d="M12 7v5M6 17v-3h12v3"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" ${S}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" ${S}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" ${S}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>`,
  briefcase: `<svg viewBox="0 0 24 24" ${S}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>`,
  chevleft: `<svg viewBox="0 0 24 24" ${S}><path d="m15 6-6 6 6 6"/></svg>`,
  book: `<svg viewBox="0 0 24 24" ${S}><path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 0 2 2h13"/><path d="M9 7h6M9 11h5"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" ${S}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>`,
  box: `<svg viewBox="0 0 24 24" ${S}><path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
  award: `<svg viewBox="0 0 24 24" ${S}><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5"/></svg>`,
  cap: `<svg viewBox="0 0 24 24" ${S}><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.2 2.7 2 6 2s6-.8 6-2v-5"/></svg>`,
  key: `<svg viewBox="0 0 24 24" ${S}><circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8 20 3M16.5 6.5 19 9M14 9l2 2"/></svg>`,

  // ---- BNB · 12 phân hệ ----
  today: `<svg viewBox="0 0 24 24" ${S}><path d="M3 18h18"/><path d="M5.5 18a6.5 6.5 0 0 1 13 0"/><path d="M12 3v3M4 10 5.5 11.5M20 10l-1.5 1.5M1.5 18h1.5M21 18h1.5"/></svg>`,
  leads: `<svg viewBox="0 0 24 24" ${S}><path d="M4 5h16M6.5 10h11M9.5 15h5M11 20h2"/></svg>`,
  customer: `<svg viewBox="0 0 24 24" ${S}><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="2.2"/><path d="M5.7 16a3.4 3.4 0 0 1 6.6 0M15 10h4M15 13.5h3"/></svg>`,
  fit: `<svg viewBox="0 0 24 24" ${S}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="m9.3 12.2 1.6 1.6L14.7 10"/></svg>`,
  quote: `<svg viewBox="0 0 24 24" ${S}><path d="M3 11.5V4.5A1.5 1.5 0 0 1 4.5 3h7L21 12.5 12.5 21 3 11.5Z"/><circle cx="7.5" cy="7.5" r="1.4"/></svg>`,
  survey: `<svg viewBox="0 0 24 24" ${S}><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/></svg>`,
  cart: `<svg viewBox="0 0 24 24" ${S}><path d="M3 4h2l2.2 11.4a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/><circle cx="9" cy="20" r="1.3" ${PF} stroke="none"/><circle cx="17.5" cy="20" r="1.3" ${PF} stroke="none"/></svg>`,
  truck: `<svg viewBox="0 0 24 24" ${S}><rect x="2" y="6" width="12" height="9.5" rx="1.5"/><path d="M14 9h3.6L21 12.3v3.2h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg>`,
  warranty: `<svg viewBox="0 0 24 24" ${S}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6Z"/><path d="m9 11.5 2 2 4-4"/></svg>`,
  handover: `<svg viewBox="0 0 24 24" ${S}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8 12h6m0 0-2.2-2.2M14 12l-2.2 2.2"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" ${S}><path d="M12 4 2.6 20h18.8L12 4Z"/><path d="M12 10.5v4M12 17.5h.01"/></svg>`,
  crown: `<svg viewBox="0 0 24 24" ${S}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8Z"/></svg>`,

  // ---- Tiện ích liên hệ ----
  phone: `<svg viewBox="0 0 24 24" ${S}><path d="M6 3h3l1.8 4.5L8.5 9a11 11 0 0 0 5 5l1.5-2.3L19.5 14V18a2 2 0 0 1-2 2A15 15 0 0 1 4 6.5 2 2 0 0 1 6 4.5Z"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" ${S}><path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="M8 9.5h8M8 12.5h5"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" ${S}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7.5 8 5.5 8-5.5"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" ${S}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" ${S}><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3L12 3Z"/><path d="M18 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/></svg>`,
  wrench: `<svg viewBox="0 0 24 24" ${S}><path d="M14.7 6.3a3.5 3.5 0 0 1-4.4 4.4l-5 5 3 3 5-5a3.5 3.5 0 0 1 4.4-4.4l-2.3 2.3-2-2 2.3-2.3Z"/></svg>`,

  // ---- Ngành bếp ----
  stove: `<svg viewBox="0 0 24 24" ${S}><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="2.4"/><circle cx="15.5" cy="9.5" r="2.4"/><path d="M6 16h12"/></svg>`,
  hood: `<svg viewBox="0 0 24 24" ${S}><path d="M3 7h18l-1.8 5H4.8L3 7Z"/><path d="M8.5 12v2.5a2 2 0 0 0 4 0M16 12l.8 3"/></svg>`,
  oven: `<svg viewBox="0 0 24 24" ${S}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16"/><circle cx="8" cy="5.5" r="0.6" ${PF} stroke="none"/><circle cx="11" cy="5.5" r="0.6" ${PF} stroke="none"/><rect x="7" y="11" width="10" height="7" rx="1"/></svg>`,
  sink: `<svg viewBox="0 0 24 24" ${S}><path d="M4 10h16v3.5A4.5 4.5 0 0 1 15.5 18h-7A4.5 4.5 0 0 1 4 13.5V10Z"/><path d="M12 10V5.5A2.5 2.5 0 0 1 14.5 3H17M12 13v2"/></svg>`,
  fridge: `<svg viewBox="0 0 24 24" ${S}><rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M6 10h12M9.5 6v1.5M9.5 13v2"/></svg>`,
  fire: `<svg viewBox="0 0 24 24" ${S}><path d="M12 3c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.2.4-2 1-2.8C9.4 9.4 11 8 12 3Z"/></svg>`,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, className }: { name: string; className?: string }) {
  const svg = ICONS[name];
  if (!svg) return null;
  return (
    <span
      className={className}
      style={{ display: "inline-flex" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
