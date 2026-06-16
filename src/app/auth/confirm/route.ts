import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Xác thực liên kết email của Supabase (đặt lại mật khẩu, xác nhận đăng ký, magic link…)
 * theo luồng `token_hash` + `verifyOtp`. Khác với luồng PKCE (`?code=`), cách này KHÔNG cần
 * `code_verifier` lưu sẵn ở trình duyệt → mở link ở BẤT KỲ trình duyệt/thiết bị nào cũng chạy
 * (HR gửi, nhân viên mở trên điện thoại…). verifyOtp đặt phiên vào cookie phía server, rồi
 * chuyển hướng sang `next` (mặc định /reset-password) — trang đó đọc phiên và cho đặt MK mới.
 *
 * Template email Supabase (Authentication → Emails → Reset Password) phải trỏ vào đây:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNext(searchParams.get("next"));

  if (tokenHash && type) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // Liên kết thiếu tham số / sai / đã hết hạn.
  return NextResponse.redirect(new URL("/forgot-password?err=expired", origin));
}

/** Chỉ cho phép đường dẫn nội bộ để tránh open-redirect. */
function sanitizeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/reset-password";
}
