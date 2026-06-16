"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  findUserByCredentials,
  findUserForRecovery,
  getUserById,
  patchUserAccount,
  updateUserPassword,
} from "@/lib/org/store";
import { isSupabaseAuthEnabled } from "@/lib/supabase/env";
import { SESSION_COOKIE, requireSession } from "./session";

/** URL gốc của site (cho link email đặt lại mật khẩu). */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 ngày
};

async function setSessionCookie(uid: string) {
  (await cookies()).set(SESSION_COOKIE, uid, COOKIE_OPTS);
}

/** Đăng nhập dev bằng email + mật khẩu (khi chưa nối Supabase). */
export async function devLoginAction(fd: FormData) {
  const email = (fd.get("email")?.toString() ?? "").trim();
  const password = fd.get("password")?.toString() ?? "";
  const user = await findUserByCredentials(email, password);
  if (!user) redirect("/login?error=1");
  await setSessionCookie(user.id);
  redirect("/dashboard");
}

/**
 * Đăng nhập nhanh theo tài khoản mẫu — CHỈ máy dev (DEV_QUICKLOGIN=1).
 * Bỏ qua bước nhập mật khẩu nên TUYỆT ĐỐI không cho chạy ở bản deploy
 * (chặn cả khi nút bị ẩn nhưng ai đó gọi thẳng action).
 */
export async function quickLoginAction(fd: FormData) {
  if (isSupabaseAuthEnabled || process.env.DEV_QUICKLOGIN !== "1") redirect("/login");
  const uid = fd.get("uid")?.toString() ?? "";
  const user = await getUserById(uid);
  if (!user) redirect("/login?error=1");
  await setSessionCookie(user.id);
  redirect("/dashboard");
}

/**
 * Đổi mật khẩu chủ động (trang Tài khoản): xác minh mật khẩu hiện tại rồi đặt mật khẩu mới.
 * Supabase Auth: xác minh + đổi qua Admin API (service_role) phía server; dev: kiểm tra app_users.
 */
export async function changePasswordAction(fd: FormData) {
  const session = await requireSession();
  const current = fd.get("currentPassword")?.toString() ?? "";
  const next = fd.get("newPassword")?.toString() ?? "";
  const confirm = fd.get("confirmPassword")?.toString() ?? "";
  // Trang gọi form (/account hoặc /settings/account) để báo lỗi/thành công quay đúng chỗ.
  const backRaw = fd.get("returnTo")?.toString() || "/account";
  const back = backRaw.startsWith("/") ? backRaw : "/account";

  if (next.length < 6) redirect(`${back}?err=short`);
  if (next !== confirm) redirect(`${back}?err=mismatch`);

  if (isSupabaseAuthEnabled) {
    // Supabase Auth: đổi MK qua Admin API (service_role) phía server — KHÔNG phụ thuộc
    // phiên người dùng (tránh treo/"session missing" trên Cloudflare). Xác minh MK hiện tại trước.
    const { adminUpdatePassword, adminVerifyPassword } = await import("@/lib/supabase/admin");
    const ok = await adminVerifyPassword(session.user.email, current);
    if (!ok) redirect(`${back}?err=current`);
    const done = await adminUpdatePassword(session.user, next);
    if (!done) redirect(`${back}?err=notfound`);
    await patchUserAccount(session.user.id, { mustChangePassword: false });
    // Đổi MK qua Admin API thu hồi phiên hiện tại → đăng nhập lại bằng MK mới.
    redirect("/login?reset=1");
  }

  // Chế độ tuỳ biến (dev): kiểm tra mật khẩu hiện tại trong app_users.
  const user = await getUserById(session.user.id);
  if (!user) redirect(`${back}?err=notfound`);
  if ((user!.password ?? "") !== current) redirect(`${back}?err=current`);
  await updateUserPassword(session.user.id, next);
  redirect(`${back}?ok=1`);
}

/**
 * Buộc đổi mật khẩu ở lần đăng nhập đầu (sau khi HR cấp tài khoản + mật khẩu tạm).
 * Người dùng đã xác thực bằng mật khẩu tạm nên chỉ cần đặt mật khẩu mới.
 */
export async function forcePasswordChangeAction(fd: FormData) {
  const session = await requireSession();
  const next = fd.get("newPassword")?.toString() ?? "";
  const confirm = fd.get("confirmPassword")?.toString() ?? "";

  if (next.length < 6) redirect("/change-password?err=short");
  if (next !== confirm) redirect("/change-password?err=mismatch");

  if (isSupabaseAuthEnabled) {
    // Đổi MK qua Admin API (service_role) phía server — KHÔNG dùng phiên người dùng
    // (updateUser theo phiên bị treo/"session missing" trên Cloudflare/OpenNext).
    const { adminUpdatePassword } = await import("@/lib/supabase/admin");
    const done = await adminUpdatePassword(session.user, next);
    if (!done) redirect("/change-password?err=notfound");
    await patchUserAccount(session.user.id, { mustChangePassword: false });
    // Đổi MK qua Admin API thu hồi phiên hiện tại → cho đăng nhập lại bằng MK mới.
    redirect("/login?reset=1");
  }

  const user = await getUserById(session.user.id);
  // Không cho đặt lại trùng mật khẩu tạm vừa được cấp.
  if (user && (user.password ?? "") === next) redirect("/change-password?err=same");
  await updateUserPassword(session.user.id, next);
  redirect("/dashboard");
}

/**
 * Quên mật khẩu — đặt lại qua số điện thoại đã đăng ký (chế độ dev: email + SĐT khớp hồ sơ).
 * Khi nối Supabase sẽ thay bằng OTP SMS thật.
 */
export async function forgotPasswordAction(fd: FormData) {
  const email = (fd.get("email")?.toString() ?? "").trim();

  if (isSupabaseAuthEnabled) {
    // Gửi link đặt lại mật khẩu qua email (Supabase). KHÔNG tiết lộ email có tồn tại hay không.
    if (email) {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/reset-password` });
    }
    redirect("/forgot-password?sent=1");
  }

  // Chế độ tuỳ biến (dev): xác minh email + SĐT khớp hồ sơ rồi đặt mật khẩu mới.
  const phone = fd.get("phone")?.toString() ?? "";
  const next = fd.get("newPassword")?.toString() ?? "";
  const confirm = fd.get("confirmPassword")?.toString() ?? "";
  if (next.length < 6) redirect("/forgot-password?err=short");
  if (next !== confirm) redirect("/forgot-password?err=mismatch");
  const user = await findUserForRecovery(email, phone);
  if (!user) redirect("/forgot-password?err=verify");
  await updateUserPassword(user.id, next);
  redirect("/login?reset=1");
}

/** Đăng xuất — xoá cookie dev (và session Supabase nếu có). */
export async function signOutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  if (isSupabaseAuthEnabled) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    // scope:"local" → chỉ xoá phiên & cookie phía client, KHÔNG gọi mạng thu hồi token.
    // Tránh treo Server Action trên Cloudflare Worker (như lỗi đổi mật khẩu trước đây).
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/login");
}
