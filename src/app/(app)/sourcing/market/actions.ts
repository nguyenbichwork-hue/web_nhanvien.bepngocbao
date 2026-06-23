"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { setMarketConfig } from "@/lib/bnb/market/store";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();
const num = (fd: FormData, k: string, def: number) => {
  const v = parseInt(s(fd, k).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(v) && v > 0 ? v : def;
};

/** Lưu cấu hình Auto Pricing. Ô để TRỐNG (url/secret) → GIỮ NGUYÊN giá trị cũ (không xoá). */
export async function saveMarketSettingsAction(fd: FormData) {
  await requirePermission("quote.manage");
  const url = s(fd, "appsScriptUrl");
  const secret = s(fd, "sheetSecret");
  const sheetUrl = s(fd, "sheetUrl");
  const patch: Record<string, unknown> = {
    luongDong: num(fd, "luongDong", 5),
    luongLink: num(fd, "luongLink", 5),
    batch: num(fd, "batch", 20),
    maxLinks: num(fd, "maxLinks", 12),
  };
  if (url) patch.appsScriptUrl = url;        // chỉ ghi đè khi có nhập
  if (secret) patch.sheetSecret = secret;    // trống → giữ secret cũ
  if (sheetUrl) patch.sheetUrl = sheetUrl;
  await setMarketConfig(patch);
  revalidatePath("/sourcing/market");
}
