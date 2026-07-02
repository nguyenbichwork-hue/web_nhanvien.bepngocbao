-- ============================================================================
-- TKB · Hệ quản trị THIẾT KẾ BẾP (thietkebep.bepngocbao.vn) — 2026-07-02
-- ----------------------------------------------------------------------------
-- Module quản trị đặt TRONG RMS (nhanvien), dữ liệu namespace tkb_* để tách
-- khỏi nghiệp vụ RMS. Cùng khuôn JSONB 0005/0007 (id text + data jsonb).
-- Chỉ server (service_role) truy cập → BẬT RLS, KHÔNG mở policy. Idempotent.
--
-- Kiến trúc Nháp → Xuất bản:
--   • Các bảng tkb_* = bản NHÁP (admin sửa thoải mái).
--   • Bấm "Xuất bản" → server gom toàn bộ nháp thành 1 SNAPSHOT (tkb_snapshots)
--     + trỏ con trỏ 'published' trong tkb_settings.
--   • thietkebep đọc GET /api/tkb/published (cache CDN) → không đọc nháp.
--
-- Bản đồ collection:
--   tkb_products         — sản phẩm (thay master-catalog.json + overlay Haravan)
--   tkb_categories       — ngành hàng + cấu hình hiển thị
--   tkb_facets           — định nghĩa bộ lọc Product Finder (facet/option/predicate)
--   tkb_scenarios        — 12+ kịch bản combo KB-xx (thay scenarios.ts)
--   tkb_questions        — câu hỏi wizard/advisory theo luồng (flow key trong data)
--   tkb_knowledge        — thư viện khái niệm 3 tầng (thay knowledge-base.json)
--   tkb_rec_weights      — trọng số chấm điểm rec-engine (thay DEFAULT_WEIGHTS)
--   tkb_service_packages — gói dịch vụ A/B/C báo giá (thay service-packages.json)
--   tkb_settings         — cấu hình đơn lẻ (logo, cam kết, showroom, con trỏ published)
--   tkb_snapshots        — snapshot xuất bản (immutable, id = version)
--   tkb_quotes           — báo giá đã tạo từ thietkebep (lưu vết)
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'tkb_products', 'tkb_categories', 'tkb_facets', 'tkb_scenarios',
    'tkb_questions', 'tkb_knowledge', 'tkb_rec_weights',
    'tkb_service_packages', 'tkb_settings', 'tkb_snapshots', 'tkb_quotes'
  ]
  loop
    execute format(
      'create table if not exists %I (id text primary key, data jsonb not null, updated_at timestamptz not null default now());',
      t);
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;
