// Tầng TỔNG HỢP số liệu nhân sự (analytics) — tính từ tầng dữ liệu store.
// Dùng chung cho Dashboard và trang Báo cáo. Khi nối Supabase, các hàm store
// bên dưới đổi sang truy vấn DB là tầng này chạy nguyên vẹn.

import {
  listDepartments,
  listEmployees,
  listEntities,
  listJobTitles,
  listLeaveRequests,
  listLeaveTypes,
} from "./store";
import {
  EMPLOYMENT_TYPE_LABEL,
  GENDER_LABEL,
  type Employee,
  type Gender,
} from "./types";

/** Bảng màu xoay vòng cho biểu đồ (khớp tông màu Dashboard). */
export const PALETTE = [
  "#6366F1",
  "#10B981",
  "#F59E0B",
  "#F43F5E",
  "#0EA5E9",
  "#8B5CF6",
  "#14B8A6",
  "#EC4899",
];

/** Một lát cắt phân bố: nhãn + số lượng + màu. */
export type Slice = { label: string; count: number; color: string };

export type HrAnalytics = {
  scope: string; // tên phạm vi đang xem (pháp nhân hoặc "toàn tập đoàn")
  total: number; // tổng nhân sự đang làm (chưa nghỉ việc)
  active: number; // chính thức
  probation: number; // thử việc
  left: number; // đã nghỉ việc
  byEntity: Slice[]; // cơ cấu theo pháp nhân
  byDepartment: Slice[]; // theo phòng ban (top + gộp)
  byEmploymentType: Slice[]; // theo loại hình lao động
  byTitle: Slice[]; // theo chức danh
  // --- Đa dạng ---
  byGender: Slice[];
  femalePct: number;
  avgAge: number | null;
  byAgeBand: Slice[];
  avgTenure: number | null;
  // --- Tuyển dụng ---
  hiresThisYear: number;
  hiresThisMonth: number;
  hiresByMonth: { label: string; count: number }[]; // 6 tháng gần nhất
  recentHires: {
    id: string;
    name: string;
    dept: string;
    date: string;
    status: Employee["status"];
  }[];
};

export type LeaveAnalytics = {
  pending: number; // số đơn chờ duyệt
  onLeaveToday: number; // số người đang nghỉ hôm nay (đơn đã duyệt)
  approvedDaysThisMonth: number; // tổng ngày phép đã duyệt bắt đầu trong tháng
  byType: Slice[]; // số đơn theo loại nghỉ trong năm (mọi trạng thái còn hiệu lực)
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const YEAR_MS = 365.25 * MS_PER_DAY;

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** Số năm (thập phân) từ một mốc ISO đến `to`. */
function yearsSince(iso: string | undefined | null, to: Date): number | null {
  const d = parseDate(iso);
  if (!d) return null;
  return (to.getTime() - d.getTime()) / YEAR_MS;
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

/** Gom theo khoá → mảng Slice, sắp giảm dần, gộp phần đuôi vào "Khác". */
function toSlices(
  counts: Map<string, number>,
  opts: { top?: number; otherLabel?: string } = {},
): Slice[] {
  const top = opts.top ?? Infinity;
  const sorted = [...counts.entries()]
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, top);
  const tail = sorted.slice(top);
  const slices: Slice[] = head.map(([label, count], i) => ({
    label,
    count,
    color: PALETTE[i % PALETTE.length],
  }));
  if (tail.length) {
    const rest = tail.reduce((s, [, c]) => s + c, 0);
    if (rest > 0)
      slices.push({ label: opts.otherLabel ?? "Khác", count: rest, color: "#94A3B8" });
  }
  return slices;
}

function ageBandOf(years: number): string {
  if (years < 25) return "Dưới 25";
  if (years < 35) return "25–34";
  if (years < 45) return "35–44";
  if (years < 55) return "45–54";
  return "55+";
}
const AGE_BAND_ORDER = ["Dưới 25", "25–34", "35–44", "45–54", "55+"];

/** Tổng hợp toàn bộ chỉ số nhân sự, có thể lọc theo 1 pháp nhân. */
export async function getHrAnalytics(entityId?: string): Promise<HrAnalytics> {
  const [entities, departments, jobTitles, all] = await Promise.all([
    listEntities(),
    listDepartments(),
    listJobTitles(),
    listEmployees(),
  ]);
  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth(); // 0-based

  const employees = entityId
    ? all.filter((e) => e.legalEntityId === entityId)
    : all;
  const scope = entityId
    ? entities.find((e) => e.id === entityId)?.name ?? "Pháp nhân"
    : "Toàn tập đoàn";

  const headcount = employees.filter((e) => e.status !== "left");
  const deptName = (id?: string | null) =>
    departments.find((d) => d.id === id)?.name ?? "Chưa phân bổ";
  const titleName = (id?: string | null) =>
    jobTitles.find((j) => j.id === id)?.name ?? "Chưa gán";
  const entityName = (id: string) =>
    entities.find((e) => e.id === id)?.name ?? "—";

  // --- Cơ cấu ---
  const byEntityMap = new Map<string, number>();
  const byDeptMap = new Map<string, number>();
  const byTypeMap = new Map<string, number>();
  const byTitleMap = new Map<string, number>();
  const byGenderMap = new Map<string, number>();
  const byAgeMap = new Map<string, number>();
  const ages: number[] = [];
  const tenures: number[] = [];

  for (const e of headcount) {
    byEntityMap.set(entityName(e.legalEntityId), (byEntityMap.get(entityName(e.legalEntityId)) ?? 0) + 1);
    byDeptMap.set(deptName(e.departmentId), (byDeptMap.get(deptName(e.departmentId)) ?? 0) + 1);
    const typeLabel = e.employmentType ? EMPLOYMENT_TYPE_LABEL[e.employmentType] : "Chưa rõ";
    byTypeMap.set(typeLabel, (byTypeMap.get(typeLabel) ?? 0) + 1);
    byTitleMap.set(titleName(e.jobTitleId), (byTitleMap.get(titleName(e.jobTitleId)) ?? 0) + 1);
    const g = (e.gender ?? "other") as Gender;
    byGenderMap.set(GENDER_LABEL[g], (byGenderMap.get(GENDER_LABEL[g]) ?? 0) + 1);
    const age = yearsSince(e.dateOfBirth, now);
    if (age !== null && age > 0 && age < 100) {
      ages.push(age);
      byAgeMap.set(ageBandOf(age), (byAgeMap.get(ageBandOf(age)) ?? 0) + 1);
    }
    const tenure = yearsSince(e.joinDate, now);
    if (tenure !== null && tenure >= 0) tenures.push(tenure);
  }

  // Giới tính: giữ thứ tự Nam/Nữ/Khác, màu cố định.
  const genderColors: Record<string, string> = { Nam: "#0EA5E9", Nữ: "#EC4899", Khác: "#94A3B8" };
  const byGender: Slice[] = (["Nam", "Nữ", "Khác"] as const)
    .map((label) => ({ label, count: byGenderMap.get(label) ?? 0, color: genderColors[label] }))
    .filter((s) => s.count > 0);
  const female = byGenderMap.get("Nữ") ?? 0;

  // Nhóm tuổi: giữ đúng thứ tự khoảng tuổi.
  const byAgeBand: Slice[] = AGE_BAND_ORDER.map((label, i) => ({
    label,
    count: byAgeMap.get(label) ?? 0,
    color: PALETTE[i % PALETTE.length],
  })).filter((s) => s.count > 0);

  // --- Tuyển dụng ---
  const hiresThisYear = headcount.filter((e) => parseDate(e.joinDate)?.getUTCFullYear() === thisYear).length;
  const hiresThisMonth = headcount.filter((e) => {
    const d = parseDate(e.joinDate);
    return d?.getUTCFullYear() === thisYear && d?.getUTCMonth() === thisMonth;
  }).length;

  const hiresByMonth: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(thisYear, thisMonth - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const count = headcount.filter((e) => {
      const j = parseDate(e.joinDate);
      return j?.getUTCFullYear() === y && j?.getUTCMonth() === m;
    }).length;
    hiresByMonth.push({ label: `T${m + 1}`, count });
  }

  const recentHires = [...headcount]
    .filter((e) => e.joinDate)
    .sort((a, b) => (a.joinDate! < b.joinDate! ? 1 : -1))
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      name: e.fullName,
      dept: deptName(e.departmentId),
      date: e.joinDate!,
      status: e.status,
    }));

  return {
    scope,
    total: headcount.length,
    active: headcount.filter((e) => e.status === "active").length,
    probation: headcount.filter((e) => e.status === "probation").length,
    left: employees.filter((e) => e.status === "left").length,
    byEntity: toSlices(byEntityMap),
    byDepartment: toSlices(byDeptMap, { top: 6 }),
    byEmploymentType: toSlices(byTypeMap),
    byTitle: toSlices(byTitleMap, { top: 6 }),
    byGender,
    femalePct: headcount.length ? (female / headcount.length) * 100 : 0,
    avgAge: avg(ages),
    byAgeBand,
    avgTenure: avg(tenures),
    hiresThisYear,
    hiresThisMonth,
    hiresByMonth,
    recentHires,
  };
}

/** Tổng hợp chỉ số nghỉ phép, có thể lọc theo 1 pháp nhân. */
export async function getLeaveAnalytics(entityId?: string): Promise<LeaveAnalytics> {
  const [employees, leaveTypes, requests] = await Promise.all([
    listEmployees(entityId),
    listLeaveTypes(),
    listLeaveRequests(),
  ]);
  const empIds = new Set(employees.map((e) => e.id));
  const scoped = entityId ? requests.filter((r) => empIds.has(r.employeeId)) : requests;

  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

  const pending = scoped.filter((r) => r.status === "pending").length;
  const onLeaveToday = new Set(
    scoped
      .filter((r) => r.status === "approved" && r.startDate <= todayStr && r.endDate >= todayStr)
      .map((r) => r.employeeId),
  ).size;
  const approvedDaysThisMonth = scoped
    .filter(
      (r) =>
        r.status === "approved" &&
        parseDate(r.startDate)?.getUTCFullYear() === thisYear &&
        parseDate(r.startDate)?.getUTCMonth() === now.getUTCMonth(),
    )
    .reduce((s, r) => s + r.days, 0);

  const typeName = (id: string) => leaveTypes.find((t) => t.id === id)?.name ?? "Khác";
  const byTypeMap = new Map<string, number>();
  for (const r of scoped) {
    if (r.status === "cancelled" || r.status === "rejected") continue;
    if (!r.startDate.startsWith(String(thisYear))) continue;
    byTypeMap.set(typeName(r.leaveTypeId), (byTypeMap.get(typeName(r.leaveTypeId)) ?? 0) + 1);
  }

  return {
    pending,
    onLeaveToday,
    approvedDaysThisMonth,
    byType: toSlices(byTypeMap),
  };
}

// ============================ Biến động nhân sự (Turnover) ============================
export type TurnoverAnalytics = {
  scope: string;
  headcount: number; // đang làm
  leftThisYear: number; // nghỉ việc trong năm
  leftTotal: number;
  turnoverRatePct: number; // leftThisYear / (đang làm + nghỉ trong năm) × 100
  avgTenureLeft: number | null; // thâm niên TB tại thời điểm nghỉ
  byDeptLeft: Slice[]; // nghỉ việc theo phòng ban
  leftByMonth: { label: string; count: number }[]; // 6 tháng gần nhất
};

export async function getTurnoverAnalytics(entityId?: string): Promise<TurnoverAnalytics> {
  const [entities, departments, all] = await Promise.all([
    listEntities(),
    listDepartments(),
    listEmployees(),
  ]);
  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth();
  const employees = entityId ? all.filter((e) => e.legalEntityId === entityId) : all;
  const scope = entityId ? entities.find((e) => e.id === entityId)?.name ?? "Pháp nhân" : "Toàn tập đoàn";
  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? "Chưa phân bổ";

  const headcount = employees.filter((e) => e.status !== "left");
  const left = employees.filter((e) => e.status === "left");
  const leftThisYear = left.filter((e) => parseDate(e.leaveDate)?.getUTCFullYear() === thisYear);

  const byDeptMap = new Map<string, number>();
  const tenuresAtLeave: number[] = [];
  for (const e of left) {
    byDeptMap.set(deptName(e.departmentId), (byDeptMap.get(deptName(e.departmentId)) ?? 0) + 1);
    const end = parseDate(e.leaveDate) ?? now;
    const t = yearsSince(e.joinDate, end);
    if (t !== null && t >= 0) tenuresAtLeave.push(t);
  }

  const leftByMonth: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(thisYear, thisMonth - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const count = left.filter((e) => {
      const l = parseDate(e.leaveDate);
      return l?.getUTCFullYear() === y && l?.getUTCMonth() === m;
    }).length;
    leftByMonth.push({ label: `T${m + 1}`, count });
  }

  const denom = headcount.length + leftThisYear.length;
  return {
    scope,
    headcount: headcount.length,
    leftThisYear: leftThisYear.length,
    leftTotal: left.length,
    turnoverRatePct: denom ? (leftThisYear.length / denom) * 100 : 0,
    avgTenureLeft: avg(tenuresAtLeave),
    byDeptLeft: toSlices(byDeptMap, { top: 6 }),
    leftByMonth,
  };
}

// ============================ Phân tích lương (Salary) ============================
export type SalaryStat = { label: string; avg: number; count: number };
export type SalaryAnalytics = {
  scope: string;
  totalGross: number; // tổng quỹ lương (gross) của người đang làm
  avgGross: number | null;
  byDept: SalaryStat[];
  byGender: SalaryStat[];
  byLevel: SalaryStat[];
  payGapPct: number | null; // (TB nam − TB nữ) / TB nam × 100
};

const LEVEL_LABEL: Record<number, string> = {
  1: "Nhân viên",
  2: "Trưởng nhóm",
  3: "Quản lý",
  4: "Giám đốc",
  5: "Ban lãnh đạo",
};

export async function getSalaryAnalytics(entityId?: string): Promise<SalaryAnalytics> {
  const [entities, departments, jobTitles, all] = await Promise.all([
    listEntities(),
    listDepartments(),
    listJobTitles(),
    listEmployees(),
  ]);
  const scope = entityId ? entities.find((e) => e.id === entityId)?.name ?? "Pháp nhân" : "Toàn tập đoàn";
  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? "Chưa phân bổ";
  const levelOf = (id?: string | null) => jobTitles.find((j) => j.id === id)?.jobLevel ?? 1;

  const employees = (entityId ? all.filter((e) => e.legalEntityId === entityId) : all)
    .filter((e) => e.status !== "left" && e.baseSalary);
  const gross = (e: Employee) => (e.baseSalary ?? 0) + (e.allowance ?? 0);

  const totalGross = employees.reduce((s, e) => s + gross(e), 0);

  // Gom trung bình theo khoá.
  const groupAvg = (keyFn: (e: Employee) => string): SalaryStat[] => {
    const sum = new Map<string, number>();
    const cnt = new Map<string, number>();
    for (const e of employees) {
      const k = keyFn(e);
      sum.set(k, (sum.get(k) ?? 0) + gross(e));
      cnt.set(k, (cnt.get(k) ?? 0) + 1);
    }
    return [...sum.entries()]
      .map(([label, total]) => ({ label, avg: total / (cnt.get(label) || 1), count: cnt.get(label) || 0 }))
      .sort((a, b) => b.avg - a.avg);
  };

  const byGender = groupAvg((e) => GENDER_LABEL[(e.gender ?? "other") as Gender]);
  const male = byGender.find((g) => g.label === "Nam")?.avg ?? null;
  const female = byGender.find((g) => g.label === "Nữ")?.avg ?? null;

  return {
    scope,
    totalGross,
    avgGross: employees.length ? totalGross / employees.length : null,
    byDept: groupAvg((e) => deptName(e.departmentId)),
    byGender,
    byLevel: groupAvg((e) => LEVEL_LABEL[levelOf(e.jobTitleId)] ?? "Khác"),
    payGapPct: male && female ? ((male - female) / male) * 100 : null,
  };
}
