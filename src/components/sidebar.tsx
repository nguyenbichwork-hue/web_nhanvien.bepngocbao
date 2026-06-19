"use client";

// Sidebar port từ TailAdmin (MIT — Copyright (c) 2023 TailAdmin): nền trắng 290px,
// nhãn nhóm IN HOA gray-400, menu-item bo lg, active = brand-50 + brand-500.
// Gắn dữ liệu NAV + icon của BNB; thêm chấm màu nhóm (bản sắc theo nhóm).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";
import { BrandLogo } from "./brand-logo";
import type { NavGroup } from "@/lib/nav";
import { accentForGroup } from "@/lib/theme/accent";

export function Sidebar({
  groups, showSettings, open, onClose,
}: {
  groups: NavGroup[];
  showSettings: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const item = (href: string, icon: string, label: string) => (
    <li key={href}>
      <Link
        href={href}
        onClick={onClose}
        className={`menu-item group ${isActive(href) ? "menu-item-active" : "menu-item-inactive"}`}
      >
        <Icon name={icon} />
        <span>{label}</span>
      </Link>
    </li>
  );

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-screen w-[290px] flex-col overflow-y-auto border-r border-gray-200 bg-white px-5 transition-transform duration-300 lg:static lg:translate-x-0 dark:border-gray-800 dark:bg-gray-900 ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex items-center gap-2 py-8">
        <BrandLogo height={30} variant="sidebar" />
      </div>

      <nav className="flex flex-col pb-6">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <h3 className="menu-group-title mb-3 flex items-center gap-2 px-3">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: accentForGroup(group.label).main }} />
              {group.label}
            </h3>
            <ul className="flex flex-col gap-1">
              {group.items.map((it) => item(it.href, it.icon, it.label))}
            </ul>
          </div>
        ))}

        <div className="mb-4 h-px bg-gray-200 dark:bg-gray-800" />
        <div>
          <h3 className="menu-group-title mb-3 px-3">Hệ thống</h3>
          <ul className="flex flex-col gap-1">
            {item("/guide", "book", "Hướng dẫn")}
            {item(showSettings ? "/settings" : "/settings/account", "settings", "Cài đặt")}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
