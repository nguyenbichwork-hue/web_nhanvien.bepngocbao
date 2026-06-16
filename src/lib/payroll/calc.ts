// Lõi tính lương: từ hồ sơ lương của nhân viên → bóc tách BHXH, thuế TNCN, thực lĩnh.
// Hàm thuần (pure), không phụ thuộc store — dễ kiểm thử & tái dùng.

import type { Employee } from "@/lib/org/types";
import {
  CAP_BHXH_BHYT,
  INSURANCE_RATE,
  PIT_BRACKETS,
  PIT_DEPENDENT_DEDUCTION,
  PIT_SELF_DEDUCTION,
  capBhtn,
} from "./config";

export type Region = 1 | 2 | 3 | 4;

/** Định dạng tiền VND (làm tròn về đồng). */
export const formatVND = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;

export type Payslip = {
  base: number; // lương cơ bản
  allowance: number; // phụ cấp
  contractGross: number; // thu nhập theo hợp đồng = base + allowance
  unpaidDays: number; // số ngày nghỉ không lương trong kỳ
  standardDays: number; // số ngày công chuẩn của tháng
  unpaidDeduction: number; // tiền trừ do nghỉ không lương
  extraTaxable: number; // điều chỉnh kỳ CHỊU THUẾ (thưởng/phụ cấp/khấu trừ), +/−
  postTaxAdjustment: number; // điều chỉnh kỳ SAU thuế, +/−
  gross: number; // thu nhập chịu thuế thực tế = contractGross − trừ nghỉ KL + extraTaxable
  insuranceBaseBhxh: number; // mức đóng BHXH/BHYT (sau khi áp trần)
  insuranceBaseBhtn: number; // mức đóng BHTN (sau khi áp trần)
  empBhxh: number; // NLĐ đóng BHXH 8%
  empBhyt: number; // NLĐ đóng BHYT 1,5%
  empBhtn: number; // NLĐ đóng BHTN 1%
  empInsurance: number; // tổng NLĐ đóng (10,5%)
  erInsurance: number; // tổng NSDLĐ đóng (21,5%) — chi phí doanh nghiệp
  taxableIncome: number; // thu nhập chịu thuế = gross − BH (NLĐ)
  dependents: number; // số người phụ thuộc
  deduction: number; // tổng giảm trừ (bản thân + NPT)
  pitBase: number; // thu nhập tính thuế (TNTT)
  pit: number; // thuế TNCN phải nộp
  net: number; // thực lĩnh = gross − BH − thuế
  totalCost: number; // tổng chi phí DN = gross + BH (NSDLĐ)
};

/** Thuế TNCN theo biểu lũy tiến từng phần. */
export function progressivePIT(tntt: number): number {
  if (tntt <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const b of PIT_BRACKETS) {
    const slice = Math.min(tntt, b.upTo) - lower;
    if (slice > 0) tax += slice * b.rate;
    lower = b.upTo;
    if (tntt <= b.upTo) break;
  }
  return tax;
}

/**
 * Tính phiếu lương tháng cho 1 nhân viên (vùng lương của pháp nhân).
 * opts.unpaidDays + opts.standardDays: trừ lương theo tỷ lệ ngày nghỉ không lương.
 * Lưu ý: BHXH vẫn tính trên lương đóng theo hợp đồng (chỉ miễn khi nghỉ ≥14 ngày/
 * tháng — quy tắc đó để bổ sung sau).
 */
export function computePayslip(
  emp: Employee,
  region: Region = 1,
  opts: {
    unpaidDays?: number;
    standardDays?: number;
    extraTaxable?: number;
    postTaxAdjustment?: number;
  } = {},
): Payslip {
  const base = emp.baseSalary ?? 0;
  const allowance = emp.allowance ?? 0;
  const contractGross = base + allowance;

  const standardDays = opts.standardDays && opts.standardDays > 0 ? opts.standardDays : 22;
  const unpaidDays = Math.max(0, Math.min(opts.unpaidDays ?? 0, standardDays));
  const unpaidDeduction = (contractGross * unpaidDays) / standardDays;
  // Điều chỉnh kỳ chịu thuế cộng thẳng vào thu nhập (chảy qua thuế TNCN); KHÔNG
  // ảnh hưởng mức đóng BHXH (BHXH tính trên lương đóng theo hợp đồng).
  const extraTaxable = opts.extraTaxable ?? 0;
  const postTaxAdjustment = opts.postTaxAdjustment ?? 0;
  const gross = Math.max(0, contractGross - unpaidDeduction + extraTaxable);

  const insBase = emp.insuranceSalary ?? base;
  const insuranceBaseBhxh = Math.min(insBase, CAP_BHXH_BHYT);
  const insuranceBaseBhtn = Math.min(insBase, capBhtn(region));

  const empBhxh = insuranceBaseBhxh * INSURANCE_RATE.employee.bhxh;
  const empBhyt = insuranceBaseBhxh * INSURANCE_RATE.employee.bhyt;
  const empBhtn = insuranceBaseBhtn * INSURANCE_RATE.employee.bhtn;
  const empInsurance = empBhxh + empBhyt + empBhtn;

  const erInsurance =
    insuranceBaseBhxh *
      (INSURANCE_RATE.employer.bhxh + INSURANCE_RATE.employer.bhyt + INSURANCE_RATE.employer.tnld) +
    insuranceBaseBhtn * INSURANCE_RATE.employer.bhtn;

  const taxableIncome = gross - empInsurance;
  const dependents = emp.dependents ?? 0;
  const deduction = PIT_SELF_DEDUCTION + dependents * PIT_DEPENDENT_DEDUCTION;
  const pitBase = Math.max(0, taxableIncome - deduction);
  const pit = progressivePIT(pitBase);
  // net = thực lĩnh từ lương (gross đã gồm khoản chịu thuế). Điều chỉnh SAU thuế
  // (postTaxAdjustment) tách riêng để nơi gọi cộng vào "thực nhận sau điều chỉnh".
  const net = gross - empInsurance - pit;

  return {
    base,
    allowance,
    contractGross,
    unpaidDays,
    standardDays,
    unpaidDeduction,
    extraTaxable,
    postTaxAdjustment,
    gross,
    insuranceBaseBhxh,
    insuranceBaseBhtn,
    empBhxh,
    empBhyt,
    empBhtn,
    empInsurance,
    erInsurance,
    taxableIncome,
    dependents,
    deduction,
    pitBase,
    pit,
    net,
    totalCost: gross + erInsurance,
  };
}

/** Nhân viên có đang được trả lương trong tháng (yyyy-mm) không? */
export function isPaidInMonth(emp: Employee, ym: string): boolean {
  const monthStart = `${ym}-01`;
  const monthEnd = `${ym}-31`;
  if (emp.joinDate && emp.joinDate > monthEnd) return false; // chưa vào làm trong tháng
  if (emp.leaveDate && emp.leaveDate < monthStart) return false; // đã nghỉ trước tháng
  // Đã nghỉ việc nhưng không ghi ngày nghỉ → không tính vào kỳ lương.
  if (emp.status === "left" && !emp.leaveDate) return false;
  return true;
}
