// Dựng bảng so giá: khớp SP của mình với giá đã cào → giá thấp nhất TT + giá đề xuất.
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { getMine, listSites, getMarketConfig } from "@/lib/bnb/market/store";
import { compareMarket } from "@/lib/bnb/market/compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  await requirePermission("quote.manage");
  try {
    const [mine, sites, cfg] = await Promise.all([getMine(), listSites(), getMarketConfig()]);
    const rows = compareMarket(mine.items, sites, cfg);
    return NextResponse.json({ ok: true, rows, sitesCrawled: sites.length, myCount: mine.items.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
