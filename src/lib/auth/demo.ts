import { listAssignments, listRoles, listUsers } from "@/lib/org/store";
import { SCOPE_LABEL } from "@/lib/org/types";

export type DemoAccount = {
  uid: string;
  fullName: string;
  email: string;
  roleName: string;
  scopeLabel: string;
};

/** Tài khoản mẫu cho khối "Đăng nhập nhanh" ở trang đăng nhập (chế độ dev). */
export async function listDemoAccounts(): Promise<DemoAccount[]> {
  const [users, assignments, roles] = await Promise.all([
    listUsers(),
    listAssignments(),
    listRoles(),
  ]);
  // Thứ tự ưu tiên theo cấp để hiển thị: Admin → HR tập đoàn → HR → Quản lý → Nhân viên.
  const order = ["ADMIN", "BOD", "HRG", "HR", "REC", "MGR", "EMP"];
  const rankOf = (code?: string) => {
    const i = code ? order.indexOf(code) : -1;
    return i === -1 ? 99 : i;
  };
  return users
    .filter((u) => u.password && u.isActive)
    .map((u) => {
      const a = assignments.find((x) => x.userId === u.id);
      const role = roles.find((r) => r.id === a?.roleId);
      return {
        uid: u.id,
        fullName: u.fullName,
        email: u.email,
        roleName: role?.name ?? "Chưa gán vai trò",
        scopeLabel: a ? SCOPE_LABEL[a.scopeType] : "—",
        rank: rankOf(role?.code),
      };
    })
    .sort((x, y) => x.rank - y.rank)
    .map((e): DemoAccount => ({
      uid: e.uid,
      fullName: e.fullName,
      email: e.email,
      roleName: e.roleName,
      scopeLabel: e.scopeLabel,
    }));
}
