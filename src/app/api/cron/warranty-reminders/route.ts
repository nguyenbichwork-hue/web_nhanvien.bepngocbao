// Cron nhắc bảo hành — Vercel Cron gọi mỗi ngày (xem vercel.json).
// Quét bảo hành đến mốc 1/7/30/90 ngày → tạo việc chăm sóc + gửi ZNS cho khách.
// Bảo vệ bằng CRON_SECRET (Vercel gửi header Authorization: Bearer <CRON_SECRET>).

import { runWarrantyReminders } from "@/lib/bnb/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return new Response("unauthorized", { status: 401 });
    }
  }
  const result = await runWarrantyReminders();
  return Response.json({ ok: true, ...result });
}
