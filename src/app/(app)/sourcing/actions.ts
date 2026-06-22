"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { applyWeeklyQuote, parseQuotePaste, setCostItemVon, listCostItems } from "@/lib/bnb/cost-store";
import { sellFromCost } from "@/lib/bnb/sourcing";
import { createQuote } from "@/lib/bnb/store";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();

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
    lines: [{ sku: item.code ?? undefined, name, qty: 1, unitPrice }],
    byId: sess.employee?.id,
  });
  redirect(`/quote/${q.id}`);
}

/** Sửa nhanh giá vốn 1 SP (theo Mã SP) → tính lại giá bán. */
export async function setCostAction(fd: FormData) {
  await requirePermission("quote.manage");
  const code = s(fd, "code");
  const vonStr = s(fd, "von").replace(/[^\d]/g, "");
  if (!code) return;
  await setCostItemVon(code, vonStr ? Number(vonStr) : null);
  revalidatePath("/sourcing");
}
