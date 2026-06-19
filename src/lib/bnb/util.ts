// BNB · Tiện ích dùng chung cho các phân hệ bán hàng.
// QUAN TRỌNG: file này phải CLIENT-SAFE (nhiều Client Component import). Helper
// cần đọc store (server-only) nằm ở `./names.ts`, KHÔNG để ở đây.
import { formatVND } from "@/lib/payroll/calc";
import type { Order, Quote, QuoteLine } from "./types";

export const fmtVnd = (n: number) => formatVND(n || 0);

/** Thành tiền một dòng = đơn giá × SL − chiết khấu (chiết khấu là số tiền tuyệt đối của dòng). */
export const lineAmount = (l: QuoteLine): number =>
  Math.max(0, l.unitPrice * l.qty - (l.discount || 0));

export const quoteSubtotal = (q: Pick<Quote, "lines">): number =>
  q.lines.reduce((s, l) => s + lineAmount(l), 0);

export const quoteTotal = (q: Pick<Quote, "lines" | "discount">): number =>
  Math.max(0, quoteSubtotal(q) - (q.discount || 0));

export const orderRemaining = (o: Pick<Order, "total" | "paid">): number =>
  Math.max(0, (o.total || 0) - (o.paid || 0));

/* ---- Ngày tháng (vi-VN) ---- */
export const fmtDate = (iso?: string): string =>
  iso ? new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export const fmtDateTime = (iso?: string): string =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";

/** So sánh theo NGÀY local (yyyy-mm-dd). */
export const dayKey = (iso?: string | Date): string => {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const isSameDay = (a?: string, b?: string | Date): boolean =>
  Boolean(a) && dayKey(a) === dayKey(b || new Date());

/** Sinh tắt tên (2 chữ cái) cho avatar. */
export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts.at(-2)?.[0] || "") + (parts.at(-1)?.[0] || parts[0]?.[0] || "K")).toUpperCase();
};

/** Màu nền avatar suy ra từ tên (ổn định) — dùng cho .av. */
export const avatarBg = (name: string): string => {
  const palette = [
    "linear-gradient(135deg,#c8203f,#9e1b32)",
    "linear-gradient(135deg,#0fa371,#2bd4a6)",
    "linear-gradient(135deg,#2b86c5,#5fc0f0)",
    "linear-gradient(135deg,#8b5cf6,#c084fc)",
    "linear-gradient(135deg,#e23b54,#fb7185)",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};
