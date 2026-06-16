# Bếp Ngọc Bảo — Hệ thống vận hành cửa hàng (BNB ERP)

Hệ thống quản lý vận hành hợp nhất cho **Bếp Ngọc Bảo** — bán lẻ thiết bị bếp châu Âu cao cấp:
bán hàng, CRM, tư vấn, giao–lắp, hậu mãi, marketing, kho, tài chính và nhân sự trong một nền tảng.

## Công nghệ
- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS v4** — design system "crimson & slate" theo logo BNB
- **Supabase** (PostgreSQL + Auth + Storage) — tùy chọn; chạy được **chế độ dev** không cần Supabase (seed in-memory)
- **Haravan Open Platform API** — đồng bộ 2 chiều sản phẩm/đơn/khách/tồn kho + webhook real-time
- Deploy: **Vercel** (kèm Vercel Cron)

## Các phân hệ
**Bán hàng:** Dashboard "Hôm nay" · CRM & Lead · Khách hàng 360 · CX (Hành trình 12 bước + NPS) · Đánh giá ·
Fit Diagnostic · Thiết kế bếp AI · Khảo sát nhà khách · Tư vấn & Báo giá · POS quầy · Đơn hàng
**Marketing & Kho:** Marketing (Pillar/Calendar/Ads-CPL) · Tồn kho real-time · Nhập hàng (PO)
**Hiện trường & Hậu mãi:** Giao–Lắp đặt · Bảo hành (tự nhắc 1/7/30/90 + Zalo ZNS) · Báo cáo ca · Việc nội bộ & Sự cố
**Quản trị:** Dashboard quản trị · Tài chính – Kế toán (công nợ/giá vốn/đối soát + xuất AMIS) · Báo cáo
**Nhân sự (kế thừa K-HR):** Nhân viên · Ca làm · Nghỉ phép · Lương · KPI

## Tích hợp
- **Haravan:** `apis.haravan.com/com` (chỉ cần access token). Đồng bộ products/orders/customers/inventory;
  ghi ngược tạo đơn/khách; webhook `/api/haravan/webhook`.
- **Webhook nhận Lead** `/api/leads/webhook` (FB/TikTok/Zalo form → lead).
- **Cron nhắc bảo hành** `/api/cron/warranty-reminders` (Vercel Cron, 1/7/30/90 ngày).
- **Zalo ZNS** gửi tin chăm sóc; **Resend** gửi email; **AI** (OpenAI/Gemini) cho Thiết kế bếp.

## Chạy thử
```bash
pnpm install
cp .env.example .env.local   # điền token thật khi cần; để trống = chế độ dev
pnpm dev                     # http://localhost:3000
```
Chế độ dev không cần đăng nhập thật — dùng "đăng nhập nhanh" demo (mật khẩu 123456).

## Cấu hình (.env.local)
Xem `.env.example`. Tối thiểu chạy được khi để trống tất cả. Bật tính năng:
`HARAVAN_API_TOKEN` (catalog/đơn thật) · `NEXT_PUBLIC_SUPABASE_*` (persist/auth) ·
`OPENAI_API_KEY`/`GEMINI_API_KEY` (ảnh AI) · `ZALO_ZNS_*` (tin chăm sóc) · `RESEND_API_KEY` (email) ·
`CRON_SECRET` · `HARAVAN_WEBHOOK_SECRET` · `LEADS_WEBHOOK_SECRET`.

## Cơ sở dữ liệu
`supabase/migrations/` — chạy `0005` (lõi K-HR) + `0007` (BNB) trên Supabase để bật lưu trữ.
