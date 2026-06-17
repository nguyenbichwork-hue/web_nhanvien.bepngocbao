"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { registerHaravanWebhooks } from "@/lib/haravan/client";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();

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
