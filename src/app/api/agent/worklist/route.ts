// Agent cào giá (máy nhân viên) lấy DANH SÁCH SP cần cào giá mỗi sáng.
// Trả toàn bộ kho giá vốn (catalog ~1.5k SP) kèm query + domain chính hãng để xác minh.
import { NextResponse, type NextRequest } from "next/server";
import { checkAgentToken } from "@/lib/bnb/agent-auth";
import { listCostItems } from "@/lib/bnb/cost-store";
import { officialDomainFor } from "@/lib/bnb/market/discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const err = checkAgentToken(req);
  if (err) return NextResponse.json({ ok: false, error: err }, { status: 401 });
  const items = await listCostItems();
  const work = items
    .filter((c) => c.code && c.model)
    .map((c) => ({
      code: c.code as string,
      brand: c.brand,
      model: c.model,
      cat: c.cat || "",
      query: [c.brand, c.model, c.cat].filter(Boolean).join(" ").trim(),
      official: officialDomainFor(c.brand) || "",
    }));
  return NextResponse.json({ ok: true, count: work.length, items: work });
}
