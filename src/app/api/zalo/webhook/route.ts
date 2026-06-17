// Webhook Zalo OA → nhận tin khách gửi, lưu vào hộp thoại (/inbox).
// Zalo POST event (user_send_text, user_send_image, follow...) tới endpoint này.
// Xác thực chữ ký: X-ZEvent-Signature = "mac=" + sha256(appId + rawBody + timestamp + OASecret).
//
// Đăng ký: khai URL này ở Zalo for Developers → OA → Webhook:
//   https://<domain>/api/zalo/webhook
// Thiếu ZALO_OA_SECRET_KEY → bỏ qua kiểm tra chữ ký (tiện thử nội bộ).

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import {
  appendMessage, createConversation, findConversationByZaloUser,
} from "@/lib/bnb/store";
import { fetchOAProfile, oaSecret } from "@/lib/zalo/oa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ZaloEvent = {
  app_id?: string;
  event_name?: string;
  timestamp?: string | number;
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { msg_id?: string; text?: string };
  follower?: { id?: string };
};

export async function POST(req: Request) {
  const raw = await req.text();
  const secret = oaSecret();
  const sig = req.headers.get("x-zevent-signature") || "";

  let ev: ZaloEvent;
  try {
    ev = JSON.parse(raw) as ZaloEvent;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  // Xác thực chữ ký khi đã có OA secret.
  if (secret) {
    const mac = crypto
      .createHash("sha256")
      .update(`${ev.app_id || ""}${raw}${ev.timestamp || ""}${secret}`)
      .digest("hex");
    const expected = `mac=${mac}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return new Response("invalid signature", { status: 401 });
    }
  }

  // Chỉ xử lý tin văn bản khách gửi vào.
  if (ev.event_name === "user_send_text" && ev.sender?.id && ev.message?.text) {
    const zaloUserId = ev.sender.id;
    let conv = await findConversationByZaloUser(zaloUserId);
    if (!conv) {
      const profile = await fetchOAProfile(zaloUserId);
      conv = await createConversation({
        zaloUserId,
        name: profile?.name || `Khách Zalo ${zaloUserId.slice(-4)}`,
        avatar: profile?.avatar,
        phone: profile?.phone,
        status: "pending",
        unread: 0,
      });
    }
    await appendMessage({
      conversationId: conv.id,
      direction: "in",
      text: ev.message.text,
      msgId: ev.message.msg_id,
    });
    revalidatePath("/inbox");
  }

  return Response.json({ ok: true });
}

// GET để Zalo verify endpoint sống.
export async function GET() {
  return Response.json({ ok: true, service: "zalo-oa-webhook" });
}
