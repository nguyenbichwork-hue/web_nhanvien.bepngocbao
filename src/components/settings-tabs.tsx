"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; need?: "org" | "rbac" | "admin" }[] = [
  { href: "/settings", label: "Tổng quan", need: "admin" },
  { href: "/settings/entities", label: "Pháp nhân", need: "org" },
  { href: "/settings/departments", label: "Phòng ban", need: "org" },
  { href: "/settings/positions", label: "Chức danh", need: "org" },
  { href: "/settings/payitems", label: "Phụ cấp & Khấu trừ", need: "org" },
  { href: "/settings/holidays", label: "Ngày lễ", need: "org" },
  { href: "/settings/approval", label: "Quy trình duyệt", need: "org" },
  { href: "/settings/roles", label: "Vai trò & quyền", need: "rbac" },
  { href: "/settings/audit", label: "Nhật ký", need: "rbac" },
  // Luôn hiện cho MỌI vai trò — đổi mật khẩu & thông tin tài khoản cá nhân.
  { href: "/settings/account", label: "Tài khoản & Bảo mật" },
];

export function SettingsTabs({ canOrg, canRbac }: { canOrg: boolean; canRbac: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/settings" ? pathname === "/settings" : pathname.startsWith(href);

  const tabs = TABS.filter((t) => {
    if (!t.need) return true;
    if (t.need === "org") return canOrg;
    if (t.need === "rbac") return canRbac;
    return canOrg || canRbac; // "admin"
  });

  return (
    <div className="chips" style={{ marginBottom: 22 }}>
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={`chip${isActive(t.href) ? " on" : ""}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
