"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createDelivery, updateDelivery, getOrder, getCustomer, cascadeDeliveryStatus } from "@/lib/bnb/store";
import type { DeliveryStatus } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();

const DELIVERY_STATUSES: DeliveryStatus[] = [
  "scheduled", "enroute", "installing", "done", "failed", "rescheduled",
];

/** Tạo lịch giao – lắp: chọn đơn/khách, ngày giờ, địa chỉ, đội KT, ghi chú. */
export async function createDeliveryAction(fd: FormData) {
  await requirePermission("delivery.manage");
  const date = s(fd, "date");
  const time = s(fd, "time") || "08:00";
  if (!date) return;
  const scheduledAt = new Date(`${date}T${time}`).toISOString();

  const orderId = s(fd, "orderId") || undefined;
  let customerId = s(fd, "customerId") || undefined;
  let address = s(fd, "address") || undefined;

  // Kế thừa khách & địa chỉ từ đơn nếu chưa nhập.
  if (orderId) {
    const order = await getOrder(orderId);
    if (order) {
      if (!customerId) customerId = order.customerId;
      if (!address) address = order.address;
    }
  }
  if (!address && customerId) {
    const cus = await getCustomer(customerId);
    if (cus) address = cus.address;
  }

  await createDelivery({
    orderId,
    customerId,
    scheduledAt,
    address,
    teamId: s(fd, "teamId") || undefined,
    status: "scheduled",
    note: s(fd, "note") || undefined,
  });
  revalidatePath("/delivery");
  revalidatePath("/dashboard");
}

/** Chuyển trạng thái một lịch giao – lắp; sang "done" thì ghi mốc nghiệm thu. */
export async function setDeliveryStatusAction(fd: FormData) {
  const sess = await requirePermission("delivery.manage");
  const id = s(fd, "id");
  const status = s(fd, "status") as DeliveryStatus;
  if (!id || !DELIVERY_STATUSES.includes(status)) return;
  await updateDelivery(id, {
    status,
    doneAt: status === "done" ? new Date().toISOString() : undefined,
  });
  // Cascade: lắp xong → đẩy hành trình sang Bàn giao, tạo Bảo hành + việc mời review, mở Referral.
  await cascadeDeliveryStatus(id, status, sess.employee?.id);
  revalidatePath("/delivery");
  revalidatePath("/warranty");
  revalidatePath("/journey");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
