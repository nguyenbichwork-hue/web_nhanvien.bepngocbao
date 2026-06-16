"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createWarranty, updateWarranty, getOrder, getCustomer } from "@/lib/bnb/store";
import { listWarranties } from "@/lib/bnb/store";
import { CARE_MILESTONES } from "@/lib/bnb/types";
import type { WarrantyStatus } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();

const MILESTONES = [...CARE_MILESTONES] as number[];

/** Ngày (yyyy-mm-dd) = ngày lắp + n ngày. */
function addDays(installedAt: string, days: number): string {
  const d = new Date(installedAt);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Tính mốc kế tiếp & nextCareAt từ ngày lắp + các mốc đã chăm. */
function planNextCare(installedAt: string | undefined, careDone: number[]): { nextMs?: number; nextCareAt?: string } {
  const nextMs = MILESTONES.find((m) => !careDone.includes(m));
  if (nextMs === undefined || !installedAt) return {};
  return { nextMs, nextCareAt: addDays(installedAt, nextMs) };
}

/** Tạo phiếu bảo hành: chọn khách/đơn, sản phẩm, ngày lắp. */
export async function createWarrantyAction(fd: FormData) {
  const sess = await requirePermission("warranty.manage");
  const installedAt = s(fd, "installedAt") || undefined;
  const orderId = s(fd, "orderId") || undefined;
  let customerId = s(fd, "customerId") || undefined;

  if (orderId && !customerId) {
    const order = await getOrder(orderId);
    if (order) customerId = order.customerId;
  }

  const { nextCareAt } = planNextCare(installedAt, []);
  // Đến hạn ngay nếu mốc kế tiếp đã tới (vd lắp hôm nay → mốc 1 ngày).
  const today = new Date().toISOString().slice(0, 10);
  const status: WarrantyStatus = nextCareAt && nextCareAt <= today ? "due" : "active";

  await createWarranty({
    customerId,
    orderId,
    productName: s(fd, "productName") || undefined,
    installedAt,
    status,
    nextCareAt,
    careDone: [],
    assigneeId: sess.employee?.id,
    note: s(fd, "note") || undefined,
  });
  revalidatePath("/warranty");
  revalidatePath("/dashboard");
}

/** Đánh dấu đã chăm sóc mốc kế tiếp: thêm vào careDone, tính lại status & nextCareAt. */
export async function markCareDoneAction(fd: FormData) {
  await requirePermission("warranty.manage");
  const id = s(fd, "id");
  if (!id) return;
  const all = await listWarranties();
  const cur = all.find((w) => w.id === id);
  if (!cur) return;

  const careDone = [...(cur.careDone || [])];
  // Mốc cần đánh dấu = mốc gửi lên (nếu hợp lệ) hoặc mốc kế tiếp chưa làm.
  const sent = Number(s(fd, "milestone"));
  const target = MILESTONES.includes(sent) && !careDone.includes(sent)
    ? sent
    : MILESTONES.find((m) => !careDone.includes(m));
  if (target === undefined) return;
  careDone.push(target);
  careDone.sort((a, b) => a - b);

  const allDone = MILESTONES.every((m) => careDone.includes(m));
  const { nextCareAt } = planNextCare(cur.installedAt, careDone);
  const today = new Date().toISOString().slice(0, 10);

  let status: WarrantyStatus;
  if (allDone) status = "resolved";
  else if (nextCareAt && nextCareAt <= today) status = "due";
  else status = "contacted";

  await updateWarranty(id, { careDone, status, nextCareAt: allDone ? undefined : nextCareAt });
  revalidatePath("/warranty");
  revalidatePath("/dashboard");
}
