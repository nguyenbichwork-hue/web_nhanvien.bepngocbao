import { Icon } from "@/components/icon";
import { AccountPanel } from "@/components/account-panel";
import { requireSession } from "@/lib/auth/session";

type SP = { ok?: string; err?: string };

export default async function AccountPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await requireSession();
  const sp = await searchParams;

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Tài khoản của tôi
      </div>
      <div className="page-head">
        <div>
          <h1>Tài khoản của tôi</h1>
          <p>Đổi mật khẩu và xem thông tin đăng nhập của bạn.</p>
        </div>
      </div>

      <AccountPanel session={session} status={sp} returnTo="/account" />
    </div>
  );
}
