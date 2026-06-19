"use client";

// Header port từ TailAdmin (MIT — Copyright (c) 2023 TailAdmin): nền trắng border-b,
// hamburger (mobile) + ô tìm kiếm trái, cụm điều khiển phải (theme, thông báo, user).
import { Icon } from "./icon";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({
  name = "Khách", role = "Nhân sự", initials = "K", notif = 0, onMenu,
}: {
  name?: string;
  role?: string;
  initials?: string;
  notif?: number;
  onMenu?: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex grow items-center justify-between gap-3 px-3 py-3 lg:px-6 lg:py-4">
        {/* Trái: hamburger (mobile) + tìm kiếm */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenu}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 lg:hidden dark:border-gray-800 dark:text-gray-400 [&_svg]:h-5 [&_svg]:w-5"
            aria-label="Mở menu"
          >
            <Icon name="grid" />
          </button>
          <div className="relative hidden sm:block">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 [&_svg]:h-5 [&_svg]:w-5">
              <Icon name="search" />
            </span>
            <input
              placeholder="Tìm nhân viên, đơn từ, báo cáo…"
              className="h-11 w-[260px] rounded-lg border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/15 xl:w-[420px] dark:border-gray-800 dark:bg-gray-800 dark:text-white/90"
            />
          </div>
        </div>

        {/* Phải: theme + thông báo + user + đăng xuất */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <a
            href="/notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 [&_svg]:h-5 [&_svg]:w-5"
            aria-label="Thông báo"
          >
            <Icon name="bell" />
            {notif > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-error-500 ring-2 ring-white dark:ring-gray-900" />
            )}
          </a>
          <a href="/account" className="flex items-center gap-3" title="Tài khoản của tôi">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
              {initials}
            </span>
            <span className="hidden text-left lg:block">
              <span className="block text-sm font-medium text-gray-800 dark:text-white/90">{name}</span>
              <span className="block text-xs text-gray-500">{role}</span>
            </span>
          </a>
          <a
            href="/auth/signout"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 [&_svg]:h-5 [&_svg]:w-5"
            aria-label="Đăng xuất"
          >
            <Icon name="logout" />
          </a>
        </div>
      </div>
    </header>
  );
}
