// Tham số pháp lý tính lương Việt Nam.
// Nguồn: memory ref-vn-hr-figures-2025-2026 — ĐỂ DẠNG HẰNG SỐ để kế toán/HR dễ
// cập nhật khi quy định thay đổi (không hard-code rải rác trong logic).

/** Lương cơ sở (từ 01/7/2025) — dùng cho trần đóng BHXH/BHYT. */
export const BASE_WAGE = 2_340_000;

/** Lương tối thiểu vùng (NĐ 293/2025, áp dụng từ 01/01/2026). */
export const REGION_MIN_WAGE: Record<1 | 2 | 3 | 4, number> = {
  1: 5_310_000,
  2: 4_730_000,
  3: 4_140_000,
  4: 3_700_000,
};

/**
 * Tỷ lệ đóng bảo hiểm bắt buộc (từ 01/7/2025).
 *   NLĐ  = 10,5% (BHXH 8% + BHYT 1,5% + BHTN 1%)
 *   NSDLĐ = 21,5% (BHXH 17% + BHYT 3% + BHTN 1% + TNLĐ-BNN 0,5%)
 */
export const INSURANCE_RATE = {
  employee: { bhxh: 0.08, bhyt: 0.015, bhtn: 0.01 },
  employer: { bhxh: 0.17, bhyt: 0.03, bhtn: 0.01, tnld: 0.005 },
} as const;

/** Trần tiền lương đóng BHXH & BHYT = 20× lương cơ sở. */
export const CAP_BHXH_BHYT = 20 * BASE_WAGE; // 46.800.000

/** Trần tiền lương đóng BHTN = 20× lương tối thiểu vùng. */
export const capBhtn = (region: 1 | 2 | 3 | 4) => 20 * REGION_MIN_WAGE[region];

/** Giảm trừ gia cảnh (áp dụng kỳ tính thuế từ 2026). */
export const PIT_SELF_DEDUCTION = 15_500_000; // bản thân
export const PIT_DEPENDENT_DEDUCTION = 6_200_000; // mỗi người phụ thuộc

/**
 * Biểu thuế TNCN lũy tiến từng phần — 7 bậc HIỆN HÀNH (kiểm chứng được).
 * LƯU Ý: dự thảo 2026 rút còn 5 bậc nhưng CHƯA chốt ngưỡng → giữ biểu 7 bậc;
 * khi luật mới có hiệu lực chỉ cần sửa bảng này.
 */
export const PIT_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 5_000_000, rate: 0.05 },
  { upTo: 10_000_000, rate: 0.1 },
  { upTo: 18_000_000, rate: 0.15 },
  { upTo: 32_000_000, rate: 0.2 },
  { upTo: 52_000_000, rate: 0.25 },
  { upTo: 80_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];
