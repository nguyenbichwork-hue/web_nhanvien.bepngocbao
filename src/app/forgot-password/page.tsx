import Link from "next/link";
import { Icon } from "@/components/icon";
import { BrandLogo } from "@/components/brand-logo";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { isSupabaseAuthEnabled } from "@/lib/supabase/env";

type SP = { err?: string; sent?: string };

const ERR: Record<string, string> = {
  short: "Mật khẩu mới phải có ít nhất 6 ký tự.",
  mismatch: "Mật khẩu xác nhận không khớp.",
  verify: "Email hoặc số điện thoại không khớp với tài khoản nào.",
  expired: "Liên kết đặt lại đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu gửi lại bên dưới.",
};

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<SP> }) {
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
          <BrandLogo height={46} centered onDark />
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Quên mật khẩu</h1>

        {isSupabaseAuthEnabled ? (
          // --- Chế độ Supabase Auth: gửi link đặt lại qua email ---
          sp.sent ? (
            <>
              <div className="badge b-green" style={{ width: "100%", justifyContent: "center", margin: "14px 0" }}>
                Đã gửi! Kiểm tra hộp thư
              </div>
              <p className="muted small" style={{ marginBottom: 16 }}>
                Nếu email tồn tại trong hệ thống, bạn sẽ nhận được liên kết đặt lại mật khẩu.
                Mở email và bấm vào liên kết để đặt mật khẩu mới.
              </p>
            </>
          ) : (
            <>
              {sp.err && (
                <div className="badge b-rose" style={{ width: "100%", justifyContent: "center", margin: "14px 0" }}>
                  {ERR[sp.err] ?? "Có lỗi xảy ra."}
                </div>
              )}
              <p className="muted small" style={{ marginBottom: 20 }}>
                Nhập email đăng nhập của bạn. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu vào email đó.
              </p>
              <form action={forgotPasswordAction}>
                <div className="field">
                  <label>Email đăng nhập</label>
                  <input type="email" name="email" autoComplete="email" placeholder="ban@congty.vn" required />
                </div>
                <button type="submit" className="btn primary" style={{ width: "100%", justifyContent: "center", padding: 13 }}>
                  <Icon name="key" /> Gửi liên kết đặt lại
                </button>
              </form>
            </>
          )
        ) : (
          // --- Chế độ tuỳ biến (dev): email + SĐT khớp hồ sơ ---
          <>
            <p className="muted small" style={{ marginBottom: 20 }}>
              Nhập email đăng nhập và số điện thoại đã đăng ký trên hồ sơ để đặt lại mật khẩu.
            </p>
            {sp.err && (
              <div className="badge b-rose" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
                {ERR[sp.err] ?? "Có lỗi xảy ra."}
              </div>
            )}
            <form action={forgotPasswordAction}>
              <div className="field">
                <label>Email đăng nhập</label>
                <input type="email" name="email" autoComplete="email" placeholder="ban@congty.vn" required />
              </div>
              <div className="field">
                <label>Số điện thoại đã đăng ký</label>
                <input type="tel" name="phone" autoComplete="tel" placeholder="09xxxxxxxx" required />
              </div>
              <div className="field">
                <label>Mật khẩu mới</label>
                <input type="password" name="newPassword" autoComplete="new-password" minLength={6} placeholder="Tối thiểu 6 ký tự" required />
              </div>
              <div className="field">
                <label>Xác nhận mật khẩu mới</label>
                <input type="password" name="confirmPassword" autoComplete="new-password" minLength={6} required />
              </div>
              <button type="submit" className="btn primary" style={{ width: "100%", justifyContent: "center", padding: 13 }}>
                <Icon name="key" /> Đặt lại mật khẩu
              </button>
            </form>
          </>
        )}

        <p className="muted small" style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/login">← Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
