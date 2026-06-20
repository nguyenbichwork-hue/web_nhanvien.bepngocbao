"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createNpsResponse, markJourneyReadyReferral } from "@/lib/bnb/store";
import type { NpsChannel } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();

export async function recordNpsAction(fd: FormData) {
  const sess = await requirePermission("cx.manage");
  const name = s(fd, "customerName");
  const score = Math.max(0, Math.min(10, Number(s(fd, "score"))));
  if (!name || Number.isNaN(score)) return;
  const customerId = s(fd, "customerId") || undefined;
  await createNpsResponse({
    customerName: name,
    customerId,
    score,
    channel: (s(fd, "channel") || "call") as NpsChannel,
    comment: s(fd, "comment") || undefined,
    byId: sess.employee?.id,
  });
  // North Star: khách cho điểm khuyến nghị (≥9) → tự bật "sẵn sàng giới thiệu" trên hành trình.
  if (score >= 9 && (customerId || name)) {
    await markJourneyReadyReferral({ customerId, name });
  }
  revalidatePath("/cx");
  revalidatePath("/journey");
}
