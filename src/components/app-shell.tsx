"use client";

// Khung layout port từ TailAdmin (MIT — Copyright (c) 2023 TailAdmin): page wrapper
// flex h-screen → sidebar + (header + main). Quản lý đóng/mở sidebar trên mobile.
import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { NavGroup } from "@/lib/nav";

export function AppShell({
  groups, showSettings, name, role, initials, notif, children,
}: {
  groups: NavGroup[];
  showSettings: boolean;
  name: string;
  role: string;
  initials: string;
  notif: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar groups={groups} showSettings={showSettings} open={open} onClose={() => setOpen(false)} />
      {open && (
        <div className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
      )}
      <div className="relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <Topbar name={name} role={role} initials={initials} notif={notif} onMenu={() => setOpen(true)} />
        <main>
          <div className="mx-auto max-w-[1536px] p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
