// Agent đẩy KẾT QUẢ giá thị trường về (lô) + cập nhật trạng thái lần chạy.
// Body:
//   { start:true, total, machine }            -> đánh dấu bắt đầu
//   { results:[AgentPrice...] }               -> lưu 1 lô giá
//   { done:true, lastCount, total, machine }  -> kết thúc, ghi thời điểm
import { NextResponse, type NextRequest } from "next/server";
import { checkAgentToken } from "@/lib/bnb/agent-auth";
import { saveAgentPrices, setAgentStatus, type AgentPrice } from "@/lib/bnb/market/agent-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const err = checkAgentToken(req);
  if (err) return NextResponse.json({ ok: false, error: err }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    start?: boolean; done?: boolean; results?: AgentPrice[];
    total?: number; lastCount?: number; machine?: string;
  };

  if (body.start) {
    await setAgentStatus({
      running: true,
      startedAt: new Date().toISOString(),
      total: body.total ?? 0,
      machine: body.machine || "",
    });
  }

  let saved = 0;
  if (Array.isArray(body.results) && body.results.length) {
    const clean = body.results
      .filter((r) => r && r.code)
      .map((r) => ({ ...r, at: r.at || new Date().toISOString() }));
    await saveAgentPrices(clean);
    saved = clean.length;
  }

  if (body.done) {
    await setAgentStatus({
      running: false,
      lastRunAt: new Date().toISOString(),
      lastCount: body.lastCount ?? 0,
      total: body.total ?? 0,
      machine: body.machine || "",
    });
  }

  return NextResponse.json({ ok: true, saved });
}
