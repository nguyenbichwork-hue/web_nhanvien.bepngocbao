"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import {
  createReceptionLog, updateReceptionLog, deleteReceptionLog, importReceptionLogs,
} from "@/lib/bnb/store";
import type { ReceptionLog } from "@/lib/bnb/types";

// Các trường nhập từ form (khớp ReceptionLog, trừ id/createdAt).
const FIELDS: (keyof ReceptionLog)[] = [
  "ngay", "gio", "nhanvien", "sdt", "nguon", "donhang", "ngaychot", "tongtg",
  "masp", "tensp", "cat", "soluong", "sotien", "datcoc",
  "customer", "khachxem", "khachhoi", "nvtuvan", "trigger", "whynow", "need",
  "influencer", "solution", "objection", "whybuy", "whynotbuy", "trust", "decision",
];

export async function saveReceptionAction(input: { id?: string } & Partial<ReceptionLog>) {
  await requirePermission("lead.read");
  const data: Partial<ReceptionLog> = {};
  for (const f of FIELDS) {
    const v = input[f];
    if (v != null) (data as Record<string, string>)[f] = String(v);
  }
  if (input.id) await updateReceptionLog(input.id, data);
  else await createReceptionLog(data as Omit<ReceptionLog, "id" | "createdAt">);
  revalidatePath("/reception");
}

export async function deleteReceptionAction(id: string) {
  await requirePermission("lead.read");
  if (id) await deleteReceptionLog(id);
  revalidatePath("/reception");
}

// ---- Import từ Google Sheet công khai (nhật ký tiếp khách của nhân viên) ----
const SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/1aEEdIMb9P9XXleVehZGeokCq04k5P5a7y5Za3BRDH1w/export?format=csv&gid=815873163";

// Tên cột (header tiếng Việt ở sheet) → field ReceptionLog.
const HEADER_MAP: Record<string, keyof ReceptionLog> = {
  "Ngày": "ngay", "Thời gian": "gio", "Tên nhân viên": "nhanvien",
  "Số điện thoại khách": "sdt", "Khách hàng tới từ đâu": "nguon",
  "Thời điểm ghi nhận": "createdAt", "Khách là ai": "customer", "Khách xem": "khachxem",
  "Khách hỏi về": "khachhoi", "Nhân viên đã tư vấn": "nvtuvan",
  "Vì sao khách tìm giải pháp": "trigger", "Vì sao mua lúc này": "whynow",
  "Ba nhu cầu lớn nhất": "need", "Người ảnh hưởng nhất": "influencer",
  "Giải pháp đề xuất": "solution", "Khách đắn đo nhất": "objection",
  "Vì sao khách chọn BNB": "whybuy", "Vì sao khách không mua": "whynotbuy",
  "Khoảnh khắc tạo niềm tin": "trust", "Khách quyết định như thế nào?": "decision",
  "Mã sản phẩm": "masp", "Tên sản phẩm": "tensp", "Loại sản phẩm": "cat",
  "Số lượng": "soluong", "Số tiền thanh toán": "sotien", "Số tiền đặt cọc": "datcoc",
  "Mã đơn hàng": "donhang", "Ngày khách chốt đơn": "ngaychot", "Tổng thời gian chăm sóc": "tongtg",
};

// Parser CSV nhỏ gọn (xử lý dấu phẩy/xuống dòng trong ô bọc ngoặc kép).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c === "\r") { /* skip */ }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// id ổn định theo nội dung dòng → import lại không nhân đôi.
function stableId(o: Record<string, string>): string {
  const base = [o.createdAt, o.ngay, o.gio, o.nhanvien, o.sdt, o.tensp, o.donhang].join("|");
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return "rl-import-" + h.toString(36);
}

export async function importReceptionFromSheetAction(): Promise<{ ok: boolean; added: number; skipped: number; total: number; error?: string }> {
  await requirePermission("lead.read");
  try {
    const res = await fetch(SHEET_CSV, { cache: "no-store" });
    if (!res.ok) return { ok: false, added: 0, skipped: 0, total: 0, error: `HTTP ${res.status}` };
    const grid = parseCsv(await res.text());
    if (grid.length < 2) return { ok: false, added: 0, skipped: 0, total: 0, error: "Sheet rỗng" };
    const headers = grid[0];
    const rows: ReceptionLog[] = [];
    for (let r = 1; r < grid.length; r++) {
      const cells = grid[r];
      if (!cells.some((c) => c.trim())) continue;
      const o: Record<string, string> = {};
      headers.forEach((h, i) => { const f = HEADER_MAP[h.trim()]; if (f) o[f] = (cells[i] || "").trim(); });
      o.id = stableId(o);
      if (!o.createdAt) o.createdAt = new Date().toISOString();
      rows.push(o as unknown as ReceptionLog);
    }
    const r = await importReceptionLogs(rows);
    revalidatePath("/reception");
    return { ok: true, added: r.added, skipped: r.skipped, total: rows.length };
  } catch (e) {
    return { ok: false, added: 0, skipped: 0, total: 0, error: String(e) };
  }
}
