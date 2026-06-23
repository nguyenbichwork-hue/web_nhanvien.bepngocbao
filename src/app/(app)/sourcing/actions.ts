"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import {
  applyWeeklyQuote, parseQuotePaste, setCostItemVon, listCostItems,
  saveCostItem, createCostItem, deleteCostItem, setMarkup,
} from "@/lib/bnb/cost-store";
import { sellFromCost } from "@/lib/bnb/sourcing";
import { createQuote } from "@/lib/bnb/store";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();
const num = (fd: FormData, k: string): number | null => {
  const v = (fd.get(k)?.toString() || "").replace(/[^\d]/g, "");
  return v ? Number(v) : null;
};

function revalidateSourcing() {
  revalidatePath("/sourcing");
  revalidatePath("/sourcing/catalog");
  revalidatePath("/sourcing/suppliers");
  revalidatePath("/sourcing/update");
}

/** Nhập báo giá tuần của 1 NCC: dán model + giá vốn (từ Excel/Zalo) → khớp & cập nhật. */
export async function applyWeeklyQuoteAction(fd: FormData) {
  await requirePermission("quote.manage");
  const brand = s(fd, "brand");
  const pairs = parseQuotePaste(s(fd, "rows"));
  if (!brand || !pairs.length) {
    redirect(`/sourcing/update?err=1&brand=${encodeURIComponent(brand)}`);
  }
  const res = await applyWeeklyQuote(brand, pairs);
  revalidatePath("/sourcing");
  revalidatePath("/sourcing/suppliers");
  const miss = encodeURIComponent(res.unmatched.slice(0, 30).join(", "));
  redirect(`/sourcing/update?brand=${encodeURIComponent(brand)}&ok=${res.matched.length}&miss=${res.unmatched.length}&missList=${miss}`);
}

/** Tạo nhanh báo giá nháp từ 1 SP trong kết quả tìm nguồn (đơn giá = giá bán đề xuất). */
export async function quoteFromItemAction(fd: FormData) {
  const sess = await requirePermission("quote.manage");
  const code = s(fd, "code");
  if (!code) return;
  const item = (await listCostItems()).find((c) => c.code === code);
  if (!item) return;
  const unitPrice = item.ban ?? (item.von != null ? sellFromCost(item.von) : 0);
  const name = `${item.cat ? item.cat + " " : ""}${item.brand} ${item.model}`.trim();
  const q = await createQuote({
    status: "draft",
    // Mang theo NCC (RMS: hãng = NCC) + giá vốn → sau này tách PO theo nhà cung cấp.
    lines: [{ sku: item.code ?? undefined, name, qty: 1, unitPrice, supplierName: item.brand, unitCost: item.von ?? undefined }],
    byId: sess.employee?.id,
  });
  redirect(`/quote/${q.id}`);
}

/** Sửa nhanh giá vốn 1 SP (theo Mã SP) → tính lại giá bán. */
export async function setCostAction(fd: FormData) {
  await requirePermission("quote.manage");
  const code = s(fd, "code");
  if (!code) return;
  await setCostItemVon(code, num(fd, "von"));
  revalidateSourcing();
}

/* ===== Quản lý sản phẩm & giá (/sourcing/catalog) ===== */

/** Cấu hình markup mặc định (nhập theo %). */
export async function setMarkupAction(fd: FormData) {
  await requirePermission("quote.manage");
  const pct = num(fd, "markup");
  if (pct == null) return;
  await setMarkup(pct / 100);
  revalidateSourcing();
}

/** Lưu giá 1 SP (giá vốn / giá bán / niêm yết). Để trống Giá bán → tự tính theo markup. */
export async function saveCostItemAction(fd: FormData) {
  await requirePermission("quote.manage");
  const code = s(fd, "code");
  if (!code) return;
  await saveCostItem(code, {
    von: num(fd, "von"),
    ban: num(fd, "ban"),
    ny: num(fd, "ny"),
    brand: s(fd, "brand") || undefined,
    model: s(fd, "model") || undefined,
  });
  revalidateSourcing();
}

/** Thêm sản phẩm mới vào kho giá. */
export async function createCostItemAction(fd: FormData) {
  await requirePermission("quote.manage");
  const brand = s(fd, "brand");
  const model = s(fd, "model");
  if (!brand || !model) {
    redirect("/sourcing/catalog?err=1");
  }
  await createCostItem({
    code: s(fd, "code") || undefined,
    brand,
    model,
    cat: s(fd, "cat") || null,
    von: num(fd, "von"),
    ny: num(fd, "ny"),
  });
  revalidateSourcing();
  redirect(`/sourcing/catalog?added=1&brand=${encodeURIComponent(brand)}`);
}

/** Xoá 1 SP khỏi kho giá. */
export async function deleteCostItemAction(fd: FormData) {
  await requirePermission("quote.manage");
  const code = s(fd, "code");
  if (!code) return;
  await deleteCostItem(code);
  revalidateSourcing();
}
