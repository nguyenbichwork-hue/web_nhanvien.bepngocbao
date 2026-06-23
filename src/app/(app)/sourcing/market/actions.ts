"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { setMarketConfig } from "@/lib/bnb/market/store";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();
const num = (fd: FormData, k: string, def: number) => {
  const v = parseInt(s(fd, k).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(v) && v > 0 ? v : def;
};

/** Lưu cấu hình Auto Pricing: Apps Script URL/secret, link Sheet, luồng dòng/link, batch. */
export async function saveMarketSettingsAction(fd: FormData) {
  await requirePermission("quote.manage");
  await setMarketConfig({
    appsScriptUrl: s(fd, "appsScriptUrl") || undefined,
    sheetSecret: s(fd, "sheetSecret") || undefined,
    sheetUrl: s(fd, "sheetUrl") || undefined,
    luongDong: num(fd, "luongDong", 5),
    luongLink: num(fd, "luongLink", 5),
    batch: num(fd, "batch", 20),
    maxLinks: num(fd, "maxLinks", 12),
  });
  revalidatePath("/sourcing/market");
}
