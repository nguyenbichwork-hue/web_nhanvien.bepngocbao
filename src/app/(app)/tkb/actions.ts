"use server";
// TKB · server actions (chỉ admin: tkb.manage)
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { publishTkbSnapshot } from "@/lib/tkb/store";

export async function publishTkbAction(): Promise<{ ok: boolean; version?: string; error?: string }> {
  const s = await requirePermission("tkb.manage");
  try {
    const ptr = await publishTkbSnapshot(s.user.email);
    revalidatePath("/tkb");
    return { ok: true, version: ptr.version };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 300) };
  }
}
