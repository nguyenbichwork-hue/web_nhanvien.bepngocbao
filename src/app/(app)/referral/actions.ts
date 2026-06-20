"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createReferral, updateReferral, deleteReferral } from "@/lib/bnb/store";
import type { CxReferral } from "@/lib/bnb/types";

export async function saveReferralAction(input: { id?: string } & Partial<CxReferral>) {
  await requirePermission("lead.read");
  const { id, ...rest } = input;
  if (id) {
    await updateReferral(id, rest);
  } else {
    await createReferral({
      referrerName: rest.referrerName || "Khách giới thiệu",
      referrerPhone: rest.referrerPhone,
      referrerCustomerId: rest.referrerCustomerId,
      referrerJourneyId: rest.referrerJourneyId,
      refereeName: rest.refereeName,
      refereePhone: rest.refereePhone,
      status: rest.status,
      orderId: rest.orderId,
      revenue: rest.revenue,
      rewardKind: rest.rewardKind,
      rewardValue: rest.rewardValue,
      rewardStatus: rest.rewardStatus,
      ownerId: rest.ownerId,
      note: rest.note,
    });
  }
  revalidatePath("/referral");
}

export async function setReferralStatusAction(id: string, status: CxReferral["status"]) {
  await requirePermission("lead.read");
  await updateReferral(id, { status });
  revalidatePath("/referral");
}

export async function setRewardSentAction(id: string, sent: boolean) {
  await requirePermission("lead.read");
  await updateReferral(id, { rewardStatus: sent ? "sent" : "pending" });
  revalidatePath("/referral");
}

export async function deleteReferralAction(id: string) {
  await requirePermission("lead.read");
  await deleteReferral(id);
  revalidatePath("/referral");
}
