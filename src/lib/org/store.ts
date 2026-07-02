// Kho dữ liệu TẠM THỜI (in-memory) cho module Tổ chức & RBAC.
// Mục đích: chạy/demo Sprint 1 trước khi nối Supabase thật. Dữ liệu khởi tạo
// khớp với seed SQL (supabase/migrations/0002_seed.sql).
//
// LƯU Ý: state nằm trong tiến trình server — đổi dữ liệu chỉ tồn tại tới khi
// restart server. Khi có Supabase, thay các hàm dưới bằng truy vấn DB là xong;
// chữ ký hàm (async) đã được giữ giống tầng dữ liệu thật.

import type {
  Asset,
  AssetAllocation,
  AuditLog,
  Benefit,
  BenefitEnrollment,
  Contract,
  Department,
  Dependent,
  Employee,
  Group,
  Holiday,
  Interview,
  JobTitle,
  LeaveBalance,
  LeaveRequest,
  Candidate,
  JobOpening,
  Notification,
  OnboardingTask,
  OvertimeRequest,
  PayItem,
  PayrollPeriod,
  PayrollAdjustment,
  SalaryRecord,
  LeaveType,
  LegalEntity,
  PerformanceReview,
  Permission,
  ResolvedDay,
  ReviewCycle,
  RewardDiscipline,
  Role,
  RoleAssignment,
  ScopeType,
  ScheduleConfig,
  ScheduleEntry,
  TrainingCourse,
  TrainingEnroll,
  UserAccount,
  WorkShift,
} from "./types";
import { ONBOARDING_TEMPLATE, computeFinalScore } from "./types";
import { cache } from "react";
import {
  getConfig,
  isSupabaseStoreConfigured,
  pullCollection,
  setConfig,
  upsertMany,
  upsertRow,
  deleteRow,
} from "./persist";

// ---- Danh mục quyền (khớp 0002_seed.sql) ----
export const PERMISSIONS: Permission[] = [
  { code: "org.read", module: "org", action: "read", description: "Xem cơ cấu tổ chức" },
  { code: "org.manage", module: "org", action: "manage", description: "Quản lý công ty, phòng ban, chức danh" },
  { code: "system.rbac", module: "system", action: "manage", description: "Quản lý vai trò & phân quyền" },
  { code: "employee.read", module: "employee", action: "read", description: "Xem hồ sơ nhân viên" },
  { code: "employee.create", module: "employee", action: "create", description: "Thêm nhân viên" },
  { code: "employee.update", module: "employee", action: "update", description: "Sửa hồ sơ nhân viên" },
  { code: "employee.delete", module: "employee", action: "delete", description: "Xoá nhân viên" },
  { code: "schedule.read", module: "schedule", action: "read", description: "Xem lịch làm việc" },
  { code: "schedule.manage", module: "schedule", action: "manage", description: "Xếp & sửa lịch làm việc" },
  { code: "leave.read", module: "leave", action: "read", description: "Xem nghỉ phép" },
  { code: "leave.request", module: "leave", action: "create", description: "Tạo đơn nghỉ phép" },
  { code: "leave.approve", module: "leave", action: "approve", description: "Duyệt đơn nghỉ phép" },
  { code: "payroll.read", module: "payroll", action: "read", description: "Xem bảng lương" },
  { code: "payroll.manage", module: "payroll", action: "manage", description: "Tính & chốt lương" },
  { code: "report.read", module: "report", action: "read", description: "Xem báo cáo" },
  { code: "report.export", module: "report", action: "export", description: "Xuất báo cáo" },
  { code: "recruit.read", module: "recruit", action: "read", description: "Xem tuyển dụng" },
  { code: "recruit.manage", module: "recruit", action: "manage", description: "Đăng tin & quản lý ứng viên" },
  { code: "performance.read", module: "performance", action: "read", description: "Xem đánh giá KPI" },
  { code: "performance.manage", module: "performance", action: "manage", description: "Chấm & chốt đánh giá KPI" },
  { code: "contract.read", module: "contract", action: "read", description: "Xem hợp đồng lao động" },
  { code: "contract.manage", module: "contract", action: "manage", description: "Tạo & quản lý hợp đồng" },
  { code: "asset.read", module: "asset", action: "read", description: "Xem tài sản cấp phát" },
  { code: "asset.manage", module: "asset", action: "manage", description: "Cấp phát & thu hồi tài sản" },
  { code: "training.read", module: "training", action: "read", description: "Xem đào tạo" },
  { code: "training.manage", module: "training", action: "manage", description: "Quản lý khoá học & ghi danh" },
  { code: "reward.read", module: "reward", action: "read", description: "Xem khen thưởng – kỷ luật" },
  { code: "reward.manage", module: "reward", action: "manage", description: "Ghi nhận khen thưởng – kỷ luật" },
  { code: "benefit.read", module: "benefit", action: "read", description: "Xem phúc lợi" },
  { code: "benefit.manage", module: "benefit", action: "manage", description: "Quản lý phúc lợi & đăng ký" },
  { code: "overtime.read", module: "overtime", action: "read", description: "Xem làm thêm giờ" },
  { code: "overtime.request", module: "overtime", action: "create", description: "Đăng ký làm thêm giờ" },
  { code: "overtime.approve", module: "overtime", action: "approve", description: "Duyệt làm thêm giờ" },

  // ===== BNB · Bán hàng & vận hành cửa hàng =====
  { code: "lead.read", module: "lead", action: "read", description: "Xem khách hàng tiềm năng (lead)" },
  { code: "lead.manage", module: "lead", action: "manage", description: "Tạo & chăm sóc lead, đổi trạng thái phễu" },
  { code: "customer.read", module: "customer", action: "read", description: "Xem hồ sơ khách hàng (Customer 360)" },
  { code: "customer.manage", module: "customer", action: "manage", description: "Tạo & sửa hồ sơ khách hàng" },
  { code: "fit.read", module: "fit", action: "read", description: "Dùng Fit Diagnostic & xem kết quả" },
  { code: "fit.manage", module: "fit", action: "manage", description: "Quản lý kịch bản tư vấn (KB-01..12)" },
  { code: "survey.read", module: "survey", action: "read", description: "Xem khảo sát nhà khách" },
  { code: "survey.manage", module: "survey", action: "manage", description: "Tạo & cập nhật khảo sát hiện trạng bếp" },
  { code: "quote.read", module: "quote", action: "read", description: "Xem báo giá" },
  { code: "quote.manage", module: "quote", action: "manage", description: "Tạo & gửi báo giá" },
  { code: "order.read", module: "order", action: "read", description: "Xem đơn hàng" },
  { code: "order.manage", module: "order", action: "manage", description: "Chốt đơn, thu tiền, cập nhật trạng thái" },
  { code: "delivery.read", module: "delivery", action: "read", description: "Xem lịch giao – lắp" },
  { code: "delivery.manage", module: "delivery", action: "manage", description: "Điều phối đội kỹ thuật giao – lắp" },
  { code: "warranty.read", module: "warranty", action: "read", description: "Xem bảo hành & hậu mãi" },
  { code: "warranty.manage", module: "warranty", action: "manage", description: "Tạo phiếu bảo hành, xử lý hậu mãi" },
  { code: "shiftreport.read", module: "shiftreport", action: "read", description: "Xem báo cáo ca & bàn giao" },
  { code: "shiftreport.manage", module: "shiftreport", action: "manage", description: "Tạo & chốt báo cáo cuối ca" },
  { code: "task.read", module: "task", action: "read", description: "Xem việc nội bộ & sự cố" },
  { code: "task.manage", module: "task", action: "manage", description: "Giao việc, xử lý sự cố vận hành" },
  { code: "bizdash.read", module: "bizdash", action: "read", description: "Xem Dashboard quản trị cửa hàng" },
  { code: "design.read", module: "design", action: "read", description: "Dùng Thiết kế bếp AI" },
  { code: "design.manage", module: "design", action: "manage", description: "Quản lý mẫu/cấu hình thiết kế bếp AI" },
  { code: "cx.read", module: "cx", action: "read", description: "Xem CX OS (hành trình KH & NPS)" },
  { code: "cx.manage", module: "cx", action: "manage", description: "Ghi nhận NPS, quản lý trải nghiệm KH" },
  { code: "marketing.read", module: "marketing", action: "read", description: "Xem Marketing (nội dung, ads, CPL)" },
  { code: "marketing.manage", module: "marketing", action: "manage", description: "Quản lý trụ nội dung, lịch, chiến dịch" },
  { code: "purchase.read", module: "purchase", action: "read", description: "Xem mua hàng / nhập kho" },
  { code: "purchase.manage", module: "purchase", action: "manage", description: "Tạo & nhận đơn nhập hàng (PO)" },
  { code: "finance.read", module: "finance", action: "read", description: "Xem tài chính (công nợ, lãi gộp, dòng tiền)" },
  { code: "finance.manage", module: "finance", action: "manage", description: "Đối soát ngân hàng, xuất kế toán" },
  { code: "review.read", module: "review", action: "read", description: "Xem đánh giá khách hàng" },
  { code: "review.manage", module: "review", action: "manage", description: "Phản hồi & xử lý đánh giá" },
  { code: "inbox.read", module: "inbox", action: "read", description: "Xem hộp thoại Zalo OA" },
  { code: "inbox.manage", module: "inbox", action: "manage", description: "Trả lời & xử lý hội thoại Zalo OA" },
  { code: "tkb.read", module: "tkb", action: "read", description: "Xem hệ quản trị web Thiết kế bếp" },
  { code: "tkb.manage", module: "tkb", action: "manage", description: "Sửa & xuất bản nội dung web Thiết kế bếp" },
];

export const MODULE_LABEL: Record<string, string> = {
  org: "Tổ chức",
  system: "Hệ thống",
  employee: "Nhân viên",
  schedule: "Lịch làm việc",
  leave: "Nghỉ phép",
  payroll: "Tính lương",
  report: "Báo cáo",
  recruit: "Tuyển dụng",
  performance: "Đánh giá",
  contract: "Hợp đồng",
  asset: "Tài sản",
  training: "Đào tạo",
  reward: "Khen thưởng – Kỷ luật",
  benefit: "Phúc lợi",
  overtime: "Làm thêm giờ",
  lead: "Khách hàng tiềm năng",
  customer: "Khách hàng (CRM)",
  fit: "Fit Diagnostic",
  survey: "Khảo sát nhà khách",
  quote: "Báo giá",
  order: "Đơn hàng",
  delivery: "Giao – Lắp đặt",
  warranty: "Bảo hành & Hậu mãi",
  shiftreport: "Báo cáo ca",
  task: "Việc nội bộ & Sự cố",
  bizdash: "Dashboard quản trị",
  design: "Thiết kế bếp AI",
  cx: "CX · Hành trình & NPS",
  marketing: "Marketing",
  purchase: "Mua hàng / Nhập kho",
  finance: "Tài chính – Kế toán",
  review: "Đánh giá khách hàng",
  inbox: "Hộp thoại Zalo OA",
  tkb: "Thiết kế bếp (web tư vấn)",
};

const ALL = PERMISSIONS.map((p) => p.code);
const except = (...codes: string[]) => ALL.filter((c) => !codes.includes(c));

/** Mật khẩu mặc định cho tài khoản demo ở chế độ dev (chưa nối Supabase). */
export const DEV_PASSWORD = "123456";

type DB = {
  group: Group;
  entities: LegalEntity[];
  departments: Department[];
  jobTitles: JobTitle[];
  employees: Employee[];
  shifts: WorkShift[];
  scheduleEntries: ScheduleEntry[];
  scheduleConfig: ScheduleConfig;
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  reviewCycles: ReviewCycle[];
  reviews: PerformanceReview[];
  jobOpenings: JobOpening[];
  candidates: Candidate[];
  interviews: Interview[];
  onboarding: OnboardingTask[];
  dependents: Dependent[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  payrollPeriods: PayrollPeriod[];
  salaryRecords: SalaryRecord[];
  payrollAdjustments: PayrollAdjustment[];
  benefits: Benefit[];
  benefitEnrollments: BenefitEnrollment[];
  overtimes: OvertimeRequest[];
  approvalConfig: { leaveLevels: number };
  payItems: PayItem[];
  holidays: Holiday[];
  contracts: Contract[];
  rewards: RewardDiscipline[];
  assets: Asset[];
  allocations: AssetAllocation[];
  courses: TrainingCourse[];
  enrolls: TrainingEnroll[];
  roles: Role[];
  users: UserAccount[];
  assignments: RoleAssignment[];
  seq: number;
};

function seed(): DB {
  const group: Group = {
    id: "g1", code: "BNB", name: "Bếp Ngọc Bảo", shortName: "BNB",
    owner: "Đoàn Vinh Phú", systemEmail: "op.dept@khomes.vn", phone: "028-7774-8885",
    website: "khomes.vn", standardHours: "09:00–18:00, nghỉ trưa 12:00–13:30",
    payCutoffDay: 26, payDay: 30,
  };

  const entities: LegalEntity[] = [
    { id: "pn04", groupId: "g1", code: "PN04", name: "Công ty TNHH Peaki", legalName: "Công ty TNHH Peaki", legalNameEn: "Peaki", taxCode: "318900468", regNo: "318900468", regDate: "2025-03-04", region: 1, address: "Số 10, Đồng Văn Cống, phường Cát Lái, TP. Hồ Chí Minh", director: "Phạm Hoàng Yên", directorTitle: "Giám đốc", payrollBank: "Techcombank", companyAccount: "82356868", isParent: true, isActive: true },
  ];

  const departments: Department[] = [
    { id: "pn01-BGD", legalEntityId: "pn04", parentId: null, code: "BGD", name: "Ban Giám đốc", isActive: true },
    { id: "pn01-KT", legalEntityId: "pn04", parentId: null, code: "KT", name: "Phòng Tài chính / Kế toán", isActive: true },
    { id: "pn01-KD", legalEntityId: "pn04", parentId: null, code: "KD", name: "Phòng Kinh Doanh", isActive: true },
    { id: "pn01-VH", legalEntityId: "pn04", parentId: null, code: "VH", name: "Phòng Vận Hành / Bán lẻ", isActive: true },
    { id: "pn01-DA", legalEntityId: "pn04", parentId: null, code: "DA", name: "Phòng Dự án / Quản lý sản phẩm", isActive: true },
    { id: "pn01-NS", legalEntityId: "pn04", parentId: null, code: "NS", name: "Phòng Nhân sự", isActive: true },
  ];

  const jobTitles: JobTitle[] = [
    { id: "jt-gd", groupId: "g1", code: "GD", name: "Giám đốc", jobLevel: 4, isActive: true },
    { id: "jt-tp", groupId: "g1", code: "TP", name: "Trưởng phòng", jobLevel: 3, isActive: true },
    { id: "jt-ql", groupId: "g1", code: "QL", name: "Quản lý", jobLevel: 3, isActive: true },
    { id: "jt-tn", groupId: "g1", code: "TN", name: "Trưởng nhóm", jobLevel: 2, isActive: true },
    { id: "jt-cv", groupId: "g1", code: "CV", name: "Chuyên viên", jobLevel: 1, isActive: true },
    { id: "jt-nv", groupId: "g1", code: "NV", name: "Nhân viên", jobLevel: 1, isActive: true },
    { id: "jt-tt", groupId: "g1", code: "TT", name: "Thực tập sinh", jobLevel: 0, isActive: true },
  ];

  const employees: Employee[] = [
    { id: "e1", legalEntityId: "pn04", jobTitleId: "jt-nv", code: "NV0001", fullName: "Nguyễn Bình Minh", email: "djmidazofficial@gmail.com", status: "active", gender: "male", dateOfBirth: "2003-02-16", phone: "0357539794", personalEmail: "djmidazofficial@gmail.com", nationalId: "70203002914", nationalIdDate: "2023-11-13", nationalIdPlace: "Cục CS QLHC", address: "615/3 Xô Viết Nghệ Tĩnh, P 26, Bình Thạnh", employmentType: "fulltime", joinDate: "2026-04-28", taxCode: "70203002914", bankName: "Vietcombank", bankAccount: "1025262745" },
    { id: "e2", legalEntityId: "pn04", jobTitleId: "jt-ql", code: "NV0002", fullName: "Đào Kế Thịnh", email: "daokethinh@gmail.com", status: "active", gender: "male", dateOfBirth: "1997-05-19", phone: "0813481208", personalEmail: "daokethinh@gmail.com", nationalId: "87097016288", nationalIdDate: "2023-05-31", nationalIdPlace: "Đồng Tháp", address: "82 Đường Số 1, Bình Trị Đông B, An Lạc, TPHCM", employmentType: "fulltime", joinDate: "2026-04-22", taxCode: "87097016288", bankName: "MB Bank", bankAccount: "97997979797" },
    { id: "e3", legalEntityId: "pn04", jobTitleId: "jt-tt", code: "NV0003", fullName: "Phạm Ngô Khả Vy", email: "phamngokhavy13052004@gmail.com", status: "active", gender: "female", dateOfBirth: "2004-05-13", phone: "0329790869", personalEmail: "phamngokhavy13052004@gmail.com", nationalId: "87304015363", nationalIdDate: "2021-08-05", nationalIdPlace: "Cục Trưởng Cục Cảnh Sát Quản Lý Hành Chính Về Trật Tự Xã Hội", address: "17/1 đường số 13, Hiệp Bình Chánh, Thủ Đức, HCM", employmentType: "intern", joinDate: "2026-04-21", taxCode: "87304015363", bankName: "Vietcombank", bankAccount: "1029243701" },
    { id: "e4", legalEntityId: "pn04", jobTitleId: "jt-nv", code: "NV0004", fullName: "Trang Cát An", email: "tvshinchanvietsub@gmail.com", status: "active", gender: "female", dateOfBirth: "2006-12-11", phone: "0945290870", personalEmail: "tvshinchanvietsub@gmail.com", nationalId: "82306011662", nationalIdDate: "2022-03-16", nationalIdPlace: "CỤC TRƯỞNG CỤC CANHE SÁT QUẢN LÝ HÀNH CHÍNH VỀ TRẬT TỰ XÃ HỘI", address: "21 lê quang chiểu phường hiệp tân quận tân phú thành phố Hồ Chí Minh", employmentType: "fulltime", joinDate: "2026-04-13", taxCode: "82306011662", bankName: "BIDV Bank", bankAccount: "7102535947" },
    { id: "e5", legalEntityId: "pn04", jobTitleId: "jt-nv", code: "NV0005", fullName: "Nguyễn Chí Công", email: "caraven1303@gmail.com", status: "active", gender: "male", dateOfBirth: "1994-03-13", phone: "0787881812", personalEmail: "caraven1303@gmail.com", nationalId: "52094003829", nationalIdDate: "2022-01-13", nationalIdPlace: "cục quản lý hành chính về trật tự xã hội", address: "165/36 Tây Thạnh, phường Tây Thạnh, quận Tân Phú, TP Hồ Chí Minh", employmentType: "fulltime", joinDate: "2026-11-05", taxCode: "52094003829", bankName: "Techcom bank", bankAccount: "19034753970013" },
    { id: "e6", legalEntityId: "pn04", jobTitleId: "jt-tn", code: "NV0006", fullName: "Nguyễn Thị Thúy Hằng", status: "active", gender: "female" },
    { id: "e7", legalEntityId: "pn04", jobTitleId: "jt-nv", code: "NV0007", fullName: "Dương Thị Hồng Ngọc", email: "duonghngoc2301@gmail.com", status: "active", gender: "female", dateOfBirth: "2001-01-23", phone: "0978395264", personalEmail: "duonghngoc2301@gmail.com", nationalId: "24301010357", nationalIdDate: "2026-01-29", nationalIdPlace: "bộ công an", address: "154/127/24 âu dương lân, p chánh hưng,q8", employmentType: "fulltime", joinDate: "2026-04-14", taxCode: "24301010357", bankName: "Vietcombank", bankAccount: "1017425776" },
    { id: "e8", legalEntityId: "pn04", jobTitleId: "jt-tt", code: "NV0008", fullName: "Bùi Thị Thanh Huyền", email: "huyenthao558@gmail.com", status: "active", gender: "female", dateOfBirth: "2005-02-27", phone: "0965571810", personalEmail: "huyenthao558@gmail.com", nationalId: "22305002583", nationalIdDate: "2030-02-27", nationalIdPlace: "CỤC TRƯỞNG CỤC CẢNH SÁT QUẢN LÝ HÀNH CHÍNH VỀ TRẬT TỰ XÃ HỘI", address: "Ecohome 3, Đông Ngạc, Bắc Từ Liêm, Hà Nội", employmentType: "seasonal", joinDate: "2025-11-24", taxCode: "22305002583", bankName: "BIDV Bank", bankAccount: "4421169534" },
  ];

  const shifts: WorkShift[] = [
    { id: "sh-hc", code: "HC", name: "Hành chính", startTime: "09:00", endTime: "18:00", breakStart: "12:00", breakEnd: "13:30", workHours: 7.5, isActive: true },
    { id: "sh-sang", code: "SANG", name: "Ca sáng", startTime: "08:00", endTime: "17:00", workHours: 8, isActive: true },
    { id: "sh-chieu", code: "CHIEU", name: "Ca chiều", startTime: "12:30", endTime: "21:00", workHours: 8, isActive: true },
  ];
  const scheduleConfig: ScheduleConfig = { workingWeekdays: [1, 2, 3, 4, 5], defaultShiftId: "sh-hc" };

  const leaveTypes: LeaveType[] = [
    { id: "lt-annual", code: "ANNUAL", name: "Phép năm", paid: true, deductsQuota: true, badge: "b-green", isActive: true },
    { id: "lt-sick", code: "SICK", name: "Nghỉ ốm", paid: true, deductsQuota: false, badge: "b-amber", isActive: true },
    { id: "lt-maternity", code: "MATERNITY", name: "Thai sản", paid: true, deductsQuota: false, badge: "b-rose", isActive: true },
    { id: "lt-wedding", code: "WEDDING", name: "Nghỉ kết hôn", paid: true, deductsQuota: false, badge: "b-indigo", isActive: true },
    { id: "lt-bereavement", code: "BEREAVEMENT", name: "Nghỉ tang", paid: true, deductsQuota: false, badge: "b-gray", isActive: true },
    { id: "lt-unpaid", code: "UNPAID", name: "Nghỉ không lương", paid: false, deductsQuota: false, badge: "b-gray", isActive: true },
  ];

  const holidays: Holiday[] = [
    { id: "hol-2026-01-01", date: "2026-01-01", name: "Tết Dương lịch", paid: true },
    { id: "hol-2026-02-16", date: "2026-02-16", name: "Tết Nguyên đán (30 Tết)", paid: true },
    { id: "hol-2026-02-17", date: "2026-02-17", name: "Tết Nguyên đán (Mùng 1)", paid: true },
    { id: "hol-2026-02-18", date: "2026-02-18", name: "Tết Nguyên đán (Mùng 2)", paid: true },
    { id: "hol-2026-02-19", date: "2026-02-19", name: "Tết Nguyên đán (Mùng 3)", paid: true },
    { id: "hol-2026-02-20", date: "2026-02-20", name: "Tết Nguyên đán (Mùng 4)", paid: true },
    { id: "hol-2026-04-26", date: "2026-04-26", name: "Giỗ Tổ Hùng Vương (10/3 ÂL)", paid: true },
    { id: "hol-2026-04-30", date: "2026-04-30", name: "Ngày Giải phóng miền Nam", paid: true },
    { id: "hol-2026-05-01", date: "2026-05-01", name: "Quốc tế Lao động", paid: true },
    { id: "hol-2026-09-02", date: "2026-09-02", name: "Quốc khánh", paid: true },
    { id: "hol-2026-09-03", date: "2026-09-03", name: "Nghỉ Quốc khánh (liền kề)", paid: true },
  ];

  const payItems: PayItem[] = [
    { id: "pi-an", code: "PC-AN", name: "Phụ cấp ăn trưa", kind: "allowance", defaultAmount: 730000, taxable: false, insurable: false, isActive: true },
    { id: "pi-xe", code: "PC-XE", name: "Phụ cấp xăng xe / đi lại", kind: "allowance", defaultAmount: 1000000, taxable: true, insurable: false, isActive: true },
    { id: "pi-dt", code: "PC-DT", name: "Phụ cấp điện thoại", kind: "allowance", defaultAmount: 860000, taxable: true, insurable: false, isActive: true },
    { id: "pi-tn", code: "PC-TN", name: "Phụ cấp trách nhiệm", kind: "allowance", defaultAmount: 2000000, taxable: true, insurable: true, isActive: true },
    { id: "pi-cc", code: "PC-CC", name: "Phụ cấp chuyên cần", kind: "allowance", defaultAmount: 300000, taxable: true, insurable: false, isActive: true },
    { id: "pi-dp", code: "PC-DP", name: "Phụ cấp đồng phục", kind: "allowance", defaultAmount: 410000, taxable: false, insurable: false, isActive: true },
    { id: "pi-cd", code: "KT-CD", name: "Đoàn phí công đoàn", kind: "deduction", taxable: false, insurable: false, isActive: true },
  ];

  const roles: Role[] = [
    { id: "r-admin", code: "ADMIN", name: "Quản trị hệ thống", description: "Toàn quyền hệ thống, cấu hình & phân quyền", isSystem: true, permissions: [...ALL] },
    { id: "r-bod", code: "BOD", name: "Chủ cửa hàng / BOD", description: "Xem toàn cảnh doanh thu, lead, vận hành; phê duyệt cấp cao", isSystem: true, permissions: ["org.read", "employee.read", "schedule.read", "leave.read", "leave.approve", "payroll.read", "report.read", "report.export", "recruit.read", "performance.read", "contract.read", "asset.read", "training.read", "reward.read", "benefit.read", "overtime.read", "overtime.approve", "lead.read", "customer.read", "fit.read", "survey.read", "quote.read", "order.read", "delivery.read", "warranty.read", "shiftreport.read", "task.read", "bizdash.read", "design.read", "cx.read", "marketing.read", "purchase.read", "finance.read", "finance.manage", "review.read", "inbox.read"] },
    { id: "r-hrg", code: "HRG", name: "HR Toàn hệ thống", description: "Nhân sự cấp cao — quản lý toàn bộ nhân sự, tổ chức", isSystem: true, permissions: except("system.rbac") },
    { id: "r-hr", code: "HR", name: "HR Đơn vị", description: "Nhân sự trong phạm vi được phân (phòng ban)", isSystem: true, permissions: except("system.rbac", "org.manage") },
    { id: "r-rec", code: "REC", name: "Recruiter", description: "Quản lý tuyển dụng, ứng viên, phỏng vấn", isSystem: true, permissions: ["org.read", "employee.read", "recruit.read", "recruit.manage", "report.read"] },
    { id: "r-mgr", code: "MGR", name: "Quản lý trực tiếp", description: "Trưởng đơn vị — xếp lịch, duyệt đơn, xem nhân sự phòng ban", isSystem: true, permissions: ["org.read", "employee.read", "schedule.read", "schedule.manage", "leave.read", "leave.approve", "report.read", "recruit.read", "performance.read", "performance.manage", "contract.read", "asset.read", "training.read", "reward.read", "benefit.read", "overtime.read", "overtime.approve"] },
    { id: "r-emp", code: "EMP", name: "Nhân viên", description: "Tự phục vụ — xem lịch, gửi đơn, xem phiếu lương & KPI của bản thân", isSystem: true, permissions: ["schedule.read", "leave.read", "leave.request", "payroll.read", "performance.read", "overtime.read", "overtime.request"] },
    // ===== BNB · Vai trò bán hàng & vận hành cửa hàng =====
    { id: "r-sale", code: "SALE", name: "Tư vấn bán hàng (Sales)", description: "Chăm lead, tư vấn, khảo sát, báo giá, chốt đơn", isSystem: true, permissions: ["customer.read", "customer.manage", "lead.read", "lead.manage", "fit.read", "survey.read", "survey.manage", "quote.read", "quote.manage", "order.read", "order.manage", "delivery.read", "warranty.read", "shiftreport.read", "shiftreport.manage", "task.read", "task.manage", "report.read", "design.read", "design.manage", "cx.read", "cx.manage", "review.read", "review.manage", "inbox.read", "inbox.manage"] },
    { id: "r-cskh", code: "CSKH", name: "Chăm sóc khách hàng / Hậu mãi", description: "Hậu mãi, bảo hành, nhắc chăm sóc 1/7/30/90 ngày", isSystem: true, permissions: ["customer.read", "customer.manage", "lead.read", "order.read", "warranty.read", "warranty.manage", "task.read", "task.manage", "shiftreport.read", "cx.read", "cx.manage", "inbox.read", "inbox.manage"] },
    { id: "r-tech", code: "TECH", name: "Kỹ thuật giao – lắp", description: "Nhận lịch giao – lắp, nghiệm thu, xử lý hiện trường", isSystem: true, permissions: ["order.read", "survey.read", "delivery.read", "delivery.manage", "warranty.read", "warranty.manage", "task.read", "task.manage", "shiftreport.read", "shiftreport.manage"] },
    { id: "r-sroom", code: "SROOM", name: "Quản lý Showroom", description: "Điều phối bán hàng – vận hành tại showroom", isSystem: true, permissions: ["customer.read", "customer.manage", "lead.read", "lead.manage", "fit.read", "fit.manage", "survey.read", "survey.manage", "quote.read", "quote.manage", "order.read", "order.manage", "delivery.read", "delivery.manage", "warranty.read", "warranty.manage", "shiftreport.read", "shiftreport.manage", "task.read", "task.manage", "report.read", "bizdash.read", "design.read", "design.manage", "cx.read", "cx.manage", "marketing.read", "marketing.manage", "purchase.read", "purchase.manage", "finance.read", "finance.manage", "review.read", "review.manage", "employee.read", "schedule.read", "schedule.manage", "inbox.read", "inbox.manage"] },
    // Front office · Marketing (sơ đồ Lớp 2) — trụ nội dung, lịch, quảng cáo, CPL.
    { id: "r-mkt", code: "MKT", name: "Marketing", description: "Trụ nội dung, lịch đăng, chiến dịch Ads/CPL, đánh giá & kênh Zalo", isSystem: true, permissions: ["marketing.read", "marketing.manage", "customer.read", "lead.read", "cx.read", "review.read", "review.manage", "inbox.read", "inbox.manage", "report.read", "bizdash.read"] },
    // Back office · Tài chính – Kế toán (sơ đồ Lớp 2) — công nợ, giá vốn, đối soát ngân hàng, AMIS.
    { id: "r-acc", code: "ACC", name: "Kế toán / Tài chính", description: "Công nợ, giá vốn/lãi gộp, đối soát ngân hàng, xuất kế toán AMIS", isSystem: true, permissions: ["finance.read", "finance.manage", "order.read", "purchase.read", "purchase.manage", "customer.read", "report.read", "report.export", "bizdash.read"] },
  ];

  const users: UserAccount[] = [
    { id: "u-admin", email: "admin@k-homes.vn", fullName: "Quản trị hệ thống", isActive: true, password: DEV_PASSWORD },
    { id: "u1", email: "djmidazofficial@gmail.com", fullName: "Nguyễn Bình Minh", employeeId: "e1", isActive: true, password: DEV_PASSWORD },
    { id: "u2", email: "daokethinh@gmail.com", fullName: "Đào Kế Thịnh", employeeId: "e2", isActive: true, password: DEV_PASSWORD },
    { id: "u3", email: "phamngokhavy13052004@gmail.com", fullName: "Phạm Ngô Khả Vy", employeeId: "e3", isActive: true, password: DEV_PASSWORD },
    { id: "u4", email: "tvshinchanvietsub@gmail.com", fullName: "Trang Cát An", employeeId: "e4", isActive: true, password: DEV_PASSWORD },
    { id: "u5", email: "caraven1303@gmail.com", fullName: "Nguyễn Chí Công", employeeId: "e5", isActive: true, password: DEV_PASSWORD },
    { id: "u6", email: "duonghngoc2301@gmail.com", fullName: "Dương Thị Hồng Ngọc", employeeId: "e7", isActive: true, password: DEV_PASSWORD },
    { id: "u7", email: "huyenthao558@gmail.com", fullName: "Bùi Thị Thanh Huyền", employeeId: "e8", isActive: true, password: DEV_PASSWORD },
  ];

  const assignments: RoleAssignment[] = [
    { id: "a-admin", userId: "u-admin", roleId: "r-admin", scopeType: "GROUP" },
    { id: "a1", userId: "u1", roleId: "r-emp", scopeType: "SELF" },
    { id: "a2", userId: "u2", roleId: "r-mgr", scopeType: "GROUP" },
    { id: "a3", userId: "u3", roleId: "r-emp", scopeType: "SELF" },
    { id: "a4", userId: "u4", roleId: "r-emp", scopeType: "SELF" },
    { id: "a5", userId: "u5", roleId: "r-emp", scopeType: "SELF" },
    { id: "a6", userId: "u6", roleId: "r-emp", scopeType: "SELF" },
    { id: "a7", userId: "u7", roleId: "r-hr", scopeType: "GROUP" },
  ];

  return {
    group, entities, departments, jobTitles, employees, shifts, scheduleEntries: [],
    scheduleConfig, leaveTypes, leaveRequests: [], reviewCycles: [], reviews: [],
    jobOpenings: [], candidates: [], interviews: [], onboarding: [], dependents: [],
    auditLogs: [], notifications: [], payrollPeriods: [], salaryRecords: [], payrollAdjustments: [],
    benefits: [], benefitEnrollments: [],
    overtimes: [], approvalConfig: { leaveLevels: 2 }, payItems, holidays, contracts: [], rewards: [],
    assets: [], allocations: [], courses: [], enrolls: [], roles, users, assignments, seq: 1,
  };
}
// Singleton tồn tại qua HMR của dev server.
const g = globalThis as unknown as { __bnbDB?: DB };
function db(): DB {
  if (!g.__bnbDB) g.__bnbDB = seed();
  return g.__bnbDB;
}

// ============================ Đồng bộ Supabase (Giai đoạn 1) ============================
// Mô hình: bộ nhớ (db()) là bản làm việc; Supabase là NGUỒN SỰ THẬT cho các
// collection ĐÃ NỐI:
//   Giai đoạn 1: Tổ chức + Nhân viên + Tài khoản.
//   Giai đoạn 2: Lịch làm việc (ca, ngoại lệ, cấu hình) + Nghỉ phép (loại nghỉ, đơn).
// - Mỗi REQUEST: nạp lại dữ liệu đã nối từ Supabase vào bộ nhớ (React cache() → 1 lần/request).
// - Lần đầu (Supabase trống): đẩy seed in-memory hiện có LÊN Supabase (nạp dữ liệu thật).
// - DB đã có từ GĐ trước nhưng THIẾU catalog GĐ mới → seed bù (idempotent).
// - Mọi hàm GHI của collection đã nối ghi xuyên xuống Supabase (write-through).
// Các collection CHƯA nối (lương, tuyển dụng, hợp đồng…) vẫn thuần in-memory như trước.

// Bản đồ collection (mảng) → tên bảng Supabase. TẤT CẢ đều đã nối.
// `as const satisfies` giữ kiểu chặt (k là khoá DB hợp lệ). Bảng write-through dùng chung map này.
const COLL_TABLES = [
  ["entities", "legal_entities"], ["departments", "departments"], ["jobTitles", "job_titles"],
  ["employees", "employees"], ["payItems", "pay_items"], ["roles", "roles"], ["users", "app_users"],
  ["assignments", "role_assignments"], ["shifts", "shifts"], ["scheduleEntries", "schedule_entries"],
  ["leaveTypes", "leave_types"], ["leaveRequests", "leave_requests"], ["holidays", "holidays"],
  ["contracts", "contracts"], ["rewards", "rewards"], ["assets", "assets"], ["allocations", "allocations"],
  ["courses", "courses"], ["enrolls", "enrolls"], ["reviewCycles", "review_cycles"], ["reviews", "reviews"],
  ["jobOpenings", "job_openings"], ["candidates", "candidates"], ["interviews", "interviews"],
  ["onboarding", "onboarding"], ["dependents", "dependents"], ["notifications", "notifications"],
  ["auditLogs", "audit_logs"], ["payrollPeriods", "payroll_periods"], ["salaryRecords", "salary_records"],
  ["payrollAdjustments", "payroll_adjustments"], ["benefits", "benefits"],
  ["benefitEnrollments", "benefit_enrollments"], ["overtimes", "overtimes"],
] as const satisfies readonly [keyof DB, string][];

// Cấu hình đơn lẻ → key trong bảng app_config.
const CONFIG_KEYS = [
  ["group", "group"], ["approvalConfig", "approval_config"], ["scheduleConfig", "schedule_config"],
] as const satisfies readonly [keyof DB, string][];

const asRows = (v: unknown) => v as { id: string }[];

/** Đẩy toàn bộ seed in-memory (mọi collection + cấu hình) lên Supabase — dùng khi DB mới tinh. */
async function seedAllToSupabase(base: DB): Promise<void> {
  await Promise.all([
    ...CONFIG_KEYS.map(([k, key]) => setConfig(key, base[k])),
    ...COLL_TABLES.map(([k, t]) => upsertMany(t, asRows(base[k]))),
  ]);
}

// Tra cứu nhanh key collection/cấu hình → tên bảng / khoá config.
const TABLE_OF = new Map<keyof DB, string>(COLL_TABLES.map(([k, t]) => [k, t]));
const CFGKEY_OF = new Map<keyof DB, string>(CONFIG_KEYS.map(([k, key]) => [k, key]));
const ALL_KEYS = [...COLL_TABLES.map(([k]) => k), ...CONFIG_KEYS.map(([k]) => k)] as (keyof DB)[];

// Trạng thái nạp theo REQUEST (React cache() → 1 instance mỗi request):
// `loading` giữ promise nạp của từng collection để khử trùng lặp & chờ xong trước khi đọc.
const reqState = cache(() => ({ loading: new Map<keyof DB, Promise<void>>() }));

/**
 * Seed-nếu-trống + bù danh mục — tối đa 1 lần mỗi request.
 * Khi DB trống: đẩy seed in-memory LÊN Supabase và coi như MỌI collection đã nạp
 * (db() đang giữ đúng seed) → khỏi kéo lại.
 */
const ensureSeeded = cache(async (): Promise<void> => {
  if (!isSupabaseStoreConfigured) return; // chưa cấu hình → in-memory thuần
  const base = db();
  const grp = await getConfig<Group>("group");
  if (!grp) {
    await seedAllToSupabase(base);
    const st = reqState();
    ALL_KEYS.forEach((k) => st.loading.set(k, Promise.resolve()));
    return;
  }
  // DB đã có (GĐ trước) nhưng có thể THIẾU catalog GĐ sau → seed bù danh mục ca + loại nghỉ + lễ.
  if (!(await getConfig("schedule_config"))) {
    await Promise.all([
      setConfig("schedule_config", base.scheduleConfig),
      upsertMany("shifts", base.shifts),
      upsertMany("leave_types", base.leaveTypes),
      upsertMany("holidays", base.holidays),
    ]);
  }
});

/**
 * Nạp LƯỜI chỉ những collection/cấu hình được yêu cầu (mỗi cái = 1 subrequest),
 * khử trùng lặp & cache theo request. Đây là CHÌA KHOÁ để không vượt giới hạn
 * subrequest của Cloudflare Workers (free = 50): trước đây mỗi request kéo cả ~38 bảng.
 */
async function ensureLoaded(keys: (keyof DB)[]): Promise<void> {
  if (!isSupabaseStoreConfigured) return;
  await ensureSeeded();
  const st = reqState();
  await Promise.all(
    keys.map((k) => {
      let p = st.loading.get(k);
      if (!p) {
        p = (async () => {
          const table = TABLE_OF.get(k);
          if (table) {
            Object.assign(db(), { [k]: await pullCollection(table) });
            return;
          }
          const ck = CFGKEY_OF.get(k);
          if (ck) {
            const v = await getConfig(ck);
            if (v) Object.assign(db(), { [k]: v });
          }
        })();
        st.loading.set(k, p);
      }
      return p;
    }),
  );
}

/**
 * Lấy DB sau khi đã nạp các collection CẦN DÙNG từ Supabase.
 * Truyền danh sách key để chỉ kéo đúng phần cần (khuyến nghị). Không truyền → kéo TẤT CẢ (an toàn, đắt).
 */
async function getDb(...keys: (keyof DB)[]): Promise<DB> {
  await ensureLoaded(keys.length ? keys : ALL_KEYS);
  return db();
}

/** Đảm bảo vài collection đã nạp khi code đọc thẳng db() (không qua getDb). */
async function ensure(...keys: (keyof DB)[]): Promise<void> {
  await ensureLoaded(keys);
}

// null/undefined giữ nguyên (JSON.parse(JSON.stringify(undefined)) sẽ ném lỗi).
const clone = <T>(v: T): T => (v == null ? v : JSON.parse(JSON.stringify(v)));
const nextId = (prefix: string) => `${prefix}-${(db().seq++).toString(36)}${Date.now().toString(36).slice(-4)}`;

// ============================ READ ============================
// Các hàm đọc Giai đoạn 1 gọi getDb() để đồng bộ dữ liệu từ Supabase trước khi đọc.
export async function getGroup(): Promise<Group> {
  return clone((await getDb("group")).group);
}
export async function listEntities(): Promise<LegalEntity[]> {
  return clone((await getDb("entities")).entities);
}
export async function getEntity(id: string): Promise<LegalEntity | undefined> {
  return clone((await getDb("entities")).entities.find((e) => e.id === id));
}
export async function listDepartments(entityId?: string): Promise<Department[]> {
  const all = (await getDb("departments")).departments;
  return clone(entityId ? all.filter((d) => d.legalEntityId === entityId) : all);
}
export async function listJobTitles(): Promise<JobTitle[]> {
  return clone((await getDb("jobTitles")).jobTitles);
}
export async function listEmployees(entityId?: string): Promise<Employee[]> {
  const all = (await getDb("employees")).employees;
  return clone(entityId ? all.filter((e) => e.legalEntityId === entityId) : all);
}
export async function getEmployee(id: string): Promise<Employee | undefined> {
  return clone((await getDb("employees")).employees.find((e) => e.id === id));
}
export async function listRoles(): Promise<Role[]> {
  return clone((await getDb("roles")).roles);
}
export async function listUsers(): Promise<UserAccount[]> {
  return clone((await getDb("users")).users);
}
export async function getUserById(id: string): Promise<UserAccount | undefined> {
  return clone((await getDb("users")).users.find((u) => u.id === id));
}
/** Xác thực email + mật khẩu (chế độ dev). Trả tài khoản nếu khớp & đang hoạt động. */
export async function findUserByCredentials(
  email: string,
  password: string,
): Promise<UserAccount | undefined> {
  const u = (await getDb("users")).users.find(
    (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.isActive,
  );
  if (!u || !u.password || u.password !== password) return undefined;
  return clone(u);
}
export async function listAssignments(): Promise<RoleAssignment[]> {
  return clone((await getDb("assignments")).assignments);
}

// ============================ WRITE (Pháp nhân) ============================
export async function createEntity(input: Omit<LegalEntity, "id" | "groupId">): Promise<LegalEntity> {
  const dbo = await getDb("group", "entities");
  const e: LegalEntity = { ...input, id: nextId("ent"), groupId: dbo.group.id };
  dbo.entities.push(e);
  await upsertRow("legal_entities", e.id, e);
  return clone(e);
}
export async function updateEntity(id: string, patch: Partial<LegalEntity>): Promise<void> {
  const e = (await getDb("entities")).entities.find((x) => x.id === id);
  if (e) {
    Object.assign(e, patch, { id: e.id, groupId: e.groupId });
    await upsertRow("legal_entities", e.id, e);
  }
}

// ============================ WRITE (Phòng ban) ============================
export async function createDepartment(input: Omit<Department, "id">): Promise<Department> {
  const dbo = await getDb("departments");
  const dep: Department = { ...input, id: nextId("dep") };
  dbo.departments.push(dep);
  await upsertRow("departments", dep.id, dep);
  return clone(dep);
}
export async function updateDepartment(id: string, patch: Partial<Department>): Promise<void> {
  const dep = (await getDb("departments")).departments.find((x) => x.id === id);
  if (dep) {
    Object.assign(dep, patch, { id: dep.id });
    await upsertRow("departments", dep.id, dep);
  }
}
export async function deleteDepartment(id: string): Promise<void> {
  const dbo = await getDb("departments");
  // gỡ con trỏ parent cho phòng ban con (và đồng bộ các phòng con đã đổi)
  const children = dbo.departments.filter((x) => x.parentId === id);
  children.forEach((c) => (c.parentId = null));
  dbo.departments = dbo.departments.filter((x) => x.id !== id);
  await Promise.all([
    deleteRow("departments", id),
    ...children.map((c) => upsertRow("departments", c.id, c)),
  ]);
}

// ============================ WRITE (Chức danh) ============================
export async function createJobTitle(input: Omit<JobTitle, "id" | "groupId">): Promise<JobTitle> {
  const dbo = await getDb("group", "jobTitles");
  const j: JobTitle = { ...input, id: nextId("jt"), groupId: dbo.group.id };
  dbo.jobTitles.push(j);
  await upsertRow("job_titles", j.id, j);
  return clone(j);
}
export async function updateJobTitle(id: string, patch: Partial<JobTitle>): Promise<void> {
  const j = (await getDb("jobTitles")).jobTitles.find((x) => x.id === id);
  if (j) {
    Object.assign(j, patch, { id: j.id, groupId: j.groupId });
    await upsertRow("job_titles", j.id, j);
  }
}

// ============================ WRITE (Nhân viên) ============================
export async function createEmployee(input: Omit<Employee, "id">): Promise<Employee> {
  const dbo = await getDb("employees");
  const e: Employee = { ...input, id: nextId("emp") };
  dbo.employees.push(e);
  await upsertRow("employees", e.id, e);
  return clone(e);
}
export async function updateEmployee(id: string, patch: Partial<Employee>): Promise<void> {
  const e = (await getDb("employees")).employees.find((x) => x.id === id);
  if (e) {
    Object.assign(e, patch, { id: e.id });
    await upsertRow("employees", e.id, e);
  }
}
export async function deleteEmployee(id: string): Promise<void> {
  const dbo = await getDb("departments", "employees");
  // gỡ nhân viên khỏi vị trí trưởng phòng đang nắm (nếu có) + đồng bộ phòng đó
  const freed = dbo.departments.filter((d) => d.managerEmployeeId === id);
  freed.forEach((d) => (d.managerEmployeeId = null));
  dbo.employees = dbo.employees.filter((x) => x.id !== id);
  await Promise.all([
    deleteRow("employees", id),
    ...freed.map((d) => upsertRow("departments", d.id, d)),
  ]);
}

/** Sinh mã nhân viên kế tiếp dạng NVxxxx (theo mã lớn nhất hiện có). */
export async function nextEmployeeCode(): Promise<string> {
  const nums = (await getDb("employees"))
    .employees.map((e) => /^NV(\d+)$/.exec(e.code)?.[1])
    .filter((x): x is string => !!x)
    .map((x) => parseInt(x, 10));
  const max = nums.length ? Math.max(...nums) : 0;
  return `NV${String(max + 1).padStart(4, "0")}`;
}

// ============================ Lịch sử lương ============================
export async function listSalaryRecords(employeeId: string): Promise<SalaryRecord[]> {
  return clone(
    (await getDb("salaryRecords"))
      .salaryRecords.filter((r) => r.employeeId === employeeId)
      .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1)),
  );
}

export async function addSalaryRecord(input: Omit<SalaryRecord, "id" | "createdAt">): Promise<SalaryRecord> {
  const dbo = await getDb("salaryRecords", "employees");
  const rec: SalaryRecord = { ...input, id: nextId("sal"), createdAt: new Date().toISOString() };
  dbo.salaryRecords.push(rec);
  await upsertRow("salary_records", rec.id, rec);
  // Nếu là bản ghi MỚI NHẤT (effectiveFrom lớn nhất) → cập nhật lương "hiện tại" trên hồ sơ.
  const latest = dbo.salaryRecords
    .filter((r) => r.employeeId === input.employeeId)
    .reduce((a, b) => (a.effectiveFrom >= b.effectiveFrom ? a : b));
  if (latest.id === rec.id) {
    const e = dbo.employees.find((x) => x.id === input.employeeId);
    if (e) {
      e.baseSalary = rec.baseSalary;
      e.allowance = rec.allowance;
      if (rec.insuranceSalary != null) e.insuranceSalary = rec.insuranceSalary;
      await upsertRow("employees", e.id, e);
    }
  }
  return clone(rec);
}

export async function deleteSalaryRecord(id: string): Promise<void> {
  const dbo = await getDb("salaryRecords");
  dbo.salaryRecords = dbo.salaryRecords.filter((r) => r.id !== id);
  await deleteRow("salary_records", id);
}

/**
 * Mức lương áp dụng cho kỳ `ym` (yyyy-mm): bản ghi lịch sử có effectiveFrom lớn
 * nhất mà ≤ ym; nếu chưa có → lấy lương trên hồ sơ nhân viên.
 */
export async function resolveSalary(
  employeeId: string,
  ym: string,
): Promise<{ baseSalary: number; allowance: number; insuranceSalary?: number }> {
  const dbo = await getDb("employees", "salaryRecords");
  const emp = dbo.employees.find((e) => e.id === employeeId);
  const applicable = dbo.salaryRecords
    .filter((r) => r.employeeId === employeeId && r.effectiveFrom <= ym)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0];
  if (applicable) {
    return {
      baseSalary: applicable.baseSalary,
      allowance: applicable.allowance,
      insuranceSalary: applicable.insuranceSalary ?? applicable.baseSalary,
    };
  }
  return {
    baseSalary: emp?.baseSalary ?? 0,
    allowance: emp?.allowance ?? 0,
    insuranceSalary: emp?.insuranceSalary,
  };
}

// ============================ Điều chỉnh kỳ lương ============================
export async function listPayrollAdjustments(employeeId: string, ym: string): Promise<PayrollAdjustment[]> {
  return clone((await getDb("payrollAdjustments")).payrollAdjustments.filter((a) => a.employeeId === employeeId && a.ym === ym));
}

export async function addPayrollAdjustment(
  input: Omit<PayrollAdjustment, "id" | "createdAt">,
): Promise<PayrollAdjustment> {
  const dbo = await getDb("payrollAdjustments");
  const adj: PayrollAdjustment = { ...input, id: nextId("padj"), createdAt: new Date().toISOString() };
  dbo.payrollAdjustments.push(adj);
  await upsertRow("payroll_adjustments", adj.id, adj);
  return clone(adj);
}

export async function deletePayrollAdjustment(id: string): Promise<void> {
  const dbo = await getDb("payrollAdjustments");
  dbo.payrollAdjustments = dbo.payrollAdjustments.filter((a) => a.id !== id);
  await deleteRow("payroll_adjustments", id);
}

/**
 * Tổng điều chỉnh kỳ lương, tách theo cờ chịu thuế.
 * Khấu trừ (deduction) là số trừ; loại khác là số cộng.
 */
export async function getPayrollAdjustmentTotals(
  employeeId: string,
  ym: string,
): Promise<{ taxable: number; postTax: number }> {
  let taxable = 0;
  let postTax = 0;
  for (const a of (await getDb("payrollAdjustments")).payrollAdjustments.filter((x) => x.employeeId === employeeId && x.ym === ym)) {
    const signed = a.kind === "deduction" ? -Math.abs(a.amount) : Math.abs(a.amount);
    if (a.taxable) taxable += signed;
    else postTax += signed;
  }
  return { taxable, postTax };
}

// ============================ Lịch làm việc ============================
export async function listShifts(): Promise<WorkShift[]> {
  return clone((await getDb("shifts")).shifts);
}
export async function getScheduleConfig(): Promise<ScheduleConfig> {
  return clone((await getDb("scheduleConfig")).scheduleConfig);
}
export async function listScheduleEntries(employeeId?: string): Promise<ScheduleEntry[]> {
  const all = (await getDb("scheduleEntries")).scheduleEntries;
  return clone(employeeId ? all.filter((e) => e.employeeId === employeeId) : all);
}

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
/** Thứ trong tuần theo quy ước 1=T2 … 7=CN (ổn định, không lệ thuộc múi giờ). */
function weekday(y: number, m: number, d: number): number {
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=CN..6=T7
  return js === 0 ? 7 : js;
}

/**
 * Mọi NGÀY LÀM VIỆC (theo workingWeekdays) trong [start, end] — yyyy-mm-dd.
 * Bỏ qua ngày lễ nếu truyền `holidays` (ngày lễ KHÔNG tính là ngày công).
 */
function eachWorkdayInRange(
  start: string,
  end: string,
  workingWeekdays: number[],
  holidays?: Set<string>,
): string[] {
  const out: string[] = [];
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return out;
  for (let t = new Date(s); t <= e; t.setUTCDate(t.getUTCDate() + 1)) {
    const dow = t.getUTCDay() === 0 ? 7 : t.getUTCDay();
    const date = `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
    if (workingWeekdays.includes(dow) && !holidays?.has(date)) {
      out.push(date);
    }
  }
  return out;
}

/** Tập ngày lễ (yyyy-mm-dd) hiện có — tiện lọc ngày công. */
function holidaySet(): Set<string> {
  return new Set(db().holidays.map((x) => x.date));
}

/** Giải lịch 1 tháng cho 1 nhân viên: gộp lịch hành chính nền + ngoại lệ. */
export async function resolveMonth(
  employeeId: string,
  year: number,
  month: number,
): Promise<ResolvedDay[]> {
  const { shifts, scheduleEntries, scheduleConfig, leaveTypes, leaveRequests, holidays } = await getDb("shifts", "scheduleEntries", "scheduleConfig", "leaveTypes", "leaveRequests", "holidays");
  const shiftOf = (id?: string | null) => shifts.find((s) => s.id === id);
  const defaultShift = shiftOf(scheduleConfig.defaultShiftId);
  const hset = new Set(holidays.map((x) => x.date));
  const holidayName = new Map(holidays.map((x) => [x.date, x.name] as const));
  const overrides = new Map(
    scheduleEntries.filter((e) => e.employeeId === employeeId).map((e) => [e.date, e]),
  );
  // Phép đã DUYỆT → phủ lên các NGÀY LÀM VIỆC trong khoảng (bỏ qua lễ; nguồn sự thật là đơn nghỉ).
  const leaveByDate = new Map<string, string>(); // date → ghi chú hiển thị
  for (const r of leaveRequests) {
    if (r.employeeId !== employeeId || r.status !== "approved") continue;
    const tName = leaveTypes.find((t) => t.id === r.leaveTypeId)?.name ?? "Nghỉ phép";
    for (const date of eachWorkdayInRange(r.startDate, r.endDate, scheduleConfig.workingWeekdays, hset)) {
      leaveByDate.set(date, r.halfDay ? `${tName} (nửa ngày)` : tName);
    }
  }
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate(); // số ngày trong tháng
  const out: ResolvedDay[] = [];
  for (let d = 1; d <= days; d++) {
    const date = dateStr(year, month, d);
    const ov = overrides.get(date);
    // Ưu tiên: ngoại lệ thủ công > phép đã duyệt > ngày lễ > lịch hành chính nền.
    if (!ov && leaveByDate.has(date)) {
      out.push({ date, kind: "leave", note: leaveByDate.get(date), isOverride: false });
      continue;
    }
    if (!ov && hset.has(date)) {
      out.push({ date, kind: "holiday", note: holidayName.get(date), isOverride: false });
      continue;
    }
    if (ov) {
      const usesShift = ov.kind === "work" || ov.kind === "wfh" || ov.kind === "makeup";
      const hasCustom = !!(usesShift && ov.startTime && ov.endTime);
      out.push({
        date,
        kind: ov.kind,
        shift: usesShift && !hasCustom ? clone(shiftOf(ov.shiftId) ?? defaultShift) : undefined,
        customStart: hasCustom ? ov.startTime : undefined,
        customEnd: hasCustom ? ov.endTime : undefined,
        note: ov.note,
        isOverride: true,
      });
    } else {
      const isWorkday = scheduleConfig.workingWeekdays.includes(weekday(year, month, d));
      out.push({
        date,
        kind: isWorkday ? "work" : "off",
        shift: isWorkday ? clone(defaultShift) : undefined,
        isOverride: false,
      });
    }
  }
  return out;
}

/** Ghi đè/thêm ngoại lệ cho 1 ngày (upsert theo employeeId+date). */
export async function setScheduleEntry(input: Omit<ScheduleEntry, "id">): Promise<void> {
  const list = (await getDb("scheduleEntries")).scheduleEntries;
  const existing = list.find((e) => e.employeeId === input.employeeId && e.date === input.date);
  let entry: ScheduleEntry;
  if (existing) {
    Object.assign(existing, input, { id: existing.id });
    entry = existing;
  } else {
    entry = { ...input, id: nextId("sch") };
    list.push(entry);
  }
  await upsertRow("schedule_entries", entry.id, entry);
}

/** Xoá ngoại lệ → ngày đó quay về lịch hành chính nền. */
export async function clearScheduleEntry(employeeId: string, date: string): Promise<void> {
  const dbo = await getDb("scheduleEntries");
  const removed = dbo.scheduleEntries.filter((e) => e.employeeId === employeeId && e.date === date);
  dbo.scheduleEntries = dbo.scheduleEntries.filter(
    (e) => !(e.employeeId === employeeId && e.date === date),
  );
  await Promise.all(removed.map((e) => deleteRow("schedule_entries", e.id)));
}

// ============================ Nghỉ phép ============================
export async function listLeaveTypes(): Promise<LeaveType[]> {
  return clone((await getDb("leaveTypes")).leaveTypes);
}
export async function listLeaveRequests(filter?: { employeeId?: string; status?: string }): Promise<LeaveRequest[]> {
  let list = (await getDb("leaveRequests")).leaveRequests;
  if (filter?.employeeId) list = list.filter((r) => r.employeeId === filter.employeeId);
  if (filter?.status) list = list.filter((r) => r.status === filter.status);
  return clone(list);
}
export async function getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
  return clone((await getDb("leaveRequests")).leaveRequests.find((r) => r.id === id));
}

/** Đếm số ngày công của một khoảng nghỉ (chỉ ngày làm việc; nửa ngày = 0,5). */
export async function countLeaveDays(start: string, end: string, halfDay: boolean): Promise<number> {
  const dbo = await getDb("holidays", "scheduleConfig");
  const hset = new Set(dbo.holidays.map((x) => x.date));
  const n = eachWorkdayInRange(start, end, dbo.scheduleConfig.workingWeekdays, hset).length;
  if (halfDay && start === end) return n ? 0.5 : 0;
  return n;
}

export async function createLeaveRequest(
  input: Omit<LeaveRequest, "id" | "days" | "status" | "createdAt" | "decidedAt" | "decidedByName" | "decisionNote">,
): Promise<LeaveRequest> {
  const dbo = await getDb("leaveRequests");
  const days = await countLeaveDays(input.startDate, input.endDate, input.halfDay);
  const r: LeaveRequest = {
    ...input,
    id: nextId("lr"),
    days,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  dbo.leaveRequests.push(r);
  await upsertRow("leave_requests", r.id, r);
  return clone(r);
}

/**
 * Duyệt / từ chối đơn nghỉ — hỗ trợ DUYỆT NHIỀU CẤP.
 * Từ chối: kết thúc ngay. Duyệt: ghi 1 cấp; đủ số cấp cấu hình → "đã duyệt".
 * Một người không duyệt 2 lần cho cùng đơn (đảm bảo các cấp là người khác nhau).
 */
export async function decideLeaveRequest(
  id: string,
  decision: "approved" | "rejected",
  by?: { userId: string; name: string },
  note?: string,
): Promise<void> {
  const dbo = await getDb("leaveRequests", "approvalConfig");
  const r = dbo.leaveRequests.find((x) => x.id === id);
  if (!r || r.status !== "pending") return;
  const now = new Date().toISOString();
  const name = by?.name || "Quản trị hệ thống";

  if (decision === "rejected") {
    r.status = "rejected";
    r.decidedAt = now;
    r.decidedByName = name;
    r.decisionNote = note || undefined;
    await upsertRow("leave_requests", r.id, r);
    return;
  }

  const required = dbo.approvalConfig.leaveLevels || 1;
  r.approvals = r.approvals ?? [];
  if (by?.userId && r.approvals.some((a) => a.byUserId === by.userId)) return; // đã duyệt cấp trước rồi
  r.approvals.push({ level: r.approvals.length + 1, byUserId: by?.userId ?? "", byName: name, at: now });
  if (r.approvals.length >= required) {
    r.status = "approved";
    r.decidedAt = now;
    r.decidedByName = name;
  }
  await upsertRow("leave_requests", r.id, r);
}

/** Cấu hình quy trình duyệt. */
export async function getApprovalConfig(): Promise<{ leaveLevels: number }> {
  return clone((await getDb("approvalConfig")).approvalConfig);
}
export async function setLeaveApprovalLevels(n: number): Promise<void> {
  const dbo = await getDb("approvalConfig");
  dbo.approvalConfig.leaveLevels = Math.max(1, Math.min(3, Math.round(n)));
  await setConfig("approval_config", dbo.approvalConfig);
}

/** Cập nhật cấu hình chung của tập đoàn (giữ nguyên id/code). */
export async function updateGroup(patch: Partial<Group>): Promise<void> {
  const grp = (await getDb("group")).group;
  Object.assign(grp, patch, { id: grp.id, code: grp.code });
  await setConfig("group", grp);
}

/** Huỷ đơn (người gửi rút đơn chờ, hoặc thu hồi đơn đã duyệt). */
export async function cancelLeaveRequest(id: string): Promise<void> {
  const r = (await getDb("leaveRequests")).leaveRequests.find((x) => x.id === id);
  if (!r || r.status === "rejected" || r.status === "cancelled") return;
  r.status = "cancelled";
  await upsertRow("leave_requests", r.id, r);
}

/** Số dư quỹ phép năm của 1 nhân viên trong 1 năm. */
export async function getLeaveBalance(employeeId: string, year: number): Promise<LeaveBalance> {
  const dbo = await getDb("employees", "leaveTypes", "leaveRequests");
  const emp = dbo.employees.find((e) => e.id === employeeId);
  const annualType = dbo.leaveTypes.find((t) => t.code === "ANNUAL");
  // Quota: 12 ngày + 1 ngày mỗi 5 năm thâm niên; năm đầu tính theo tỷ lệ tháng còn lại.
  let quota = 12;
  const joinYear = emp?.joinDate ? Number(emp.joinDate.slice(0, 4)) : year;
  const joinMonth = emp?.joinDate ? Number(emp.joinDate.slice(5, 7)) : 1;
  if (joinYear < year) {
    quota = 12 + Math.floor((year - joinYear) / 5);
  } else if (joinYear === year) {
    quota = Math.ceil((12 * (12 - (joinMonth - 1))) / 12); // theo số tháng làm trong năm
  } else {
    quota = 0; // chưa vào làm
  }
  const annualReqs = dbo.leaveRequests.filter(
    (r) => r.employeeId === employeeId && r.leaveTypeId === annualType?.id && r.startDate.startsWith(String(year)),
  );
  const used = annualReqs.filter((r) => r.status === "approved").reduce((s, r) => s + r.days, 0);
  const pending = annualReqs.filter((r) => r.status === "pending").reduce((s, r) => s + r.days, 0);
  return { employeeId, year, quota, used, pending, remaining: quota - used - pending };
}

/** Số ngày NGHỈ KHÔNG LƯƠNG đã duyệt của 1 NV trong tháng (yyyy-mm); chỉ ngày làm việc. */
// Lõi THUẦN (đọc dữ liệu ĐÃ nạp sẵn trong `dbo`) — dùng chung cho hàm async 1 nhân viên
// và cho loadPayrollMonth (tính cả bảng từ 1 lượt nạp, an toàn subrequest trên Workers).
function unpaidLeaveDaysOf(dbo: DB, employeeId: string, ym: string): number {
  const { leaveRequests, leaveTypes, scheduleConfig } = dbo;
  const unpaidTypeIds = new Set(leaveTypes.filter((t) => !t.paid).map((t) => t.id));
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return 0;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthStart = `${ym}-01`;
  const monthEnd = `${ym}-${pad(last)}`;
  let total = 0;
  const hset = new Set(dbo.holidays.map((x) => x.date));
  for (const r of leaveRequests) {
    if (r.employeeId !== employeeId || r.status !== "approved") continue;
    if (!unpaidTypeIds.has(r.leaveTypeId)) continue;
    const s = r.startDate > monthStart ? r.startDate : monthStart;
    const e = r.endDate < monthEnd ? r.endDate : monthEnd;
    if (s > e) continue;
    const wd = eachWorkdayInRange(s, e, scheduleConfig.workingWeekdays, hset).length;
    total += r.halfDay && r.startDate === r.endDate ? (wd ? 0.5 : 0) : wd;
  }
  return total;
}
export async function getUnpaidLeaveDays(employeeId: string, ym: string): Promise<number> {
  return unpaidLeaveDaysOf(await getDb("leaveRequests", "leaveTypes", "scheduleConfig", "holidays"), employeeId, ym);
}

/** Số ngày công chuẩn của tháng (số ngày làm việc theo lịch hành chính nền). */
export async function standardWorkdaysInMonth(ym: string): Promise<number> {
  await ensure("scheduleConfig", "holidays"); // holidaySet() đọc db().holidays
  const { scheduleConfig } = db();
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return 22;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return eachWorkdayInRange(`${ym}-01`, `${ym}-${pad(last)}`, scheduleConfig.workingWeekdays, holidaySet()).length;
}

// ============================ Tài khoản đăng nhập ============================
export async function getUserByEmployee(employeeId: string): Promise<UserAccount | undefined> {
  return clone((await getDb("users")).users.find((u) => u.employeeId === employeeId));
}
export async function createUser(input: Omit<UserAccount, "id">): Promise<UserAccount> {
  const dbo = await getDb("users");
  const u: UserAccount = { ...input, id: nextId("user") };
  dbo.users.push(u);
  await upsertRow("app_users", u.id, u);
  return clone(u);
}
export async function createAssignment(input: Omit<RoleAssignment, "id">): Promise<RoleAssignment> {
  const dbo = await getDb("assignments");
  const a: RoleAssignment = { ...input, id: nextId("asg") };
  dbo.assignments.push(a);
  await upsertRow("role_assignments", a.id, a);
  return clone(a);
}

/** Gán/đổi vai trò + phạm vi cho MỘT người dùng (mỗi user chỉ 1 assignment). Upsert theo userId. */
export async function setUserAssignment(input: {
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeEntityId?: string | null;
  scopeDepartmentId?: string | null;
}): Promise<RoleAssignment> {
  const dbo = await getDb("assignments");
  // Phạm vi chỉ giữ id liên quan tới loại scope (tránh dữ liệu thừa).
  const scopeEntityId = undefined;
  const scopeDepartmentId = input.scopeType === "DEPARTMENT" ? input.scopeDepartmentId || undefined : undefined;
  const cur = dbo.assignments.find((a) => a.userId === input.userId);
  if (cur) {
    cur.roleId = input.roleId;
    cur.scopeType = input.scopeType;
    cur.scopeEntityId = scopeEntityId;
    cur.scopeDepartmentId = scopeDepartmentId;
    await upsertRow("role_assignments", cur.id, cur);
    return clone(cur);
  }
  return createAssignment({ userId: input.userId, roleId: input.roleId, scopeType: input.scopeType, scopeEntityId, scopeDepartmentId });
}

/** Gỡ toàn bộ assignment của một người dùng (về trạng thái chưa gán vai trò). */
export async function removeUserAssignment(userId: string): Promise<void> {
  const dbo = await getDb("assignments");
  const victims = dbo.assignments.filter((a) => a.userId === userId);
  if (!victims.length) return;
  dbo.assignments = dbo.assignments.filter((a) => a.userId !== userId);
  await Promise.all(victims.map((a) => deleteRow("role_assignments", a.id)));
}

/** Chuẩn hoá số điện thoại VN để so khớp (bỏ ký tự thừa, +84/84 → 0). */
function normPhone(s?: string | null): string {
  let d = (s ?? "").replace(/\D/g, "");
  if (d.startsWith("84")) d = "0" + d.slice(2);
  return d;
}

/** Đổi mật khẩu của một tài khoản và TẮT cờ buộc đổi (người dùng đã tự đặt). */
export async function updateUserPassword(userId: string, newPassword: string): Promise<void> {
  const u = (await getDb("users")).users.find((x) => x.id === userId);
  if (u) {
    u.password = newPassword;
    u.mustChangePassword = false;
    await upsertRow("app_users", u.id, u);
  }
}

/** Cập nhật vài trường tài khoản (dùng cho luồng Supabase Auth: cờ buộc đổi, authUserId). */
export async function patchUserAccount(
  userId: string,
  patch: Partial<Pick<UserAccount, "mustChangePassword" | "authUserId" | "password">>,
): Promise<void> {
  const u = (await getDb("users")).users.find((x) => x.id === userId);
  if (u) {
    Object.assign(u, patch);
    await upsertRow("app_users", u.id, u);
  }
}

/** HR đặt lại mật khẩu tạm cho tài khoản → BẬT cờ buộc đổi ở lần đăng nhập kế tiếp. */
export async function resetUserPassword(userId: string, tempPassword: string): Promise<void> {
  const u = (await getDb("users")).users.find((x) => x.id === userId);
  if (u) {
    u.password = tempPassword;
    u.mustChangePassword = true;
    await upsertRow("app_users", u.id, u);
  }
}

/**
 * Tìm tài khoản để KHÔI PHỤC mật khẩu: khớp email đăng nhập + đúng số điện thoại
 * đã đăng ký trên hồ sơ nhân viên. (Chế độ dev — khi nối Supabase sẽ thay bằng OTP SMS thật.)
 */
export async function findUserForRecovery(email: string, phone: string): Promise<UserAccount | undefined> {
  const dbo = await getDb("users", "employees");
  const u = dbo.users.find(
    (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.isActive,
  );
  if (!u || !u.employeeId) return undefined;
  const emp = dbo.employees.find((e) => e.id === u.employeeId);
  if (!emp) return undefined;
  const want = normPhone(phone);
  if (!want || normPhone(emp.phone) !== want) return undefined;
  return clone(u);
}

// ============================ Đánh giá KPI ============================
export async function listReviewCycles(): Promise<ReviewCycle[]> {
  return clone((await getDb("reviewCycles")).reviewCycles);
}
export async function getReviewCycle(id: string): Promise<ReviewCycle | undefined> {
  return clone((await getDb("reviewCycles")).reviewCycles.find((c) => c.id === id));
}

// finalScore luôn suy ra từ items để nhất quán với điểm đã chấm.
const withScore = (r: PerformanceReview): PerformanceReview => ({
  ...r,
  finalScore: computeFinalScore(r.items),
});

export async function listReviews(cycleId?: string): Promise<PerformanceReview[]> {
  const all = (await getDb("reviews")).reviews.filter((r) => (cycleId ? r.cycleId === cycleId : true));
  return clone(all.map(withScore));
}
export async function getReview(id: string): Promise<PerformanceReview | undefined> {
  const r = (await getDb("reviews")).reviews.find((x) => x.id === id);
  return r ? clone(withScore(r)) : undefined;
}

/** Lưu điểm chấm của quản lý cho 1 bản đánh giá. */
export async function saveReview(
  id: string,
  input: {
    scores: Record<string, number | undefined>;
    comments: Record<string, string | undefined>;
    managerComment?: string;
    managerName?: string;
    finalize: boolean;
  },
): Promise<void> {
  const r = (await getDb("reviews")).reviews.find((x) => x.id === id);
  if (!r) return;
  for (const it of r.items) {
    const sc = input.scores[it.id];
    if (sc != null && sc >= 1 && sc <= 5) it.score = sc;
    if (input.comments[it.id] !== undefined) it.comment = input.comments[it.id] || undefined;
  }
  if (input.managerComment !== undefined) r.managerComment = input.managerComment || undefined;
  if (input.managerName) r.managerName = input.managerName;
  r.finalScore = computeFinalScore(r.items);
  const allScored = r.items.every((i) => i.score != null);
  r.status = input.finalize && allScored ? "finalized" : "manager";
  await upsertRow("reviews", r.id, r);
}

// ============================ Tuyển dụng (ATS) ============================
export async function listJobOpenings(entityId?: string): Promise<JobOpening[]> {
  const all = (await getDb("jobOpenings")).jobOpenings;
  return clone(entityId ? all.filter((o) => o.legalEntityId === entityId) : all);
}
export async function getJobOpening(id: string): Promise<JobOpening | undefined> {
  return clone((await getDb("jobOpenings")).jobOpenings.find((o) => o.id === id));
}
export async function createJobOpening(input: Omit<JobOpening, "id">): Promise<JobOpening> {
  const dbo = await getDb("jobOpenings");
  const o: JobOpening = { ...input, id: nextId("jo") };
  dbo.jobOpenings.push(o);
  await upsertRow("job_openings", o.id, o);
  return clone(o);
}
export async function updateJobOpening(id: string, patch: Partial<JobOpening>): Promise<void> {
  const o = (await getDb("jobOpenings")).jobOpenings.find((x) => x.id === id);
  if (o) {
    Object.assign(o, patch, { id: o.id });
    await upsertRow("job_openings", o.id, o);
  }
}

export async function listCandidates(openingId?: string): Promise<Candidate[]> {
  const all = (await getDb("candidates")).candidates;
  return clone(openingId ? all.filter((c) => c.openingId === openingId) : all);
}
export async function getCandidate(id: string): Promise<Candidate | undefined> {
  return clone((await getDb("candidates")).candidates.find((c) => c.id === id));
}
export async function createCandidate(input: Omit<Candidate, "id" | "stage">): Promise<Candidate> {
  const dbo = await getDb("candidates");
  const c: Candidate = { ...input, id: nextId("cd"), stage: "applied" };
  dbo.candidates.push(c);
  await upsertRow("candidates", c.id, c);
  return clone(c);
}
export async function setCandidateStage(id: string, stage: Candidate["stage"]): Promise<void> {
  const c = (await getDb("candidates")).candidates.find((x) => x.id === id);
  if (c) {
    c.stage = stage;
    await upsertRow("candidates", c.id, c);
  }
}

// ---- Phỏng vấn ----
export async function listInterviews(candidateId: string): Promise<Interview[]> {
  return clone((await getDb("interviews")).interviews.filter((i) => i.candidateId === candidateId).sort((a, b) => a.round - b.round));
}
export async function createInterview(input: Omit<Interview, "id" | "result">): Promise<void> {
  const dbo = await getDb("interviews");
  const iv: Interview = { ...input, id: nextId("iv"), result: "pending" };
  dbo.interviews.push(iv);
  await upsertRow("interviews", iv.id, iv);
}
export async function setInterviewResult(
  id: string,
  result: Interview["result"],
  extra?: { score?: number; note?: string },
): Promise<void> {
  const iv = (await getDb("interviews")).interviews.find((x) => x.id === id);
  if (!iv) return;
  iv.result = result;
  if (extra?.score != null) iv.score = extra.score;
  if (extra?.note !== undefined) iv.note = extra.note || undefined;
  await upsertRow("interviews", iv.id, iv);
}
export async function deleteInterview(id: string): Promise<void> {
  const dbo = await getDb("interviews");
  dbo.interviews = dbo.interviews.filter((i) => i.id !== id);
  await deleteRow("interviews", id);
}

// ---- Onboarding ----
export async function listOnboarding(candidateId: string): Promise<OnboardingTask[]> {
  return clone((await getDb("onboarding")).onboarding.filter((t) => t.candidateId === candidateId).sort((a, b) => a.order - b.order));
}
/** Sinh checklist hội nhập theo mẫu nếu ứng viên chưa có. */
export async function ensureOnboarding(candidateId: string): Promise<void> {
  const dbo = await getDb("onboarding");
  if (dbo.onboarding.some((t) => t.candidateId === candidateId)) return;
  const tasks: OnboardingTask[] = ONBOARDING_TEMPLATE.map((label, i) => ({
    id: nextId("ob"), candidateId, label, done: false, order: i,
  }));
  dbo.onboarding.push(...tasks);
  await Promise.all(tasks.map((t) => upsertRow("onboarding", t.id, t)));
}
export async function toggleOnboarding(id: string, done: boolean): Promise<void> {
  const t = (await getDb("onboarding")).onboarding.find((x) => x.id === id);
  if (t) {
    t.done = done;
    await upsertRow("onboarding", t.id, t);
  }
}

/**
 * Tuyển ứng viên → tạo hồ sơ nhân viên (kế thừa dữ liệu, không nhập lại),
 * gắn ứng viên với NV, chuyển sang "đã nhận việc" và sinh checklist hội nhập.
 * Trả về id nhân viên (mới hoặc đã có).
 */
export async function convertCandidateToEmployee(candidateId: string): Promise<string | undefined> {
  const dbo = await getDb("candidates", "jobOpenings", "employees");
  const c = dbo.candidates.find((x) => x.id === candidateId);
  if (!c) return undefined;
  if (c.employeeId) return c.employeeId; // đã tuyển rồi
  const o = dbo.jobOpenings.find((j) => j.id === c.openingId);
  if (!o) return undefined;
  const code = await nextEmployeeCode();
  const emp: Employee = {
    id: nextId("emp"),
    legalEntityId: o.legalEntityId,
    departmentId: o.departmentId ?? null,
    jobTitleId: o.jobTitleId ?? null,
    code,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    status: "probation",
    employmentType: "fulltime",
    joinDate: new Date().toISOString().slice(0, 10),
  };
  dbo.employees.push(emp);
  c.employeeId = emp.id;
  c.stage = "hired";
  await Promise.all([
    upsertRow("employees", emp.id, emp), // nhân viên (GĐ1)
    upsertRow("candidates", c.id, c), // ứng viên đã chuyển trạng thái → đã tuyển
  ]);
  await ensureOnboarding(candidateId);
  return emp.id;
}

// ============================ Người phụ thuộc ============================
/** Đồng bộ employee.dependents = số NPT ĐÃ đăng ký giảm trừ (nguồn cho thuế TNCN). */
async function syncDependentCount(employeeId: string) {
  const dbo = await getDb("employees", "dependents");
  const emp = dbo.employees.find((e) => e.id === employeeId);
  if (emp) {
    emp.dependents = dbo.dependents.filter((d) => d.employeeId === employeeId && d.taxRegistered).length;
    await upsertRow("employees", emp.id, emp); // số NPT ảnh hưởng tính lương → lưu lại
  }
}
export async function listDependents(employeeId: string): Promise<Dependent[]> {
  return clone((await getDb("dependents")).dependents.filter((d) => d.employeeId === employeeId));
}
export async function createDependent(input: Omit<Dependent, "id">): Promise<void> {
  const dbo = await getDb("dependents");
  const dep: Dependent = { ...input, id: nextId("dep") };
  dbo.dependents.push(dep);
  await upsertRow("dependents", dep.id, dep);
  await syncDependentCount(input.employeeId);
}
export async function deleteDependent(id: string): Promise<void> {
  const dbo = await getDb("dependents");
  const dep = dbo.dependents.find((d) => d.id === id);
  if (!dep) return;
  dbo.dependents = dbo.dependents.filter((d) => d.id !== id);
  await deleteRow("dependents", id);
  await syncDependentCount(dep.employeeId);
}

// ============================ Tự đánh giá KPI (nhân viên) ============================
/** Nhân viên tự chấm điểm + ghi nhận xét cho bản đánh giá của chính mình. */
export async function saveSelfReview(
  id: string,
  input: { selfScores: Record<string, number | undefined>; selfComment?: string },
): Promise<void> {
  const r = (await getDb("reviews")).reviews.find((x) => x.id === id);
  if (!r || r.status === "finalized") return;
  for (const it of r.items) {
    const sc = input.selfScores[it.id];
    if (sc != null && sc >= 1 && sc <= 5) it.selfScore = sc;
  }
  if (input.selfComment !== undefined) r.selfComment = input.selfComment || undefined;
  // Lần đầu tự đánh giá → chuyển trạng thái sang "NV tự đánh giá".
  if (r.status === "pending") r.status = "self";
  await upsertRow("reviews", r.id, r);
}

// ============================ Nhật ký thao tác (AuditLog) ============================
export async function addAuditLog(entry: { userName: string; action: string; module: string; detail?: string }): Promise<void> {
  const dbo = await getDb("auditLogs");
  const log: AuditLog = { ...entry, id: nextId("au"), at: new Date().toISOString() };
  dbo.auditLogs.unshift(log);
  if (dbo.auditLogs.length > 1000) dbo.auditLogs.length = 1000; // chặn phình bộ nhớ
  await upsertRow("audit_logs", log.id, log);
}
export async function listAuditLogs(limit = 200): Promise<AuditLog[]> {
  return clone(
    [...(await getDb("auditLogs")).auditLogs].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit),
  );
}

// ============================ Thông báo (Notification) ============================
export async function createNotification(userId: string, payload: { title: string; body?: string; href?: string }): Promise<void> {
  if (!userId) return;
  const dbo = await getDb("notifications");
  const n: Notification = { id: nextId("nt"), userId, ...payload, createdAt: new Date().toISOString(), read: false };
  dbo.notifications.unshift(n);
  await upsertRow("notifications", n.id, n);
}
export async function listNotifications(userId: string): Promise<Notification[]> {
  return clone(
    (await getDb("notifications")).notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  );
}
export async function unreadNotificationCount(userId: string): Promise<number> {
  return (await getDb("notifications")).notifications.filter((n) => n.userId === userId && !n.read).length;
}
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const dbo = await getDb("notifications");
  const changed = dbo.notifications.filter((n) => n.userId === userId && !n.read);
  changed.forEach((n) => (n.read = true));
  await Promise.all(changed.map((n) => upsertRow("notifications", n.id, n)));
}
export async function markNotificationRead(id: string): Promise<void> {
  const n = (await getDb("notifications")).notifications.find((x) => x.id === id);
  if (n) {
    n.read = true;
    await upsertRow("notifications", n.id, n);
  }
}
/** id tài khoản gắn với 1 nhân viên (để gửi thông báo cho chính chủ). */
export async function userIdOfEmployee(employeeId: string): Promise<string | undefined> {
  return (await getDb("users")).users.find((u) => u.employeeId === employeeId)?.id;
}

function deptSubtree(rootId: string): Set<string> {
  const all = db().departments;
  const out = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const c of all.filter((d) => d.parentId === id)) {
      if (!out.has(c.id)) { out.add(c.id); stack.push(c.id); }
    }
  }
  return out;
}
/** Các tài khoản có `permission` và phạm vi BAO PHỦ nhân viên này (vd người duyệt đơn). */
export async function approverUserIds(employeeId: string, permission: string): Promise<string[]> {
  const { users, assignments, roles, employees } = await getDb("users", "assignments", "roles", "employees", "departments");
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return [];
  const result = new Set<string>();
  for (const a of assignments) {
    const role = roles.find((r) => r.id === a.roleId);
    if (!role || !role.permissions.includes(permission)) continue;
    let inScope = false;
    if (a.scopeType === "GROUP") inScope = true;
    else if (a.scopeType === "DEPARTMENT" && a.scopeDepartmentId)
      inScope = !!emp.departmentId && deptSubtree(a.scopeDepartmentId).has(emp.departmentId);
    else if (a.scopeType === "SELF")
      inScope = users.find((u) => u.id === a.userId)?.employeeId === employeeId;
    if (inScope) result.add(a.userId);
  }
  return [...result];
}

// ============================ Kỳ lương (chốt/mở) ============================
export async function getPayrollPeriod(ym: string): Promise<PayrollPeriod | undefined> {
  return clone((await getDb("payrollPeriods")).payrollPeriods.find((p) => p.ym === ym));
}
export async function setPayrollPeriodStatus(ym: string, status: PayrollPeriod["status"], byName?: string): Promise<void> {
  const dbo = await getDb("payrollPeriods");
  let p = dbo.payrollPeriods.find((x) => x.ym === ym);
  if (!p) { p = { id: nextId("pp"), ym, status }; dbo.payrollPeriods.push(p); }
  p.status = status;
  if (status === "closed") { p.closedAt = new Date().toISOString(); p.closedByName = byName; }
  else { p.closedAt = undefined; p.closedByName = undefined; }
  await upsertRow("payroll_periods", p.id, p);
}
/** Điều chỉnh thưởng(+)/kỷ luật(−) trong tháng ym của 1 nhân viên (VND). */
function rewardAdjustmentOf(dbo: DB, employeeId: string, ym: string): number {
  return dbo.rewards
    .filter((r) => r.employeeId === employeeId && r.date.startsWith(ym) && r.amount)
    .reduce((s, r) => s + (r.kind === "reward" ? (r.amount as number) : -(r.amount as number)), 0);
}
export async function getRewardAdjustment(employeeId: string, ym: string): Promise<number> {
  return rewardAdjustmentOf(await getDb("rewards"), employeeId, ym);
}

// ============================ Phúc lợi (Benefit) ============================
export async function listBenefits(): Promise<Benefit[]> {
  return clone((await getDb("benefits")).benefits);
}
export async function createBenefit(input: Omit<Benefit, "id">): Promise<void> {
  const dbo = await getDb("benefits");
  const b: Benefit = { ...input, id: nextId("bn") };
  dbo.benefits.push(b);
  await upsertRow("benefits", b.id, b);
}
export async function toggleBenefit(id: string, isActive: boolean): Promise<void> {
  const b = (await getDb("benefits")).benefits.find((x) => x.id === id);
  if (b) {
    b.isActive = isActive;
    await upsertRow("benefits", b.id, b);
  }
}
export async function deleteBenefit(id: string): Promise<void> {
  const dbo = await getDb("benefitEnrollments", "benefits");
  const enrollIds = dbo.benefitEnrollments.filter((e) => e.benefitId === id).map((e) => e.id);
  dbo.benefits = dbo.benefits.filter((b) => b.id !== id);
  dbo.benefitEnrollments = dbo.benefitEnrollments.filter((e) => e.benefitId !== id);
  await Promise.all([
    deleteRow("benefits", id),
    ...enrollIds.map((eid) => deleteRow("benefit_enrollments", eid)),
  ]);
}
export async function listBenefitEnrollments(filter?: { benefitId?: string; employeeId?: string }): Promise<BenefitEnrollment[]> {
  let list = (await getDb("benefitEnrollments")).benefitEnrollments;
  if (filter?.benefitId) list = list.filter((e) => e.benefitId === filter.benefitId);
  if (filter?.employeeId) list = list.filter((e) => e.employeeId === filter.employeeId);
  return clone(list);
}
export async function enrollBenefit(input: { benefitId: string; employeeId: string; startDate: string; note?: string }): Promise<void> {
  const dbo = await getDb("benefitEnrollments");
  if (dbo.benefitEnrollments.some((e) => e.benefitId === input.benefitId && e.employeeId === input.employeeId)) return;
  const be: BenefitEnrollment = { ...input, id: nextId("be") };
  dbo.benefitEnrollments.push(be);
  await upsertRow("benefit_enrollments", be.id, be);
}
export async function removeBenefitEnrollment(id: string): Promise<void> {
  const dbo = await getDb("benefitEnrollments");
  dbo.benefitEnrollments = dbo.benefitEnrollments.filter((e) => e.id !== id);
  await deleteRow("benefit_enrollments", id);
}

// ============================ Làm thêm giờ (Overtime) ============================
export async function listOvertime(filter?: { employeeId?: string; status?: string }): Promise<OvertimeRequest[]> {
  let list = [...(await getDb("overtimes")).overtimes].sort((a, b) => b.date.localeCompare(a.date));
  if (filter?.employeeId) list = list.filter((o) => o.employeeId === filter.employeeId);
  if (filter?.status) list = list.filter((o) => o.status === filter.status);
  return clone(list);
}
export async function createOvertime(input: Omit<OvertimeRequest, "id" | "status" | "createdAt" | "decidedByName" | "decidedAt">): Promise<void> {
  const dbo = await getDb("overtimes");
  const o: OvertimeRequest = { ...input, id: nextId("ot"), status: "pending", createdAt: new Date().toISOString() };
  dbo.overtimes.push(o);
  await upsertRow("overtimes", o.id, o);
}
export async function decideOvertime(id: string, decision: "approved" | "rejected", byName?: string): Promise<OvertimeRequest | null> {
  const o = (await getDb("overtimes")).overtimes.find((x) => x.id === id);
  if (!o || o.status !== "pending") return null;
  o.status = decision;
  o.decidedByName = byName || "Quản trị hệ thống";
  o.decidedAt = new Date().toISOString();
  await upsertRow("overtimes", o.id, o);
  return clone(o);
}
export async function cancelOvertime(id: string): Promise<void> {
  const o = (await getDb("overtimes")).overtimes.find((x) => x.id === id);
  if (o && (o.status === "pending" || o.status === "approved")) {
    o.status = "cancelled";
    await upsertRow("overtimes", o.id, o);
  }
}
/** Tiền làm thêm giờ ĐÃ DUYỆT trong tháng ym của 1 nhân viên (VND). */
function overtimePayOf(dbo: DB, employeeId: string, ym: string): number {
  const emp = dbo.employees.find((e) => e.id === employeeId);
  if (!emp) return 0;
  const gross = (emp.baseSalary ?? 0) + (emp.allowance ?? 0);
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return 0;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const hset = new Set(dbo.holidays.map((x) => x.date));
  const stdDays = eachWorkdayInRange(`${ym}-01`, `${ym}-${pad(last)}`, dbo.scheduleConfig.workingWeekdays, hset).length;
  const hourly = stdDays ? gross / (stdDays * 8) : 0;
  return Math.round(
    dbo.overtimes
      .filter((o) => o.employeeId === employeeId && o.status === "approved" && o.date.startsWith(ym))
      .reduce((s, o) => s + hourly * o.hours * o.multiplier, 0),
  );
}
export async function getOvertimePay(employeeId: string, ym: string): Promise<number> {
  return overtimePayOf(await getDb("employees", "holidays", "scheduleConfig", "overtimes"), employeeId, ym);
}

/**
 * Nạp MỘT LẦN toàn bộ dữ liệu cần cho bảng lương kỳ `ym` (đúng 1 lượt getDb) rồi cho phép
 * tính từng nhân viên TẠI BỘ NHỚ. Dành cho Route Handler xuất Excel: ở đó React cache()
 * KHÔNG thiết lập phạm vi theo-request nên gọi getDb trong vòng lặp sẽ kéo lại bảng mỗi lần
 * và vượt giới hạn 50 subrequest/invocation của Cloudflare Workers.
 */
export async function loadPayrollMonth(ym: string): Promise<{
  employees: Employee[];
  entities: LegalEntity[];
  standardDays: number;
  metricsOf: (employeeId: string) => { unpaidDays: number; rewardAdj: number; overtimePay: number };
}> {
  const dbo = await getDb(
    "employees", "entities", "leaveRequests", "leaveTypes",
    "scheduleConfig", "holidays", "rewards", "overtimes",
  );
  const [y, m] = ym.split("-").map(Number);
  const standardDays = y && m
    ? eachWorkdayInRange(
        `${ym}-01`,
        `${ym}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`,
        dbo.scheduleConfig.workingWeekdays,
        new Set(dbo.holidays.map((x) => x.date)),
      ).length
    : 22;
  return {
    employees: clone(dbo.employees),
    entities: clone(dbo.entities),
    standardDays,
    metricsOf: (employeeId: string) => ({
      unpaidDays: unpaidLeaveDaysOf(dbo, employeeId, ym),
      rewardAdj: rewardAdjustmentOf(dbo, employeeId, ym),
      overtimePay: overtimePayOf(dbo, employeeId, ym),
    }),
  };
}

// ============================ WRITE (Vai trò / quyền) ============================
export async function setRolePermission(roleId: string, code: string, on: boolean): Promise<void> {
  const r = (await getDb("roles")).roles.find((x) => x.id === roleId);
  if (!r) return;
  const has = r.permissions.includes(code);
  if (on && !has) r.permissions.push(code);
  if (!on && has) r.permissions = r.permissions.filter((c) => c !== code);
  await upsertRow("roles", r.id, r);
}
export async function createRole(input: { code: string; name: string; description?: string }): Promise<Role> {
  const dbo = await getDb("roles");
  const r: Role = { id: nextId("role"), isSystem: false, permissions: [], ...input };
  dbo.roles.push(r);
  await upsertRow("roles", r.id, r);
  return clone(r);
}

// ============================ Ngày lễ ============================
export async function listHolidays(year?: number): Promise<Holiday[]> {
  const all = [...(await getDb("holidays")).holidays].sort((a, b) => a.date.localeCompare(b.date));
  return clone(year ? all.filter((h) => h.date.startsWith(String(year))) : all);
}
export async function createHoliday(input: Omit<Holiday, "id">): Promise<Holiday> {
  const dbo = await getDb("holidays");
  const h: Holiday = { ...input, id: nextId("hol") };
  dbo.holidays.push(h);
  await upsertRow("holidays", h.id, h);
  return clone(h);
}
export async function deleteHoliday(id: string): Promise<void> {
  const dbo = await getDb("holidays");
  dbo.holidays = dbo.holidays.filter((h) => h.id !== id);
  await deleteRow("holidays", id);
}

// ============================ Phụ cấp & Khấu trừ ============================
export async function listPayItems(): Promise<PayItem[]> {
  return clone((await getDb("payItems")).payItems);
}
export async function getPayItem(id: string): Promise<PayItem | undefined> {
  return clone((await getDb("payItems")).payItems.find((p) => p.id === id));
}
export async function createPayItem(input: Omit<PayItem, "id">): Promise<PayItem> {
  const dbo = await getDb("payItems");
  const p: PayItem = { ...input, id: nextId("pi") };
  dbo.payItems.push(p);
  await upsertRow("pay_items", p.id, p);
  return clone(p);
}
export async function updatePayItem(id: string, patch: Partial<PayItem>): Promise<void> {
  const p = (await getDb("payItems")).payItems.find((x) => x.id === id);
  if (p) {
    Object.assign(p, patch, { id: p.id });
    await upsertRow("pay_items", p.id, p);
  }
}
export async function deletePayItem(id: string): Promise<void> {
  const dbo = await getDb("payItems");
  dbo.payItems = dbo.payItems.filter((p) => p.id !== id);
  await deleteRow("pay_items", id);
}

// ============================ Hợp đồng lao động ============================
export async function listContracts(employeeId?: string): Promise<Contract[]> {
  const all = (await getDb("contracts")).contracts;
  return clone(employeeId ? all.filter((c) => c.employeeId === employeeId) : all);
}
export async function getContract(id: string): Promise<Contract | undefined> {
  return clone((await getDb("contracts")).contracts.find((c) => c.id === id));
}
export async function createContract(input: Omit<Contract, "id">): Promise<Contract> {
  const dbo = await getDb("contracts");
  const c: Contract = { ...input, id: nextId("ct") };
  dbo.contracts.push(c);
  await upsertRow("contracts", c.id, c);
  return clone(c);
}
export async function updateContract(id: string, patch: Partial<Contract>): Promise<void> {
  const c = (await getDb("contracts")).contracts.find((x) => x.id === id);
  if (c) {
    Object.assign(c, patch, { id: c.id });
    await upsertRow("contracts", c.id, c);
  }
}
export async function deleteContract(id: string): Promise<void> {
  const dbo = await getDb("contracts");
  dbo.contracts = dbo.contracts.filter((c) => c.id !== id);
  await deleteRow("contracts", id);
}

// ============================ Khen thưởng – Kỷ luật ============================
export async function listRewards(employeeId?: string): Promise<RewardDiscipline[]> {
  const all = [...(await getDb("rewards")).rewards].sort((a, b) => b.date.localeCompare(a.date));
  return clone(employeeId ? all.filter((r) => r.employeeId === employeeId) : all);
}
export async function createReward(input: Omit<RewardDiscipline, "id">): Promise<RewardDiscipline> {
  const dbo = await getDb("rewards");
  const r: RewardDiscipline = { ...input, id: nextId("rd") };
  dbo.rewards.push(r);
  await upsertRow("rewards", r.id, r);
  return clone(r);
}
export async function deleteReward(id: string): Promise<void> {
  const dbo = await getDb("rewards");
  dbo.rewards = dbo.rewards.filter((r) => r.id !== id);
  await deleteRow("rewards", id);
}

// ============================ Tài sản ============================
export async function listAssets(): Promise<Asset[]> {
  return clone((await getDb("assets")).assets);
}
export async function getAsset(id: string): Promise<Asset | undefined> {
  return clone((await getDb("assets")).assets.find((a) => a.id === id));
}
export async function createAsset(input: Omit<Asset, "id">): Promise<Asset> {
  const dbo = await getDb("assets");
  const a: Asset = { ...input, id: nextId("as") };
  dbo.assets.push(a);
  await upsertRow("assets", a.id, a);
  return clone(a);
}
export async function updateAsset(id: string, patch: Partial<Asset>): Promise<void> {
  const a = (await getDb("assets")).assets.find((x) => x.id === id);
  if (a) {
    Object.assign(a, patch, { id: a.id });
    await upsertRow("assets", a.id, a);
  }
}
export async function deleteAsset(id: string): Promise<void> {
  const dbo = await getDb("allocations", "assets");
  const allocIds = dbo.allocations.filter((al) => al.assetId === id).map((al) => al.id);
  dbo.assets = dbo.assets.filter((a) => a.id !== id);
  dbo.allocations = dbo.allocations.filter((al) => al.assetId !== id);
  await Promise.all([
    deleteRow("assets", id),
    ...allocIds.map((aid) => deleteRow("allocations", aid)),
  ]);
}
export async function listAllocations(filter?: { assetId?: string; employeeId?: string; openOnly?: boolean }): Promise<AssetAllocation[]> {
  let list = (await getDb("allocations")).allocations;
  if (filter?.assetId) list = list.filter((a) => a.assetId === filter.assetId);
  if (filter?.employeeId) list = list.filter((a) => a.employeeId === filter.employeeId);
  if (filter?.openOnly) list = list.filter((a) => !a.returnedDate);
  return clone(list);
}
/** Cấp phát tài sản cho NV: tạo lượt cấp + đặt tài sản sang "đang cấp phát". */
export async function allocateAsset(input: { assetId: string; employeeId: string; allocatedDate: string; note?: string }): Promise<void> {
  const dbo = await getDb("assets", "allocations");
  const asset = dbo.assets.find((a) => a.id === input.assetId);
  if (!asset || asset.status !== "available") return;
  const al: AssetAllocation = { ...input, id: nextId("al"), returnedDate: null };
  dbo.allocations.push(al);
  asset.status = "allocated";
  await Promise.all([
    upsertRow("allocations", al.id, al),
    upsertRow("assets", asset.id, asset),
  ]);
}
/** Thu hồi tài sản: đóng lượt cấp + đặt tài sản về "sẵn sàng". */
export async function returnAllocation(allocationId: string, returnedDate: string): Promise<void> {
  const dbo = await getDb("allocations", "assets");
  const al = dbo.allocations.find((a) => a.id === allocationId);
  if (!al || al.returnedDate) return;
  al.returnedDate = returnedDate;
  const asset = dbo.assets.find((a) => a.id === al.assetId);
  if (asset && asset.status === "allocated") asset.status = "available";
  await Promise.all([
    upsertRow("allocations", al.id, al),
    ...(asset ? [upsertRow("assets", asset.id, asset)] : []),
  ]);
}

// ============================ Đào tạo (L&D) ============================
export async function listCourses(): Promise<TrainingCourse[]> {
  return clone([...(await getDb("courses")).courses].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "")));
}
export async function getCourse(id: string): Promise<TrainingCourse | undefined> {
  return clone((await getDb("courses")).courses.find((c) => c.id === id));
}
export async function createCourse(input: Omit<TrainingCourse, "id">): Promise<TrainingCourse> {
  const dbo = await getDb("courses");
  const c: TrainingCourse = { ...input, id: nextId("co") };
  dbo.courses.push(c);
  await upsertRow("courses", c.id, c);
  return clone(c);
}
export async function updateCourse(id: string, patch: Partial<TrainingCourse>): Promise<void> {
  const c = (await getDb("courses")).courses.find((x) => x.id === id);
  if (c) {
    Object.assign(c, patch, { id: c.id });
    await upsertRow("courses", c.id, c);
  }
}
export async function listEnrolls(filter?: { courseId?: string; employeeId?: string }): Promise<TrainingEnroll[]> {
  let list = (await getDb("enrolls")).enrolls;
  if (filter?.courseId) list = list.filter((e) => e.courseId === filter.courseId);
  if (filter?.employeeId) list = list.filter((e) => e.employeeId === filter.employeeId);
  return clone(list);
}
export async function enrollTraining(input: { courseId: string; employeeId: string; note?: string }): Promise<void> {
  const dbo = await getDb("enrolls");
  const exists = dbo.enrolls.find((e) => e.courseId === input.courseId && e.employeeId === input.employeeId && e.status !== "cancelled");
  if (exists) return; // tránh ghi danh trùng
  const en: TrainingEnroll = { ...input, id: nextId("en"), status: "enrolled" };
  dbo.enrolls.push(en);
  await upsertRow("enrolls", en.id, en);
}
export async function setEnrollStatus(
  id: string,
  status: TrainingEnroll["status"],
  extra?: { score?: number; completedDate?: string },
): Promise<void> {
  const e = (await getDb("enrolls")).enrolls.find((x) => x.id === id);
  if (!e) return;
  e.status = status;
  if (extra?.score != null) e.score = extra.score;
  if (status === "completed") e.completedDate = extra?.completedDate ?? new Date().toISOString().slice(0, 10);
  await upsertRow("enrolls", e.id, e);
}
