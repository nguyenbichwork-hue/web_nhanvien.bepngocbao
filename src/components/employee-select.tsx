"use client";

// Ô chọn nhân viên có tìm kiếm (combobox): gõ tên hoặc mã NV để lọc nhanh.
// Submit qua <input hidden name={name}> mang employeeId → dùng được trong mọi <form> (kể cả server action / GET).
// Không kiểm soát: tự giữ id; báo thay đổi qua onChange cho form cha cần theo dõi.
import { useState } from "react";

export type PickEmployee = { id: string; fullName: string; code: string };

type Props = {
  name: string;
  employees: PickEmployee[];
  required?: boolean;
  defaultValue?: string; // employeeId
  onChange?: (id: string) => void;
  placeholder?: string;
  includeAllOption?: boolean; // thêm mục "Tất cả" (value rỗng) — hữu ích khi làm bộ lọc
  allLabel?: string;
  style?: React.CSSProperties;
};

const labelOf = (e: PickEmployee) => `${e.fullName} · ${e.code}`;
// Bỏ dấu tiếng Việt để gõ "vy", "khovy", "an"… đều khớp.
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

export function EmployeeSelect({
  name,
  employees,
  required,
  defaultValue = "",
  onChange,
  placeholder = "Gõ tên hoặc mã NV…",
  includeAllOption = false,
  allLabel = "Tất cả nhân viên",
  style,
}: Props) {
  const initSel = employees.find((e) => e.id === defaultValue);
  const [id, setIdState] = useState(defaultValue);
  const [text, setText] = useState(initSel ? labelOf(initSel) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  function setId(v: string) {
    setIdState(v);
    onChange?.(v);
  }

  const q = norm(text);
  const sel = employees.find((e) => e.id === id);
  // Ô chữ đúng bằng nhãn đang chọn → coi như không lọc (hiện tất cả để dễ đổi).
  const list = !q || (sel && text === labelOf(sel)) ? employees : employees.filter((e) => norm(labelOf(e)).includes(q));

  function pick(e: PickEmployee) {
    setId(e.id);
    setText(labelOf(e));
    setOpen(false);
  }

  function pickAll() {
    setId("");
    setText("");
    setOpen(false);
  }

  // Khi rời ô (bấm ra ngoài): chuẩn hoá ô chữ về lựa chọn hợp lệ.
  function close() {
    setOpen(false);
    if (sel) {
      setText(labelOf(sel));
      return;
    }
    const only = list.length === 1 ? list[0] : undefined;
    if (only) {
      setText(labelOf(only));
      setId(only.id);
    } else {
      setText("");
      setId("");
    }
  }

  function onKey(ev: React.KeyboardEvent) {
    const top = includeAllOption ? list.length : list.length - 1;
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, top));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (ev.key === "Enter") {
      if (open) {
        ev.preventDefault();
        if (includeAllOption && active === 0) pickAll();
        else {
          const item = list[includeAllOption ? active - 1 : active];
          if (item) pick(item);
        }
      }
    } else if (ev.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="combo" style={style}>
      <input type="hidden" name={name} value={id} />
      <input
        type="text"
        className="combo-input"
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        // Bắt buộc đặt trên ô chữ (focus được) → trình duyệt chặn submit nếu bỏ trống.
        // Khi blur, ô chữ tự chuẩn hoá về nhãn NV đã chọn hoặc rỗng nên required khớp với hidden id.
        required={required}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(0);
          if (id) setId(""); // gõ lại nghĩa là bỏ lựa chọn cũ cho tới khi chọn mục mới
        }}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onBlur={close}
        onKeyDown={onKey}
      />
      {open && (
        // Giữ focus ở input khi bấm trong danh sách (chặn blur sớm); chọn bằng onClick.
        <div className="combo-list" role="listbox" onMouseDown={(e) => e.preventDefault()}>
          {includeAllOption && (
            <div
              role="option"
              aria-selected={id === ""}
              className={`combo-opt${active === 0 ? " on" : ""}`}
              onMouseEnter={() => setActive(0)}
              onClick={pickAll}
            >
              {allLabel}
            </div>
          )}
          {list.length === 0 ? (
            <div className="combo-empty">Không tìm thấy nhân viên</div>
          ) : (
            list.map((e, i) => {
              const idx = includeAllOption ? i + 1 : i;
              return (
                <div
                  key={e.id}
                  role="option"
                  aria-selected={e.id === id}
                  className={`combo-opt${active === idx ? " on" : ""}${e.id === id ? " sel" : ""}`}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => pick(e)}
                >
                  <span className="cn">{e.fullName}</span>
                  <span className="cc">{e.code}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
