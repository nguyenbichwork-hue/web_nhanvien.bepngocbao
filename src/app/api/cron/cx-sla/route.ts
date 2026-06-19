// Cron CX SLA — Vercel Cron gọi mỗi ngày (xem vercel.json).
// Đẩy các mốc SLA hành trình đến hạn (48H/check-in D1-3-7/mời review) thành
// follow-up hôm nay. Bảo vệ bằng CRON_SECRET.
import { runCxSla } from "@/lib/bnb/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  }
  const result = await runCxSla();
  return Response.json({ ok: true, ...result });
}
