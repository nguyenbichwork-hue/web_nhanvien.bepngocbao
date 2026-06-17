// Ảnh thu nhỏ sản phẩm — dùng ảnh thật từ Haravan (p.image). Thiếu ảnh → ô giữ chỗ.
// Dùng <img> thường (không next/image) để khỏi cấu hình domain cho ảnh Haravan ngoài.
import { Icon } from "@/components/icon";

export function ProductThumb({
  src,
  name,
  size = 38,
}: {
  src?: string;
  name?: string;
  size?: number;
}) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 8,
    flexShrink: 0,
    objectFit: "cover",
    background: "var(--surface-2)",
    border: "1px solid var(--bd)",
  };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name || "Sản phẩm"} style={style} loading="lazy" />;
  }
  return (
    <div style={{ ...style, display: "grid", placeItems: "center", color: "var(--tx-soft)" }} aria-hidden>
      <Icon name="box" />
    </div>
  );
}
