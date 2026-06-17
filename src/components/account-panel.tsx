import Link from "next/link";
import { Icon } from "@/components/icon";
import { MfaSetup } from "@/components/mfa-setup";
import { changePasswordAction } from "@/lib/auth/actions";
import { isSupabaseAuthEnabled } from "@/lib/supabase/env";
import { SCOPE_LABEL } from "@/lib/org/types";
import type { Session } from "@/lib/auth/session";

const ERR: Record<string, string> = {
  current: "Mật khẩu hiện tại không đúng.",
  short: "Mật khẩu mới phải có ít nhất 6 ký tự.",
  mismatch: "Mật khẩu xác nhận không khớp.",
  notfound: "Không tìm thấy tài khoản.",
};

/**
 * Khối "Tài khoản của tôi": thông tin đăng nhập + đổi mật khẩu.
 * Dùng chung cho /account (menu avatar) và /settings/account (tab Cài đặt) — mọi vai trò.
 * `returnTo` để action quay lại đúng trang khi báo lỗi.
 */
export function AccountPanel({
  session,
  status,
  returnTo,
}: {
  session: Session;
  status: { ok?: string; err?: string };
  returnTo: string;
}) {
  const emp = session.employee;
  const scopeLabel = SCOPE_LABEL[session.scope];

  return (
    <>
      {/* Thông tin tài khoản */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <div>
            <h3>Thông tin đăng nhập</h3>
            <div className="sub">Email & vai trò do bộ phận Nhân sự thiết lập.</div>
          </div>
          <span className="badge b-indigo">{session.role.name}</span>
        </div>
        <div className="grid-k g-3" style={{ gap: 14 }}>
          <Field label="Email đăng nhập" value={session.user.email} />
          <Field label="Vai trò" value={session.role.name} />
          <Field label="Phạm vi dữ liệu" value={scopeLabel} />
          {emp && <Field label="Họ tên" value={emp.fullName} />}
          {emp && <Field label="Mã nhân viên" value={emp.code} />}
          <Field label="SĐT khôi phục" value={emp?.phone || "(chưa có — cập nhật trong hồ sơ)"} />
        </div>
        {emp && (
          <Link href="/account/profile" className="btn" style={{ marginTop: 14, width: "fit-content" }}>
            <Icon name="user" /> Sửa hồ sơ của tôi
          </Link>
        )}
      </div>

      {/* Đổi mật khẩu */}
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-h">
          <div>
            <h3>Đổi mật khẩu</h3>
            <div className="sub">Mật khẩu mới tối thiểu 6 ký tự. Số điện thoại trên hồ sơ dùng để khôi phục khi quên.</div>
          </div>
          <span className="badge b-gray"><Icon name="key" /></span>
        </div>

        {status.ok && (
          <div className="badge b-green" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
            Đã đổi mật khẩu thành công.
          </div>
        )}
        {status.err && (
          <div className="badge b-rose" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
            {ERR[status.err] ?? "Có lỗi xảy ra."}
          </div>
        )}

        <form action={changePasswordAction}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <div className="field">
            <label>Mật khẩu hiện tại *</label>
            <input type="password" name="currentPassword" autoComplete="current-password" required />
          </div>
          <div className="grid-k g-2" style={{ gap: 14 }}>
            <div className="field">
              <label>Mật khẩu mới *</label>
              <input type="password" name="newPassword" autoComplete="new-password" minLength={6} required />
            </div>
            <div className="field">
              <label>Xác nhận mật khẩu mới *</label>
              <input type="password" name="confirmPassword" autoComplete="new-password" minLength={6} required />
            </div>
          </div>
          <button type="submit" className="btn primary"><Icon name="check" /> Đổi mật khẩu</button>
        </form>
      </div>

      {/* 2FA — chỉ khi đã bật Supabase Auth (MFA là tính năng của Supabase Auth) */}
      {isSupabaseAuthEnabled && <MfaSetup />}
    </>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <div style={{ fontWeight: 600 }}>{value || "—"}</div>
    </div>
  );
}
