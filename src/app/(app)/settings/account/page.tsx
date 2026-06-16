import { AccountPanel } from "@/components/account-panel";
import { requireSession } from "@/lib/auth/session";

type SP = { ok?: string; err?: string };

// Tài khoản & Bảo mật — tab Cài đặt mà MỌI vai trò đều vào được (chỉ cần đăng nhập).
export default async function SettingsAccountPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await requireSession();
  const sp = await searchParams;
  return <AccountPanel session={session} status={sp} returnTo="/settings/account" />;
}
