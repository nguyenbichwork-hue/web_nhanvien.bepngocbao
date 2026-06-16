import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { BrandLogo } from "@/components/brand-logo";
import { forcePasswordChangeAction, signOutAction } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";

type SP = { err?: string };

const ERR: Record<string, string> = {
  short: "Mật khẩu mới phải có ít nhất 6 ký tự.",
  mismatch: "Mật khẩu xác nhận không khớp.",
  same: "Mật khẩu mới không được trùng mật khẩu tạm.",
  notfound: "Không tìm thấy tài khoản đăng nhập. Vui lòng đăng nhập lại.",
};

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Trang này chỉ dành cho lần buộc đổi mật khẩu. Đã đổi rồi → về trang Tài khoản.
  if (!session!.user.mustChangePassword) redirect("/account");
  const sp = await searchParams;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "radial-gradient(1200px 600px at 70% -10%, rgba(158,27,50,.16), transparent), var(--bg)",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 430, padding: 32 }}>
        <div style={{ paddingBottom: 18, display: "flex", justifyContent: "center" }}>
          <BrandLogo height={46} centered />
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Đặt mật khẩu mới</h1>
        <p className="muted small" style={{ marginBottom: 20 }}>
          Đây là lần đăng nhập đầu với mật khẩu do Nhân sự cấp. Vui lòng đặt mật khẩu riêng của bạn để tiếp tục.
        </p>

        {sp.err && (
          <div className="badge b-rose" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
            {ERR[sp.err] ?? "Có lỗi xảy ra."}
          </div>
        )}

        <form action={forcePasswordChangeAction}>
          <div className="field">
            <label>Mật khẩu mới</label>
            <input type="password" name="newPassword" autoComplete="new-password" minLength={6} placeholder="Tối thiểu 6 ký tự" required />
          </div>
          <div className="field">
            <label>Xác nhận mật khẩu mới</label>
            <input type="password" name="confirmPassword" autoComplete="new-password" minLength={6} required />
          </div>
          <button type="submit" className="btn primary" style={{ width: "100%", justifyContent: "center", padding: 13 }}>
            <Icon name="check" /> Lưu & tiếp tục
          </button>
        </form>

        <form action={signOutAction} style={{ marginTop: 14 }}>
          <button type="submit" className="btn ghost" style={{ width: "100%", justifyContent: "center" }}>
            Đăng xuất
          </button>
        </form>
      </div>
    </div>
  );
}
