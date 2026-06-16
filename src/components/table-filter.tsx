"use client";

// Ô tìm kiếm lọc nhanh các DÒNG của một bảng đã render sẵn (server component),
// dùng cho các tab có NHIỀU nhân viên (Lịch làm việc, Tính lương, Nghỉ phép…).
// Cách dùng: đặt id lên <table>, rồi <TableFilter targetId="..." />.
// Lọc theo nội dung chữ của từng <tr> (đã chứa tên & mã NV) → gõ tên là khớp,
// bỏ dấu tiếng Việt nên "vy"/"khovy"/"an" đều tìm được.
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

type Props = {
  targetId: string;
  placeholder?: string;
  /** Bộ chọn dòng trong bảng (mặc định mọi <tr> trong <tbody>). */
  rowSelector?: string;
  style?: React.CSSProperties;
};

export function TableFilter({
  targetId,
  placeholder = "Tìm nhân viên…",
  rowSelector = "tbody tr",
  style,
}: Props) {
  const [q, setQ] = useState("");

  // Ẩn/hiện dòng trực tiếp trên DOM (không đụng tới React render của bảng server).
  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root) return;
    const nq = norm(q);
    const rows = root.querySelectorAll<HTMLElement>(rowSelector);
    rows.forEach((r) => {
      const hay = norm(r.getAttribute("data-search") ?? r.textContent ?? "");
      r.style.display = !nq || hay.includes(nq) ? "" : "none";
    });
  }, [q, targetId, rowSelector]);

  return (
    <div className="search" style={{ maxWidth: 280, flex: "none", ...style }}>
      <Icon name="search" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
      />
    </div>
  );
}
