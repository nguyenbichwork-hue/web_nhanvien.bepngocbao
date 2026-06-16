-- ============================================================================
-- BNB · Bán hàng & vận hành cửa hàng — Lưu trữ dạng JSONB
-- ----------------------------------------------------------------------------
-- Mỗi collection trong src/lib/bnb/store.ts = 1 bảng (id text + data jsonb),
-- cùng khuôn với 0005 (K-HR). Chỉ server (service_role) truy cập → BẬT RLS,
-- KHÔNG mở policy nào. An toàn chạy lại nhiều lần (idempotent).
--
-- Bản đồ tên bảng khớp TABLE trong store.ts:
--   leads→bnb_leads, customers→bnb_customers, activities→bnb_activities,
--   surveys→bnb_surveys, quotes→bnb_quotes, orders→bnb_orders,
--   deliveries→bnb_deliveries, warranties→bnb_warranties,
--   shiftReports→bnb_shift_reports, tasks→bnb_tasks, products→bnb_products
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'bnb_leads', 'bnb_customers', 'bnb_activities', 'bnb_surveys',
    'bnb_quotes', 'bnb_orders', 'bnb_deliveries', 'bnb_warranties',
    'bnb_shift_reports', 'bnb_tasks', 'bnb_nps_responses',
    'bnb_pillars', 'bnb_calendar_items', 'bnb_ad_campaigns', 'bnb_purchase_orders',
    'bnb_bank_txns', 'bnb_reviews', 'bnb_products'
  ]
  loop
    execute format(
      'create table if not exists %I (id text primary key, data jsonb not null, updated_at timestamptz not null default now());',
      t);
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;
