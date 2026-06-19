import Link from "next/link";
import { Icon } from "./icon";

export type HeroStat = { label: string; value: string | number; tone?: "up" | "down" | "flat" };

// Header trang theo GIAO DIỆN GỐC (crumbs + page-head). Giữ API cũ (icon/title/
// subtitle/crumb/actions; eyebrow/stats nhận nhưng không render) để mọi trang đang
// gọi <PageHero/> tự hiển thị lại như trước khi redesign mà không phải sửa từng trang.
export function PageHero({
  icon,
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
    <>
      {crumb && crumb.length > 0 && (
        <div className="crumbs">
          {crumb.map(([label, href], i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {href ? <Link href={href}>{label}</Link> : <span>{label}</span>}
              {i < crumb.length - 1 && <Icon name="chev" />}
            </span>
          ))}
        </div>
      )}
      <div className="page-head">
        <div>
          <h1>{icon && <Icon name={icon} />} {title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="flex gap aic" style={{ flexWrap: "wrap" }}>{actions}</div>}
      </div>
    </>
  );
}
