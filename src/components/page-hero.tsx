import Link from "next/link";
import { Icon } from "./icon";

export type HeroStat = { label: string; value: string | number; tone?: "up" | "down" | "flat" };

// Page header kiểu TailAdmin: tiêu đề (h2) bên trái + breadcrumb (Home / …) bên
// phải, kèm slot thao tác. Gọn, phẳng — đúng "PageBreadcrumb" của TailAdmin.
// (icon/eyebrow/stats giữ trong props để không phải sửa ~50 trang gọi, nhưng
//  không render — TailAdmin header không có hero to.)
export function PageHero({
  title,
  subtitle,
  crumb,
  actions,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  crumb?: [string, string?][];
  stats?: HeroStat[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-head2">
      <div className="ph-left">
        <h2 className="ph-title">{title}</h2>
        {subtitle && <p className="ph-sub">{subtitle}</p>}
      </div>
      <div className="ph-right">
        {crumb && crumb.length > 0 && (
          <nav className="ph-crumb">
            {crumb.map(([label, href], i) => (
              <span key={i} className="phc-item">
                {href ? <Link href={href}>{label}</Link> : <span>{label}</span>}
                {i < crumb.length - 1 && <Icon name="chev" />}
              </span>
            ))}
          </nav>
        )}
        {actions && <div className="ph-actions">{actions}</div>}
      </div>
    </div>
  );
}
