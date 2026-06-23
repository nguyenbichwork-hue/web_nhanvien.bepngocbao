// Cào catalog 1 web (miễn phí) rồi lưu Supabase. Client gọi lần lượt từng web để vượt giới hạn 60s.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { crawlSite } from "@/lib/bnb/market/crawl-site";
import { saveSite } from "@/lib/bnb/market/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  await requirePermission("quote.manage");
  const body = await req.json().catch(() => ({}));
  const raw = String(body?.url || "").trim();
  if (!raw) return NextResponse.json({ ok: false, error: "Thiếu url" }, { status: 400 });
  const url = raw.startsWith("http") ? raw : "https://" + raw;
  const official = Boolean(body?.official);
  const brand = body?.brand ? String(body.brand) : undefined;
  const maxProducts = Math.max(100, Math.min(4000, Number(body?.maxProducts) || 2000));

  let domain = raw;
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* keep */
  }
  try {
    const r = await crawlSite(url, { maxProducts, budgetMs: 38000 });
    await saveSite({
      domain,
      siteName: r.siteName,
      official,
      brand,
      platform: r.platform,
      count: r.products.length,
      products: r.products,
      crawledAt: new Date().toISOString(),
      note: r.note,
    });
    return NextResponse.json({ ok: true, domain, count: r.products.length, platform: r.platform, note: r.note });
  } catch (e) {
    return NextResponse.json({ ok: false, domain, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
