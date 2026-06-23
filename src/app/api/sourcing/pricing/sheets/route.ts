// Proxy tới Apps Script: ping / setup / listSheets / getProducts.
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { getMarketConfig } from "@/lib/bnb/market/store";
import {
  sheetPing, sheetSetup, sheetList, sheetGetProducts, sheetConfigured, sheetCfgFromEnv,
  type SheetConfig,
} from "@/lib/bnb/market/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function cfg(): Promise<SheetConfig> {
  const c = await getMarketConfig();
  const env = sheetCfgFromEnv();
  return { url: c.appsScriptUrl || env.url, secret: c.sheetSecret || env.secret };
}

export async function POST(req: NextRequest) {
  await requirePermission("quote.read");
  const body = (await req.json().catch(() => ({}))) as { action?: string; sheets?: string[] };
  const conf = await cfg();
  if (!sheetConfigured(conf)) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình Apps Script URL / Secret ở tab Cài đặt." }, { status: 400 });
  }
  try {
    switch (body.action) {
      case "ping": { const d = await sheetPing(conf); return NextResponse.json({ ok: true, sheet: d.sheet }); }
      case "setup": { const d = await sheetSetup(conf); return NextResponse.json({ ok: true, created: d.created }); }
      case "listSheets": return NextResponse.json({ ok: true, sheets: await sheetList(conf) });
      case "getProducts": return NextResponse.json({ ok: true, products: await sheetGetProducts(conf, body.sheets) });
      default: return NextResponse.json({ ok: false, error: "action không hợp lệ" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
