// Logo Bếp Ngọc Bảo.
// - Mặc định (thanh bên, nền sáng): dùng ảnh logo ngang đầy đủ /logo.png.
// - onDark (trang đăng nhập, nền tối): monogram crimson /logo-mark.png (nền trong suốt)
//   + tên thương hiệu render bằng chữ sáng → sạch, không cần tấm nền trắng.

export function BrandLogo({
  height = 30,
  centered = false,
  subtitle = null,
  onDark = false,
}: {
  height?: number;
  centered?: boolean;
  subtitle?: string | null;
  /** Trên nền tối (trang đăng nhập…) — dùng monogram + chữ sáng cho gọn gàng. */
  onDark?: boolean;
}) {
  if (onDark) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mark.png"
          alt="Bếp Ngọc Bảo"
          style={{ height: height * 1.18, width: "auto", display: "block", filter: "drop-shadow(0 4px 14px rgba(200,32,63,.35))" }}
        />
        <div style={{ textAlign: "center", lineHeight: 1.15 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 17, letterSpacing: 2.5 }}>BẾP NGỌC BẢO</div>
          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, letterSpacing: 0.6, marginTop: 3, textTransform: "uppercase" }}>
            An tâm vận hành · Trọn vẹn cảm xúc
          </div>
        </div>
      </div>
    );
  }

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
        style={{ height, width: "auto", display: "block", maxWidth: "100%" }}
      />
      {subtitle && (
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--tx-soft)", letterSpacing: 0.2 }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
