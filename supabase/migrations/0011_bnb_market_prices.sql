-- ============================================================================
-- BNB · RMS — Giá thị trường do AGENT (máy nhân viên cào local) đẩy về.
-- Collection bnb_market_prices (id = Mã SP, data jsonb = AgentPrice). Khớp khuôn
-- JSONB store (0007). Chỉ server (service_role) truy cập → BẬT RLS, không policy.
-- Idempotent — an toàn chạy lại.
-- ============================================================================
create table if not exists bnb_market_prices (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table bnb_market_prices enable row level security;
