"use client";

// Tìm kiếm + LỌC nhanh các DÒNG của một bảng đã render sẵn (server component).
// Cách dùng: đặt id lên <table>, rồi <TableFilter targetId="..." filters={[...]} />.
//  - Tìm theo nội dung chữ từng <tr> (bỏ dấu tiếng Việt): "vy"/"khovy"/"an" đều khớp.
//  - Lọc theo thuộc tính: mỗi <tr> gắn data-<key>="giá trị" để khớp với dropdown.
// Lọc chạy hoàn toàn ở trình duyệt (không gọi lại server) → nhanh, mượt.
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

export type FilterDef = { key: string; label: string; options: { value: string; label: string }[] };

type Props = {
  targetId: string;
  placeholder?: string;
  /** Bộ chọn dòng trong bảng (mặc định mọi <tr> trong <tbody>). */
  rowSelector?: string;
  /** Dropdown lọc theo thuộc tính data-<key> trên mỗi <tr>. */
  filters?: FilterDef[];
  /** Hiện số kết quả khớp (mặc định bật khi có filters). */
  showCount?: boolean;
  style?: React.CSSProperties;
};

export function TableFilter({
  targetId,
  placeholder = "Tìm kiếm…",
  rowSelector = "tbody tr",
  filters = [],
  showCount,
  style,
}: Props) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Record<string, string>>({});
  const [count, setCount] = useState<{ shown: number; total: number } | null>(null);
  const wantCount = showCount ?? filters.length > 0;

  // Ẩn/hiện dòng trực tiếp trên DOM (không đụng tới React render của bảng server).
  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root) return;
    const nq = norm(q);
    const rows = root.querySelectorAll<HTMLElement>(rowSelector);
    let shown = 0;
    rows.forEach((r) => {
      const hay = norm(r.getAttribute("data-search") ?? r.textContent ?? "");
      let ok = !nq || hay.includes(nq);
      if (ok) {
        for (const f of filters) {
          const v = sel[f.key];
          if (v && v !== "__all" && r.getAttribute(`data-${f.key}`) !== v) { ok = false; break; }
        }
      }
      r.style.display = ok ? "" : "none";
      if (ok) shown++;
    });
    if (wantCount) setCount({ shown, total: rows.length });
  }, [q, sel, targetId, rowSelector, filters, wantCount]);

  const active = q.trim() || Object.values(sel).some((v) => v && v !== "__all");

  return (
    <div className="flex aic" style={{ flexWrap: "wrap", gap: 10, marginBottom: 14, ...style }}>
      <div className="search" style={{ maxWidth: 280, flex: "1 1 220px" }}>
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
      {filters.map((f) => (
        <select
          key={f.key}
          className={`fsel${(sel[f.key] ?? "__all") !== "__all" ? " act" : ""}`}
          value={sel[f.key] ?? "__all"}
          onChange={(e) => setSel((s) => ({ ...s, [f.key]: e.target.value }))}
          style={{ minWidth: 142, flex: "0 0 auto" }}
          aria-label={f.label}
        >
          <option value="__all">{f.label}: Tất cả</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
      {active && (
        <button type="button" className="btn sm" onClick={() => { setQ(""); setSel({}); }} title="Xoá lọc">
          <Icon name="x" /> Xoá lọc
        </button>
      )}
      {wantCount && count && (
        <span className="small muted" style={{ marginLeft: "auto" }}>{count.shown}/{count.total} kết quả</span>
      )}
    </div>
  );
}
