"use client";

// Ô tải ảnh có nén phía trình duyệt (không gọi mạng, không thư viện ngoài → chạy
// được trên Cloudflare Workers). Ảnh được resize + nén JPEG rồi lưu dưới dạng
// data URL trong một <input type="hidden"> để gửi kèm form (server action đọc qua
// FormData như mọi trường khác). Dùng cho ảnh chân dung & ảnh CCCD.

import { useRef, useState } from "react";
import { Icon } from "./icon";

type Props = {
  name: string; // tên field gửi lên server
  label: string;
  defaultValue?: string; // data URL hiện có (chế độ sửa)
  variant?: "portrait" | "card"; // chân dung (vuông) | CCCD (chữ nhật)
  hint?: string;
};

const MAX_DIM: Record<NonNullable<Props["variant"]>, number> = {
  portrait: 512,
  card: 1100,
};

/** Đọc file ảnh → resize theo cạnh dài tối đa → nén JPEG → trả data URL. */
function compressImage(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được tệp"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Tệp không phải ảnh hợp lệ"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Trình duyệt không hỗ trợ canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({ name, label, defaultValue, variant = "portrait", hint }: Props) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isPortrait = variant === "portrait";
  const boxStyle: React.CSSProperties = {
    width: isPortrait ? 120 : 200,
    height: isPortrait ? 120 : 126,
    borderRadius: isPortrait ? "50%" : "var(--r-md)",
    border: "1px dashed var(--line)",
    background: "var(--surface-2)",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  };

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const dataUrl = await compressImage(file, MAX_DIM[variant]);
      setValue(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xử lý ảnh");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <input type="hidden" name={name} value={value} />
      <div className="flex aic" style={{ gap: 14 }}>
        <div style={boxStyle}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span className="muted" style={{ display: "grid", placeItems: "center", gap: 4 }}>
              <Icon name="user" />
            </span>
          )}
        </div>
        <div className="flex" style={{ flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPick}
            style={{ display: "none" }}
            id={`file-${name}`}
          />
          <label htmlFor={`file-${name}`} className="btn" style={{ cursor: "pointer" }}>
            <Icon name="download" /> {busy ? "Đang xử lý…" : value ? "Đổi ảnh" : "Tải ảnh lên"}
          </label>
          {value && (
            <button type="button" className="btn ghost small" onClick={() => setValue("")}>
              <Icon name="trash" /> Xoá ảnh
            </button>
          )}
          {hint && <span className="muted small">{hint}</span>}
          {error && <span className="small" style={{ color: "var(--c-rose)" }}>{error}</span>}
        </div>
      </div>
    </div>
  );
}
