// Đưa toàn bộ catalog SP của mình (bnb_cost_items) vào Google Sheet (cột A..F).
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { listCostItems } from "@/lib/bnb/cost-store";
import { getMarketConfig } from "@/lib/bnb/market/store";
import {
  sheetImportProducts, sheetConfigured, sheetCfgFromEnv,
  type SheetConfig, type SheetImportItem,
} from "@/lib/bnb/market/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  await requirePermission("quote.manage");
  const c = await getMarketConfig();
  const env = sheetCfgFromEnv();
  const conf: SheetConfig = { url: c.appsScriptUrl || env.url, secret: c.sheetSecret || env.secret };
  if (!sheetConfigured(conf)) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình Apps Script (tab Cài đặt)." }, { status: 400 });
  }
  const items = await listCostItems();
  const mapped: SheetImportItem[] = items.map((c2) => ({
    ma: c2.code ?? "",
    brand: c2.brand ?? "",
    model: c2.model ?? "",
    ten: [c2.cat, c2.brand, c2.model].filter(Boolean).join(" "),
    giaVon: c2.von ?? null,
    giaHienTai: c2.ban ?? (c2.ny ?? null),
  }));
  try {
    const r = await sheetImportProducts(conf, "SanPham", mapped);
    return NextResponse.json({ ok: true, written: r.written });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
