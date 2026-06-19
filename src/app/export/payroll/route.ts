import { getSession, can } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/scope";
import { loadPayrollMonth } from "@/lib/org/store";
import { computePayslip, isPaidInMonth, type Region } from "@/lib/payroll/calc";
import { rowsToXlsxResponse } from "@/lib/export/xlsx";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !can(session, "payroll.read")) return new Response("Forbidden", { status: 403 });

  const sp = new URL(request.url).searchParams;
  const monthParam = sp.get("month") ?? "";
  const now = new Date();
  const ym = /^\d{4}-\d{2}$/.test(monthParam)
    ? monthParam
    : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  // Nạp toàn bộ dữ liệu kỳ trong MỘT lượt (tránh getDb trong vòng lặp → vượt 50 subrequest).
  const { employees: allEmployees, entities, standardDays, metricsOf } = await loadPayrollMonth(ym);
  const visIds = await visibleEmployeeIds(session);
  // Vùng lương tối thiểu lấy từ hồ sơ công ty (dùng cho BHXH/BHTN).
  const regionOf = (id: string): Region => (entities.find((e) => e.id === id)?.region ?? 1) as Region;

  const employees = allEmployees
    .filter((e) => visIds === "all" || visIds.has(e.id))
    .filter((e) => isPaidInMonth(e, ym));

  const rows: unknown[][] = [[
    "Mã NV", "Họ tên", "Lương cơ bản", "Phụ cấp", "Ngày nghỉ KL",
    "Gross", "BH (NLĐ)", "Số NPT", "Thuế TNCN", "Thưởng/Phạt", "Tiền OT", "Thực nhận",
  ]];
  for (const e of employees) {
    const { unpaidDays, rewardAdj, overtimePay } = metricsOf(e.id);
    const s = computePayslip(e, regionOf(e.legalEntityId), { unpaidDays, standardDays });
    rows.push([
      e.code, e.fullName, s.base, s.allowance, s.unpaidDays,
      s.gross, s.empInsurance, s.dependents, s.pit, rewardAdj, overtimePay, s.net + rewardAdj + overtimePay,
    ]);
  }

  return rowsToXlsxResponse(`bang-luong-${ym}`, rows, `Lương ${ym}`);
}
