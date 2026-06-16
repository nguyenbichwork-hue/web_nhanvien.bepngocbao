// Webhook nhận Lead từ form quảng cáo (Facebook/TikTok/Zalo) → tạo lead trong CRM.
// POST JSON: { name, phone, source?, need?, email?, secret? }
// Bảo vệ: nếu env LEADS_WEBHOOK_SECRET được đặt → BẮT BUỘC body.secret hoặc
//         header x-webhook-secret khớp, sai → 401. Thiếu name/phone → 400.
//
// Đăng ký (một lần, cần URL public sau khi deploy):
//   POST https://<domain>/api/leads/webhook
//   { "name": "Nguyễn A", "phone": "0901234567", "source": "facebook",
//     "need": "Báo giá bếp từ", "secret": "<LEADS_WEBHOOK_SECRET>" }

import { createLead } from "@/lib/bnb/store";
import { LEAD_SOURCES, type LeadSource } from "@/lib/bnb/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // Xác thực secret nếu đã cấu hình.
    const secret = process.env.LEADS_WEBHOOK_SECRET || "";
    if (secret) {
      const sent = req.headers.get("x-webhook-secret") || String(body.secret || "");
      if (sent !== secret) {
        return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
      }
    }

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    if (!name || !phone) {
      return Response.json({ ok: false, error: "missing name or phone" }, { status: 400 });
    }

    // Chỉ nhận source hợp lệ, mặc định facebook.
    const rawSource = String(body.source || "").trim();
    const source: LeadSource = (LEAD_SOURCES as string[]).includes(rawSource)
      ? (rawSource as LeadSource)
      : "facebook";

    const need = String(body.need || "").trim() || undefined;
    const email = String(body.email || "").trim() || undefined;

    const lead = await createLead({ name, phone, source, stage: "new", need, email });
    return Response.json({ ok: true, leadId: lead.id });
  } catch (err) {
    console.error("[leads-webhook] lỗi:", err);
    return Response.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}

// GET để kiểm tra endpoint sống.
export async function GET() {
  return Response.json({ ok: true, service: "leads-webhook" });
}
