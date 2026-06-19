"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
import { BrandLogo } from "./brand-logo";
import type { NavGroup } from "@/lib/nav";

export function Sidebar({
  groups,
  showSettings,
}: {
  groups: NavGroup[];
  showSettings: boolean;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandLogo height={30} variant="sidebar" />
      </div>

      {groups.map((group) => (
        <div key={group.label}>
          <div className="nav-label">{group.label}</div>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${isActive(item.href) ? " active" : ""}`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </div>
      ))}

      <div className="spacer" />
      <div className="nav-divider" />
      <div>
        <div className="nav-label">Hệ thống</div>
        <Link
          href="/guide"
          className={`nav-item${isActive("/guide") ? " active" : ""}`}
        >
          <Icon name="book" />
          Hướng dẫn
        </Link>
        {/* Mọi vai trò đều thấy Cài đặt: admin → quản trị hệ thống; còn lại → Tài khoản & Bảo mật. */}
        <Link
          href={showSettings ? "/settings" : "/settings/account"}
          className={`nav-item${isActive("/settings") ? " active" : ""}`}
        >
          <Icon name="settings" />
          Cài đặt
        </Link>
      </div>
    </aside>
  );
}
