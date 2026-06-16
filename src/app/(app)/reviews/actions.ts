"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createReview, respondReview } from "@/lib/bnb/store";
import type { ReviewChannel } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();

/** Clamp số sao về khoảng 1..5. */
const clampRating = (n: number): number => Math.min(5, Math.max(1, Math.round(n || 0)));

export async function createReviewAction(fd: FormData) {
  const sess = await requirePermission("review.manage");
  const customerName = s(fd, "customerName");
  if (!customerName) return;
  await createReview({
    customerName,
    channel: (s(fd, "channel") || "google") as ReviewChannel,
    rating: clampRating(Number(s(fd, "rating") || "5")),
    content: s(fd, "content") || undefined,
    status: "new",
    byId: sess.employee?.id,
  });
  revalidatePath("/reviews");
}

export async function respondReviewAction(fd: FormData) {
  const sess = await requirePermission("review.manage");
  const id = s(fd, "id");
  const response = s(fd, "response");
  if (!id || !response) return;
  await respondReview(id, response, sess.employee?.id);
  revalidatePath("/reviews");
}
