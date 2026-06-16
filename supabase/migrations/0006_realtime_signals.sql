-- ============================================================================
-- K-HR · Bảng tín hiệu Realtime (2026-06-10)
-- ----------------------------------------------------------------------------
-- Mục đích: cho TRÌNH DUYỆT đang mở tự cập nhật (router.refresh) khi có thay đổi
-- (đổi lịch, xin nghỉ, thông báo mới...) MÀ KHÔNG lộ dữ liệu nhạy cảm.
--
-- Cách hoạt động: server (service_role) "chạm" một dòng cờ theo `channel` mỗi khi
-- có thay đổi. Client subscribe Realtime bảng này; nhận cờ → gọi refresh để kéo
-- lại dữ liệu qua server (server vẫn RBAC + service_role như cũ).
--
-- Bảng này CHỈ chứa cờ (channel + thời điểm), KHÔNG chứa dữ liệu thật → an toàn khi
-- cho khoá anon đọc. Mọi bảng dữ liệu khác vẫn đóng (RLS không policy).
--
-- An toàn chạy lại nhiều lần (idempotent).
-- ============================================================================

create table if not exists realtime_signals (
  channel    text primary key,
  payload    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table realtime_signals enable row level security;

-- Cho phép đọc cờ (anon + authenticated). Realtime postgres_changes kiểm tra RLS
-- theo vai trò người subscribe → cần policy SELECT này thì client mới nhận được.
drop policy if exists "read signals" on realtime_signals;
create policy "read signals" on realtime_signals
  for select to anon, authenticated using (true);

grant select on realtime_signals to anon, authenticated;

-- Đưa bảng vào publication realtime để phát thay đổi.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'realtime_signals'
  ) then
    alter publication supabase_realtime add table realtime_signals;
  end if;
end $$;

-- Khởi tạo sẵn các kênh (tránh lần đầu chưa có dòng nào).
insert into realtime_signals (channel) values
  ('schedule'), ('leave'), ('overtime'), ('reward'), ('notif')
on conflict (channel) do nothing;
