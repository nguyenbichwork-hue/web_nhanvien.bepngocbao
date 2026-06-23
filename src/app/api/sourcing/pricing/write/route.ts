// Ghi 1 lô kết quả lên Google Sheet (cột G..O + công thức Lợi nhuận/%LN).
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { getMarketConfig } from "@/lib/bnb/market/store";
import {
  sheetWriteResults, sheetConfigured, sheetCfgFromEnv,
  type SheetConfig, type SheetResultItem,
} from "@/lib/bnb/market/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  await requirePermission("quote.manage");
  const body = (await req.json().catch(() => ({}))) as { items?: SheetResultItem[] };
  const items = body.items || [];
  if (!items.length) return NextResponse.json({ ok: false, error: "Không có dòng để ghi" }, { status: 400 });

  const c = await getMarketConfig();
  const env = sheetCfgFromEnv();
  const conf: SheetConfig = { url: c.appsScriptUrl || env.url, secret: c.sheetSecret || env.secret };
  if (!sheetConfigured(conf)) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình Apps Script." }, { status: 400 });
  }
  try {
    const r = await sheetWriteResults(conf, items);
    return NextResponse.json({ ok: true, written: r.written });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
