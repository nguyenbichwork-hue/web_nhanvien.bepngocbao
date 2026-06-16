import Link from "next/link";
import { Icon } from "@/components/icon";
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

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Thông báo
      </div>
      <div className="page-head">
        <div>
          <h1>Thông báo</h1>
          <p>{items.length} thông báo · {unread} chưa đọc.</p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="btn"><Icon name="check" /> Đánh dấu tất cả đã đọc</button>
          </form>
        )}
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
