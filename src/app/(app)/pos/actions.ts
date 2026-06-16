"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createOrder, pushOrderToHaravan } from "@/lib/bnb/store";
import type { PaymentMethod, Payment, QuoteLine } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();

type RawLine = { productId?: unknown; sku?: unknown; name?: unknown; qty?: unknown; unitPrice?: unknown };

/** Thanh toán POS: tạo Order completed (paid = total) từ giỏ; tuỳ chọn đẩy Haravan. */
export async function checkoutAction(fd: FormData) {
  const sess = await requirePermission("order.manage");

  let raw: RawLine[] = [];
  try {
    raw = JSON.parse(s(fd, "cart") || "[]");
  } catch {
    raw = [];
  }
  const lines: QuoteLine[] = raw
    .map((r) => ({
      productId: r.productId ? String(r.productId) : undefined,
      sku: r.sku ? String(r.sku) : undefined,
      name: String(r.name || "").trim(),
      qty: Math.max(1, Number(r.qty) || 1),
      unitPrice: Math.max(0, Number(r.unitPrice) || 0),
    }))
    .filter((l) => l.name);
  if (!lines.length) return;

  const total = lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const method = (s(fd, "method") || "cash") as PaymentMethod;
  const customerId = s(fd, "customerId") || undefined;
  const guestName = s(fd, "guestName");
  const guestPhone = s(fd, "guestPhone");

  const noteParts: string[] = ["POS quầy"];
  if (!customerId && guestName) noteParts.push(`Khách: ${guestName}${guestPhone ? ` · ${guestPhone}` : ""}`);

  const payments: Payment[] = [
    { id: `pay-${Date.now()}`, amount: total, method, at: new Date().toISOString(), note: "Thanh toán POS" },
  ];

  const order = await createOrder({
    customerId,
    lines,
    total,
    paid: total,
    status: "completed",
    assigneeId: sess.employee?.id,
    payments,
    note: noteParts.join(" · "),
  });

  if (s(fd, "pushHaravan") === "1") {
    await pushOrderToHaravan(order.id);
  }

  revalidatePath("/orders");
  revalidatePath("/pos");
  revalidatePath("/dashboard");
  redirect(`/orders/${order.id}`);
}
