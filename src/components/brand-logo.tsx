// Logo Bếp Ngọc Bảo (ảnh thật ở /public/logo.png — đỏ crimson + chữ slate).
// Dùng ở thanh bên và các trang đăng nhập/quên-mật-khẩu.

export function BrandLogo({
  height = 30,
  centered = false,
  subtitle = null,
}: {
  height?: number;
  centered?: boolean;
  subtitle?: string | null;
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
