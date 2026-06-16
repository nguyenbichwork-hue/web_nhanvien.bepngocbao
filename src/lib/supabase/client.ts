"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Supabase client cho Client Components (chạy ở trình duyệt).
 * Khi chưa cấu hình (chế độ dev), dùng giá trị placeholder để KHÔNG ném lỗi lúc
 * build/prerender — các trang auth không được dùng ở chế độ dev (đã có quick-login). */
export function createClient() {
  return createBrowserClient(
    SUPABASE_URL || "https://placeholder.supabase.co",
    SUPABASE_ANON_KEY || "placeholder-anon-key",
  );
}
