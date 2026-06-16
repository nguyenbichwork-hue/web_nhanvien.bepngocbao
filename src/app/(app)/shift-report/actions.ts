"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createShiftReport } from "@/lib/bnb/store";
import type { ShiftKind } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();
const num = (fd: FormData, k: string) => {
  const v = s(fd, k).replace(/[^\d]/g, "");
  return v ? Number(v) : undefined;
};

export async function createShiftReportAction(fd: FormData) {
  const sess = await requirePermission("shiftreport.manage");

  const date = s(fd, "date") || new Date().toISOString().slice(0, 10);
  const shift = (s(fd, "shift") || "full") as ShiftKind;

  await createShiftReport({
    date,
    shift,
    showroom: s(fd, "showroom") || undefined,
    revenue: num(fd, "revenue"),
    orders: num(fd, "orders"),
    leads: num(fd, "leads"),
    visitors: num(fd, "visitors"),
    issues: s(fd, "issues") || undefined,
    handover: s(fd, "handover") || undefined,
    byId: sess.employee?.id,
  });

  revalidatePath("/shift-report");
  revalidatePath("/dashboard");
}
