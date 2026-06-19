"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createShiftCheckin } from "@/lib/bnb/store";
import type { ShiftCheckin } from "@/lib/bnb/types";

// Lưu METADATA báo cáo ca vào Supabase. Ảnh + Telegram đã được client gửi thẳng
// qua Apps Script → Drive (giữ bot nguyên), KHÔNG đi qua đây.
export async function saveShiftCheckinAction(input: Omit<ShiftCheckin, "id" | "createdAt">) {
  await requirePermission("shiftreport.read");
  await createShiftCheckin(input);
  revalidatePath("/checkin");
}
