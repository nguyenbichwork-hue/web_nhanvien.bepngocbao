"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Nghe bảng cờ `realtime_signals` qua Supabase Realtime. Khi có thay đổi (ai đó
 * đổi lịch / xin nghỉ / có thông báo mới...) → gọi router.refresh() để màn đang mở
 * tự cập nhật mà KHÔNG cần tải lại trang. Gom nhiều cờ trong ~500ms thành 1 lần refresh.
 *
 * An toàn: chỉ subscribe bảng cờ (không dữ liệu nhạy cảm). No-op khi chưa cấu hình Supabase.
 */
export function RealtimeRefresh() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const channel = supabase
      .channel("khr-realtime-signals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "realtime_signals" },
        () => {
          // Debounce: nhiều cờ dồn dập (vd duyệt phép vừa đổi cả lịch) → 1 refresh.
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 500);
        },
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
