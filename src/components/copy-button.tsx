"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

/** Nút copy nội dung vào clipboard (dùng cho nội dung PO/báo giá để dán Zalo thủ công). */
export function CopyButton({
  text,
  label = "Copy gửi Zalo",
  className = "btn ghost",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard bị chặn → bỏ qua */
        }
      }}
    >
      <Icon name={done ? "check" : "copy"} /> {done ? "Đã copy" : label}
    </button>
  );
}
