"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createBankTxn, matchBankTxn } from "@/lib/bnb/store";
import type { TxnDirection } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();
const num = (fd: FormData, k: string) => {
  const v = s(fd, k).replace(/[^\d]/g, "");
  return v ? Number(v) : undefined;
};

export async function createBankTxnAction(fd: FormData) {
  await requirePermission("finance.manage");
  const amount = num(fd, "amount") || 0;
  if (amount <= 0) return;
  // input[type=date] → giữ yyyy-mm-dd; rỗng thì lấy hôm nay.
  const date = s(fd, "date") || new Date().toISOString().slice(0, 10);
  await createBankTxn({
    date,
    amount,
    direction: (s(fd, "direction") || "in") as TxnDirection,
    bank: s(fd, "bank") || undefined,
    ref: s(fd, "ref") || undefined,
    counterparty: s(fd, "counterparty") || undefined,
    matchedOrderId: s(fd, "matchedOrderId") || undefined,
    note: s(fd, "note") || undefined,
  });
  revalidatePath("/finance");
}

export async function matchTxnAction(fd: FormData) {
  await requirePermission("finance.manage");
  const id = s(fd, "id");
  if (!id) return;
  const orderId = s(fd, "matchedOrderId") || undefined;
  await matchBankTxn(id, orderId);
  revalidatePath("/finance");
}
