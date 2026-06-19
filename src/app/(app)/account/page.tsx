import { PageHero } from "@/components/page-hero";
import { AccountPanel } from "@/components/account-panel";
import { requireSession } from "@/lib/auth/session";

type SP = { ok?: string; err?: string };

export default async function AccountPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await requireSession();
  const sp = await searchParams;

  return (
    <div>
      <PageHero
        icon="settings"
        title="Tài khoản của tôi"
        subtitle="Đổi mật khẩu và xem thông tin đăng nhập của bạn."
        crumb={[["Trang chủ", "/dashboard"], ["Tài khoản"], ["Tài khoản của tôi"]]}
      />

      <AccountPanel session={session} status={sp} returnTo="/account" />
    </div>
  );
}
