// BNB · Fit Diagnostic — "5 câu hỏi vàng" → khớp 1 trong 12 kịch bản (KB-01..12)
// → 3 phương án phân tầng (Cơ bản / Cân bằng / Cao cấp) gắn SKU thật.
// Config-driven; SKU tham chiếu danh mục Haravan (stub khi offline).

import type { QuoteTier } from "./types";

export type FitQuestion = {
  id: string;
  label: string;
  options: { id: string; label: string }[];
};

export const FIT_QUESTIONS: FitQuestion[] = [
  {
    id: "house",
    label: "Không gian bếp của anh/chị là?",
    options: [
      { id: "apartment", label: "Căn hộ chung cư" },
      { id: "townhouse", label: "Nhà phố" },
      { id: "villa", label: "Biệt thự / nhà lớn" },
      { id: "studio", label: "Studio / bếp nhỏ" },
    ],
  },
  {
    id: "condition",
    label: "Hiện trạng bếp?",
    options: [
      { id: "new", label: "Nhà mới, làm từ đầu" },
      { id: "renovate", label: "Cải tạo, nâng cấp" },
      { id: "replace", label: "Thay 1–2 thiết bị" },
    ],
  },
  {
    id: "family",
    label: "Gia đình có mấy người nấu ăn?",
    options: [
      { id: "small", label: "1–2 người" },
      { id: "medium", label: "3–4 người" },
      { id: "large", label: "5 người trở lên" },
    ],
  },
  {
    id: "budget",
    label: "Ngân sách dự kiến cho thiết bị bếp?",
    options: [
      { id: "under15", label: "Dưới 15 triệu" },
      { id: "15to30", label: "15 – 30 triệu" },
      { id: "30to60", label: "30 – 60 triệu" },
      { id: "over60", label: "Trên 60 triệu" },
    ],
  },
  {
    id: "priority",
    label: "Điều anh/chị ưu tiên nhất?",
    options: [
      { id: "brand", label: "Thương hiệu cao cấp, bền" },
      { id: "value", label: "Giá tốt, đủ dùng" },
      { id: "aesthetic", label: "Thẩm mỹ, đồng bộ" },
      { id: "health", label: "An toàn, sức khoẻ" },
    ],
  },
];

export type FitAnswers = Record<string, string>;

export type FitTier = { skus: string[]; note?: string };
export type FitScenario = {
  id: string; // KB-01..12
  name: string;
  desc: string;
  match: Partial<Record<string, string[]>>; // questionId → các option khớp
  tiers: Record<QuoteTier, FitTier>;
};

// 12 kịch bản bán hàng. SKU tham chiếu STUB_PRODUCTS (và danh mục Haravan thật).
export const FIT_SCENARIOS: FitScenario[] = [
  { id: "KB-01", name: "Căn hộ nhỏ, tối giản", desc: "Bếp từ đôi + hút mùi gọn cho căn hộ 1–2 người.",
    match: { house: ["apartment", "studio"], family: ["small"], budget: ["under15", "15to30"] },
    tiers: {
      basic: { skus: ["TBR-KAFF-KF-105I", "HM-HAFELE-HH-WVG90B"], note: "Đủ dùng, giá tốt" },
      balanced: { skus: ["BT-CHEFS-EH-DIH366", "HM-HAFELE-HH-WVG90B"] },
      premium: { skus: ["BT-BOSCH-PXY875DE3E", "HM-HAFELE-HH-WVG90B"] },
    } },
  { id: "KB-02", name: "Nhà phố gia đình", desc: "Combo bếp từ + hút mùi + lò cho gia đình 3–4 người.",
    match: { house: ["townhouse"], family: ["medium"], budget: ["30to60"] },
    tiers: {
      basic: { skus: ["BT-CHEFS-EH-DIH366", "HM-HAFELE-HH-WVG90B"] },
      balanced: { skus: ["BT-CHEFS-EH-DIH366", "HM-HAFELE-HH-WVG90B", "LO-BOSCH-HBA5570S0B"] },
      premium: { skus: ["BT-BOSCH-PXY875DE3E", "HM-KAFF-KF-GB029", "LO-BOSCH-HBA5570S0B"] },
    } },
  { id: "KB-03", name: "Biệt thự cao cấp", desc: "Trọn bộ thiết bị nhập khẩu Đức, đồng bộ thẩm mỹ.",
    match: { house: ["villa"], budget: ["over60"], priority: ["brand", "aesthetic"] },
    tiers: {
      basic: { skus: ["BT-BOSCH-PXY875DE3E", "HM-KAFF-KF-GB029", "LO-BOSCH-HBA5570S0B"] },
      balanced: { skus: ["BT-BOSCH-PXY875DE3E", "HM-KAFF-KF-GB029", "LO-BOSCH-HBA5570S0B", "MRB-BOSCH-SMS46MI05E"] },
      premium: { skus: ["BT-BOSCH-PXY875DE3E", "HM-KAFF-KF-GB029", "LO-BOSCH-HBA5570S0B", "MRB-BOSCH-SMS46MI05E", "LVS-SPELIER-SPM-628"] },
    } },
  { id: "KB-04", name: "Ưu tiên sức khoẻ", desc: "Bếp từ an toàn + máy lọc nước + máy rửa bát.",
    match: { priority: ["health"], budget: ["30to60", "over60"] },
    tiers: {
      basic: { skus: ["BT-CHEFS-EH-DIH366", "LVS-SPELIER-SPM-628"] },
      balanced: { skus: ["BT-CHEFS-EH-DIH366", "LVS-SPELIER-SPM-628", "MRB-BOSCH-SMS46MI05E"] },
      premium: { skus: ["BT-BOSCH-PXY875DE3E", "LVS-SPELIER-SPM-628", "MRB-BOSCH-SMS46MI05E"] },
    } },
  { id: "KB-05", name: "Thay thiết bị đơn lẻ", desc: "Chỉ cần thay 1–2 món, giữ phần còn lại.",
    match: { condition: ["replace"], budget: ["under15", "15to30"] },
    tiers: {
      basic: { skus: ["TBR-KAFF-KF-105I"] },
      balanced: { skus: ["BT-CHEFS-EH-DIH366"] },
      premium: { skus: ["BT-BOSCH-PXY875DE3E"] },
    } },
  { id: "KB-06", name: "Cải tạo bếp cũ", desc: "Nâng cấp đồng bộ bếp + hút mùi + chậu rửa.",
    match: { condition: ["renovate"], budget: ["15to30", "30to60"] },
    tiers: {
      basic: { skus: ["TBR-KAFF-KF-105I", "HM-HAFELE-HH-WVG90B", "CR-KONOX-KN8048DUB"] },
      balanced: { skus: ["BT-CHEFS-EH-DIH366", "HM-HAFELE-HH-WVG90B", "CR-KONOX-KN8048DUB", "VS-KONOX-KN-PK01"] },
      premium: { skus: ["BT-BOSCH-PXY875DE3E", "HM-KAFF-KF-GB029", "CR-KONOX-KN8048DUB", "VS-KONOX-KN-PK01"] },
    } },
  { id: "KB-07", name: "Bếp đông người", desc: "Gia đình đông, nấu nhiều — cần công suất & rửa bát.",
    match: { family: ["large"], budget: ["30to60", "over60"] },
    tiers: {
      basic: { skus: ["BT-CHEFS-EH-DIH366", "HM-KAFF-KF-GB029"] },
      balanced: { skus: ["BT-BOSCH-PXY875DE3E", "HM-KAFF-KF-GB029", "MRB-BOSCH-SMS46MI05E"] },
      premium: { skus: ["BT-BOSCH-PXY875DE3E", "HM-KAFF-KF-GB029", "MRB-BOSCH-SMS46MI05E", "LO-BOSCH-HBA5570S0B"] },
    } },
  { id: "KB-08", name: "Giá tốt, đủ dùng", desc: "Tối ưu chi phí cho người mua lần đầu.",
    match: { priority: ["value"], budget: ["under15"] },
    tiers: {
      basic: { skus: ["TBR-KAFF-KF-105I"] },
      balanced: { skus: ["TBR-KAFF-KF-105I", "HM-HAFELE-HH-WVG90B"] },
      premium: { skus: ["BT-CHEFS-EH-DIH366", "HM-HAFELE-HH-WVG90B"] },
    } },
  { id: "KB-09", name: "Studio hiện đại", desc: "Bếp nhỏ gọn, thẩm mỹ cho người trẻ.",
    match: { house: ["studio"], priority: ["aesthetic"] },
    tiers: {
      basic: { skus: ["TBR-KAFF-KF-105I", "HM-HAFELE-HH-WVG90B"] },
      balanced: { skus: ["BT-CHEFS-EH-DIH366", "HM-HAFELE-HH-WVG90B"] },
      premium: { skus: ["BT-BOSCH-PXY875DE3E", "HM-KAFF-KF-GB029"] },
    } },
  { id: "KB-10", name: "Căn hộ tầm trung", desc: "Cân bằng giá – chất cho căn hộ 3–4 người.",
    match: { house: ["apartment"], family: ["medium"], budget: ["15to30"] },
    tiers: {
      basic: { skus: ["TBR-KAFF-KF-105I", "HM-HAFELE-HH-WVG90B"] },
      balanced: { skus: ["BT-CHEFS-EH-DIH366", "HM-HAFELE-HH-WVG90B", "CR-KONOX-KN8048DUB"] },
      premium: { skus: ["BT-BOSCH-PXY875DE3E", "HM-HAFELE-HH-WVG90B", "MRB-BOSCH-SMS46MI05E"] },
    } },
  { id: "KB-11", name: "Bộ bếp Bosch trọn gói", desc: "Khách yêu thích thương hiệu Bosch đồng bộ.",
    match: { priority: ["brand"], budget: ["over60"] },
    tiers: {
      basic: { skus: ["BT-BOSCH-PXY875DE3E", "LO-BOSCH-HBA5570S0B"] },
      balanced: { skus: ["BT-BOSCH-PXY875DE3E", "LO-BOSCH-HBA5570S0B", "MRB-BOSCH-SMS46MI05E"] },
      premium: { skus: ["BT-BOSCH-PXY875DE3E", "LO-BOSCH-HBA5570S0B", "MRB-BOSCH-SMS46MI05E", "HM-KAFF-KF-GB029"] },
    } },
  { id: "KB-12", name: "Nhà mới làm từ đầu", desc: "Setup toàn bộ bếp cho nhà mới.",
    match: { condition: ["new"], budget: ["30to60", "over60"] },
    tiers: {
      basic: { skus: ["BT-CHEFS-EH-DIH366", "HM-HAFELE-HH-WVG90B", "CR-KONOX-KN8048DUB", "VS-KONOX-KN-PK01"] },
      balanced: { skus: ["BT-BOSCH-PXY875DE3E", "HM-HAFELE-HH-WVG90B", "LO-BOSCH-HBA5570S0B", "CR-KONOX-KN8048DUB"] },
      premium: { skus: ["BT-BOSCH-PXY875DE3E", "HM-KAFF-KF-GB029", "LO-BOSCH-HBA5570S0B", "MRB-BOSCH-SMS46MI05E", "CR-KONOX-KN8048DUB", "VS-KONOX-KN-PK01"] },
    } },
];

/** Chấm điểm & chọn kịch bản khớp nhất với câu trả lời. */
export function matchScenario(answers: FitAnswers): { scenario: FitScenario; score: number } {
  let best = FIT_SCENARIOS[0];
  let bestScore = -1;
  for (const sc of FIT_SCENARIOS) {
    let score = 0;
    for (const [qid, opts] of Object.entries(sc.match)) {
      if (opts && answers[qid] && opts.includes(answers[qid])) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = sc;
    }
  }
  return { scenario: best, score: bestScore };
}

export const TIER_ORDER: QuoteTier[] = ["basic", "balanced", "premium"];
