-- ============================================================================
-- K-HR · Lưu trữ dạng JSONB (2026-06-09)
-- ----------------------------------------------------------------------------
-- Mỗi "bộ sưu tập" (collection) trong store.ts = 1 bảng (id text + data jsonb).
-- Các giá trị đơn lẻ (group, cấu hình lịch, cấu hình duyệt, bộ đếm) nằm trong
-- bảng app_config (key + data jsonb).
--
-- Vì sao JSONB: app xử lý toàn bộ nghiệp vụ ở tầng code (không truy vấn SQL phức
-- tạp), kiểu dữ liệu TypeScript thay đổi liên tục → lưu cả object vào jsonb giúp
-- KHÔNG phải sửa schema mỗi lần thêm trường. Tầng dữ liệu đọc `data` ra đúng kiểu.
--
-- Bảo mật: chỉ server (khoá service_role) truy cập → BẬT RLS, KHÔNG mở policy nào
-- (anon/publishable bị từ chối hoàn toàn; service_role bỏ qua RLS).
--
-- File này THAY THẾ các bản nháp cũ 0001–0004 (cột rời, dữ liệu 5 pháp nhân lỗi
-- thời). CHỈ chạy file này. An toàn chạy lại nhiều lần (idempotent).
-- ============================================================================

-- Bảng cấu hình đơn lẻ (group / schedule_config / approval_config / seq …)
create table if not exists app_config (
  key        text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_config enable row level security;

-- Tạo tất cả bảng collection theo cùng một khuôn (id text + data jsonb).
do $$
declare t text;
begin
  foreach t in array array[
    'legal_entities', 'departments', 'job_titles', 'employees',
    'shifts', 'schedule_entries', 'leave_types', 'leave_requests',
    'review_cycles', 'reviews', 'job_openings', 'candidates',
    'interviews', 'onboarding', 'dependents', 'audit_logs',
    'notifications', 'payroll_periods', 'salary_records',
    'payroll_adjustments', 'benefits', 'benefit_enrollments',
    'overtimes', 'pay_items', 'holidays', 'contracts', 'rewards',
    'assets', 'allocations', 'courses', 'enrolls', 'roles',
    'app_users', 'role_assignments'
  ]
  loop
    execute format(
      'create table if not exists %I (id text primary key, data jsonb not null, updated_at timestamptz not null default now());',
      t);
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;
