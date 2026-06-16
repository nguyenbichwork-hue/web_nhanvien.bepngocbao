"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import {
  createPillar, createCalendarItem, updateCalendarItem, createAdCampaign,
} from "@/lib/bnb/store";
import type { MktChannel, ContentStatus, AdStatus } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();
const num = (fd: FormData, k: string) => {
  const v = s(fd, k).replace(/[^\d]/g, "");
  return v ? Number(v) : undefined;
};

export async function createPillarAction(fd: FormData) {
  await requirePermission("marketing.manage");
  const name = s(fd, "name");
  if (!name) return;
  await createPillar({
    name,
    desc: s(fd, "desc") || undefined,
    color: s(fd, "color") || undefined,
  });
  revalidatePath("/marketing");
}

export async function createCalendarItemAction(fd: FormData) {
  const sess = await requirePermission("marketing.manage");
  const title = s(fd, "title");
  if (!title) return;
  // input[type=datetime-local] → ISO; rỗng thì lấy thời điểm hiện tại.
  const raw = s(fd, "scheduledAt");
  const scheduledAt = raw ? new Date(raw).toISOString() : new Date().toISOString();
  await createCalendarItem({
    title,
    channel: (s(fd, "channel") || "facebook") as MktChannel,
    pillarId: s(fd, "pillarId") || undefined,
    status: (s(fd, "status") || "planned") as ContentStatus,
    scheduledAt,
    note: s(fd, "note") || undefined,
    byId: sess.employee?.id,
  });
  revalidatePath("/marketing");
}

export async function setContentStatusAction(fd: FormData) {
  await requirePermission("marketing.manage");
  const id = s(fd, "id");
  const status = s(fd, "status") as ContentStatus;
  if (!id || !status) return;
  await updateCalendarItem(id, { status });
  revalidatePath("/marketing");
}

export async function createAdCampaignAction(fd: FormData) {
  await requirePermission("marketing.manage");
  const name = s(fd, "name");
  if (!name) return;
  await createAdCampaign({
    name,
    channel: (s(fd, "channel") || "facebook") as MktChannel,
    spend: num(fd, "spend") || 0,
    leads: num(fd, "leads") || 0,
    clicks: num(fd, "clicks"),
    startAt: s(fd, "startAt") || undefined,
    endAt: s(fd, "endAt") || undefined,
    status: (s(fd, "status") || "active") as AdStatus,
  });
  revalidatePath("/marketing");
}
