-- ============================================================================
-- BNB · CX OS Đợt 4 — Chương trình giới thiệu (Referral)
-- ----------------------------------------------------------------------------
-- Bảng JSONB (id text + data jsonb), cùng khuôn 0007/0009. Chỉ server
-- (service_role) truy cập → BẬT RLS, KHÔNG mở policy. Idempotent.
--   referrals → bnb_cx_referrals (store.ts)
-- ============================================================================

create table if not exists bnb_cx_referrals (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table bnb_cx_referrals enable row level security;
