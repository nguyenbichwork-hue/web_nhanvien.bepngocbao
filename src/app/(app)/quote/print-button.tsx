"use client";

import { Icon } from "@/components/icon";

/** Nút "In" — gọi window.print(). Đặt riêng trong phân hệ quote (chưa có component dùng chung). */
export function PrintButton({ label = "In báo giá" }: { label?: string }) {
  return (
    <button type="button" className="btn ghost no-print" onClick={() => window.print()}>
      <Icon name="download" /> {label}
    </button>
  );
}
