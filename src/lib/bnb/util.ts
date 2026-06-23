// BNB · Tiện ích dùng chung cho các phân hệ bán hàng.
// QUAN TRỌNG: file này phải CLIENT-SAFE (nhiều Client Component import). Helper
// cần đọc store (server-only) nằm ở `./names.ts`, KHÔNG để ở đây.
import { formatVND } from "@/lib/payroll/calc";
import type { Order, PurchaseOrder, Quote, QuoteLine } from "./types";

export const fmtVnd = (n: number) => formatVND(n || 0);

/** Rút gọn số lớn cho hero/KPI: 1.2 tỷ / 850tr / 12k. (client-safe) */
export const compactNum = (n: number): string => {
  const a = Math.abs(n || 0);
  if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace(/\.0$/, "") + " tỷ";
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "tr";
  if (a >= 1e3) return Math.round(n / 1e3) + "k";
  return (n || 0).toLocaleString("vi-VN");
};
/** Như compactNum nhưng thêm "đ". */
export const compactVnd = (n: number): string => compactNum(n) + "đ";

/** Thành tiền một dòng = đơn giá × SL − chiết khấu (chiết khấu là số tiền tuyệt đối của dòng). */
export const lineAmount = (l: QuoteLine): number =>
  Math.max(0, l.unitPrice * l.qty - (l.discount || 0));

export const quoteSubtotal = (q: Pick<Quote, "lines">): number =>
  q.lines.reduce((s, l) => s + lineAmount(l), 0);

export const quoteTotal = (q: Pick<Quote, "lines" | "discount">): number =>
  Math.max(0, quoteSubtotal(q) - (q.discount || 0));

export const orderRemaining = (o: Pick<Order, "total" | "paid">): number =>
  Math.max(0, (o.total || 0) - (o.paid || 0));

/** Nội dung đơn đặt hàng (PO) để COPY DÁN gửi NCC qua Zalo (thủ công, không nối OA). */
export const poZaloText = (po: Pick<PurchaseOrder, "code" | "supplierName" | "items" | "total" | "expectedAt">): string => {
  const rows = po.items.map(
    (it, i) =>
      `${i + 1}. ${it.name}${it.sku ? ` [${it.sku}]` : ""} — SL ${it.qty} × ${fmtVnd(it.unitCost)} = ${fmtVnd(it.unitCost * it.qty)}`,
  );
  return [
    `🧾 ĐƠN ĐẶT HÀNG ${po.code}`,
    `Kính gửi NCC: ${po.supplierName}`,
    `Bếp Ngọc Bảo xin đặt các mặt hàng sau:`,
    ``,
    ...rows,
    ``,
    `TỔNG GIÁ NHẬP: ${fmtVnd(po.total)}`,
    po.expectedAt ? `Mong giao trước: ${fmtDate(po.expectedAt)}` : "",
    `Vui lòng xác nhận tồn kho & thời gian giao. Cảm ơn NCC!`,
  ]
    .filter(Boolean)
    .join("\n");
};

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
