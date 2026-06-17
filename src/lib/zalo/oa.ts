// Zalo Official Account (OA) — Open API gửi/nhận tin nhắn hội thoại (khác ZNS).
// ZNS (zns.ts) = tin template chăm sóc; OA Message API = chat 2 chiều với khách
// trong cửa sổ 7 ngày kể từ tin cuối của khách (chính sách Zalo).
//
// Cấu hình (.env.local):
//   ZALO_OA_ACCESS_TOKEN  — access token của OA (Zalo for Developers, làm mới định kỳ)
//   ZALO_OA_SECRET_KEY    — OA secret, để xác thực chữ ký webhook (X-ZEvent-Signature)
//
// Thiếu token → no-op (trả {ok:false}); webhook vẫn nhận và lưu hội thoại bình thường,
// chỉ không gửi được tin ra. Tham khảo: https://developers.zalo.me/docs/official-account

const TOKEN = process.env.ZALO_OA_ACCESS_TOKEN || "";
const SECRET = process.env.ZALO_OA_SECRET_KEY || "";
const SEND_URL = "https://openapi.zalo.me/v3.0/oa/message/cs";
const PROFILE_URL = "https://openapi.zalo.me/v3.0/oa/user/detail";

export function oaConfigured(): boolean {
  return Boolean(TOKEN);
}
export function oaSecret(): string {
  return SECRET;
}

export type OaSendResult = { ok: boolean; reason?: string; msgId?: string };

/** Gửi 1 tin văn bản tới user Zalo (CS message, trong cửa sổ tương tác 7 ngày). */
export async function sendOAMessage(zaloUserId: string, text: string): Promise<OaSendResult> {
  if (!TOKEN) return { ok: false, reason: "no_token" };
  if (!zaloUserId || !text.trim()) return { ok: false, reason: "empty" };
  try {
    const res = await fetch(SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: TOKEN },
      body: JSON.stringify({
        recipient: { user_id: zaloUserId },
        message: { text: text.slice(0, 2000) },
      }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: number; message?: string; data?: { message_id?: string };
    };
    if (json.error === 0) return { ok: true, msgId: json.data?.message_id };
    return { ok: false, reason: json.message || `error ${json.error}` };
  } catch (err) {
    console.error("[zalo-oa] gửi thất bại:", err);
    return { ok: false, reason: "exception" };
  }
}

export type OaProfile = { name?: string; avatar?: string; phone?: string };

/** Lấy hồ sơ người dùng Zalo (tên/avatar) để hiển thị trong inbox. */
export async function fetchOAProfile(zaloUserId: string): Promise<OaProfile | null> {
  if (!TOKEN || !zaloUserId) return null;
  try {
    const url = `${PROFILE_URL}?data=${encodeURIComponent(JSON.stringify({ user_id: zaloUserId }))}`;
    const res = await fetch(url, { headers: { access_token: TOKEN }, cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as {
      error?: number; data?: { display_name?: string; avatar?: string; shared_info?: { phone?: string } };
    };
    if (json.error !== 0 || !json.data) return null;
    return {
      name: json.data.display_name,
      avatar: json.data.avatar,
      phone: json.data.shared_info?.phone,
    };
  } catch {
    return null;
  }
}
