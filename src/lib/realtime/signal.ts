// Tín hiệu realtime "nhẹ": chỉ phát một CỜ THAY ĐỔI (không chứa dữ liệu nhạy cảm).
// Trình duyệt đang mở nghe cờ này qua Supabase Realtime → tự gọi router.refresh()
// để kéo lại dữ liệu mới từ server (server vẫn dùng service_role + RBAC như cũ).
//
// Bảng `realtime_signals` (chạy SQL trong web/supabase/realtime_signals.sql):
//   channel text primary key, updated_at timestamptz, payload jsonb
// Anon CHỈ được đọc bảng cờ này (không lộ schedule/leave/notifications...).

import { isSupabaseStoreConfigured, supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Tên kênh tín hiệu. Kênh "logic" gom theo phân hệ (schedule|leave|...) VÀ
 * kênh THEO TÊN BẢNG (vd "bnb_orders", "schedule_entries") do tầng persist tự
 * phát mỗi khi GHI — nhờ vậy MỌI phân hệ đều có realtime mà không phải sửa từng action.
 * Client (`realtime-refresh.tsx`) ánh xạ kênh → phân hệ để CHỈ refresh đúng màn đang xem.
 */
export type SignalChannel = string;

/**
 * Phát/“chạm” một cờ thay đổi. payload chỉ để gợi ý (vd userId người nhận),
 * KHÔNG đặt dữ liệu nhạy cảm vào đây vì anon đọc được. Không bao giờ ném lỗi.
 */
export async function bumpSignal(channel: SignalChannel, payload?: Record<string, unknown>): Promise<void> {
  if (!isSupabaseStoreConfigured) return;
  try {
    await supabaseAdmin()
      .from("realtime_signals")
      .upsert({ channel, updated_at: new Date().toISOString(), payload: payload ?? {} });
  } catch {
    // Tín hiệu hỏng không được làm gãy thao tác nghiệp vụ.
  }
}
