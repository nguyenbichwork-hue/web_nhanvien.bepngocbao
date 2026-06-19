import { PageHero } from "@/components/page-hero";
import { SettingsTabs } from "@/components/settings-tabs";
import { can, requireSession } from "@/lib/auth/session";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  // MỌI người đăng nhập đều vào được Cài đặt (ít nhất để đổi mật khẩu ở tab Tài khoản).
  // Các tab quản trị (tổ chức/phân quyền) tự ẩn theo quyền VÀ mỗi trang con tự gác quyền.
  const session = await requireSession();
  const canOrg = can(session, "org.manage");
  const canRbac = can(session, "system.rbac");
  const isAdmin = canOrg || canRbac;

  return (
    <div>
      <PageHero
        icon="settings"
        title="Cài đặt"
        subtitle={
          isAdmin
            ? "Hồ sơ công ty, danh mục dùng chung, phân quyền (RBAC) và tài khoản cá nhân."
            : "Tài khoản & bảo mật cá nhân."
        }
        crumb={[["Trang chủ", "/dashboard"], ["Hệ thống"], ["Cài đặt"]]}
      />
      <SettingsTabs canOrg={canOrg} canRbac={canRbac} />
      {children}
    </div>
  );
}
