// Kiểu dữ liệu cho module Tổ chức & Phân quyền (RBAC).
// Phản ánh schema SQL ở supabase/migrations/0001_org_rbac.sql.

export type Group = {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  // --- Cấu hình chung toàn tập đoàn (sheet "0. Tập đoàn") ---
  owner?: string; // chủ sở hữu / người sáng lập
  systemEmail?: string; // email hệ thống gửi thông báo/phiếu lương
  phone?: string; // điện thoại liên hệ chung
  website?: string;
  standardHours?: string; // giờ làm chuẩn, vd "09:00–18:00, nghỉ trưa 12:00–13:30"
  payCutoffDay?: number; // ngày chốt công hằng tháng (1–31)
  payDay?: number; // ngày trả lương hằng tháng (1–31)
};

/** Pháp nhân — mỗi công ty trên giấy tờ (MST, BHXH... riêng). */
export type LegalEntity = {
  id: string;
  groupId: string;
  code: string; // PN01..PN05
  name: string;
  legalName?: string;
  legalNameEn?: string; // tên công ty tiếng Anh
  taxCode?: string;
  regNo?: string; // số ĐKKD (giấy phép kinh doanh)
  regDate?: string; // ngày cấp ĐKKD (yyyy-mm-dd)
  bhxhCode?: string;
  region?: 1 | 2 | 3 | 4; // Vùng lương tối thiểu I–IV
  address?: string;
  phone?: string;
  email?: string;
  director?: string;
  directorTitle?: string; // chức vụ người đại diện pháp luật
  payrollBank?: string; // ngân hàng chi lương
  companyAccount?: string; // số tài khoản công ty (chi lương)
  isParent?: boolean; // là công ty mẹ?
  isActive: boolean;
};

/** Phòng ban — cây phân cấp trong một pháp nhân. */
export type Department = {
  id: string;
  legalEntityId: string;
  parentId: string | null;
  code: string;
  name: string;
  managerEmployeeId?: string | null;
  isActive: boolean;
};

/** Chức danh — danh mục dùng chung toàn tập đoàn. */
export type JobTitle = {
  id: string;
  groupId: string;
  code: string;
  name: string;
  jobLevel?: number; // 1 NV … 5 BLĐ
  isActive: boolean;
};

export type EmployeeStatus = "active" | "probation" | "inactive" | "left";

export const EMPLOYEE_STATUS_LABEL: Record<EmployeeStatus, string> = {
  active: "Chính thức",
  probation: "Thử việc",
  inactive: "Tạm nghỉ",
  left: "Đã nghỉ việc",
};

/** Loại hình lao động (theo hợp đồng). */
export type EmploymentType = "fulltime" | "parttime" | "contract" | "intern" | "seasonal";

export const EMPLOYMENT_TYPE_LABEL: Record<EmploymentType, string> = {
  fulltime: "Toàn thời gian",
  parttime: "Bán thời gian",
  contract: "Hợp đồng dịch vụ",
  intern: "Thực tập sinh",
  seasonal: "Thời vụ",
};

export type Gender = "male" | "female" | "other";

export const GENDER_LABEL: Record<Gender, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

/** Nhân viên — hồ sơ Core HR (Sprint 2). */
export type Employee = {
  id: string;
  legalEntityId: string;
  departmentId?: string | null;
  jobTitleId?: string | null;
  code: string;
  fullName: string;
  email?: string; // email công việc
  status: EmployeeStatus;
  // --- Ảnh hồ sơ & giấy tờ (data URL nén, lưu in-memory; sẽ chuyển Supabase Storage sau) ---
  photoUrl?: string; // ảnh chân dung
  idCardFrontUrl?: string; // ảnh CCCD mặt trước
  idCardBackUrl?: string; // ảnh CCCD mặt sau
  // --- Thông tin cá nhân ---
  gender?: Gender;
  dateOfBirth?: string; // ISO yyyy-mm-dd
  phone?: string;
  personalEmail?: string;
  nationalId?: string; // số CCCD/CMND
  nationalIdDate?: string; // ngày cấp
  nationalIdPlace?: string; // nơi cấp
  address?: string; // nơi ở hiện tại
  // --- Lao động & hợp đồng ---
  employmentType?: EmploymentType;
  joinDate?: string; // ngày vào làm
  probationEndDate?: string; // ngày hết thử việc
  leaveDate?: string | null; // ngày nghỉ việc
  // --- Lương / thuế / bảo hiểm ---
  baseSalary?: number; // lương cơ bản (gross) theo hợp đồng, VND/tháng
  allowance?: number; // tổng phụ cấp chịu thuế, VND/tháng
  insuranceSalary?: number; // mức lương đóng BHXH (mặc định = baseSalary)
  dependents?: number; // số người phụ thuộc (giảm trừ thuế TNCN)
  taxCode?: string; // mã số thuế cá nhân
  socialInsuranceNo?: string; // số sổ BHXH
  bankAccount?: string; // số tài khoản
  bankName?: string; // ngân hàng
  // --- Khác ---
  note?: string;
};

// ---- Lịch làm việc (work schedule / roster) ----

/** Ca làm việc — danh mục dùng chung toàn tập đoàn. */
export type WorkShift = {
  id: string;
  code: string; // HC | SANG | CHIEU | OFF
  name: string; // Hành chính
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  breakStart?: string; // "12:00"
  breakEnd?: string; // "13:30"
  workHours: number; // số giờ làm thực (đã trừ nghỉ trưa), vd 7.5
  isActive: boolean;
};

/** Loại ngày trên lịch — quyết định cách hiển thị & tính công sau này. */
export type ScheduleKind =
  | "work" // đi làm theo ca
  | "off" // nghỉ (cuối tuần / nghỉ thường)
  | "holiday" // nghỉ lễ
  | "wfh" // làm từ xa
  | "business" // đi công tác
  | "makeup" // làm bù
  | "leave"; // nghỉ phép (suy ra từ đơn đã duyệt, module Nghỉ phép)

export const SCHEDULE_KIND_LABEL: Record<ScheduleKind, string> = {
  work: "Đi làm",
  off: "Nghỉ",
  holiday: "Nghỉ lễ",
  wfh: "Làm từ xa",
  business: "Công tác",
  makeup: "Làm bù",
  leave: "Nghỉ phép",
};

/** Màu badge gợi ý cho từng loại ngày (class trong globals.css). */
export const SCHEDULE_KIND_BADGE: Record<ScheduleKind, string> = {
  work: "b-green",
  off: "b-gray",
  holiday: "b-rose",
  wfh: "b-indigo",
  business: "b-amber",
  makeup: "b-amber",
  leave: "b-sky",
};

/**
 * Bản ghi lịch của 1 nhân viên trong 1 ngày — CHỈ lưu khi KHÁC mặc định
 * (ngoại lệ/override). Ngày không có bản ghi → suy ra từ lịch hành chính nền.
 */
export type ScheduleEntry = {
  id: string;
  employeeId: string;
  date: string; // yyyy-mm-dd
  kind: ScheduleKind;
  shiftId?: string | null; // ca áp dụng khi kind = work | wfh | makeup
  startTime?: string; // giờ tùy chỉnh (ghi đè ca), vd "13:30"
  endTime?: string; // giờ tùy chỉnh, vd "17:00"
  note?: string;
};

/** Lịch hành chính nền (cấu hình chung). */
export type ScheduleConfig = {
  workingWeekdays: number[]; // 1=T2 … 7=CN (mặc định [1,2,3,4,5] = T2–T6)
  defaultShiftId: string; // ca mặc định cho ngày làm việc
};

/** Một ngày đã giải (resolved) trên lịch — gộp nền + ngoại lệ. */
export type ResolvedDay = {
  date: string; // yyyy-mm-dd
  kind: ScheduleKind;
  shift?: WorkShift; // ca chuẩn áp dụng (nếu không tùy chỉnh giờ)
  customStart?: string; // giờ tùy chỉnh — khi có thì hiển thị thay cho ca chuẩn
  customEnd?: string;
  note?: string;
  isOverride: boolean; // true nếu có ScheduleEntry ghi đè
};

// ---- Nghỉ phép (leave) ----

/**
 * Loại nghỉ phép — danh mục dùng chung toàn tập đoàn, phản ánh BLLĐ 2019.
 * `paid`        : doanh nghiệp trả lương cho ngày nghỉ.
 * `deductsQuota`: trừ vào quỹ phép năm (chỉ "Phép năm").
 */
export type LeaveType = {
  id: string;
  code: string; // ANNUAL | SICK | UNPAID | MATERNITY | WEDDING | BEREAVEMENT | OTHER
  name: string; // Phép năm
  paid: boolean;
  deductsQuota: boolean;
  badge: string; // class badge trong globals.css
  isActive: boolean;
};

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã huỷ",
};

export const LEAVE_STATUS_BADGE: Record<LeaveStatus, string> = {
  pending: "b-amber",
  approved: "b-green",
  rejected: "b-rose",
  cancelled: "b-gray",
};

/** Một lượt phê duyệt trong chuỗi duyệt nhiều cấp. */
export type ApprovalAction = {
  level: number; // cấp duyệt thứ mấy (1, 2…)
  byUserId: string;
  byName: string;
  at: string; // ISO
};

/** Đơn xin nghỉ phép — workflow duyệt có thể nhiều cấp. */
export type LeaveRequest = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd (= startDate nếu nghỉ 1 ngày)
  halfDay: boolean; // true → nghỉ nửa ngày (chỉ khi start = end), tính 0.5 ngày
  days: number; // số ngày công đã tính (chỉ ngày làm việc theo lịch nền)
  reason?: string;
  status: LeaveStatus;
  createdAt: string; // ISO
  decidedAt?: string; // ISO — thời điểm duyệt/từ chối cuối cùng
  decidedByName?: string; // người ra quyết định cuối
  decisionNote?: string; // lý do từ chối / ghi chú duyệt
  approvals?: ApprovalAction[]; // các cấp đã duyệt (duyệt nhiều cấp)
};

/** Số dư quỹ phép năm của 1 nhân viên trong 1 năm. */
export type LeaveBalance = {
  employeeId: string;
  year: number;
  quota: number; // 12 + thâm niên (+1 mỗi 5 năm), năm đầu tính theo tỷ lệ
  used: number; // tổng ngày phép năm đã DUYỆT trong năm
  pending: number; // tổng ngày phép năm đang CHỜ duyệt (tạm giữ chỗ)
  remaining: number; // quota - used - pending
};

// ---- RBAC ----

export type Permission = {
  code: string; // module.action
  module: string;
  action: string;
  description: string;
};

export type Role = {
  id: string;
  code: string; // ADMIN | HRG | HR | MSS | ESS | custom
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: string[]; // danh sách permission.code
};

export type ScopeType = "GROUP" | "ENTITY" | "DEPARTMENT" | "SELF";

export const SCOPE_LABEL: Record<ScopeType, string> = {
  GROUP: "Toàn hệ thống",
  ENTITY: "Một pháp nhân",
  DEPARTMENT: "Theo phòng ban",
  SELF: "Chỉ cá nhân",
};

export type UserAccount = {
  id: string;
  email: string;
  fullName: string;
  employeeId?: string | null;
  isActive: boolean;
  /** Mật khẩu — CHỈ phục vụ đăng nhập ở chế độ dev (chưa nối Supabase).
   *  Khi nối Supabase, mật khẩu thật do Supabase Auth quản lý, trường này bỏ qua. */
  password?: string;
  /** Buộc đổi mật khẩu ở lần đăng nhập kế tiếp — bật khi HR cấp/đặt lại mật khẩu tạm. */
  mustChangePassword?: boolean;
  /** id người dùng trong Supabase Auth (auth.users) — gắn khi dùng Supabase Auth. */
  authUserId?: string;
};

export type RoleAssignment = {
  id: string;
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeEntityId?: string | null;
  scopeDepartmentId?: string | null;
};

// ---- Đánh giá hiệu suất (Performance / KPI) ----

export type ReviewCycleStatus = "open" | "closed";

/** Kỳ đánh giá (quý/năm) — khung thời gian chấm KPI toàn tập đoàn. */
export type ReviewCycle = {
  id: string;
  name: string; // "Đánh giá Quý 2/2026"
  periodLabel: string; // "Q2/2026"
  startDate: string; // yyyy-mm-dd
  endDate: string;
  status: ReviewCycleStatus;
};

/** Một mục KPI/mục tiêu trong bản đánh giá — chấm theo thang điểm 1–5. */
export type KpiItem = {
  id: string;
  title: string;
  weight: number; // trọng số %, tổng các mục nên = 100
  score?: number; // điểm 1–5 (quản lý chấm)
  selfScore?: number; // điểm 1–5 (nhân viên tự đánh giá)
  comment?: string;
};

export type ReviewStatus = "pending" | "self" | "manager" | "finalized";

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "Chưa bắt đầu",
  self: "NV tự đánh giá",
  manager: "QL đang chấm",
  finalized: "Đã chốt",
};

export const REVIEW_STATUS_BADGE: Record<ReviewStatus, string> = {
  pending: "b-gray",
  self: "b-amber",
  manager: "b-indigo",
  finalized: "b-green",
};

/** Bản đánh giá của 1 nhân viên trong 1 kỳ. */
export type PerformanceReview = {
  id: string;
  cycleId: string;
  employeeId: string;
  items: KpiItem[];
  status: ReviewStatus;
  managerName?: string;
  managerComment?: string;
  selfComment?: string;
  finalScore?: number; // điểm tổng có trọng số (1–5)
};

export type PerfRating = "A" | "B" | "C" | "D";

/** Quy đổi điểm tổng (1–5) → xếp loại. */
export function perfRating(
  score?: number,
): { code: PerfRating; label: string; badge: string } | null {
  if (score == null) return null;
  if (score >= 4.5) return { code: "A", label: "Xuất sắc", badge: "b-green" };
  if (score >= 3.5) return { code: "B", label: "Tốt", badge: "b-indigo" };
  if (score >= 2.5) return { code: "C", label: "Đạt", badge: "b-amber" };
  return { code: "D", label: "Cần cải thiện", badge: "b-rose" };
}

/** Điểm tổng có trọng số, chuẩn hoá theo tổng trọng số các mục ĐÃ chấm. */
export function computeFinalScore(items: KpiItem[]): number | undefined {
  const scored = items.filter((i) => i.score != null && i.weight > 0);
  const totalW = scored.reduce((s, i) => s + i.weight, 0);
  if (!totalW) return undefined;
  return scored.reduce((s, i) => s + i.weight * (i.score as number), 0) / totalW;
}

// ---- Tuyển dụng (ATS) ----

export type OpeningStatus = "open" | "paused" | "closed";

export const OPENING_STATUS_LABEL: Record<OpeningStatus, string> = {
  open: "Đang tuyển",
  paused: "Tạm dừng",
  closed: "Đã đóng",
};

export const OPENING_STATUS_BADGE: Record<OpeningStatus, string> = {
  open: "b-green",
  paused: "b-amber",
  closed: "b-gray",
};

/** Tin tuyển dụng / vị trí cần tuyển. */
export type JobOpening = {
  id: string;
  title: string;
  legalEntityId: string;
  departmentId?: string | null;
  jobTitleId?: string | null;
  headcount: number; // số lượng cần tuyển
  status: OpeningStatus;
  openDate: string; // yyyy-mm-dd
  note?: string;
  // --- Nội dung tin đăng tuyển ---
  employmentType?: EmploymentType; // loại hình lao động
  workLocation?: string; // địa điểm làm việc
  salaryMin?: number; // mức lương tối thiểu (VND/tháng)
  salaryMax?: number; // mức lương tối đa (VND/tháng)
  salaryText?: string; // mô tả lương tự do (vd "Thoả thuận") — ưu tiên khi không có min/max
  experience?: string; // yêu cầu kinh nghiệm
  description?: string; // mô tả công việc
  requirements?: string; // yêu cầu ứng viên
  benefits?: string; // quyền lợi
  closeDate?: string; // hạn nộp hồ sơ (yyyy-mm-dd)
  contactName?: string; // người phụ trách tuyển dụng
  contactEmail?: string;
  contactPhone?: string;
};

export type CandidateStage =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";

export const CANDIDATE_STAGE_LABEL: Record<CandidateStage, string> = {
  applied: "Ứng tuyển",
  screening: "Sàng lọc",
  interview: "Phỏng vấn",
  offer: "Đề nghị",
  hired: "Nhận việc",
  rejected: "Từ chối",
};

export const CANDIDATE_STAGE_BADGE: Record<CandidateStage, string> = {
  applied: "b-gray",
  screening: "b-indigo",
  interview: "b-amber",
  offer: "b-sky",
  hired: "b-green",
  rejected: "b-rose",
};

/** Các cột pipeline đang hoạt động (cột "Từ chối" hiển thị riêng). */
export const PIPELINE_STAGES: CandidateStage[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
];

/** Bước kế tiếp trong pipeline (null nếu đã ở cuối / đã chốt). */
export function nextStage(stage: CandidateStage): CandidateStage | null {
  const i = PIPELINE_STAGES.indexOf(stage);
  if (i < 0 || i >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[i + 1];
}

export type Candidate = {
  id: string;
  openingId: string;
  fullName: string;
  email?: string;
  phone?: string;
  source?: string; // nguồn ứng viên: Website, Giới thiệu, LinkedIn…
  stage: CandidateStage;
  appliedDate: string; // yyyy-mm-dd
  note?: string;
  employeeId?: string | null; // gắn khi đã tuyển → tạo hồ sơ nhân viên
};

// ---- Người phụ thuộc (Dependent) ----
export type DependentRelation = "child" | "spouse" | "parent" | "other";

export const DEPENDENT_RELATION_LABEL: Record<DependentRelation, string> = {
  child: "Con",
  spouse: "Vợ/Chồng",
  parent: "Cha/Mẹ",
  other: "Khác",
};

/** Người phụ thuộc của nhân viên — dùng cho giảm trừ gia cảnh thuế TNCN. */
export type Dependent = {
  id: string;
  employeeId: string;
  fullName: string;
  relation: DependentRelation;
  dateOfBirth?: string;
  taxCode?: string; // MST người phụ thuộc
  taxRegistered: boolean; // đã đăng ký giảm trừ gia cảnh
  startDate?: string; // bắt đầu giảm trừ
  note?: string;
};

// ---- Phỏng vấn (Interview) ----
export type InterviewResult = "pending" | "pass" | "fail";

export const INTERVIEW_RESULT_LABEL: Record<InterviewResult, string> = {
  pending: "Chờ kết quả",
  pass: "Đạt",
  fail: "Không đạt",
};

export const INTERVIEW_RESULT_BADGE: Record<InterviewResult, string> = {
  pending: "b-amber",
  pass: "b-green",
  fail: "b-rose",
};

/** Một vòng phỏng vấn của ứng viên. */
export type Interview = {
  id: string;
  candidateId: string;
  round: number; // vòng 1, 2…
  title?: string; // tên vòng: Sàng lọc, Chuyên môn, Lãnh đạo…
  interviewer?: string;
  scheduledDate?: string; // yyyy-mm-dd
  result: InterviewResult;
  score?: number; // điểm 1–10
  note?: string;
};

// ---- Onboarding (hội nhập) ----
/** Đầu việc hội nhập cho 1 ứng viên đã tuyển. */
export type OnboardingTask = {
  id: string;
  candidateId: string;
  label: string;
  done: boolean;
  order: number;
};

/** Mẫu checklist hội nhập mặc định (sinh khi tuyển ứng viên thành nhân viên). */
export const ONBOARDING_TEMPLATE: string[] = [
  "Ký hợp đồng lao động",
  "Cấp tài khoản hệ thống & email",
  "Cấp phát tài sản (laptop, thẻ…)",
  "Khai báo BHXH & mã số thuế",
  "Đào tạo hội nhập (định hướng)",
  "Bàn giao công việc & người hướng dẫn",
];

// ---- Ngày lễ (Holiday) ----
/** Ngày nghỉ lễ hưởng lương — dùng chung toàn tập đoàn (cấu hình nền). */
export type Holiday = {
  id: string;
  date: string; // yyyy-mm-dd
  name: string;
  paid: boolean;
};

// ---- Hợp đồng lao động (Contract) ----
export type ContractType = "probation" | "fixed" | "indefinite" | "seasonal";

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  probation: "Thử việc",
  fixed: "Xác định thời hạn",
  indefinite: "Không xác định thời hạn",
  seasonal: "Thời vụ",
};

export type ContractStatus = "active" | "expiring" | "expired" | "terminated";

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  active: "Hiệu lực",
  expiring: "Sắp hết hạn",
  expired: "Hết hạn",
  terminated: "Đã chấm dứt",
};

export const CONTRACT_STATUS_BADGE: Record<ContractStatus, string> = {
  active: "b-green",
  expiring: "b-amber",
  expired: "b-rose",
  terminated: "b-gray",
};

/** Hợp đồng lao động của một nhân viên. */
export type Contract = {
  id: string;
  employeeId: string;
  code: string; // số HĐ
  type: ContractType;
  startDate: string; // yyyy-mm-dd
  endDate?: string | null; // null = không xác định thời hạn
  baseSalary?: number;
  allowance?: number;
  signedDate?: string;
  terminated?: boolean; // chấm dứt trước hạn
  note?: string;
};

/** Trạng thái hợp đồng tính theo ngày (today / mốc "sắp hết hạn"). */
export function contractStatus(c: Contract, today: string, soon: string): ContractStatus {
  if (c.terminated) return "terminated";
  if (!c.endDate) return "active"; // không xác định thời hạn
  if (c.endDate < today) return "expired";
  if (c.endDate <= soon) return "expiring";
  return "active";
}

// ---- Khen thưởng – Kỷ luật (Reward / Discipline) ----
export type RecordKind = "reward" | "discipline";

export const RECORD_KIND_LABEL: Record<RecordKind, string> = {
  reward: "Khen thưởng",
  discipline: "Kỷ luật",
};

export const RECORD_KIND_BADGE: Record<RecordKind, string> = {
  reward: "b-green",
  discipline: "b-rose",
};

/** Quyết định khen thưởng hoặc kỷ luật với một nhân viên. */
export type RewardDiscipline = {
  id: string;
  employeeId: string;
  kind: RecordKind;
  title: string;
  reason?: string;
  amount?: number; // tiền thưởng (+) hoặc phạt; 0/để trống nếu không có
  date: string; // yyyy-mm-dd
  decisionNo?: string; // số quyết định
  note?: string;
};

// ---- Quản lý tài sản (Asset) ----
export type AssetStatus = "available" | "allocated" | "maintenance" | "retired";

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  available: "Sẵn sàng",
  allocated: "Đang cấp phát",
  maintenance: "Bảo trì",
  retired: "Đã thanh lý",
};

export const ASSET_STATUS_BADGE: Record<AssetStatus, string> = {
  available: "b-green",
  allocated: "b-indigo",
  maintenance: "b-amber",
  retired: "b-gray",
};

/** Gợi ý nhóm tài sản (loại nhập tự do, đây chỉ là gợi ý dropdown). */
export const ASSET_CATEGORIES = ["Laptop", "Điện thoại", "Màn hình", "Xe", "Đồng phục", "Khác"] as const;

export type Asset = {
  id: string;
  code: string;
  name: string;
  category: string;
  status: AssetStatus;
  note?: string;
};

/** Lượt cấp phát tài sản cho nhân viên (returnedDate = null → đang giữ). */
export type AssetAllocation = {
  id: string;
  assetId: string;
  employeeId: string;
  allocatedDate: string; // yyyy-mm-dd
  returnedDate?: string | null;
  note?: string;
};

// ---- Đào tạo & Phát triển (Training / L&D) ----
export type CourseStatus = "planned" | "ongoing" | "done" | "cancelled";

export const COURSE_STATUS_LABEL: Record<CourseStatus, string> = {
  planned: "Dự kiến",
  ongoing: "Đang diễn ra",
  done: "Hoàn thành",
  cancelled: "Đã huỷ",
};

export const COURSE_STATUS_BADGE: Record<CourseStatus, string> = {
  planned: "b-gray",
  ongoing: "b-amber",
  done: "b-green",
  cancelled: "b-rose",
};

export type TrainingCourse = {
  id: string;
  code: string;
  name: string;
  category?: string;
  provider?: string;
  hours?: number;
  cost?: number; // chi phí/khoá
  startDate?: string;
  endDate?: string;
  status: CourseStatus;
  note?: string;
};

export type EnrollStatus = "enrolled" | "completed" | "cancelled";

export const ENROLL_STATUS_LABEL: Record<EnrollStatus, string> = {
  enrolled: "Đã ghi danh",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
};

export const ENROLL_STATUS_BADGE: Record<EnrollStatus, string> = {
  enrolled: "b-amber",
  completed: "b-green",
  cancelled: "b-gray",
};

/** Ghi danh của 1 nhân viên vào 1 khoá đào tạo. */
export type TrainingEnroll = {
  id: string;
  courseId: string;
  employeeId: string;
  status: EnrollStatus;
  score?: number; // điểm/kết quả (nếu có)
  completedDate?: string;
  note?: string;
};

// ---- Nhật ký thao tác (AuditLog) ----
/** Bản ghi nhật ký một thao tác nhạy cảm trên hệ thống. */
export type AuditLog = {
  id: string;
  at: string; // ISO
  userName: string;
  action: string; // mô tả ngắn, vd "Duyệt đơn nghỉ"
  module: string; // module key (employee, leave, payroll…)
  detail?: string;
};

// ---- Thông báo (Notification) ----
export type Notification = {
  id: string;
  userId: string; // người nhận
  title: string;
  body?: string;
  href?: string; // link khi bấm vào
  createdAt: string; // ISO
  read: boolean;
};

// ---- Kỳ lương (PayrollPeriod) ----
export type PayrollStatus = "open" | "closed";

export const PAYROLL_STATUS_LABEL: Record<PayrollStatus, string> = {
  open: "Đang mở",
  closed: "Đã chốt",
};

/** Kỳ lương theo tháng — chốt để khoá số liệu. */
export type PayrollPeriod = {
  id: string;
  ym: string; // yyyy-mm
  status: PayrollStatus;
  closedAt?: string;
  closedByName?: string;
};

/**
 * Lịch sử lương — mỗi lần HR điều chỉnh lương tạo 1 bản ghi có tháng hiệu lực.
 * Lương áp cho kỳ lương = bản ghi có `effectiveFrom` lớn nhất mà ≤ kỳ đó
 * (xem `resolveSalary` trong store). Nếu chưa có bản ghi → dùng lương trên hồ sơ.
 */
export type SalaryRecord = {
  id: string;
  employeeId: string;
  effectiveFrom: string; // yyyy-mm — tháng bắt đầu áp dụng
  baseSalary: number; // lương cơ bản mới
  allowance: number; // phụ cấp mới
  insuranceSalary?: number; // lương đóng BHXH mới (mặc định = baseSalary)
  reason?: string; // lý do điều chỉnh (tăng lương, điều chuyển…)
  createdAt: string; // ISO
  createdByName?: string;
};

/** Loại điều chỉnh lương theo kỳ. */
export type AdjustmentKind = "bonus" | "deduction" | "allowance" | "other";

export const ADJ_KIND_LABEL: Record<AdjustmentKind, string> = {
  bonus: "Thưởng",
  allowance: "Phụ cấp thêm",
  deduction: "Khấu trừ",
  other: "Khác",
};

/**
 * Điều chỉnh áp cho MỘT kỳ lương (yyyy-mm) của một nhân viên.
 * `taxable=true` → cộng/trừ vào thu nhập chịu thuế (tính lại thuế TNCN);
 * `taxable=false` → cộng/trừ thẳng vào thực nhận (sau thuế).
 * Khấu trừ (deduction) luôn là số trừ; các loại khác là số cộng.
 */
export type PayrollAdjustment = {
  id: string;
  employeeId: string;
  ym: string; // yyyy-mm
  kind: AdjustmentKind;
  label: string;
  amount: number; // nhập số dương; deduction sẽ được trừ
  taxable: boolean;
  note?: string;
  createdAt: string; // ISO
  createdByName?: string;
};

// ---- Phúc lợi (Benefit) ----
/** Danh mục phúc lợi của công ty (BH sức khoẻ, du lịch, quà lễ tết…). */
export type Benefit = {
  id: string;
  code: string;
  name: string;
  category?: string;
  description?: string;
  valuePerYear?: number; // giá trị/người/năm (nếu quy ra tiền)
  isActive: boolean;
};

/** Đăng ký một phúc lợi cho một nhân viên. */
export type BenefitEnrollment = {
  id: string;
  benefitId: string;
  employeeId: string;
  startDate: string;
  note?: string;
};

// ---- Làm thêm giờ (Overtime) ----
/** Hệ số làm thêm giờ theo Bộ luật Lao động. */
export const OT_MULTIPLIERS = [
  { value: 1.5, label: "Ngày thường (150%)" },
  { value: 2, label: "Ngày nghỉ tuần (200%)" },
  { value: 3, label: "Ngày lễ/Tết (300%)" },
] as const;

export const otMultiplierLabel = (m: number) =>
  OT_MULTIPLIERS.find((x) => x.value === m)?.label ?? `${m * 100}%`;

// ---- Phụ cấp & Khấu trừ (Pay item) ----
export type PayItemKind = "allowance" | "deduction";

export const PAY_ITEM_KIND_LABEL: Record<PayItemKind, string> = {
  allowance: "Phụ cấp",
  deduction: "Khấu trừ",
};

export const PAY_ITEM_KIND_BADGE: Record<PayItemKind, string> = {
  allowance: "b-green",
  deduction: "b-rose",
};

/**
 * Danh mục khoản cộng/trừ vào lương dùng chung toàn tập đoàn (sheet "7. Phụ cấp & Khấu trừ").
 * `taxable`   : khoản này có tính vào thu nhập chịu thuế TNCN không.
 * `insurable` : khoản này có tính vào tiền lương đóng BHXH không.
 * Đây là danh mục NỀN (gợi ý mức mặc định); số tiền thực áp cho từng NV vẫn do
 * hồ sơ lương / điều chỉnh kỳ lương quyết định.
 */
export type PayItem = {
  id: string;
  code: string; // PC-AN, KT-CD…
  name: string;
  kind: PayItemKind;
  defaultAmount?: number; // mức mặc định (VND); để trống nếu tuỳ NV
  taxable: boolean;
  insurable: boolean;
  isActive: boolean;
};

/** Đơn đăng ký làm thêm giờ — dùng chung trạng thái với đơn nghỉ. */
export type OvertimeRequest = {
  id: string;
  employeeId: string;
  date: string; // yyyy-mm-dd
  hours: number;
  multiplier: number; // 1.5 | 2 | 3
  reason?: string;
  status: LeaveStatus; // pending | approved | rejected | cancelled
  createdAt: string;
  decidedByName?: string;
  decidedAt?: string;
};
