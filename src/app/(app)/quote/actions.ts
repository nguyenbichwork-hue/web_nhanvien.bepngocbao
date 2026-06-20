"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createQuote, updateQuote, acceptQuoteToOrder } from "@/lib/bnb/store";
import type { QuoteLine, QuoteStatus, QuoteTier } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();
const num = (fd: FormData, k: string) => {
  const v = s(fd, k).replace(/[^\d]/g, "");
  return v ? Number(v) : undefined;
};

/** Tạo báo giá mới từ trình tạo (quote-builder gói các dòng vào JSON ở field "lines"). */
export async function createQuoteAction(fd: FormData) {
  const sess = await requirePermission("quote.manage");

  // Khách hàng / lead: chỉ 1 trong 2, tuỳ ô "refType".
  const refType = s(fd, "refType"); // "customer" | "lead"
  const refId = s(fd, "refId");
  const customerId = refType === "customer" && refId ? refId : undefined;
  const leadId = refType === "lead" && refId ? refId : undefined;

  // Các dòng hàng: client gửi xuống dạng JSON đã chuẩn hoá.
  let lines: QuoteLine[] = [];
  try {
    const raw = JSON.parse(s(fd, "lines") || "[]") as unknown[];
    lines = raw
      .map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        const name = String(o.name ?? "").trim();
        const qty = Math.max(1, Math.round(Number(o.qty) || 0));
        const unitPrice = Math.max(0, Math.round(Number(o.unitPrice) || 0));
        const discount = Math.max(0, Math.round(Number(o.discount) || 0));
        const sku = o.sku ? String(o.sku) : undefined;
        const productId = o.productId ? String(o.productId) : undefined;
        return { name, qty, unitPrice, discount: discount || undefined, sku, productId } as QuoteLine;
      })
      .filter((l) => l.name && l.qty > 0);
  } catch {
    lines = [];
  }

  if (lines.length === 0) return; // không tạo báo giá rỗng

  await createQuote({
    customerId,
    leadId,
    tier: (s(fd, "tier") || "balanced") as QuoteTier,
    lines,
    discount: num(fd, "discount"),
    note: s(fd, "note") || undefined,
    status: "draft",
    byId: sess.employee?.id,
    validUntil: s(fd, "validUntil") || undefined,
  });

  revalidatePath("/quote");
  redirect("/quote");
}

/** Đổi trạng thái báo giá (Gửi → sent, Chốt → accepted, Từ chối → rejected). */
export async function setQuoteStatusAction(fd: FormData) {
  const sess = await requirePermission("quote.manage");
  const id = s(fd, "id");
  const status = s(fd, "status") as QuoteStatus;
  if (!id || !status) return;

  const patch: Parameters<typeof updateQuote>[1] = { status };
  if (status === "sent") patch.sentAt = new Date().toISOString();
  await updateQuote(id, patch);

  // Báo giá CHỐT → tự tạo Đơn (kế thừa dòng hàng + khách/lead), đẩy hành trình & lịch giao.
  let newOrderId: string | undefined;
  if (status === "accepted") {
    const order = await acceptQuoteToOrder(id, sess.employee?.id);
    newOrderId = order?.id;
  }

  revalidatePath("/quote");
  revalidatePath(`/quote/${id}`);
  revalidatePath("/orders");
  revalidatePath("/journey");
  revalidatePath("/delivery");
  revalidatePath("/dashboard");
  if (newOrderId) redirect(`/orders/${newOrderId}`);
}
