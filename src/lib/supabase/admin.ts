// Supabase client phía SERVER dùng khoá service_role (secret) — BỎ QUA RLS.
// Dùng cho tầng dữ liệu (store.ts) khi app tự kiểm soát phân quyền ở mức ứng dụng
// (RBAC + scope), KHÔNG dựa vào Supabase Auth ở giai đoạn này.
// KHÔNG bao giờ import file này từ Client Component (khoá secret chỉ ở server).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** true khi đã có URL + service_role key để tầng dữ liệu nói chuyện với Supabase. */
export const isSupabaseStoreConfigured = Boolean(SUPABASE_URL && SERVICE_KEY);

const g = globalThis as unknown as { __khrSupabaseAdmin?: SupabaseClient };

/** Client admin (singleton qua HMR). Ném lỗi nếu chưa cấu hình. */
export function supabaseAdmin(): SupabaseClient {
  if (!isSupabaseStoreConfigured) {
    throw new Error("Supabase chưa cấu hình (thiếu URL hoặc SUPABASE_SERVICE_ROLE_KEY).");
  }
  if (!g.__khrSupabaseAdmin) {
    g.__khrSupabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return g.__khrSupabaseAdmin;
}

/** Tìm id auth.users theo email (null nếu chưa có). */
async function findAuthUserId(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1000 });
  const e = email.toLowerCase();
  return data?.users.find((u) => (u.email ?? "").toLowerCase() === e)?.id ?? null;
}

/** Tạo tài khoản Supabase Auth (email đã xác nhận sẵn). Trả id; nếu đã tồn tại → trả id cũ. */
export async function adminEnsureAuthUser(email: string, password: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!error && data?.user) return data.user.id;
  return findAuthUserId(email); // có thể đã tồn tại
}

/** Đặt lại mật khẩu cho 1 tài khoản Supabase Auth theo id. */
export async function adminSetAuthPassword(authUserId: string, password: string): Promise<void> {
  await supabaseAdmin().auth.admin.updateUserById(authUserId, { password });
}

/**
 * Đổi mật khẩu một tài khoản bằng Admin API (service_role) — KHÔNG cần phiên đăng nhập
 * của người dùng (tránh lỗi treo/"session missing" khi đổi MK qua updateUser trên Cloudflare).
 * Ưu tiên authUserId; thiếu thì tra theo email. Trả false nếu không tìm thấy tài khoản auth.
 */
export async function adminUpdatePassword(
  ref: { authUserId?: string | null; email: string },
  password: string,
): Promise<boolean> {
  const id = ref.authUserId || (await findAuthUserId(ref.email));
  if (!id) return false;
  await supabaseAdmin().auth.admin.updateUserById(id, { password });
  return true;
}

/**
 * Xác minh mật khẩu hiện tại bằng cách thử đăng nhập trên một client TẠM (không lưu phiên).
 * Dùng cho trang Tài khoản (đổi MK chủ động) ở chế độ Supabase Auth.
 */
export async function adminVerifyPassword(email: string, password: string): Promise<boolean> {
  const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await tmp.auth.signInWithPassword({ email, password });
  return !error;
}
