"use client";

// Bộ chọn dạng "chip" cho một trường form (single-select). Lưu giá trị vào
// <input hidden> để server action đọc qua FormData như mọi trường khác.

import { useState } from "react";

type Option = { value: string; label: string };

export function ChipSelect({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div className="chips">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`chip${value === o.value ? " on" : ""}`}
            onClick={() => setValue(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}
