import { redirect } from "next/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { canAny, requireSession, tierOf } from "@/lib/auth/session";
import { NAV, type NavGroup } from "@/lib/nav";
import { unreadNotificationCount } from "@/lib/org/store";

function initialsOf(label: string) {
  const parts = label.replace(/@.*/, "").split(/[.\s_-]+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join("") || "K").toUpperCase();
}

// Nhãn menu riêng cho cấp Nhân viên — tạo cảm giác "cổng cá nhân".
const EMPLOYEE_LABELS: Record<string, string> = {
  "/dashboard": "Trang của tôi",
  "/schedule": "Lịch của tôi",
  "/leave": "Nghỉ phép",
  "/payroll": "Phiếu lương của tôi",
  "/performance": "KPI của tôi",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  // Buộc đổi mật khẩu lần đầu (HR vừa cấp tài khoản): chặn toàn bộ khu (app)
  // tới khi NV đặt mật khẩu mới. Trang /change-password nằm NGOÀI layout này nên không loop.
  if (session.user.mustChangePassword) redirect("/change-password");
  const tier = tierOf(session);

  // Lọc menu theo quyền; cấp Nhân viên đổi nhãn cho thân thiện; bỏ nhóm rỗng.
  const groups: NavGroup[] = NAV.map((g) => ({
    label: g.label,
    items: g.items
      .filter((it) => !it.perm || session.permissions.has(it.perm))
      .map((it) =>
        tier === "employee" && EMPLOYEE_LABELS[it.href]
          ? { ...it, label: EMPLOYEE_LABELS[it.href] }
          : it,
      ),
  })).filter((g) => g.items.length > 0);

  const showSettings = canAny(session, ["system.rbac", "org.manage"]);

  const name = session.employee?.fullName || session.user.fullName;
  const role = session.role.name;
  const initials = initialsOf(name);
  const notif = await unreadNotificationCount(session.user.id);

  return (
    <div className="app">
      <RealtimeRefresh />
      <Sidebar groups={groups} showSettings={showSettings} />
      <div className="main">
        <Topbar name={name} role={role} initials={initials} notif={notif} />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
