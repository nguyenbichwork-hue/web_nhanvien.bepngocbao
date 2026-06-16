"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createPurchaseOrder, updatePurchaseOrder } from "@/lib/bnb/store";
import type { POItem, POStatus } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();

type RawItem = { name?: unknown; sku?: unknown; qty?: unknown; unitCost?: unknown };

/** Tạo PO: đóng gói items JSON từ builder, tính tổng từ SL × giá vốn. */
export async function createPurchaseOrderAction(fd: FormData) {
  const sess = await requirePermission("purchase.manage");
  const supplierName = s(fd, "supplierName") || "Nhà cung cấp";

  let raw: RawItem[] = [];
  try {
    raw = JSON.parse(s(fd, "items") || "[]");
  } catch {
    raw = [];
  }
  const items: POItem[] = raw
    .map((r) => ({
      name: String(r.name || "").trim(),
      sku: r.sku ? String(r.sku).trim() : undefined,
      qty: Math.max(1, Number(r.qty) || 1),
      unitCost: Math.max(0, Number(r.unitCost) || 0),
    }))
    .filter((it) => it.name);
  if (!items.length) return;

  const total = items.reduce((sum, it) => sum + it.qty * it.unitCost, 0);

  const po = await createPurchaseOrder({
    supplierName,
    items,
    total,
    status: "draft",
    expectedAt: s(fd, "expectedAt") || undefined,
    note: s(fd, "note") || undefined,
    byId: sess.employee?.id,
  });
  revalidatePath("/purchase");
  redirect(`/purchase/${po.id}`);
}

/** Chuyển trạng thái PO: draft → ordered → received (hoặc huỷ). */
export async function setPOStatusAction(fd: FormData) {
  await requirePermission("purchase.manage");
  const id = s(fd, "id");
  const status = s(fd, "status") as POStatus;
  if (!id || !status) return;
  await updatePurchaseOrder(id, { status });
  revalidatePath("/purchase");
  revalidatePath(`/purchase/${id}`);
}
