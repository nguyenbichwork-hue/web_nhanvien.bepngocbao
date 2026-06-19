// BNB · Hệ "bản sắc theo nhóm" — mỗi nhóm phân hệ một tông màu riêng để các tab
// KHÁC BIỆT rõ ràng. Brand crimson vẫn là nhận diện chung (logo/đăng nhập);
// còn chrome của từng khu (sidebar active, hero header, KPI, biểu đồ) đổi theo
// nhóm. Khớp với src/lib/nav.ts. Đổi màu nhóm = đổi ở đây.

export type Accent = {
  key: string;
  /** Màu chính (đậm) */
  main: string;
  /** Màu sáng (cho gradient) */
  light: string;
  /** "r, g, b" của main — dùng cho rgba()/glow */
  rgb: string;
  /** Tên hiển thị ngắn của khu (cho hero/eyebrow) */
  zone: string;
};

// Bảng màu 6 khu — các hue cách xa nhau trên vòng tròn màu để dễ phân biệt.
export const ACCENTS = {
  crimson: { key: "crimson", main: "#9e1b32", light: "#c8203f", rgb: "158, 27, 50", zone: "Bán hàng" },
  violet: { key: "violet", main: "#7c3aed", light: "#a368f7", rgb: "124, 58, 237", zone: "Marketing & Kho" },
  amber: { key: "amber", main: "#ea580c", light: "#fb8a3c", rgb: "234, 88, 12", zone: "Hiện trường" },
  blue: { key: "blue", main: "#2563eb", light: "#5b8df9", rgb: "37, 99, 235", zone: "Nhân sự" },
  teal: { key: "teal", main: "#0d9488", light: "#19c2b1", rgb: "13, 148, 136", zone: "Quản trị" },
  slate: { key: "slate", main: "#475569", light: "#6b7c93", rgb: "71, 85, 105", zone: "Hệ thống" },
} as const satisfies Record<string, Accent>;

export type AccentKey = keyof typeof ACCENTS;

// Mỗi nhóm trong NAV → một accent. Khớp nhãn nhóm ở src/lib/nav.ts.
export const GROUP_ACCENT: Record<string, AccentKey> = {
  "Hằng ngày": "crimson",
  "Bán hàng": "crimson",
  "Marketing & Kho": "violet",
  "Kho & Mua hàng": "violet",
  "Hiện trường & Hậu mãi": "amber",
  "Nhân sự": "blue",
  "Quản trị": "teal",
  "Hệ thống": "slate",
};

// Map prefix route → accent (để client biết tô màu gì theo URL hiện tại).
// Sinh thủ công từ NAV để tránh phụ thuộc vòng. Khớp khi route bắt đầu bằng prefix.
const ROUTE_ACCENT: [string, AccentKey][] = [
  // Hằng ngày
  ["/dashboard", "crimson"],
  // Bán hàng
  ["/crm", "crimson"], ["/customers", "crimson"], ["/inbox", "crimson"],
  ["/cx", "crimson"], ["/reviews", "crimson"], ["/fit", "crimson"],
  ["/design", "crimson"], ["/survey", "crimson"], ["/quote", "crimson"],
  ["/pos", "crimson"], ["/orders", "crimson"],
  // Marketing & Kho
  ["/marketing", "violet"], ["/inventory", "violet"], ["/purchase", "violet"],
  // Hiện trường & Hậu mãi
  ["/delivery", "amber"], ["/warranty", "amber"], ["/shift-report", "amber"], ["/tasks", "amber"],
  // Nhân sự (gồm các module HR phụ)
  ["/employees", "blue"], ["/schedule", "blue"], ["/leave", "blue"],
  ["/overtime", "blue"], ["/payroll", "blue"], ["/performance", "blue"], ["/recruit", "blue"],
  ["/contracts", "blue"], ["/benefits", "blue"], ["/assets", "blue"],
  ["/training", "blue"], ["/rewards", "blue"], ["/notifications", "blue"],
  // Quản trị
  ["/admin", "teal"], ["/bi", "teal"], ["/finance", "teal"],
  ["/reports", "teal"], ["/integrations", "teal"],
  // Hệ thống
  ["/guide", "slate"], ["/settings", "slate"], ["/account", "slate"],
];

/** Accent cho một đường dẫn (khớp prefix dài nhất). Mặc định crimson (brand). */
export function accentForPath(path: string): Accent {
  let best: AccentKey = "crimson";
  let bestLen = -1;
  for (const [prefix, key] of ROUTE_ACCENT) {
    if ((path === prefix || path.startsWith(prefix + "/") || path.startsWith(prefix)) && prefix.length > bestLen) {
      best = key;
      bestLen = prefix.length;
    }
  }
  return ACCENTS[best];
}

/** Accent theo nhãn nhóm NAV (cho sidebar). */
export function accentForGroup(label: string): Accent {
  return ACCENTS[GROUP_ACCENT[label] ?? "crimson"];
}
