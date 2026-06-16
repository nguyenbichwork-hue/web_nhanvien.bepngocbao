import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isSupabaseAuthEnabled } from "@/lib/supabase/env";
import { listDemoAccounts } from "@/lib/auth/demo";
import { LoginForm } from "./login-form";

// Đã đăng nhập rồi thì không cho ở lại trang login.
export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  // "Đăng nhập nhanh" = tiện ích DEV (hiện danh bạ + đăng nhập không mật khẩu) →
  // CHỈ bật ở máy dev có DEV_QUICKLOGIN=1. Bản deploy KHÔNG có biến này nên TẮT,
  // tránh lộ danh bạ NV & ngăn giả danh. (Cũng tắt khi đã bật Supabase Auth.)
  const showQuickLogin = !isSupabaseAuthEnabled && process.env.DEV_QUICKLOGIN === "1";
  const demoAccounts = showQuickLogin ? await listDemoAccounts() : [];
  return <LoginForm demoAccounts={demoAccounts} />;
}
