// Logo Bếp Ngọc Bảo (ảnh thật ở /public/logo.png — đỏ crimson + chữ slate).
// Dùng ở thanh bên và các trang đăng nhập/quên-mật-khẩu.

export function BrandLogo({
  height = 30,
  centered = false,
  subtitle = null,
  onDark = false,
}: {
  height?: number;
  centered?: boolean;
  subtitle?: string | null;
  /** Trên nền tối (trang đăng nhập…) — đặt logo lên tấm nền sáng để chữ không bị chìm. */
  onDark?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: centered ? "center" : "flex-start",
        gap: 4,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Bếp Ngọc Bảo"
        style={{
          height,
          width: "auto",
          display: "block",
          maxWidth: "100%",
          ...(onDark
            ? { background: "#fff", padding: "12px 18px", borderRadius: 16, boxShadow: "0 6px 20px rgba(0,0,0,.28)" }
            : {}),
        }}
      />
      {subtitle && (
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-soft)", letterSpacing: 0.2 }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
