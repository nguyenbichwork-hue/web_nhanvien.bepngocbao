"use client";

import { Icon } from "./icon";

/** Nút in trang hiện tại (dùng cho trang xem trước tin tuyển dụng). */
export function PrintButton({ label = "In tin" }: { label?: string }) {
  return (
    <button type="button" className="btn" onClick={() => window.print()}>
      <Icon name="download" /> {label}
    </button>
  );
}
