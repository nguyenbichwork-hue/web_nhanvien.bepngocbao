import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/org/actions";
import { listNotifications } from "@/lib/org/store";
import { requireSession } from "@/lib/auth/session";

function ago(iso: string) {
  const d = iso.slice(0, 10).split("-");
  const t = iso.slice(11, 16);
  return `${d[2]}/${d[1]} ${t}`;
}

export default async function NotificationsPage() {
  const session = await requireSession();
  const items = await listNotifications(session.user.id);
  const unread = items.filter((n) => !n.read).length;
  const read = items.length - unread;

  return (
    <div>
      <PageHero
        icon="bell"
        title="Thông báo"
        subtitle="Tất cả thông báo gửi tới bạn từ hệ thống và quản lý."
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Thông báo"]]}
        stats={[
          { label: "Thông báo", value: items.length },
          { label: "Chưa đọc", value: unread, tone: unread > 0 ? "down" : "flat" },
          { label: "Đã đọc", value: read, tone: "up" },
        ]}
        actions={
          unread > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="btn"><Icon name="check" /> Đánh dấu tất cả đã đọc</button>
            </form>
          ) : undefined
        }
      />

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
        <div className="card kpi grad hover gr-deepblue">
          <div className="ic"><Icon name="bell" /></div>
          <div className="val"><CountUp to={items.length} /></div>
          <div className="lbl">tổng thông báo</div>
        </div>
        <div className="card kpi grad hover gr-sunny">
          <div className="ic"><Icon name="alert" /></div>
          <div className="val"><CountUp to={unread} /></div>
          <div className="lbl">chưa đọc</div>
        </div>
        <div className="card kpi grad hover gr-mint">
          <div className="ic"><Icon name="check" /></div>
          <div className="val"><CountUp to={read} /></div>
          <div className="lbl">đã đọc</div>
        </div>
      </div>

      <div className="card">
        {items.length === 0 ? (
          <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>Bạn chưa có thông báo nào.</p>
        ) : (
          <div style={{ display: "grid", gap: 2 }}>
            {items.map((n) => (
              <div key={n.id} className="flex aic" style={{ gap: 12, padding: "12px 6px", borderBottom: "1px solid var(--line)", background: n.read ? "transparent" : "var(--surface-2, rgba(99,102,241,.06))", borderRadius: "var(--r-md)" }}>
                <div className="ic" style={{ width: 34, height: 34, color: n.read ? "var(--tx-soft)" : "var(--brand-1)" }}><Icon name="bell" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 14 }}>
                    {n.href ? <Link href={n.href} style={{ color: "inherit" }}>{n.title}</Link> : n.title}
                  </div>
                  {n.body && <div className="small muted">{n.body}</div>}
                  <div className="small muted">{ago(n.createdAt)}</div>
                </div>
                {!n.read && (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" className="iconbtn" title="Đánh dấu đã đọc"><Icon name="check" /></button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
