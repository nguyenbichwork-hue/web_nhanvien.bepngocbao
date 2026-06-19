"use client";

// Combobox tìm kiếm dùng chung (gõ để lọc, bỏ dấu tiếng Việt) — thay cho <select>
// "phèn" ở mọi nơi chọn khách/sản phẩm/lead… Trả value qua onChange.
// resetOnPick=true: sau khi chọn thì xoá ô (dùng cho "thêm sản phẩm").
import { useEffect, useRef, useState } from "react";

export type SearchOption = { value: string; label: string; sub?: string };

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Gõ để tìm…",
  emptyLabel = "— Chưa chọn —",
  resetOnPick = false,
  ariaLabel,
}: {
  options: SearchOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  resetOnPick?: boolean;
  ariaLabel?: string;
}) {
  const sel = options.find((o) => o.value === value);
  const labelOf = (o: SearchOption) => o.label + (o.sub ? ` · ${o.sub}` : "");
  const [text, setText] = useState(sel ? labelOf(sel) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Đồng bộ text khi value đổi từ ngoài.
  useEffect(() => {
    const s = options.find((o) => o.value === value);
    setText(s ? labelOf(s) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Đóng khi bấm ra ngoài.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = norm(text);
  const showAll = !q || (sel && text === labelOf(sel));
  const list = showAll ? options : options.filter((o) => norm(labelOf(o)).includes(q));

  function pick(o: SearchOption) {
    onChange(o.value);
    setText(resetOnPick ? "" : labelOf(o));
    setOpen(false);
  }

  function clear() {
    onChange("");
    setText("");
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (list[active]) pick(list[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div className="combo" ref={boxRef}>
      <input
        className="combo-input"
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        autoComplete="off"
      />
      {value && !resetOnPick && (
        <button type="button" className="combo-clear" onClick={clear} aria-label="Xoá chọn" tabIndex={-1}>×</button>
      )}
      {open && (
        <div className="combo-list">
          {!resetOnPick && (
            <div className={`combo-opt${!value ? " sel" : ""}`} onMouseDown={(e) => { e.preventDefault(); clear(); }}>
              <span className="cn" style={{ color: "var(--tx-muted)" }}>{emptyLabel}</span>
            </div>
          )}
          {list.length === 0 && <div className="combo-empty">Không tìm thấy.</div>}
          {list.slice(0, 50).map((o, i) => (
            <div
              key={o.value}
              className={`combo-opt${i === active ? " on" : ""}${o.value === value ? " sel" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}
            >
              <span className="cn">{o.label}</span>
              {o.sub && <span className="cc">{o.sub}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
