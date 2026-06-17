# Hướng dẫn cấu hình Supabase cho BNB ERP

App chạy được **không cần Supabase** (chế độ dev: dữ liệu seed in-memory, không cần đăng nhập).
Cắm Supabase để có **lưu trữ thật, bền vững, đa người dùng**. Toàn bộ nghiệp vụ xử lý ở tầng
code (RBAC + scope), nên dùng **service_role key** (bỏ qua RLS) — bảng vẫn bật RLS, không mở policy.

## 1. Tạo project Supabase

1. Vào <https://supabase.com/dashboard> → **New project** (chọn region Singapore cho gần VN).
2. Đặt mật khẩu database (lưu lại).
3. Mở **Project Settings → API**, lấy 3 giá trị:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (mục *Project API keys*, bấm Reveal) → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ `service_role` key có toàn quyền — **chỉ để ở biến server**, KHÔNG commit, KHÔNG prefix `NEXT_PUBLIC`.

## 2. Điền `.env.local`

Sao chép `.env.example` → `.env.local` rồi điền:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 3. Chạy migration (tạo bảng)

Mở **SQL Editor** trên dashboard Supabase, chạy **lần lượt theo thứ tự** nội dung các file
trong `supabase/migrations/` (mỗi file idempotent, chạy lại nhiều lần an toàn):

| File | Nội dung |
|------|----------|
| `0001_org_rbac.sql` | Tổ chức & RBAC (HR) |
| `0002_seed.sql` | Seed danh mục HR |
| `0003_schedule.sql` | Lịch làm việc |
| `0004_leave.sql` | Nghỉ phép |
| `0005_store_jsonb.sql` | Bảng JSONB store HR + `app_config` |
| `0006_realtime_signals.sql` | Bảng cờ realtime |
| `0007_bnb_jsonb.sql` | **18 bảng BNB** (lead/đơn/khách/bảo hành…) |
| `0008_bnb_inbox.sql` | **2 bảng hộp thoại Zalo OA** (mới) |

> Cách nhanh: mở từng file, copy toàn bộ, dán vào SQL Editor, **Run**. Hoặc dùng Supabase CLI:
> `supabase link --project-ref <ref>` rồi `supabase db push`.

## 4. (Tuỳ chọn) Bật Realtime

Để trình duyệt tự refresh khi có thay đổi: **Database → Replication → `supabase_realtime`**,
thêm bảng `realtime_signals` vào publication (xem chú thích trong `0006_realtime_signals.sql`).

## 5. Khởi động lại & kiểm tra

```bash
pnpm dev   # hoặc redeploy Vercel sau khi thêm env
```

- Đăng nhập bằng tài khoản thật (đã seed): `admin@k-homes.vn` / `123456`.
- Vào **Tích hợp & Kết nối** (`/integrations`) → dòng *Supabase (lưu trữ thật)* phải hiện **Đã cấu hình**.
- Tạo thử một lead/đơn → kiểm tra bảng `bnb_leads`/`bnb_orders` trên Supabase đã có dòng mới.

## Ghi chú kiến trúc

- Mỗi collection = 1 bảng `(id text primary key, data jsonb, updated_at timestamptz)`.
- Khi Supabase **đã cấu hình**, nó là **nguồn chân lý**: store pull từ DB và write-through mọi thay đổi
  (`src/lib/org/persist.ts`, `src/lib/bnb/store.ts`).
- Chưa cấu hình → mọi hàm ghi là **no-op**, đọc trả seed in-memory (chế độ dev).
- Các tính năng cần Supabase để bền vững: 2FA, lịch sử/audit, sao lưu (PDPA), dữ liệu đa thiết bị.

## Trên Vercel

Thêm cùng bộ biến ở **Project → Settings → Environment Variables** (Production + Preview),
rồi **Redeploy**. Nhớ thêm cả `NEXT_PUBLIC_SITE_URL` = domain thật để link email/webhook đúng.
