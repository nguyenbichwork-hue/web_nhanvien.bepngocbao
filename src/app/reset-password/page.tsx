"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";

// Tạo client 1 lần (chỉ chạy ở trình duyệt).
const supabase = createClient();

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Khi tới từ link email, Supabase tự lập "phiên khôi phục" → cho phép đặt MK mới.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 6) return setError("Mật khẩu phải có ít nhất 6 ký tự.");
    if (pw !== confirm) return setError("Mật khẩu xác nhận không khớp.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return setError(error.message);
    await supabase.auth.signOut();
    setDone(true);
    setTimeout(() => router.push("/login?reset=1"), 1200);
  }

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

        {done ? (
          <div className="badge b-green" style={{ width: "100%", justifyContent: "center", margin: "16px 0" }}>
            Đã đổi mật khẩu! Đang chuyển tới trang đăng nhập…
          </div>
        ) : !ready ? (
          <p className="muted small" style={{ margin: "16px 0" }}>
            Đang xác thực liên kết… Nếu trang đứng yên, liên kết có thể đã hết hạn — hãy yêu cầu gửi lại từ
            trang <Link href="/forgot-password">Quên mật khẩu</Link>.
          </p>
        ) : (
          <>
            <p className="muted small" style={{ marginBottom: 20 }}>Nhập mật khẩu mới cho tài khoản của bạn.</p>
            {error && (
              <div className="badge b-rose" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
                {error}
              </div>
            )}
            <form onSubmit={onSubmit}>
              <div className="field">
                <label>Mật khẩu mới</label>
                <input type="password" autoComplete="new-password" minLength={6} value={pw}
                  onChange={(e) => setPw(e.target.value)} placeholder="Tối thiểu 6 ký tự" required />
              </div>
              <div className="field">
                <label>Xác nhận mật khẩu mới</label>
                <input type="password" autoComplete="new-password" minLength={6} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <button type="submit" className="btn primary" disabled={loading}
                style={{ width: "100%", justifyContent: "center", padding: 13 }}>
                <Icon name="check" /> {loading ? "Đang lưu…" : "Lưu mật khẩu"}
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
