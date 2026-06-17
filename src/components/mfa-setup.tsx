"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/client";

type Phase = "loading" | "off" | "enrolling" | "on";

/** Bật/tắt 2FA (TOTP) bằng Supabase Auth MFA. Hiển thị QR + secret khi đăng ký,
 *  yêu cầu nhập mã 6 số để xác nhận. Khi đã bật → cho phép gỡ. */
export function MfaSetup() {
  const supabase = createClient();
  const [phase, setPhase] = useState<Phase>("loading");
  const [factorId, setFactorId] = useState<string>("");
  const [qr, setQr] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) { setPhase("off"); return; }
    const verified = data?.totp?.[0]; // `totp` chỉ gồm factor đã verified
    if (verified) { setFactorId(verified.id); setPhase("on"); }
    else { setPhase("off"); }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function startEnroll() {
    setError(null); setBusy(true);
    // Dọn factor "unverified" còn sót để tránh lỗi trùng (dùng `all` vì `totp` đã lọc verified).
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `BNB ${Date.now()}` });
    setBusy(false);
    if (error || !data) { setError(error?.message || "Không khởi tạo được 2FA."); return; }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setCode("");
    setPhase("enrolling");
  }

  async function verify() {
    setError(null); setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (error) { setError("Mã không đúng hoặc đã hết hạn. Thử lại."); return; }
    setQr(""); setSecret(""); setCode("");
    setPhase("on");
  }

  async function disable() {
    if (!factorId) return;
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    setPhase("off");
  }

  return (
    <div className="card" style={{ maxWidth: 560, marginTop: 18 }}>
      <div className="card-h">
        <div>
          <h3>Xác thực 2 lớp (2FA)</h3>
          <div className="sub">Bảo vệ tài khoản bằng mã TOTP từ Google Authenticator / Authy / Microsoft Authenticator.</div>
        </div>
        <span className={`badge ${phase === "on" ? "b-green" : "b-gray"}`}>
          {phase === "loading" ? "…" : phase === "on" ? "Đang bật" : "Đang tắt"}
        </span>
      </div>

      {error && <div className="badge b-rose" style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>{error}</div>}

      {phase === "loading" && <p className="muted small">Đang kiểm tra trạng thái…</p>}

      {phase === "off" && (
        <>
          <p className="small muted" style={{ marginTop: 0 }}>
            Khi bật, mỗi lần đăng nhập bạn sẽ phải nhập thêm mã 6 số từ app xác thực.
          </p>
          <button className="btn primary" onClick={startEnroll} disabled={busy}>
            <Icon name="shield" /> {busy ? "Đang khởi tạo…" : "Bật 2FA"}
          </button>
        </>
      )}

      {phase === "enrolling" && (
        <div style={{ display: "grid", gap: 14 }}>
          <p className="small" style={{ margin: 0 }}>1. Quét mã QR bằng app xác thực (hoặc nhập khoá thủ công):</p>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{ width: 168, height: 168, background: "#fff", borderRadius: 12, padding: 8, display: "grid", placeItems: "center" }}
              {...(qr.startsWith("<") ? { dangerouslySetInnerHTML: { __html: qr } } : {})}
            >
              {!qr.startsWith("<") && qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR 2FA" style={{ width: "100%", height: "100%" }} />
              ) : null}
            </div>
            <div className="field" style={{ margin: 0, minWidth: 200 }}>
              <label>Khoá thủ công</label>
              <input value={secret} readOnly onFocus={(e) => e.target.select()} style={{ fontFamily: "monospace", fontSize: 12 }} />
            </div>
          </div>
          <div className="field" style={{ margin: 0, maxWidth: 220 }}>
            <label>2. Nhập mã 6 số</label>
            <input
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              style={{ fontFamily: "monospace", letterSpacing: 4, fontSize: 18 }}
            />
          </div>
          <div className="flex gap">
            <button className="btn primary" onClick={verify} disabled={busy || code.length !== 6}>
              <Icon name="check" /> {busy ? "Đang xác nhận…" : "Xác nhận & bật"}
            </button>
            <button className="btn" onClick={() => setPhase("off")} disabled={busy}>Huỷ</button>
          </div>
        </div>
      )}

      {phase === "on" && (
        <>
          <p className="small" style={{ marginTop: 0, color: "var(--c-teal)" }}>
            <Icon name="check" /> 2FA đang bảo vệ tài khoản này. Mỗi lần đăng nhập sẽ cần mã từ app xác thực.
          </p>
          <button className="btn" onClick={disable} disabled={busy} style={{ borderColor: "var(--c-rose)", color: "var(--c-rose)" }}>
            <Icon name="x" /> {busy ? "Đang tắt…" : "Tắt 2FA"}
          </button>
        </>
      )}
    </div>
  );
}
