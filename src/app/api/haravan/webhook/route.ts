// Webhook Haravan → đồng bộ real-time (tồn kho/sản phẩm/đơn).
// Haravan POST sự kiện (product/update, inventory_levels/update, orders/*) tới đây.
// Xác thực HMAC-SHA256 (base64) trên RAW body bằng HARAVAN_WEBHOOK_SECRET, rồi
// bust cache tag "haravan" + revalidate các trang liên quan → dữ liệu tươi ngay.
//
// Đăng ký webhook (một lần, cần URL public sau khi deploy Vercel):
//   POST https://apis.haravan.com/com/webhooks.json
//   { "webhook": { "topic": "inventory_levels/update",
//                  "address": "https://<domain>/api/haravan/webhook",
//                  "format": "json" } }
//   (lặp cho topic: product/update, products/update, orders/create, orders/updated)

import crypto from "crypto";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.HARAVAN_WEBHOOK_SECRET || "";
  const sent = req.headers.get("x-haravan-hmac-sha256") || "";
  const topic = req.headers.get("x-haravan-topic") || "unknown";

  // Khi đã đặt secret → BẮT BUỘC khớp HMAC. Chưa đặt → chấp nhận (tiện thử nội bộ).
  if (secret) {
    try {
      const digest = crypto.createHmac("sha256", secret).update(raw, "utf8").digest("base64");
      const a = Buffer.from(digest);
      const b = Buffer.from(sent);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return new Response("invalid hmac", { status: 401 });
      }
    } catch {
      return new Response("hmac error", { status: 401 });
    }
  }

  // Làm tươi dữ liệu Haravan đang cache (trang Tồn kho dùng no-store nên luôn real-time).
  revalidatePath("/inventory");
  if (topic.startsWith("order")) {
    revalidatePath("/orders");
    revalidatePath("/dashboard");
    revalidatePath("/admin");
  }
  if (topic.startsWith("product") || topic.startsWith("inventory")) {
    revalidatePath("/quote");
    revalidatePath("/quote/new");
  }

  return Response.json({ ok: true, topic });
}

// GET để kiểm tra endpoint sống.
export async function GET() {
  return Response.json({ ok: true, service: "haravan-webhook" });
}
