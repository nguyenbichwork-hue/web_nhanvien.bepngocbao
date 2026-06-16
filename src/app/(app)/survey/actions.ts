"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createSurvey } from "@/lib/bnb/store";
import type { KitchenLayout } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();
const num = (fd: FormData, k: string) => {
  const v = s(fd, k).replace(/[^\d]/g, "");
  return v ? Number(v) : undefined;
};

export async function createSurveyAction(fd: FormData) {
  const sess = await requirePermission("survey.manage");

  // "ref" gói cả lead & khách hàng: tiền tố "lead:" / "cus:".
  const ref = s(fd, "ref");
  const leadId = ref.startsWith("lead:") ? ref.slice(5) : undefined;
  const customerId = ref.startsWith("cus:") ? ref.slice(4) : undefined;

  // Gom ảnh từ các ô ImageUpload (photo0..photo2) thành mảng data URL.
  const photos = ["photo0", "photo1", "photo2"]
    .map((k) => s(fd, k))
    .filter(Boolean);

  const layout = s(fd, "layout") as KitchenLayout | "";

  await createSurvey({
    leadId,
    customerId,
    address: s(fd, "address") || undefined,
    layout: layout || undefined,
    lengthCm: num(fd, "lengthCm"),
    widthCm: num(fd, "widthCm"),
    heightCm: num(fd, "heightCm"),
    currentStatus: s(fd, "currentStatus") || undefined,
    needs: s(fd, "needs") || undefined,
    photos: photos.length ? photos : undefined,
    note: s(fd, "note") || undefined,
    byId: sess.employee?.id,
  });

  revalidatePath("/survey");
}
