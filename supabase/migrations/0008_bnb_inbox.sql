-- ============================================================================
-- BNB · Hộp thoại Zalo OA (/inbox) — Lưu trữ dạng JSONB
-- ----------------------------------------------------------------------------
-- Cùng khuôn 0007: mỗi collection = 1 bảng (id text + data jsonb). Chỉ server
-- (service_role) truy cập → BẬT RLS, KHÔNG mở policy. Idempotent, chạy lại an toàn.
--
-- Bản đồ khớp TABLE trong store.ts:
--   zaloConversations→bnb_zalo_conversations, zaloMessages→bnb_zalo_messages
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array['bnb_zalo_conversations', 'bnb_zalo_messages']
  loop
    execute format(
      'create table if not exists %I (id text primary key, data jsonb not null, updated_at timestamptz not null default now());',
      t);
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;
