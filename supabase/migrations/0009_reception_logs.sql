-- ============================================================================
-- BNB · Nhật ký tiếp khách (tích hợp từ app nhân viên baocaokhachhang)
-- ----------------------------------------------------------------------------
-- Bảng JSONB (id text + data jsonb), cùng khuôn 0007. Chỉ server (service_role)
-- truy cập → BẬT RLS, KHÔNG mở policy. Idempotent.
--   receptionLogs → bnb_reception_logs (store.ts)
-- ============================================================================

create table if not exists bnb_reception_logs (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table bnb_reception_logs enable row level security;
