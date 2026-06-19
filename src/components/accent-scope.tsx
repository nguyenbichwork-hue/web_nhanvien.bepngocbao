"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { accentForPath } from "@/lib/theme/accent";

// Đặt biến --accent / --accent-2 / --accent-rgb lên <html> theo URL hiện tại.
// Các biến phái sinh (--accent-grad, --accent-soft) định nghĩa 1 lần trong
// globals.css và tự cập nhật vì var() phân giải lúc dùng. Nhờ vậy sidebar +
// nội dung đổi tông MƯỢT theo nhóm phân hệ khi điều hướng.
export function AccentScope() {
  const pathname = usePathname();
  useEffect(() => {
    const a = accentForPath(pathname || "/");
    const root = document.documentElement;
    root.style.setProperty("--accent", a.main);
    root.style.setProperty("--accent-2", a.light);
    root.style.setProperty("--accent-rgb", a.rgb);
    root.dataset.zone = a.key;
  }, [pathname]);
  return null;
}
