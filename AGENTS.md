<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Cập nhật tab Hướng dẫn (`/guide`) khi đổi chức năng

Có một trang tài liệu nội bộ `src/app/(app)/guide/page.tsx` giải thích logic, chức năng và cách dùng của TẤT CẢ phân hệ. **Khi bạn thêm/sửa/xoá chức năng, công thức, trạng thái, hoặc thêm phân hệ mới ở bất kỳ tab nào, PHẢI cập nhật mục tương ứng trong `/guide`.**

- Các bảng dữ kiện trong `/guide` được render trực tiếp từ nguồn chân lý (`PERMISSIONS`/`MODULE_LABEL`, các `*_LABEL`/`*_BADGE` trong `lib/org/types.ts`, `lib/payroll/config.ts`, store) → tự cập nhật, KHÔNG sửa tay. Nếu thêm hằng số/label mới đáng đưa vào tài liệu, hãy render từ nguồn đó thay vì gõ cứng.
- Phần văn xuôi (Mục đích / Chức năng & logic / Cách dùng) phải sửa tay cho khớp hành vi mới.
- Nếu thêm một tab/route mới, thêm một `<Section>` + mục lục tương ứng trong `/guide`.

# Thông báo · Realtime · Email (dùng đúng helper)

Khi thêm một sự kiện cần **báo cho người dùng**, KHÔNG gọi `createNotification` trực tiếp — dùng helper `notify(uid, { title, body, href })` trong `src/lib/org/actions.ts`. Helper này phát đồng thời **3 kênh**: chuông trong app + **realtime** (đẩy sang màn người nhận) + **email** (Resend, gửi tới email cá nhân nếu có).

- **Realtime:** sau mỗi Server Action GHI dữ liệu hiển thị động, gọi `bumpSignal(channel)` (`src/lib/realtime/signal.ts`) NGAY SAU `revalidatePath(...)`. Kênh hiện có: `schedule | leave | overtime | reward | notif`. Client (`components/realtime-refresh.tsx`, gắn ở `app/(app)/layout.tsx`) nghe bảng cờ `realtime_signals` → `router.refresh()`. **Chỉ phát CỜ, KHÔNG đặt dữ liệu nhạy cảm vào payload** (anon đọc được bảng cờ). Thêm kênh mới: bổ sung vào type `SignalChannel` + seed trong `supabase/migrations/0006_realtime_signals.sql`.
- **Email:** `sendEmail()` (`src/lib/email/send.ts`) qua Resend HTTP API — chạy được trên Cloudflare Workers (KHÔNG dùng nodemailer). No-op khi thiếu `RESEND_API_KEY`. Báo hai chiều: NV→quản lý và quản lý→NV (xem mẫu `notifyScheduleChange`, OT decide).
- Lưu ý Cloudflare Workers Free **50 subrequest/invocation**: mỗi email/`bumpSignal` là 1 subrequest → đừng gửi hàng loạt đồng bộ trong một action.
