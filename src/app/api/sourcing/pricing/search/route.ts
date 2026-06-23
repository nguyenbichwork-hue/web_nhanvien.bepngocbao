// Tìm giá thị trường cho 1 sản phẩm (client gọi song song theo "luồng dòng").
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { searchProductPrices } from "@/lib/bnb/market/search";
import { officialDomainFor } from "@/lib/bnb/market/discovery";
import { filterOutliers } from "@/lib/bnb/market/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  await requirePermission("quote.read");
  const body = (await req.json().catch(() => ({}))) as {
    query?: string; model?: string; brand?: string; maxLinks?: number; concurrency?: number;
  };
  const query = String(body.query || body.model || "").trim();
  const model = String(body.model || "").trim();
  if (!query) return NextResponse.json({ ok: false, error: "Thiếu query" }, { status: 400 });

  try {
    const official = body.brand ? officialDomainFor(body.brand) || undefined : undefined;
    const r = await searchProductPrices(query, model, {
      maxLinks: body.maxLinks ?? 12,
      concurrency: body.concurrency ?? 5,
      officialDomain: official,
    });
    // Lọc giá ảo/outlier → min đáng tin
    const { kept, dropped } = filterOutliers(r.prices);
    const vals = kept.map((m) => m.price);
    const min = vals.length ? Math.min(...vals) : null;
    const officialMin = kept.filter((m) => m.official).map((m) => m.price).sort((a, b) => a - b)[0] ?? null;
    return NextResponse.json({
      ok: true,
      prices: kept,
      siteCount: new Set(kept.map((m) => m.siteName)).size,
      storesFound: r.storesFound,
      linksOpened: r.linksOpened,
      dropped,
      min,
      officialMin,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
