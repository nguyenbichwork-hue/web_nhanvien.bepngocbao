"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createOrder, getOrder, updateOrder, pushOrderToHaravan } from "@/lib/bnb/store";
import type { OrderStatus, PaymentMethod, Payment, QuoteLine } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();
const num = (fd: FormData, k: string) => {
  const v = s(fd, k).replace(/[^\d]/g, "");
  return v ? Number(v) : undefined;
};

/** Chuyển trạng thái đơn theo ORDER_FLOW. */
export async function setOrderStatusAction(fd: FormData) {
  await requirePermission("order.manage");
  const id = s(fd, "id");
  const status = s(fd, "status") as OrderStatus;
  if (!id || !status) return;
  const patch: Partial<{ status: OrderStatus; confirmedAt: string }> = { status };
  if (status === "confirmed") patch.confirmedAt = new Date().toISOString();
  await updateOrder(id, patch);
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/dashboard");
}

/** Ghi nhận một lần thanh toán → cộng vào payments & cập nhật paid. */
export async function addPaymentAction(fd: FormData) {
  await requirePermission("order.manage");
  const id = s(fd, "id");
  const amount = num(fd, "amount");
  if (!id || !amount || amount <= 0) return;
  const order = await getOrder(id);
  if (!order) return;
  const payment: Payment = {
    id: `pay-${Date.now()}`,
    amount,
    method: (s(fd, "method") || "transfer") as PaymentMethod,
    at: new Date().toISOString(),
    note: s(fd, "note") || undefined,
  };
  const payments = [...(order.payments || []), payment];
  const paid = (order.paid || 0) + amount;
  await updateOrder(id, { payments, paid });
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/dashboard");
}

/** Đẩy đơn (và khách) từ BNB lên Haravan — ghi ngược. */
export async function pushOrderToHaravanAction(fd: FormData) {
  await requirePermission("order.manage");
  const id = s(fd, "id");
  if (!id) return;
  await pushOrderToHaravan(id);
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
}

/** Tạo đơn tối giản: chọn khách, địa chỉ, ngày giao, 1 dòng hàng (mô tả + tổng tiền). */
export async function createOrderAction(fd: FormData) {
  const sess = await requirePermission("order.manage");
  const total = num(fd, "total") || 0;
  const desc = s(fd, "lineDesc") || "Hàng hoá / dịch vụ";
  const qty = num(fd, "qty") || 1;
  // Dòng hàng tối thiểu 1 phần tử — đơn giá suy ra từ tổng / số lượng.
  const lines: QuoteLine[] = [
    { name: desc, qty, unitPrice: qty > 0 ? Math.round(total / qty) : total },
  ];
  const deposit = num(fd, "deposit") || 0;
  const order = await createOrder({
    customerId: s(fd, "customerId") || undefined,
    lines,
    total,
    paid: Math.min(deposit, total),
    status: "pending",
    assigneeId: sess.employee?.id,
    address: s(fd, "address") || undefined,
    deliveryDate: s(fd, "deliveryDate") || undefined,
    payments: deposit > 0
      ? [{ id: `pay-${Date.now()}`, amount: Math.min(deposit, total), method: "transfer", at: new Date().toISOString(), note: "Đặt cọc khi tạo đơn" }]
      : [],
    note: s(fd, "note") || undefined,
  });
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  redirect(`/orders/${order.id}`);
}
