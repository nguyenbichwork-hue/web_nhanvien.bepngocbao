import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseAuthEnabled } from "@/lib/supabase/env";
import {
  getEmployee,
  getUserById,
  listAssignments,
  listRoles,
  listUsers,
} from "@/lib/org/store";
import type {
  Employee,
  Role,
  RoleAssignment,
  ScopeType,
  UserAccount,
} from "@/lib/org/types";

/** Cookie giữ id tài khoản đang đăng nhập ở chế độ dev (chưa nối Supabase). */
export const SESSION_COOKIE = "khr_uid";

/** Bậc giao diện — quyết định trang chủ & menu hiển thị cho người dùng. */
export type Tier = "admin" | "hr" | "manager" | "employee";

export type Session = {
  user: UserAccount;
  role: Role;
  assignment: RoleAssignment;
  scope: ScopeType;
  scopeEntityId?: string | null;
  scopeDepartmentId?: string | null;
  employee?: Employee;
  permissions: Set<string>;
};

/** Dựng Session từ id tài khoản (dùng chung cho cả 2 chế độ đăng nhập). */
async function resolveByUserId(uid: string): Promise<Session | null> {
  const user = await getUserById(uid);
  if (!user || !user.isActive) return null;

  const [assignments, roles] = await Promise.all([listAssignments(), listRoles()]);
  const assignment = assignments.find((a) => a.userId === user.id);
  const role = assignment ? roles.find((r) => r.id === assignment.roleId) : undefined;

  // Tài khoản chưa gán vai trò → không có quyền (chỉ vào được trang chủ).
  const safeAssignment: RoleAssignment =
    assignment ?? { id: "none", userId: user.id, roleId: "none", scopeType: "SELF" };
  const safeRole: Role =
    role ?? { id: "none", code: "NONE", name: "Chưa gán vai trò", isSystem: false, permissions: [] };

  const employee = user.employeeId ? await getEmployee(user.employeeId) : undefined;

  return {
    user,
    role: safeRole,
    assignment: safeAssignment,
    scope: safeAssignment.scopeType,
    scopeEntityId: safeAssignment.scopeEntityId ?? null,
    scopeDepartmentId: safeAssignment.scopeDepartmentId ?? null,
    employee,
    permissions: new Set(safeRole.permissions),
  };
}

/**
 * Người dùng hiện tại, hoặc null nếu chưa đăng nhập.
 * Ưu tiên cookie dev; nếu không có và đã cấu hình Supabase thì khớp theo email.
 *
 * Bọc React `cache()` → chạy ĐÚNG 1 LẦN mỗi request: layout + page cùng gọi
 * getSession nên trước đây mỗi trang gọi `supabase.auth.getUser()` (1 lượt mạng) 2 lần.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const uid = (await cookies()).get(SESSION_COOKIE)?.value;
  if (uid) return resolveByUserId(uid);

  if (isSupabaseAuthEnabled) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    // getClaims() xác minh JWT CỤC BỘ bằng JWKS (cache) — KHÔNG gọi mạng mỗi request
    // như getUser(). Token đã được proxy làm tươi nên claims đáng tin. → giảm trễ chuyển trang.
    const { data } = await supabase.auth.getClaims();
    const email = (data?.claims as { email?: string } | undefined)?.email;
    if (email) {
      const lower = email.toLowerCase();
      const match = (await listUsers()).find((u) => u.email.toLowerCase() === lower);
      if (match) return resolveByUserId(match.id);
    }
  }
  return null;
});

/** Bắt buộc đăng nhập; chưa thì chuyển tới trang đăng nhập. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export function can(s: Session, code: string): boolean {
  return s.permissions.has(code);
}

export function canAny(s: Session, codes: string[]): boolean {
  return codes.some((c) => s.permissions.has(c));
}

/** Bắt buộc có một quyền; thiếu thì chuyển tới trang Không có quyền. */
export async function requirePermission(code: string): Promise<Session> {
  const s = await requireSession();
  if (!can(s, code)) redirect("/forbidden");
  return s;
}

/** Bắt buộc có ÍT NHẤT một trong các quyền (vd Cài đặt: rbac hoặc org.manage). */
export async function requireAnyPermission(codes: string[]): Promise<Session> {
  const s = await requireSession();
  if (!canAny(s, codes)) redirect("/forbidden");
  return s;
}

/**
 * Bậc giao diện, suy từ NĂNG LỰC (bền vững cả với vai trò tuỳ biến):
 * có system.rbac → admin; sửa được nhân viên → hr; duyệt được đơn → manager; còn lại → employee.
 */
export function tierOf(s: Session): Tier {
  if (s.permissions.has("system.rbac")) return "admin";
  if (s.permissions.has("employee.update")) return "hr";
  if (s.permissions.has("leave.approve")) return "manager";
  return "employee";
}
