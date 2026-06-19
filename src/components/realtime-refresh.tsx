"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Nghe bảng cờ `realtime_signals` qua Supabase Realtime. Khi ai đó GHI dữ liệu,
 * tầng persist phát một cờ theo TÊN BẢNG (vd "bnb_orders"). Client CHỈ gọi
 * router.refresh() khi cờ đó thuộc PHÂN HỆ ĐANG XEM → hết "bão refresh" (trước đây
 * mọi thay đổi ở bất kỳ đâu đều bắt TẤT CẢ máy refresh full trang). Gom nhiều cờ
 * trong ~400ms thành 1 lần refresh.
 *
 * An toàn: chỉ subscribe bảng cờ (không dữ liệu nhạy cảm). No-op khi chưa cấu hình.
 */

// Ánh xạ KÊNH (tên bảng hoặc kênh logic cũ) → các phân hệ (đoạn route đầu) mà dữ
// liệu đó hiển thị. Kênh không có trong map → coi như "không rõ" và VẪN refresh
// (an toàn: thiếu sót chỉ làm mất tối ưu, không sai). "notif" luôn refresh (chuông
// thông báo nằm ở topbar mọi trang). Mảng rỗng = không màn nào cần tự refresh.
const CHANNEL_SEGMENTS: Record<string, string[]> = {
  // ---- Tổ chức / Nhân sự (org store) ----
  employees: ["employees", "dashboard"],
  dependents: ["employees"],
  legal_entities: ["admin", "settings"],
  departments: ["admin", "settings", "employees"],
  job_titles: ["admin", "settings"],
  roles: ["admin", "settings"],
  app_users: ["admin", "settings"],
  role_assignments: ["admin", "settings"],
  shifts: ["schedule"],
  schedule_entries: ["schedule"],
  holidays: ["schedule", "leave"],
  leave_types: ["leave"],
  leave_requests: ["leave", "dashboard"],
  overtimes: ["overtime", "dashboard"],
  contracts: ["contracts"],
  rewards: ["rewards"],
  assets: ["assets"],
  allocations: ["assets"],
  courses: ["training"],
  enrolls: ["training"],
  review_cycles: ["performance"],
  reviews: ["performance"],
  job_openings: ["recruit"],
  candidates: ["recruit"],
  interviews: ["recruit"],
  onboarding: ["recruit"],
  benefits: ["benefits"],
  benefit_enrollments: ["benefits"],
  pay_items: ["payroll"],
  payroll_periods: ["payroll"],
  salary_records: ["payroll"],
  payroll_adjustments: ["payroll"],
  notifications: ["notifications"],
  audit_logs: [], // không màn nào cần tự refresh theo audit log
  // ---- Bán hàng & vận hành (bnb store) ----
  bnb_leads: ["crm", "dashboard"],
  bnb_customers: ["customers"],
  bnb_activities: ["crm"],
  bnb_surveys: ["survey"],
  bnb_quotes: ["quote"],
  bnb_orders: ["orders", "dashboard"],
  bnb_deliveries: ["delivery", "dashboard"],
  bnb_warranties: ["warranty", "dashboard"],
  bnb_shift_reports: ["shift-report", "dashboard"],
  bnb_tasks: ["tasks", "dashboard"],
  bnb_nps_responses: ["cx"],
  bnb_pillars: ["marketing"],
  bnb_calendar_items: ["marketing"],
  bnb_ad_campaigns: ["marketing"],
  bnb_purchase_orders: ["purchase"],
  bnb_bank_txns: ["finance"],
  bnb_reviews: ["reviews"],
  bnb_zalo_conversations: ["inbox"],
  bnb_zalo_messages: ["inbox"],
  bnb_products: ["inventory", "pos"],
  // ---- Kênh logic cũ (vẫn được một số action phát) ----
  schedule: ["schedule"],
  leave: ["leave", "dashboard"],
  overtime: ["overtime", "dashboard"],
  reward: ["rewards"],
};

/** Phân hệ đang xem có cần refresh khi kênh `channel` đổi không? */
function shouldRefresh(seg: string, channel: string | undefined): boolean {
  if (!channel) return true; // không rõ → an toàn thì refresh
  if (channel === "notif") return true; // chuông thông báo ở mọi trang
  const segs = CHANNEL_SEGMENTS[channel];
  if (!segs) return true; // kênh chưa map → an toàn thì refresh
  return segs.includes(seg);
}

export function RealtimeRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  // Giữ phân hệ hiện tại trong ref để callback subscribe (đăng ký 1 lần) luôn đọc
  // được giá trị mới nhất mà không phải subscribe lại mỗi lần đổi trang.
  const segRef = useRef("");
  segRef.current = pathname.split("/")[1] || "dashboard";

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const channel = supabase
      .channel("khr-realtime-signals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "realtime_signals" },
        (payload) => {
          const ch = (payload.new as { channel?: string } | null)?.channel;
          if (!shouldRefresh(segRef.current, ch)) return;
          // Debounce: nhiều cờ dồn dập (vd duyệt phép đổi cả lịch) → 1 refresh.
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 400);
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
