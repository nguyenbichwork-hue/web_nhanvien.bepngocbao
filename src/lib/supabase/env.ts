// Cấu hình Supabase đọc từ biến môi trường.
// Khi chưa khai báo (chưa tạo project), app vẫn chạy được ở chế độ "dev không auth".
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true khi đã khai báo đủ URL + anon key (để dùng Supabase nói chung). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Bật ĐĂNG NHẬP bằng Supabase Auth thật (mỗi NV 1 tài khoản auth).
 * GIAI ĐOẠN 1 = false → giữ đăng nhập tuỳ biến (email+mật khẩu, cookie khr_uid),
 * dù dữ liệu ĐÃ lưu ở Supabase. Đặt NEXT_PUBLIC_SUPABASE_AUTH=1 để chuyển sang sau.
 */
export const isSupabaseAuthEnabled = process.env.NEXT_PUBLIC_SUPABASE_AUTH === "1";
