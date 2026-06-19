import Link from "next/link";
import { Icon } from "./icon";

export type HeroStat = { label: string; value: string | number; tone?: "up" | "down" | "flat" };

// Hero header dùng chung cho mọi trang — tạo "bản sắc" theo nhóm: ô icon gradient
// theo --accent, eyebrow (tên khu), tiêu đề lớn, mô tả, chip số liệu nhanh, và
// slot thao tác bên phải. Tô màu hoàn toàn bằng biến --accent (đổi theo nhóm).
export function PageHero({
  icon,
  title,
  subtitle,
  eyebrow,
  crumb,
  stats,
  actions,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  /** Đường dẫn vụn: [nhãn, href?][] — phần tử cuối không cần href. */
  crumb?: [string, string?][];
  stats?: HeroStat[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="hero view-in">
      <div className="hero-bg" aria-hidden />
      <div className="hero-main">
        <div className="hero-ic"><Icon name={icon} /></div>
        <div className="hero-text">
          {(eyebrow || crumb) && (
            <div className="hero-eyebrow">
              {crumb
                ? crumb.map(([label, href], i) => (
                    <span key={i} className="hc-item">
                      {href ? <Link href={href}>{label}</Link> : <span>{label}</span>}
                      {i < crumb.length - 1 && <Icon name="chev" />}
                    </span>
                  ))
                : eyebrow}
            </div>
          )}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      {(stats?.length || actions) && (
        <div className="hero-side">
          {stats?.length ? (
            <div className="hero-stats">
              {stats.map((s, i) => (
                <div className="hero-stat" key={i}>
                  <b className={s.tone ? `hs-${s.tone}` : undefined}>{s.value}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          ) : null}
          {actions && <div className="hero-actions">{actions}</div>}
        </div>
      )}
    </div>
  );
}
