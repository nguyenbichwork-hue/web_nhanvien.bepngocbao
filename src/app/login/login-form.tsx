"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseAuthEnabled } from "@/lib/supabase/env";
import { devLoginAction, quickLoginAction } from "@/lib/auth/actions";
import type { DemoAccount } from "@/lib/auth/demo";

export function LoginForm({ demoAccounts }: { demoAccounts: DemoAccount[] }) {
  return (
    <Suspense>
      <LoginInner demoAccounts={demoAccounts} />
    </Suspense>
  );
}

function LoginInner({ demoAccounts }: { demoAccounts: DemoAccount[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const urlError = params.get("error");
  const justReset = params.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError ? "Email hoặc mật khẩu không đúng." : null,
  );
  // Bước thử thách 2FA (khi tài khoản đã bật TOTP).
  const [mfa, setMfa] = useState<{ factorId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  function done() {
    router.push(next);
    router.refresh();
  }

  // Nhánh Supabase: đăng nhập thật qua supabase-js ở client.
  async function onSupabaseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    // Tài khoản có bật 2FA? → cần nâng lên aal2 bằng mã TOTP.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0]; // `totp` chỉ gồm factor đã verified
      setLoading(false);
      if (totp) { setMfa({ factorId: totp.id }); return; }
    }
    setLoading(false);
    done();
  }

  // Xác minh mã 2FA → nâng phiên lên aal2.
  async function onVerifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfa) return;
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfa.factorId, code: mfaCode.trim() });
    setLoading(false);
    if (error) { setError("Mã 2FA không đúng hoặc đã hết hạn."); return; }
    done();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(1200px 600px at 70% -10%, rgba(158,27,50,.16), transparent), var(--bg)",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 410, padding: 32 }}>
        <div style={{ paddingBottom: 22, display: "flex", justifyContent: "center" }}>
          <BrandLogo height={46} centered onDark />
        </div>

        <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>Đăng nhập</h1>
        <p className="muted small" style={{ marginBottom: 22 }}>
          Chào mừng trở lại. Vui lòng đăng nhập để tiếp tục.
        </p>

        {justReset && (
          <div className="badge b-green" style={{ width: "100%", justifyContent: "center", marginBottom: 16 }}>
            Đã đặt lại mật khẩu. Đăng nhập bằng mật khẩu mới.
          </div>
        )}

        {/* Bước 2FA: nhập mã từ app xác thực để hoàn tất đăng nhập. */}
        {mfa ? (
          <form onSubmit={onVerifyMfa}>
            <p className="small muted" style={{ marginTop: 0 }}>
              <Icon name="shield" /> Tài khoản này bật xác thực 2 lớp. Nhập mã 6 số từ app xác thực.
            </p>
            <div className="field">
              <label>Mã 2FA</label>
              <input
                inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" autoFocus
                value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                style={{ fontFamily: "monospace", letterSpacing: 6, fontSize: 20, textAlign: "center" }}
              />
            </div>
            {error && (
              <div className="badge b-rose" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>{error}</div>
            )}
            <button className="btn primary" type="submit" disabled={loading || mfaCode.length !== 6} style={{ width: "100%", justifyContent: "center", padding: 13 }}>
              <Icon name="check" /> {loading ? "Đang xác minh..." : "Xác minh & vào hệ thống"}
            </button>
            <button type="button" className="btn" onClick={() => { setMfa(null); setMfaCode(""); setError(null); }} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>
              Quay lại
            </button>
          </form>
        ) : (
        /* Form: dùng server action ở dev; supabase-js khi đã cấu hình. */
        <form
          action={isSupabaseAuthEnabled ? undefined : devLoginAction}
          onSubmit={isSupabaseAuthEnabled ? onSupabaseSubmit : undefined}
        >
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="ban@congty.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>Mật khẩu</label>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div style={{ textAlign: "right", marginBottom: 14 }}>
            <Link href="/forgot-password" className="small muted">Quên mật khẩu?</Link>
          </div>

          {error && (
            <div
              className="badge b-rose"
              style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}
            >
              {error}
            </div>
          )}

          <button
            className="btn primary"
            type="submit"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: 13 }}
          >
            <Icon name="check" />
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
        )}

        {/* Đăng nhập nhanh — chỉ ở chế độ dev (chưa nối Supabase). */}
        {!isSupabaseAuthEnabled && demoAccounts.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div
              className="small"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--tx-soft)",
                marginBottom: 12,
              }}
            >
              <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
              Đăng nhập nhanh (demo)
              <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {demoAccounts.map((a) => (
                <form key={a.uid} action={quickLoginAction}>
                  <input type="hidden" name="uid" value={a.uid} />
                  <button
                    type="submit"
                    className="btn"
                    style={{ width: "100%", justifyContent: "space-between", padding: "10px 14px" }}
                    title={`${a.email} · ${a.scopeLabel}`}
                  >
                    <span className="flex aic" style={{ gap: 10 }}>
                      <span className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                        {initials(a.fullName)}
                      </span>
                      <span style={{ textAlign: "left", lineHeight: 1.25 }}>
                        <span style={{ display: "block", fontWeight: 600, fontSize: 13 }}>{a.roleName}</span>
                        <span className="muted" style={{ fontSize: 11.5 }}>{a.fullName}</span>
                      </span>
                    </span>
                    <Icon name="chev" />
                  </button>
                </form>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 11, textAlign: "center", marginTop: 12 }}>
              Mật khẩu demo cho mọi tài khoản: <code>123456</code>
            </p>
          </div>
        )}

        <p className="muted" style={{ fontSize: 11.5, textAlign: "center", marginTop: 20 }}>
          Bếp Ngọc Bảo · Hệ thống vận hành cửa hàng
        </p>
      </div>
    </div>
  );
}

function initials(label: string) {
  const parts = label.replace(/@.*/, "").split(/[.\s_-]+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join("") || "K").toUpperCase();
}
