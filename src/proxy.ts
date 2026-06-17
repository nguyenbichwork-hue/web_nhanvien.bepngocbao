// Proxy (tên mới của "middleware" ở bản Next này): làm tươi session Supabase Auth
// + thực thi 2FA trên mỗi request server. CHỈ chạy khi đã bật Supabase Auth
// (NEXT_PUBLIC_SUPABASE_AUTH=1); ngược lại trả qua ngay (đăng nhập cookie khr_uid).
//
// Vì sao cần: @supabase/ssr lưu token trong cookie; Server Components không tự refresh.
// Gọi getUser() để xoay token sắp hết hạn & ghi cookie mới → tránh "đăng xuất ảo".

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseAuthEnabled } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseAuthEnabled || !SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Bắt buộc gọi để xoay token; KHÔNG chèn logic giữa createServerClient và getUser.
  const { data: { user } } = await supabase.auth.getUser();

  // Thực thi 2FA: tài khoản đã bật TOTP nhưng phiên mới ở aal1 (chưa nhập mã) →
  // buộc về trang đăng nhập để hoàn tất. Fail-open (lỗi → cho qua) để không khoá nhầm.
  if (user) {
    const path = request.nextUrl.pathname;
    const exempt = path.startsWith("/login") || path.startsWith("/auth") || path.startsWith("/forbidden");
    if (!exempt) {
      try {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal && aal.currentLevel === "aal1" && aal.nextLevel === "aal2") {
          const url = request.nextUrl.clone();
          url.pathname = "/login";
          url.searchParams.set("mfa", "1");
          return NextResponse.redirect(url);
        }
      } catch {
        /* fail-open */
      }
    }
  }
  return response;
}

export const config = {
  // Bỏ qua tài nguyên tĩnh & ảnh để proxy không chạy thừa.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
