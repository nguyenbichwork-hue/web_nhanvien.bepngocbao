// Bóc THÔNG SỐ/XUẤT XỨ/BẢO HÀNH cho 1 SP (làm giàu file catalog). CHẠY LOCAL (search
// engine không bị chặn). Mở khi LOCAL_SCRAPE=1; trên Vercel vẫn gate quyền.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { enrichProduct } from "@/lib/bnb/market/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (process.env.LOCAL_SCRAPE !== "1") await requirePermission("quote.read");
  const body = (await req.json().catch(() => ({}))) as { query?: string; model?: string };
  const query = String(body.query || body.model || "").trim();
  const model = String(body.model || "").trim();
  if (!query || !model) return NextResponse.json({ ok: false, error: "Thiếu query/model" }, { status: 400 });
  try {
    const r = await enrichProduct(query, model);
    return NextResponse.json({ ok: true, found: !!r, ...(r || {}) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
