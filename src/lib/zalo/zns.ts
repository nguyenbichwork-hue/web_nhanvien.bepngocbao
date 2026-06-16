// Zalo ZNS (Zalo Notification Service) — gửi tin nhắn template tới khách qua Zalo OA.
// Gate theo env; thiếu cấu hình → no-op (trả {ok:false}), app vẫn chạy như email.
//
// Cấu hình (.env.local):
//   ZALO_ZNS_ACCESS_TOKEN  — access token OA (Zalo for Developers, làm mới định kỳ)
//   ZALO_ZNS_TEMPLATE_CARE — template_id mẫu "chăm sóc sau mua" đã được Zalo duyệt
//
// Tham khảo: POST https://business.openapi.zalo.me/message/template
//   headers: { access_token }, body: { phone, template_id, template_data, tracking_id }

const TOKEN = process.env.ZALO_ZNS_ACCESS_TOKEN || "";
const CARE_TEMPLATE = process.env.ZALO_ZNS_TEMPLATE_CARE || "";
const ZNS_URL = "https://business.openapi.zalo.me/message/template";

export function znsConfigured(): boolean {
  return Boolean(TOKEN);
}

/** Chuẩn hoá SĐT VN về dạng 84xxxxxxxxx mà ZNS yêu cầu. */
function normalizePhone(phone: string): string {
  let p = phone.replace(/[^\d]/g, "");
  if (p.startsWith("0")) p = "84" + p.slice(1);
  else if (p.startsWith("84")) {
    /* giữ nguyên */
  } else if (p.length === 9) p = "84" + p;
  return p;
}

export type ZnsResult = { ok: boolean; reason?: string; msgId?: string };

/** Gửi 1 tin ZNS theo template. Trả {ok:false, reason} khi chưa cấu hình/lỗi. */
export async function sendZNS(opts: {
  phone: string;
  templateId: string;
  templateData: Record<string, string>;
  trackingId?: string;
}): Promise<ZnsResult> {
  if (!TOKEN) return { ok: false, reason: "no_token" };
  if (!opts.phone) return { ok: false, reason: "no_phone" };
  if (!opts.templateId) return { ok: false, reason: "no_template" };
  try {
    const res = await fetch(ZNS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: TOKEN },
      body: JSON.stringify({
        phone: normalizePhone(opts.phone),
        template_id: opts.templateId,
        template_data: opts.templateData,
        tracking_id: opts.trackingId || `bnb-${Date.now()}`,
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { error?: number; message?: string; data?: { msg_id?: string } };
    if (json.error === 0) return { ok: true, msgId: json.data?.msg_id };
    return { ok: false, reason: json.message || `error ${json.error}` };
  } catch (err) {
    console.error("[zns] gửi thất bại:", err);
    return { ok: false, reason: "exception" };
  }
}

/** Tiện ích: gửi tin chăm sóc sau mua (template CARE). */
export async function sendCareZNS(opts: {
  phone: string;
  customerName: string;
  productName: string;
  milestone: number;
}): Promise<ZnsResult> {
  if (!CARE_TEMPLATE) return { ok: false, reason: "no_care_template" };
  return sendZNS({
    phone: opts.phone,
    templateId: CARE_TEMPLATE,
    templateData: {
      customer_name: opts.customerName,
      product: opts.productName,
      milestone: String(opts.milestone),
    },
  });
}
