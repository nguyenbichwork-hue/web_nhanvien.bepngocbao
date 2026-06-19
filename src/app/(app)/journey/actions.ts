"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import {
  createCxJourney, updateCxJourney, deleteCxJourney, syncCxJourneysFromLeads,
} from "@/lib/bnb/store";
import type { CxJourney, JourneyStageKey } from "@/lib/bnb/types";

export async function saveJourneyAction(input: { id?: string } & Partial<CxJourney>) {
  await requirePermission("lead.read");
  const { id, ...rest } = input;
  if (id) {
    await updateCxJourney(id, rest);
  } else {
    await createCxJourney({
      name: rest.name || "Khách mới",
      phone: rest.phone, customerId: rest.customerId, leadId: rest.leadId,
      stage: (rest.stage as JourneyStageKey) || "trigger",
      ownerId: rest.ownerId, blocker: rest.blocker, nextFollowUpAt: rest.nextFollowUpAt,
      readyReferral: rest.readyReferral, note: rest.note,
    });
  }
  revalidatePath("/journey");
}

export async function advanceJourneyAction(id: string, stage: JourneyStageKey) {
  await requirePermission("lead.read");
  await updateCxJourney(id, { stage });
  revalidatePath("/journey");
}

export async function deleteJourneyAction(id: string) {
  await requirePermission("lead.read");
  await deleteCxJourney(id);
  revalidatePath("/journey");
}

export async function syncJourneysAction(): Promise<{ added: number }> {
  await requirePermission("lead.read");
  const r = await syncCxJourneysFromLeads();
  revalidatePath("/journey");
  return r;
}
