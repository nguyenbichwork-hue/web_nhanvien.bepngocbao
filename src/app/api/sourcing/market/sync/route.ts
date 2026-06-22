// Đồng bộ SP của mình từ Haravan vào cache (bấm nút) — để so giá không phải gọi Haravan mỗi lần.
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { getMyProducts } from "@/lib/bnb/market/mine";
import { saveMine } from "@/lib/bnb/market/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  await requirePermission("quote.manage");
  try {
    const my = await getMyProducts(5000);
    await saveMine(my);
    return NextResponse.json({ ok: true, count: my.length, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
