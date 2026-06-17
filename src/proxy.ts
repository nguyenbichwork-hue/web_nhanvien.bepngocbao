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

  // Bỏ qua prefetch của Next (hover Link) → không gọi mạng làm tươi token cho mỗi prefetch,
  // giảm mạnh số request tới Supabase Auth → chuyển trang mượt hơn.
  if (request.headers.get("next-router-prefetch") || request.headers.get("purpose") === "prefetch") {
    return response;
  }

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

  // Chỉ làm tươi token (1 lượt) — KHÔNG chèn logic giữa createServerClient và getUser.
  // 2FA được thực thi ở bước đăng nhập (login-form challenge), không kiểm AAL mỗi request.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Bỏ qua tài nguyên tĩnh & ảnh để proxy không chạy thừa.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
