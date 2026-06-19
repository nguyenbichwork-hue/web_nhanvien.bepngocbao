"use server";

// Server Actions cho module Tổ chức & RBAC.
// Hiện thao tác trên kho in-memory (store.ts); khi nối Supabase chỉ cần đổi
// phần gọi store sang truy vấn DB, chữ ký action giữ nguyên.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DEV_PASSWORD,
  addAuditLog,
  allocateAsset,
  approverUserIds,
  cancelLeaveRequest,
  cancelOvertime,
  createBenefit,
  createNotification,
  createOvertime,
  decideOvertime,
  deleteBenefit,
  enrollBenefit,
  removeBenefitEnrollment,
  setLeaveApprovalLevels,
  toggleBenefit,
  getEmployee,
  getUserById,
  markAllNotificationsRead,
  markNotificationRead,
  setPayrollPeriodStatus,
  addSalaryRecord,
  addPayrollAdjustment,
  deletePayrollAdjustment,
  userIdOfEmployee,
  clearScheduleEntry,
  createAsset,
  createAssignment,
  setUserAssignment,
  removeUserAssignment,
  createCandidate,
  createContract,
  createCourse,
  createDependent,
  createDepartment,
  createEmployee,
  createHoliday,
  createJobOpening,
  createJobTitle,
  createLeaveRequest,
  createInterview,
  createReward,
  createRole,
  createUser,
  convertCandidateToEmployee,
  deleteAsset,
  deleteContract,
  deleteDependent,
  deleteHoliday,
  listDepartments,
  listEntities,
  listJobTitles,
  nextEmployeeCode,
  deleteInterview,
  deleteReward,
  enrollTraining,
  getLeaveRequest,
  getReview,
  returnAllocation,
  saveSelfReview,
  setCandidateStage,
  setEnrollStatus,
  setInterviewResult,
  toggleOnboarding,
  decideLeaveRequest,
  deleteDepartment,
  deleteEmployee,
  getUserByEmployee,
  resetUserPassword,
  patchUserAccount,
  saveReview,
  setRolePermission,
  setScheduleEntry,
  updateContract,
  updateCourse,
  updateDepartment,
  updateEmployee,
  updateEntity,
  updateJobTitle,
  createPayItem,
  updatePayItem,
  deletePayItem,
} from "./store";
import type {
  AdjustmentKind,
  CandidateStage,
  ContractType,
  CourseStatus,
  DependentRelation,
  Employee,
  EmployeeStatus,
  EmploymentType,
  EnrollStatus,
  Gender,
  InterviewResult,
  LegalEntity,
  OpeningStatus,
  PayItemKind,
  RecordKind,
  ScheduleKind,
  ScopeType,
} from "./types";
import { EMPLOYEE_STATUS_LABEL, EMPLOYMENT_TYPE_LABEL } from "./types";
import { can, requirePermission, requireSession, type Session } from "@/lib/auth/session";
import { isSupabaseAuthEnabled } from "@/lib/supabase/env";
import { bumpSignal } from "@/lib/realtime/signal";
import { sendEmail, notificationEmailHtml } from "@/lib/email/send";
import { parseXlsxFile } from "@/lib/export/xlsx";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Ghi nhật ký thao tác với tên người thực hiện lấy từ phiên. */
async function audit(s: Session, action: string, module: string, detail?: string) {
  await addAuditLog({ userName: s.employee?.fullName || s.user.fullName, action, module, detail });
}

/** Email nhận thông báo của một tài khoản: ưu tiên email RIÊNG (cá nhân), fallback email đăng nhập. */
async function recipientEmail(uid: string): Promise<string | null> {
  const user = await getUserById(uid);
  if (!user) return null;
  const emp = user.employeeId ? await getEmployee(user.employeeId) : undefined;
  return emp?.personalEmail || user.email || null;
}

type NotifyPayload = { title: string; body?: string; href?: string };

/**
 * Gửi thông báo cho MỘT tài khoản qua mọi kênh: chuông trong app + tín hiệu realtime
 * (để màn người nhận tự cập nhật) + email (Resend, gửi tới email riêng nếu đã cấu hình).
 * Best-effort: email/tín hiệu hỏng không làm gãy thao tác.
 */
async function notify(uid: string, p: NotifyPayload): Promise<void> {
  if (!uid) return;
  await createNotification(uid, p);
  await bumpSignal("notif", { userId: uid });
  const to = await recipientEmail(uid);
  if (to) {
    await sendEmail({
      to,
      subject: p.title,
      html: notificationEmailHtml({ title: p.title, body: p.body, href: p.href, siteUrl: SITE_URL }),
    });
  }
}

const str = (fd: FormData, k: string) => (fd.get(k)?.toString() ?? "").trim();
const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v ? Number(v) : undefined;
};
const region = (fd: FormData): LegalEntity["region"] => {
  const n = num(fd, "region");
  return n && n >= 1 && n <= 4 ? (n as 1 | 2 | 3 | 4) : undefined;
};

// ---------------- Công ty (hồ sơ pháp lý dùng cho lương/BHXH) ----------------
export async function updateEntityAction(fd: FormData) {
  await requirePermission("org.manage");
  const id = str(fd, "id");
  await updateEntity(id, {
    name: str(fd, "name"),
    legalName: str(fd, "legalName") || undefined,
    legalNameEn: str(fd, "legalNameEn") || undefined,
    taxCode: str(fd, "taxCode") || undefined,
    regNo: str(fd, "regNo") || undefined,
    regDate: str(fd, "regDate") || undefined,
    bhxhCode: str(fd, "bhxhCode") || undefined,
    region: region(fd),
    director: str(fd, "director") || undefined,
    directorTitle: str(fd, "directorTitle") || undefined,
    payrollBank: str(fd, "payrollBank") || undefined,
    companyAccount: str(fd, "companyAccount") || undefined,
    isParent: true,
    address: str(fd, "address") || undefined,
    phone: str(fd, "phone") || undefined,
    email: str(fd, "email") || undefined,
    isActive: true,
  });
  revalidatePath("/settings/entities");
  redirect("/settings/entities");
}

// ---------------- Phòng ban ----------------
export async function createDepartmentAction(fd: FormData) {
  await requirePermission("org.manage");
  const parent = str(fd, "parentId");
  await createDepartment({
    legalEntityId: str(fd, "legalEntityId"),
    parentId: parent || null,
    code: str(fd, "code"),
    name: str(fd, "name"),
    isActive: true,
  });
  revalidatePath("/settings/departments");
}

export async function deleteDepartmentAction(fd: FormData) {
  await requirePermission("org.manage");
  await deleteDepartment(str(fd, "id"));
  revalidatePath("/settings/departments");
}

export async function renameDepartmentAction(fd: FormData) {
  await requirePermission("org.manage");
  await updateDepartment(str(fd, "id"), { name: str(fd, "name"), code: str(fd, "code") });
  revalidatePath("/settings/departments");
}

// ---------------- Chức danh ----------------
export async function createJobTitleAction(fd: FormData) {
  await requirePermission("org.manage");
  await createJobTitle({
    code: str(fd, "code"),
    name: str(fd, "name"),
    jobLevel: num(fd, "jobLevel"),
    isActive: true,
  });
  revalidatePath("/settings/positions");
}

export async function toggleJobTitleAction(fd: FormData) {
  await requirePermission("org.manage");
  await updateJobTitle(str(fd, "id"), { isActive: fd.get("isActive") != null });
  revalidatePath("/settings/positions");
}

// ---------------- Nhân viên (Core HR) ----------------
const STATUSES: EmployeeStatus[] = ["active", "probation", "inactive", "left"];
const EMP_TYPES: EmploymentType[] = ["fulltime", "parttime", "contract", "intern", "seasonal"];
const GENDERS: Gender[] = ["male", "female", "other"];

const optStr = (fd: FormData, k: string) => str(fd, k) || undefined;
const oneOf = <T extends string>(fd: FormData, k: string, allowed: T[]): T | undefined => {
  const v = str(fd, k);
  return (allowed as string[]).includes(v) ? (v as T) : undefined;
};

/** Gom các trường hồ sơ từ FormData (dùng chung cho tạo & sửa). */
function readEmployeeFields(fd: FormData): Omit<Employee, "id" | "code"> {
  return {
    legalEntityId: str(fd, "legalEntityId"),
    departmentId: optStr(fd, "departmentId") ?? null,
    jobTitleId: optStr(fd, "jobTitleId") ?? null,
    fullName: str(fd, "fullName"),
    email: optStr(fd, "email"),
    status: oneOf(fd, "status", STATUSES) ?? "active",
    photoUrl: optStr(fd, "photoUrl"),
    idCardFrontUrl: optStr(fd, "idCardFrontUrl"),
    idCardBackUrl: optStr(fd, "idCardBackUrl"),
    gender: oneOf(fd, "gender", GENDERS),
    dateOfBirth: optStr(fd, "dateOfBirth"),
    phone: optStr(fd, "phone"),
    personalEmail: optStr(fd, "personalEmail"),
    nationalId: optStr(fd, "nationalId"),
    nationalIdDate: optStr(fd, "nationalIdDate"),
    nationalIdPlace: optStr(fd, "nationalIdPlace"),
    address: optStr(fd, "address"),
    employmentType: oneOf(fd, "employmentType", EMP_TYPES),
    joinDate: optStr(fd, "joinDate"),
    probationEndDate: optStr(fd, "probationEndDate"),
    leaveDate: optStr(fd, "leaveDate") ?? null,
    baseSalary: num(fd, "baseSalary"),
    allowance: num(fd, "allowance"),
    insuranceSalary: num(fd, "insuranceSalary"),
    dependents: num(fd, "dependents"),
    taxCode: optStr(fd, "taxCode"),
    socialInsuranceNo: optStr(fd, "socialInsuranceNo"),
    bankAccount: optStr(fd, "bankAccount"),
    bankName: optStr(fd, "bankName"),
    note: optStr(fd, "note"),
  };
}

const SCOPES: ScopeType[] = ["GROUP", "DEPARTMENT", "SELF"];

/**
 * Cấp tài khoản đăng nhập cho nhân viên (móc nối — CHƯA chạy Supabase Auth/mật khẩu thật).
 * Chỉ tạo khi form tick "createAccount", có chọn vai trò, và nhân viên CHƯA có tài khoản.
 */
async function maybeProvisionAccount(emp: Employee, fd: FormData) {
  if (fd.get("createAccount") == null) return;
  const roleId = str(fd, "accountRoleId");
  if (!roleId) return;
  if (await getUserByEmployee(emp.id)) return; // đã có tài khoản → bỏ qua
  const email = str(fd, "accountEmail") || emp.email || "";
  // Khi dùng Supabase Auth: tạo luôn tài khoản auth (MK tạm) để NV đăng nhập được.
  let authUserId: string | undefined;
  if (isSupabaseAuthEnabled && email) {
    const { adminEnsureAuthUser } = await import("@/lib/supabase/admin");
    authUserId = (await adminEnsureAuthUser(email, DEV_PASSWORD)) ?? undefined;
  }
  const user = await createUser({
    email,
    fullName: emp.fullName,
    employeeId: emp.id,
    isActive: true,
    password: DEV_PASSWORD, // mật khẩu tạm — HR gửi cho NV qua Zalo/Gmail
    mustChangePassword: true, // buộc NV đổi mật khẩu ở lần đăng nhập đầu
    authUserId,
  });
  const scopeType = oneOf(fd, "accountScopeType", SCOPES) ?? "SELF";
  await createAssignment({
    userId: user.id,
    roleId,
    scopeType,
    scopeEntityId: null,
    scopeDepartmentId:
      scopeType === "DEPARTMENT" ? optStr(fd, "accountScopeDepartmentId") ?? emp.departmentId ?? null : null,
  });
}

export async function createEmployeeAction(fd: FormData) {
  const session = await requirePermission("employee.create");
  const fields = readEmployeeFields(fd);
  const emp = await createEmployee({ ...fields, code: str(fd, "code") });
  await maybeProvisionAccount(emp, fd);
  await audit(session, "Thêm nhân viên", "employee", `${emp.fullName} (${emp.code})`);
  revalidatePath("/employees");
  redirect(`/employees/${emp.id}`);
}

export async function updateEmployeeAction(fd: FormData) {
  const session = await requirePermission("employee.update");
  const id = str(fd, "id");
  const fields = readEmployeeFields(fd);
  await updateEmployee(id, fields);
  await maybeProvisionAccount({ ...fields, id, code: str(fd, "code") } as Employee, fd);
  await audit(session, "Sửa hồ sơ nhân viên", "employee", `${str(fd, "fullName")} (${str(fd, "code")})`);
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  redirect(`/employees/${id}`);
}

/**
 * NHÂN VIÊN TỰ SỬA HỒ SƠ của chính mình — chỉ các trường thông tin cá nhân.
 * KHÓA (chỉ HR+ qua updateEmployeeAction): lương/thuế/BHXH, trạng thái, pháp nhân,
 * phòng ban, chức danh, tài khoản & vai trò. Bảo vệ quyền lợi 2 bên.
 * Luôn lấy employeeId từ phiên (bỏ qua id gửi lên) để chống giả mạo.
 */
export async function updateOwnProfileAction(fd: FormData) {
  const session = await requireSession();
  const empId = session.employee?.id;
  if (!empId) redirect("/forbidden");

  // Whitelist tường minh — chỉ các trường thông tin cá nhân, không đụng lương/tổ chức/tài khoản.
  const patch: Partial<Employee> = {
    photoUrl: optStr(fd, "photoUrl"),
    idCardFrontUrl: optStr(fd, "idCardFrontUrl"),
    idCardBackUrl: optStr(fd, "idCardBackUrl"),
    gender: oneOf(fd, "gender", GENDERS),
    dateOfBirth: optStr(fd, "dateOfBirth"),
    phone: optStr(fd, "phone"),
    personalEmail: optStr(fd, "personalEmail"),
    nationalId: optStr(fd, "nationalId"),
    nationalIdDate: optStr(fd, "nationalIdDate"),
    nationalIdPlace: optStr(fd, "nationalIdPlace"),
    address: optStr(fd, "address"),
    bankAccount: optStr(fd, "bankAccount"),
    bankName: optStr(fd, "bankName"),
  };
  await updateEmployee(empId!, patch);
  await audit(session, "Tự cập nhật hồ sơ cá nhân", "employee", `${session.employee?.fullName ?? ""}`);
  revalidatePath("/account/profile");
  revalidatePath("/account");
  redirect("/account/profile?ok=1");
}

/**
 * HR đặt lại mật khẩu tạm cho tài khoản của một nhân viên (gửi lại cho NV qua Zalo/Gmail).
 * Tài khoản sẽ bị buộc đổi mật khẩu ở lần đăng nhập kế tiếp. Chỉ người sửa được hồ sơ (HR+).
 */
export async function resetEmployeePasswordAction(fd: FormData) {
  const session = await requirePermission("employee.update");
  const employeeId = str(fd, "employeeId");
  const account = await getUserByEmployee(employeeId);
  if (!account) redirect(`/employees/${employeeId}?err=noaccount`);
  await resetUserPassword(account!.id, DEV_PASSWORD); // đặt MK tạm + bật cờ buộc đổi (app)
  // Khi dùng Supabase Auth: đặt lại MK tạm trên auth.users (tạo nếu chưa có).
  if (isSupabaseAuthEnabled && account!.email) {
    const { adminEnsureAuthUser, adminSetAuthPassword } = await import("@/lib/supabase/admin");
    const aid = account!.authUserId ?? (await adminEnsureAuthUser(account!.email, DEV_PASSWORD));
    if (aid) {
      await adminSetAuthPassword(aid, DEV_PASSWORD);
      if (!account!.authUserId) await patchUserAccount(account!.id, { authUserId: aid });
    }
  }
  await audit(session, "Đặt lại mật khẩu tài khoản", "employee", account!.email);
  revalidatePath(`/employees/${employeeId}`);
  redirect(`/employees/${employeeId}?pwreset=1`);
}

// ---------------- Lịch làm việc ----------------
const KINDS: ScheduleKind[] = ["work", "off", "holiday", "wfh", "business", "makeup"];

/** Mọi ngày CÙNG THỨ với baseDate, từ baseDate tới cuối tháng (gồm cả baseDate). */
function sameWeekdayDatesToMonthEnd(baseDate: string): string[] {
  const [y, m, d] = baseDate.split("-").map(Number);
  if (!y || !m || !d) return [baseDate];
  const targetDow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out: string[] = [];
  for (let day = d; day <= daysInMonth; day++) {
    if (new Date(Date.UTC(y, m - 1, day)).getUTCDay() === targetDow) {
      out.push(`${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  }
  return out;
}

/**
 * Kiểm tra quyền sửa lịch của MỘT nhân viên:
 * - có `schedule.manage` → sửa lịch mọi người (HR/Quản lý);
 * - không có → chỉ được sửa lịch của CHÍNH MÌNH (cần `schedule.read`).
 * Trả về session để dùng tiếp.
 */
async function assertCanEditSchedule(employeeId: string): Promise<Session> {
  const session = await requireSession();
  if (can(session, "schedule.manage")) return session;
  if (can(session, "schedule.read") && session.employee?.id === employeeId) return session;
  redirect("/forbidden");
}

/**
 * Báo thay đổi lịch theo HAI CHIỀU:
 * - Nhân viên TỰ đổi lịch của mình → báo HR/Quản lý quản được NV đó.
 * - HR/Quản lý đổi lịch hộ → báo chính nhân viên đó.
 */
async function notifyScheduleChange(session: Session, employeeId: string, count: number) {
  const label = count > 1 ? `${count} ngày` : "một ngày";
  const editedSelf = session.employee?.id === employeeId;
  if (editedSelf) {
    const emp = session.employee;
    for (const uid of await approverUserIds(employeeId, "schedule.manage")) {
      if (uid === session.user.id) continue;
      await notify(uid, {
        title: "Nhân viên cập nhật lịch làm việc",
        body: `${emp?.fullName ?? "Nhân viên"} vừa điều chỉnh lịch làm việc (${label}).`,
        href: "/schedule",
      });
    }
  } else {
    const uid = await userIdOfEmployee(employeeId);
    if (uid && uid !== session.user.id) {
      await notify(uid, {
        title: "Lịch làm việc của bạn được cập nhật",
        body: `${session.employee?.fullName || session.user.fullName} vừa điều chỉnh lịch của bạn (${label}).`,
        href: "/schedule",
      });
    }
  }
}

export async function setScheduleEntryAction(fd: FormData) {
  const employeeId = str(fd, "employeeId");
  const session = await assertCanEditSchedule(employeeId);
  const kind = oneOf(fd, "kind", KINDS) ?? "work";
  const usesShift = kind === "work" || kind === "wfh" || kind === "makeup";
  const baseDate = str(fd, "date");
  const shiftRaw = optStr(fd, "shiftId");
  const isCustom = usesShift && shiftRaw === "custom";

  const fields = {
    kind,
    shiftId: usesShift && !isCustom ? shiftRaw ?? null : null,
    startTime: isCustom ? optStr(fd, "startTime") : undefined,
    endTime: isCustom ? optStr(fd, "endTime") : undefined,
    note: optStr(fd, "note"),
  };

  // Một ngày, hoặc mọi ngày cùng thứ còn lại trong tháng (đăng ký nhanh theo tuần).
  const dates = fd.get("applyWeekday") != null ? sameWeekdayDatesToMonthEnd(baseDate) : [baseDate];
  for (const date of dates) {
    await setScheduleEntry({ employeeId, date, ...fields });
  }
  revalidatePath("/schedule");
  await notifyScheduleChange(session, employeeId, dates.length);
  await bumpSignal("schedule");
}

export async function clearScheduleEntryAction(fd: FormData) {
  const employeeId = str(fd, "employeeId");
  const session = await assertCanEditSchedule(employeeId);
  await clearScheduleEntry(employeeId, str(fd, "date"));
  revalidatePath("/schedule");
  await notifyScheduleChange(session, employeeId, 1);
  await bumpSignal("schedule");
}

// ---------------- Nghỉ phép ----------------
export async function createLeaveRequestAction(fd: FormData) {
  const session = await requirePermission("leave.request");
  // Người có phạm vi cá nhân chỉ được tạo đơn cho chính mình (chống giả mạo employeeId).
  const employeeId = session.scope === "SELF" ? session.employee?.id ?? "" : str(fd, "employeeId");
  const leaveTypeId = str(fd, "leaveTypeId");
  const startDate = str(fd, "startDate");
  let endDate = str(fd, "endDate") || startDate;
  const halfDay = fd.get("halfDay") != null && endDate === startDate;
  if (endDate < startDate) endDate = startDate;
  if (!employeeId || !leaveTypeId || !startDate) return;
  await createLeaveRequest({
    employeeId,
    leaveTypeId,
    startDate,
    endDate,
    halfDay,
    reason: optStr(fd, "reason"),
  });
  // Thông báo cho người có quyền duyệt trong phạm vi (trừ chính người gửi).
  const emp = await getEmployee(employeeId);
  const approvers = await approverUserIds(employeeId, "leave.approve");
  for (const uid of approvers) {
    if (uid === session.user.id) continue;
    await notify(uid, {
      title: "Đơn nghỉ mới chờ duyệt",
      body: `${emp?.fullName ?? "Nhân viên"} xin nghỉ từ ${startDate}.`,
      href: "/leave",
    });
  }
  revalidatePath("/leave");
  revalidatePath("/schedule");
  await bumpSignal("leave");
}

/** Báo kết quả duyệt/từ chối cho người gửi đơn. */
async function notifyRequester(reqId: string, approved: boolean) {
  const r = await getLeaveRequest(reqId);
  if (!r) return;
  const uid = await userIdOfEmployee(r.employeeId);
  if (uid) {
    await notify(uid, {
      title: approved ? "Đơn nghỉ đã được duyệt" : "Đơn nghỉ bị từ chối",
      body: `Đơn nghỉ từ ${r.startDate} đã được xử lý.`,
      href: "/leave",
    });
  }
}

export async function approveLeaveRequestAction(fd: FormData) {
  const session = await requirePermission("leave.approve");
  const id = str(fd, "id");
  const who = { userId: session.user.id, name: session.employee?.fullName || session.user.fullName };
  await decideLeaveRequest(id, "approved", who);
  // Báo người gửi chỉ khi đơn đã duyệt xong (đủ các cấp).
  const r = await getLeaveRequest(id);
  if (r?.status === "approved") await notifyRequester(id, true);
  await audit(session, "Duyệt đơn nghỉ", "leave", id);
  revalidatePath("/leave");
  revalidatePath("/schedule");
  await bumpSignal("leave");
  await bumpSignal("schedule");
}

export async function rejectLeaveRequestAction(fd: FormData) {
  const session = await requirePermission("leave.approve");
  const id = str(fd, "id");
  const who = { userId: session.user.id, name: session.employee?.fullName || session.user.fullName };
  await decideLeaveRequest(id, "rejected", who, optStr(fd, "decisionNote"));
  await notifyRequester(id, false);
  await audit(session, "Từ chối đơn nghỉ", "leave", id);
  revalidatePath("/leave");
  revalidatePath("/schedule");
  await bumpSignal("leave");
}

export async function cancelLeaveRequestAction(fd: FormData) {
  const session = await requireSession();
  const id = str(fd, "id");
  const req = await getLeaveRequest(id);
  if (!req) return;
  // Cho huỷ nếu là người duyệt, hoặc chính chủ đơn (có quyền gửi đơn).
  const isOwner = !!session.employee && session.employee.id === req.employeeId;
  if (!can(session, "leave.approve") && !(isOwner && can(session, "leave.request"))) {
    redirect("/forbidden");
  }
  await cancelLeaveRequest(id);
  revalidatePath("/leave");
  revalidatePath("/schedule");
  await bumpSignal("leave");
  await bumpSignal("schedule");
}

// ---------------- Đánh giá KPI ----------------
export async function saveReviewAction(fd: FormData) {
  await requirePermission("performance.manage");
  const id = str(fd, "id");
  if (!id) return;
  const scores: Record<string, number | undefined> = {};
  const comments: Record<string, string | undefined> = {};
  for (const [k, val] of fd.entries()) {
    if (k.startsWith("score_")) {
      const v = val.toString().trim();
      scores[k.slice(6)] = v ? Number(v) : undefined;
    } else if (k.startsWith("comment_")) {
      comments[k.slice(8)] = val.toString();
    }
  }
  await saveReview(id, {
    scores,
    comments,
    managerComment: optStr(fd, "managerComment"),
    managerName: optStr(fd, "managerName"),
    finalize: fd.get("finalize") != null,
  });
  revalidatePath("/performance");
  revalidatePath(`/performance/${id}`);
  redirect(`/performance/${id}`);
}

// ---------------- Tuyển dụng (ATS) ----------------
const OPENING_STATUSES: OpeningStatus[] = ["open", "paused", "closed"];
const CANDIDATE_STAGES: CandidateStage[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
];

/** Gom các trường của tin tuyển dụng (dùng chung cho tạo & sửa). */
function readOpeningFields(fd: FormData) {
  return {
    title: str(fd, "title"),
    legalEntityId: str(fd, "legalEntityId"),
    departmentId: optStr(fd, "departmentId") ?? null,
    jobTitleId: optStr(fd, "jobTitleId") ?? null,
    headcount: num(fd, "headcount") ?? 1,
    status: oneOf(fd, "status", OPENING_STATUSES) ?? "open",
    openDate: optStr(fd, "openDate") ?? new Date().toISOString().slice(0, 10),
    employmentType: oneOf(fd, "employmentType", EMP_TYPES),
    workLocation: optStr(fd, "workLocation"),
    salaryMin: num(fd, "salaryMin"),
    salaryMax: num(fd, "salaryMax"),
    salaryText: optStr(fd, "salaryText"),
    experience: optStr(fd, "experience"),
    description: optStr(fd, "description"),
    requirements: optStr(fd, "requirements"),
    benefits: optStr(fd, "benefits"),
    closeDate: optStr(fd, "closeDate"),
    contactName: optStr(fd, "contactName"),
    contactEmail: optStr(fd, "contactEmail"),
    contactPhone: optStr(fd, "contactPhone"),
    note: optStr(fd, "note"),
  };
}

export async function createJobOpeningAction(fd: FormData) {
  await requirePermission("recruit.manage");
  const f = readOpeningFields(fd);
  if (!f.title || !f.legalEntityId) return;
  await createJobOpening(f);
  revalidatePath("/recruit");
}

export async function updateJobOpeningAction(fd: FormData) {
  await requirePermission("recruit.manage");
  const id = str(fd, "id");
  const f = readOpeningFields(fd);
  if (!id || !f.title || !f.legalEntityId) return;
  const { updateJobOpening } = await import("./store");
  await updateJobOpening(id, f);
  revalidatePath("/recruit");
  revalidatePath(`/recruit/${id}`);
  revalidatePath(`/recruit/${id}/preview`);
  redirect(`/recruit/${id}`);
}

export async function updateOpeningStatusAction(fd: FormData) {
  await requirePermission("recruit.manage");
  const id = str(fd, "id");
  const status = oneOf(fd, "status", OPENING_STATUSES);
  if (!id || !status) return;
  const { updateJobOpening } = await import("./store");
  await updateJobOpening(id, { status });
  revalidatePath("/recruit");
  revalidatePath(`/recruit/${id}`);
}

export async function createCandidateAction(fd: FormData) {
  await requirePermission("recruit.manage");
  const openingId = str(fd, "openingId");
  const fullName = str(fd, "fullName");
  if (!openingId || !fullName) return;
  await createCandidate({
    openingId,
    fullName,
    email: optStr(fd, "email"),
    phone: optStr(fd, "phone"),
    source: optStr(fd, "source"),
    appliedDate: optStr(fd, "appliedDate") ?? new Date().toISOString().slice(0, 10),
    note: optStr(fd, "note"),
  });
  revalidatePath(`/recruit/${openingId}`);
}

export async function moveCandidateAction(fd: FormData) {
  await requirePermission("recruit.manage");
  const id = str(fd, "id");
  const openingId = str(fd, "openingId");
  const stage = oneOf(fd, "stage", CANDIDATE_STAGES);
  if (!id || !stage) return;
  await setCandidateStage(id, stage);
  revalidatePath(`/recruit/${openingId}`);
}

export async function deleteEmployeeAction(fd: FormData) {
  const session = await requirePermission("employee.delete");
  const emp = await getEmployee(str(fd, "id"));
  await deleteEmployee(str(fd, "id"));
  await audit(session, "Xoá nhân viên", "employee", emp ? `${emp.fullName} (${emp.code})` : str(fd, "id"));
  revalidatePath("/employees");
  redirect("/employees");
}

// ---------------- Vai trò / quyền ----------------
export async function toggleRolePermission(roleId: string, code: string, on: boolean) {
  const session = await requirePermission("system.rbac");
  await setRolePermission(roleId, code, on);
  await audit(session, on ? "Bật quyền" : "Tắt quyền", "system", `${code} · vai trò ${roleId}`);
  revalidatePath("/settings/roles");
}

export async function createRoleAction(fd: FormData) {
  const session = await requirePermission("system.rbac");
  await createRole({
    code: str(fd, "code").toUpperCase(),
    name: str(fd, "name"),
    description: str(fd, "description") || undefined,
  });
  await audit(session, "Tạo vai trò", "system", str(fd, "name"));
  revalidatePath("/settings/roles");
}

/** Gán/đổi vai trò + phạm vi cho một người dùng (RBAC). */
export async function assignRoleAction(fd: FormData) {
  const session = await requirePermission("system.rbac");
  const userId = str(fd, "userId");
  const roleId = str(fd, "roleId");
  const scopeType = (str(fd, "scopeType") || "SELF") as ScopeType;
  if (!userId || !roleId) return;
  await setUserAssignment({
    userId,
    roleId,
    scopeType,
    scopeEntityId: null,
    scopeDepartmentId: str(fd, "scopeDepartmentId") || undefined,
  });
  await audit(session, "Gán vai trò", "system", `user ${userId} → vai trò ${roleId} (${scopeType})`);
  revalidatePath("/settings/roles");
  revalidatePath("/employees");
}

/** Gỡ vai trò của một người dùng (về "chưa gán vai trò"). Chặn tự gỡ chính mình để tránh khoá ngoài. */
export async function unassignRoleAction(fd: FormData) {
  const session = await requirePermission("system.rbac");
  const userId = str(fd, "userId");
  if (!userId) return;
  if (userId === session.user.id) {
    redirect("/settings/roles?err=" + encodeURIComponent("Không thể tự gỡ vai trò của chính bạn."));
  }
  await removeUserAssignment(userId);
  await audit(session, "Gỡ vai trò", "system", `user ${userId}`);
  revalidatePath("/settings/roles");
  revalidatePath("/employees");
}

// ---------------- Ngày lễ ----------------
export async function createHolidayAction(fd: FormData) {
  await requirePermission("org.manage");
  const date = str(fd, "date");
  const name = str(fd, "name");
  if (!date || !name) return;
  await createHoliday({ date, name, paid: fd.get("paid") != null });
  revalidatePath("/settings/holidays");
  revalidatePath("/schedule");
}
export async function deleteHolidayAction(fd: FormData) {
  await requirePermission("org.manage");
  await deleteHoliday(str(fd, "id"));
  revalidatePath("/settings/holidays");
  revalidatePath("/schedule");
}


// ---------------- Phụ cấp & Khấu trừ ----------------
const PAY_ITEM_KINDS: PayItemKind[] = ["allowance", "deduction"];

export async function createPayItemAction(fd: FormData) {
  await requirePermission("org.manage");
  const code = str(fd, "code");
  const name = str(fd, "name");
  if (!code || !name) return;
  await createPayItem({
    code,
    name,
    kind: oneOf(fd, "kind", PAY_ITEM_KINDS) ?? "allowance",
    defaultAmount: num(fd, "defaultAmount"),
    taxable: fd.get("taxable") != null,
    insurable: fd.get("insurable") != null,
    isActive: true,
  });
  revalidatePath("/settings/payitems");
}

export async function updatePayItemAction(fd: FormData) {
  await requirePermission("org.manage");
  await updatePayItem(str(fd, "id"), {
    name: str(fd, "name"),
    kind: oneOf(fd, "kind", PAY_ITEM_KINDS) ?? "allowance",
    defaultAmount: num(fd, "defaultAmount"),
    taxable: fd.get("taxable") != null,
    insurable: fd.get("insurable") != null,
  });
  revalidatePath("/settings/payitems");
}

export async function togglePayItemAction(fd: FormData) {
  await requirePermission("org.manage");
  await updatePayItem(str(fd, "id"), { isActive: fd.get("isActive") != null });
  revalidatePath("/settings/payitems");
}

export async function deletePayItemAction(fd: FormData) {
  await requirePermission("org.manage");
  await deletePayItem(str(fd, "id"));
  revalidatePath("/settings/payitems");
}

// ---------------- Hợp đồng lao động ----------------
const CONTRACT_TYPES: ContractType[] = ["probation", "fixed", "indefinite", "seasonal"];

function readContractFields(fd: FormData) {
  const type = oneOf(fd, "type", CONTRACT_TYPES) ?? "fixed";
  return {
    employeeId: str(fd, "employeeId"),
    code: str(fd, "code"),
    type,
    startDate: str(fd, "startDate"),
    // HĐ không xác định thời hạn → không có ngày kết thúc.
    endDate: type === "indefinite" ? null : optStr(fd, "endDate") ?? null,
    baseSalary: num(fd, "baseSalary"),
    allowance: num(fd, "allowance"),
    signedDate: optStr(fd, "signedDate"),
    note: optStr(fd, "note"),
  };
}

export async function createContractAction(fd: FormData) {
  const session = await requirePermission("contract.manage");
  const f = readContractFields(fd);
  if (!f.employeeId || !f.code || !f.startDate) return;
  await createContract({ ...f, terminated: false });
  await audit(session, "Tạo hợp đồng", "contract", f.code);
  revalidatePath("/contracts");
}

export async function updateContractAction(fd: FormData) {
  await requirePermission("contract.manage");
  const id = str(fd, "id");
  if (!id) return;
  await updateContract(id, readContractFields(fd));
  revalidatePath("/contracts");
  redirect("/contracts");
}

export async function terminateContractAction(fd: FormData) {
  const session = await requirePermission("contract.manage");
  await updateContract(str(fd, "id"), { terminated: true });
  await audit(session, "Chấm dứt hợp đồng", "contract", str(fd, "id"));
  revalidatePath("/contracts");
}

export async function deleteContractAction(fd: FormData) {
  await requirePermission("contract.manage");
  await deleteContract(str(fd, "id"));
  revalidatePath("/contracts");
}

// ---------------- Khen thưởng – Kỷ luật ----------------
const RECORD_KINDS: RecordKind[] = ["reward", "discipline"];

export async function createRewardAction(fd: FormData) {
  const session = await requirePermission("reward.manage");
  const employeeId = str(fd, "employeeId");
  const title = str(fd, "title");
  if (!employeeId || !title) return;
  const kind = oneOf(fd, "kind", RECORD_KINDS) ?? "reward";
  await createReward({
    employeeId,
    kind,
    title,
    reason: optStr(fd, "reason"),
    amount: num(fd, "amount"),
    date: optStr(fd, "date") ?? new Date().toISOString().slice(0, 10),
    decisionNo: optStr(fd, "decisionNo"),
    note: optStr(fd, "note"),
  });
  await audit(session, kind === "reward" ? "Khen thưởng" : "Kỷ luật", "reward", title);
  // Báo cho chính nhân viên (nếu có tài khoản).
  const uid = await userIdOfEmployee(employeeId);
  if (uid) await notify(uid, { title: kind === "reward" ? "Bạn được khen thưởng" : "Quyết định kỷ luật", body: title, href: "/dashboard" });
  revalidatePath("/rewards");
  await bumpSignal("reward");
}
export async function deleteRewardAction(fd: FormData) {
  await requirePermission("reward.manage");
  await deleteReward(str(fd, "id"));
  revalidatePath("/rewards");
}

// ---------------- Tài sản ----------------
const ASSET_STATUSES = ["available", "allocated", "maintenance", "retired"] as const;

export async function createAssetAction(fd: FormData) {
  await requirePermission("asset.manage");
  const code = str(fd, "code");
  const name = str(fd, "name");
  if (!code || !name) return;
  await createAsset({
    code,
    name,
    category: str(fd, "category") || "Khác",
    status: oneOf(fd, "status", [...ASSET_STATUSES]) ?? "available",
    note: optStr(fd, "note"),
  });
  revalidatePath("/assets");
}
export async function deleteAssetAction(fd: FormData) {
  await requirePermission("asset.manage");
  await deleteAsset(str(fd, "id"));
  revalidatePath("/assets");
}
export async function allocateAssetAction(fd: FormData) {
  await requirePermission("asset.manage");
  const assetId = str(fd, "assetId");
  const employeeId = str(fd, "employeeId");
  if (!assetId || !employeeId) return;
  await allocateAsset({
    assetId,
    employeeId,
    allocatedDate: optStr(fd, "allocatedDate") ?? new Date().toISOString().slice(0, 10),
    note: optStr(fd, "note"),
  });
  revalidatePath("/assets");
}
export async function returnAllocationAction(fd: FormData) {
  await requirePermission("asset.manage");
  await returnAllocation(str(fd, "id"), optStr(fd, "returnedDate") ?? new Date().toISOString().slice(0, 10));
  revalidatePath("/assets");
}

// ---------------- Đào tạo (L&D) ----------------
const COURSE_STATUSES: CourseStatus[] = ["planned", "ongoing", "done", "cancelled"];
const ENROLL_STATUSES: EnrollStatus[] = ["enrolled", "completed", "cancelled"];

export async function createCourseAction(fd: FormData) {
  await requirePermission("training.manage");
  const code = str(fd, "code");
  const name = str(fd, "name");
  if (!code || !name) return;
  await createCourse({
    code,
    name,
    category: optStr(fd, "category"),
    provider: optStr(fd, "provider"),
    hours: num(fd, "hours"),
    cost: num(fd, "cost"),
    startDate: optStr(fd, "startDate"),
    endDate: optStr(fd, "endDate"),
    status: oneOf(fd, "status", COURSE_STATUSES) ?? "planned",
    note: optStr(fd, "note"),
  });
  revalidatePath("/training");
}
export async function updateCourseStatusAction(fd: FormData) {
  await requirePermission("training.manage");
  const id = str(fd, "id");
  const status = oneOf(fd, "status", COURSE_STATUSES);
  if (!id || !status) return;
  await updateCourse(id, { status });
  revalidatePath("/training");
  revalidatePath(`/training/${id}`);
}
export async function enrollTrainingAction(fd: FormData) {
  await requirePermission("training.manage");
  const courseId = str(fd, "courseId");
  const employeeId = str(fd, "employeeId");
  if (!courseId || !employeeId) return;
  await enrollTraining({ courseId, employeeId, note: optStr(fd, "note") });
  revalidatePath(`/training/${courseId}`);
}
export async function setEnrollStatusAction(fd: FormData) {
  await requirePermission("training.manage");
  const id = str(fd, "id");
  const courseId = str(fd, "courseId");
  const status = oneOf(fd, "status", ENROLL_STATUSES);
  if (!id || !status) return;
  await setEnrollStatus(id, status, { score: num(fd, "score") });
  revalidatePath(`/training/${courseId}`);
}

// ---------------- ATS: Phỏng vấn & Onboarding ----------------
const INTERVIEW_RESULTS: InterviewResult[] = ["pending", "pass", "fail"];

export async function createInterviewAction(fd: FormData) {
  await requirePermission("recruit.manage");
  const candidateId = str(fd, "candidateId");
  if (!candidateId) return;
  await createInterview({
    candidateId,
    round: num(fd, "round") ?? 1,
    title: optStr(fd, "title"),
    interviewer: optStr(fd, "interviewer"),
    scheduledDate: optStr(fd, "scheduledDate"),
    score: undefined,
    note: optStr(fd, "note"),
  });
  revalidatePath(`/recruit/candidate/${candidateId}`);
}

export async function setInterviewResultAction(fd: FormData) {
  await requirePermission("recruit.manage");
  const id = str(fd, "id");
  const candidateId = str(fd, "candidateId");
  const result = oneOf(fd, "result", INTERVIEW_RESULTS);
  if (!id || !result) return;
  await setInterviewResult(id, result, { score: num(fd, "score"), note: optStr(fd, "note") });
  revalidatePath(`/recruit/candidate/${candidateId}`);
}

export async function deleteInterviewAction(fd: FormData) {
  await requirePermission("recruit.manage");
  const candidateId = str(fd, "candidateId");
  await deleteInterview(str(fd, "id"));
  revalidatePath(`/recruit/candidate/${candidateId}`);
}

export async function toggleOnboardingAction(fd: FormData) {
  await requirePermission("recruit.manage");
  const candidateId = str(fd, "candidateId");
  await toggleOnboarding(str(fd, "id"), fd.get("done") != null);
  revalidatePath(`/recruit/candidate/${candidateId}`);
}

/** Tuyển ứng viên → tạo hồ sơ nhân viên rồi mở hồ sơ đó. Cần quyền tạo nhân viên. */
export async function convertCandidateAction(fd: FormData) {
  const session = await requirePermission("employee.create");
  const candidateId = str(fd, "candidateId");
  if (!candidateId) return;
  const empId = await convertCandidateToEmployee(candidateId);
  await audit(session, "Tuyển ứng viên → tạo hồ sơ NV", "recruit", candidateId);
  revalidatePath(`/recruit/candidate/${candidateId}`);
  revalidatePath("/employees");
  if (empId) redirect(`/employees/${empId}`);
}

// ---------------- Người phụ thuộc ----------------
const DEPENDENT_RELATIONS: DependentRelation[] = ["child", "spouse", "parent", "other"];

export async function createDependentAction(fd: FormData) {
  await requirePermission("employee.update");
  const employeeId = str(fd, "employeeId");
  const fullName = str(fd, "fullName");
  if (!employeeId || !fullName) return;
  await createDependent({
    employeeId,
    fullName,
    relation: oneOf(fd, "relation", DEPENDENT_RELATIONS) ?? "child",
    dateOfBirth: optStr(fd, "dateOfBirth"),
    taxCode: optStr(fd, "taxCode"),
    taxRegistered: fd.get("taxRegistered") != null,
    startDate: optStr(fd, "startDate"),
    note: optStr(fd, "note"),
  });
  revalidatePath(`/employees/${employeeId}`);
}

export async function deleteDependentAction(fd: FormData) {
  await requirePermission("employee.update");
  const employeeId = str(fd, "employeeId");
  await deleteDependent(str(fd, "id"));
  revalidatePath(`/employees/${employeeId}`);
}

// ---------------- Tự đánh giá KPI (nhân viên) ----------------
export async function saveSelfReviewAction(fd: FormData) {
  const session = await requirePermission("performance.read");
  const id = str(fd, "id");
  if (!id) return;
  const review = await getReview(id);
  // Chỉ chính chủ mới được tự đánh giá bản của mình.
  if (!review || !session.employee || review.employeeId !== session.employee.id) redirect("/forbidden");
  const selfScores: Record<string, number | undefined> = {};
  for (const [k, val] of fd.entries()) {
    if (k.startsWith("self_")) {
      const v = val.toString().trim();
      selfScores[k.slice(5)] = v ? Number(v) : undefined;
    }
  }
  await saveSelfReview(id, { selfScores, selfComment: optStr(fd, "selfComment") });
  revalidatePath(`/performance/${id}`);
  redirect(`/performance/${id}`);
}

// ---------------- Thông báo ----------------
export async function markAllNotificationsReadAction() {
  const session = await requireSession();
  await markAllNotificationsRead(session.user.id);
  revalidatePath("/notifications");
}
export async function markNotificationReadAction(fd: FormData) {
  await requireSession();
  await markNotificationRead(str(fd, "id"));
  revalidatePath("/notifications");
}

// ---------------- Kỳ lương (chốt / mở lại) ----------------
export async function closePayrollPeriodAction(fd: FormData) {
  const session = await requirePermission("payroll.manage");
  const ym = str(fd, "ym");
  if (!/^\d{4}-\d{2}$/.test(ym)) return;
  await setPayrollPeriodStatus(ym, "closed", session.employee?.fullName || session.user.fullName);
  await audit(session, "Chốt kỳ lương", "payroll", ym);
  revalidatePath("/payroll");
}
export async function reopenPayrollPeriodAction(fd: FormData) {
  const session = await requirePermission("payroll.manage");
  const ym = str(fd, "ym");
  if (!/^\d{4}-\d{2}$/.test(ym)) return;
  await setPayrollPeriodStatus(ym, "open");
  await audit(session, "Mở lại kỳ lương", "payroll", ym);
  revalidatePath("/payroll");
}

// ---------------- Chỉnh lương (lịch sử lương) ----------------
const ADJ_KINDS: AdjustmentKind[] = ["bonus", "deduction", "allowance", "other"];

/** Tạo bản ghi lương mới có tháng hiệu lực → cập nhật lương hiện tại trên hồ sơ. */
export async function adjustSalaryAction(fd: FormData) {
  const session = await requirePermission("payroll.manage");
  const employeeId = str(fd, "employeeId");
  const effectiveFrom = str(fd, "effectiveFrom");
  const baseSalary = num(fd, "baseSalary");
  if (!employeeId || !/^\d{4}-\d{2}$/.test(effectiveFrom) || baseSalary == null) return;
  await addSalaryRecord({
    employeeId,
    effectiveFrom,
    baseSalary,
    allowance: num(fd, "allowance") ?? 0,
    insuranceSalary: num(fd, "insuranceSalary"),
    reason: optStr(fd, "reason"),
    createdByName: session.employee?.fullName || session.user.fullName,
  });
  const emp = await getEmployee(employeeId);
  await audit(session, "Điều chỉnh lương", "payroll", `${emp?.fullName ?? employeeId} · từ ${effectiveFrom}`);
  // Báo cho chính nhân viên (cấp trên → cấp dưới). Không nêu số tiền trong thông báo (riêng tư).
  const uid = await userIdOfEmployee(employeeId);
  if (uid && uid !== session.user.id) {
    await notify(uid, {
      title: "Lương của bạn được điều chỉnh",
      body: `Mức lương mới có hiệu lực từ tháng ${effectiveFrom.replace("-", "/")}.`,
      href: "/payroll",
    });
  }
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${employeeId}`);
  revalidatePath(`/employees/${employeeId}`);
}

// ---------------- Điều chỉnh kỳ lương (thưởng/khấu trừ/phụ cấp 1 tháng) ----------------
export async function addPayrollAdjustmentAction(fd: FormData) {
  const session = await requirePermission("payroll.manage");
  const employeeId = str(fd, "employeeId");
  const ym = str(fd, "ym");
  const label = str(fd, "label");
  const amount = num(fd, "amount");
  if (!employeeId || !/^\d{4}-\d{2}$/.test(ym) || !label || amount == null) return;
  await addPayrollAdjustment({
    employeeId,
    ym,
    kind: oneOf(fd, "kind", ADJ_KINDS) ?? "bonus",
    label,
    amount: Math.abs(amount),
    taxable: fd.get("taxable") != null,
    note: optStr(fd, "note"),
    createdByName: session.employee?.fullName || session.user.fullName,
  });
  await audit(session, "Thêm điều chỉnh kỳ lương", "payroll", `${label} · ${ym}`);
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${employeeId}`);
}

export async function deletePayrollAdjustmentAction(fd: FormData) {
  await requirePermission("payroll.manage");
  const employeeId = str(fd, "employeeId");
  await deletePayrollAdjustment(str(fd, "id"));
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${employeeId}`);
}

// ---------------- Phúc lợi ----------------
export async function createBenefitAction(fd: FormData) {
  await requirePermission("benefit.manage");
  const code = str(fd, "code");
  const name = str(fd, "name");
  if (!code || !name) return;
  await createBenefit({
    code,
    name,
    category: optStr(fd, "category"),
    description: optStr(fd, "description"),
    valuePerYear: num(fd, "valuePerYear"),
    isActive: true,
  });
  revalidatePath("/benefits");
}
export async function toggleBenefitAction(fd: FormData) {
  await requirePermission("benefit.manage");
  await toggleBenefit(str(fd, "id"), fd.get("isActive") != null);
  revalidatePath("/benefits");
}
export async function deleteBenefitAction(fd: FormData) {
  await requirePermission("benefit.manage");
  await deleteBenefit(str(fd, "id"));
  revalidatePath("/benefits");
}
export async function enrollBenefitAction(fd: FormData) {
  await requirePermission("benefit.manage");
  const benefitId = str(fd, "benefitId");
  const employeeId = str(fd, "employeeId");
  if (!benefitId || !employeeId) return;
  await enrollBenefit({ benefitId, employeeId, startDate: optStr(fd, "startDate") ?? new Date().toISOString().slice(0, 10), note: optStr(fd, "note") });
  revalidatePath("/benefits");
}
export async function removeBenefitEnrollmentAction(fd: FormData) {
  await requirePermission("benefit.manage");
  await removeBenefitEnrollment(str(fd, "id"));
  revalidatePath("/benefits");
}

// ---------------- Làm thêm giờ (Overtime) ----------------
export async function createOvertimeAction(fd: FormData) {
  const session = await requirePermission("overtime.request");
  // Phạm vi cá nhân chỉ tạo cho chính mình.
  const employeeId = session.scope === "SELF" ? session.employee?.id ?? "" : str(fd, "employeeId");
  const date = str(fd, "date");
  const hours = num(fd, "hours");
  const mult = num(fd, "multiplier") ?? 1.5;
  if (!employeeId || !date || !hours) return;
  await createOvertime({ employeeId, date, hours, multiplier: [1.5, 2, 3].includes(mult) ? mult : 1.5, reason: optStr(fd, "reason") });
  // Báo người duyệt OT trong phạm vi.
  const emp = await getEmployee(employeeId);
  for (const uid of await approverUserIds(employeeId, "overtime.approve")) {
    if (uid === session.user.id) continue;
    await notify(uid, { title: "Đăng ký làm thêm giờ chờ duyệt", body: `${emp?.fullName ?? "Nhân viên"} đăng ký OT ngày ${date}.`, href: "/overtime" });
  }
  revalidatePath("/overtime");
  await bumpSignal("overtime");
}
export async function decideOvertimeAction(fd: FormData) {
  const session = await requirePermission("overtime.approve");
  const id = str(fd, "id");
  const decision = fd.get("decision") === "rejected" ? "rejected" : "approved";
  const ot = await decideOvertime(id, decision, session.employee?.fullName || session.user.fullName);
  // Báo kết quả cho người đăng ký OT (trừ khi tự duyệt của mình).
  if (ot) {
    const uid = await userIdOfEmployee(ot.employeeId);
    if (uid && uid !== session.user.id) {
      await notify(uid, {
        title: decision === "approved" ? "Đăng ký OT đã được duyệt" : "Đăng ký OT bị từ chối",
        body: `Đăng ký làm thêm giờ ngày ${ot.date} đã được xử lý.`,
        href: "/overtime",
      });
    }
  }
  await audit(session, decision === "approved" ? "Duyệt làm thêm giờ" : "Từ chối làm thêm giờ", "overtime", id);
  revalidatePath("/overtime");
  await bumpSignal("overtime");
}
export async function cancelOvertimeAction(fd: FormData) {
  const session = await requireSession();
  const id = str(fd, "id");
  if (!can(session, "overtime.approve") && !can(session, "overtime.request")) redirect("/forbidden");
  await cancelOvertime(id);
  revalidatePath("/overtime");
  await bumpSignal("overtime");
}

// ---------------- Cấu hình quy trình duyệt ----------------
export async function setApprovalLevelsAction(fd: FormData) {
  const session = await requirePermission("org.manage");
  await setLeaveApprovalLevels(num(fd, "leaveLevels") ?? 1);
  await audit(session, "Đổi số cấp duyệt nghỉ phép", "system", String(num(fd, "leaveLevels") ?? 1));
  revalidatePath("/settings/approval");
}

// ---------------- Import nhân viên từ Excel ----------------
export type ImportResult = { created: number; failed: number; errors: string[] };

const reverse = (m: Record<string, string>) => {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) o[v.toLowerCase()] = k;
  return o;
};

export async function importEmployeesAction(_prev: ImportResult | null, fd: FormData): Promise<ImportResult> {
  await requirePermission("employee.create");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { created: 0, failed: 0, errors: ["Chưa chọn tệp Excel."] };

  let rows: string[][];
  try {
    rows = (await parseXlsxFile(file)).filter((r) => r.some((c) => c.trim() !== ""));
  } catch {
    return { created: 0, failed: 0, errors: ["Không đọc được tệp. Hãy chọn tệp Excel (.xlsx) đúng định dạng."] };
  }
  if (rows.length < 2) return { created: 0, failed: 0, errors: ["Tệp rỗng hoặc thiếu dòng dữ liệu."] };

  const [entities, departments, jobTitles] = await Promise.all([listEntities(), listDepartments(), listJobTitles()]);
  const statusRev = reverse(EMPLOYEE_STATUS_LABEL);
  const typeRev = reverse(EMPLOYMENT_TYPE_LABEL);

  // Khớp tiêu đề cột (không phân biệt hoa thường / dấu cách).
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };
  const col = {
    code: idx("mã nv", "mã", "code"),
    name: idx("họ tên", "tên", "fullname"),
    email: idx("email"),
    entity: idx("pháp nhân", "mã pháp nhân", "entity"),
    dept: idx("phòng ban", "phòng", "department"),
    title: idx("chức danh", "title"),
    status: idx("trạng thái", "status"),
    type: idx("loại hình", "loại", "type"),
    join: idx("ngày vào", "joindate"),
    base: idx("lương cơ bản", "base"),
    allowance: idx("phụ cấp", "allowance"),
  };
  if (col.name < 0)
    return { created: 0, failed: 0, errors: ['Thiếu cột bắt buộc "Họ tên".'] };
  const company = entities[0];

  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const matchEntity = (v: string) =>
    entities.find((e) => e.code.toLowerCase() === v.toLowerCase() || e.id === v || e.name.toLowerCase() === v.toLowerCase());

  let created = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    const fullName = get(line, col.name);
    const entVal = get(line, col.entity);
    const ent = matchEntity(entVal) ?? company;
    if (!fullName) { failed++; errors.push(`Dòng ${r + 1}: thiếu họ tên.`); continue; }
    if (!ent) { failed++; errors.push(`Dòng ${r + 1}: chưa có hồ sơ công ty.`); continue; }

    const deptVal = get(line, col.dept);
    const dept = deptVal
      ? departments.find((d) => d.legalEntityId === ent.id && (d.name.toLowerCase() === deptVal.toLowerCase() || d.code.toLowerCase() === deptVal.toLowerCase()))
      : undefined;
    const titleVal = get(line, col.title);
    const title = titleVal
      ? jobTitles.find((j) => j.name.toLowerCase() === titleVal.toLowerCase() || j.code.toLowerCase() === titleVal.toLowerCase())
      : undefined;

    const statusVal = get(line, col.status).toLowerCase();
    const typeVal = get(line, col.type).toLowerCase();
    const numOf = (s: string) => { const n = Number(s.replace(/[^\d.-]/g, "")); return isFinite(n) && n ? n : undefined; };

    const code = get(line, col.code) || (await nextEmployeeCode());
    try {
      await createEmployee({
        legalEntityId: ent.id,
        departmentId: dept?.id ?? null,
        jobTitleId: title?.id ?? null,
        code,
        fullName,
        email: get(line, col.email) || undefined,
        status: (STATUSES.includes(statusVal as EmployeeStatus) ? statusVal : statusRev[statusVal]) as EmployeeStatus ?? "active",
        employmentType: (EMP_TYPES.includes(typeVal as EmploymentType) ? typeVal : typeRev[typeVal]) as EmploymentType | undefined,
        joinDate: get(line, col.join) || undefined,
        baseSalary: numOf(get(line, col.base)),
        allowance: numOf(get(line, col.allowance)),
      });
      created++;
    } catch {
      failed++;
      errors.push(`Dòng ${r + 1}: lỗi khi tạo "${fullName}".`);
    }
  }

  revalidatePath("/employees");
  return { created, failed, errors: errors.slice(0, 20) };
}
