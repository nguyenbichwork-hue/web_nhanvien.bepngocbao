"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { registerHaravanWebhooks } from "@/lib/haravan/client";
import { updateGroup } from "@/lib/org/store";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();

/** Ngày 1..31 hoặc undefined. */
function dayOrUndef(fd: FormData, k: string): number | undefined {
  const n = Number(s(fd, k));
  return n >= 1 && n <= 31 ? Math.round(n) : undefined;
}

/** Lưu cấu hình hệ thống (tên/SĐT/email/giờ làm/ngày lương) — không cần sửa code. */
export async function updateSystemConfigAction(fd: FormData) {
  await requirePermission("system.rbac");
  await updateGroup({
    name: s(fd, "name") || undefined,
    owner: s(fd, "owner") || undefined,
    systemEmail: s(fd, "systemEmail") || undefined,
    phone: s(fd, "phone") || undefined,
    website: s(fd, "website") || undefined,
    standardHours: s(fd, "standardHours") || undefined,
    payCutoffDay: dayOrUndef(fd, "payCutoffDay"),
    payDay: dayOrUndef(fd, "payDay"),
  });
  revalidatePath("/integrations");
  revalidatePath("/settings");
  redirect("/integrations?cfg=1");
}

/** Đăng ký webhook Haravan trỏ về domain hiện tại (idempotent). */
export async function registerWebhooksAction(fd: FormData) {
  await requirePermission("system.rbac");
  const baseUrl = s(fd, "baseUrl");
  if (!/^https?:\/\//.test(baseUrl)) {
    redirect("/integrations?err=" + encodeURIComponent("URL không hợp lệ (cần http/https)"));
  }
  const results = await registerHaravanWebhooks(baseUrl);
  const created = results.filter((r) => r.status === "created").length;
  const exists = results.filter((r) => r.status === "exists").length;
  const errors = results.filter((r) => r.status === "error").length;
  revalidatePath("/integrations");
  redirect(`/integrations?reg=${created}-${exists}-${errors}`);
}
