// Gửi email giao dịch qua Resend (HTTP API) — CHẠY ĐƯỢC trên Cloudflare Workers
// (nodemailer cần TCP socket nên KHÔNG dùng được ở đó).
//
// Cấu hình bằng secret trên worker:
//   wrangler secret put RESEND_API_KEY            # khoá API từ resend.com
//   (tuỳ chọn) EMAIL_FROM = "K-Homes HRM <no-reply@your-domain>"  # domain đã verify ở Resend
//
// Khi THIẾU RESEND_API_KEY → mọi lời gọi là no-op (trả false), app vẫn chạy bình thường.

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM = process.env.EMAIL_FROM || "K-Homes HRM <onboarding@resend.dev>";

export const isEmailConfigured = Boolean(RESEND_API_KEY);

export type SendEmailInput = {
  to: string;
  subject: string;
  /** Nội dung HTML (ưu tiên). Nếu chỉ có text thì để trống. */
  html?: string;
  /** Nội dung thuần (fallback khi không có html). */
  text?: string;
};

/**
 * Gửi 1 email. Trả true nếu Resend nhận đơn, false nếu chưa cấu hình/địa chỉ rỗng/lỗi.
 * KHÔNG ném lỗi — gửi mail hỏng không được làm gãy thao tác nghiệp vụ đang chạy.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<boolean> {
  if (!isEmailConfigured || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Bọc nội dung thông báo thành một email HTML gọn cho hệ thống HRM. */
export function notificationEmailHtml(opts: {
  title: string;
  body?: string;
  href?: string;
  siteUrl: string;
}): string {
  const link = opts.href ? `${opts.siteUrl}${opts.href}` : opts.siteUrl;
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;padding:24px;font-family:Segoe UI,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#fff;padding:14px 20px;border-bottom:1px solid #eef2f7">
      <img src="${opts.siteUrl}/logo.png" alt="Bếp Ngọc Bảo" style="height:26px;display:block" />
    </div>
    <div style="padding:20px">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111827">${escapeHtml(opts.title)}</h2>
      ${opts.body ? `<p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.5">${escapeHtml(opts.body)}</p>` : ""}
      <a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Mở hệ thống</a>
    </div>
    <div style="padding:12px 20px;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6">Email tự động — vui lòng không trả lời.</div>
  </div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
