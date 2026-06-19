import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import {
  listLeads, listDeliveries, listWarranties, listOrders, listTasks, listShiftReports,
} from "@/lib/bnb/store";
import { fmtVnd, fmtDate, fmtDateTime, isSameDay } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import {
  LEAD_SOURCE_LABEL, DELIVERY_STATUS_LABEL, DELIVERY_STATUS_BADGE,
  PRIORITY_LABEL, PRIORITY_BADGE, SHIFT_LABEL,
} from "@/lib/bnb/types";

export const dynamic = "force-dynamic";

function Kpi({ icon, tone, value, label, sub }: { icon: string; tone: string; value: number; label: string; sub?: string }) {
  return (
    <div className={`card kpi grad hover ${tone}`}>
      <div className="ic"><Icon name={icon} /></div>
      <div className="val"><CountUp to={value} /></div>
      <div className="lbl">{label}</div>
      {sub && <div className="trend up">{sub}</div>}
    </div>
  );
}

export default async function TodayPage() {
  const session = await requireSession();
  const [leads, deliveries, warranties, orders, tasks, shifts, names] = await Promise.all([
    listLeads(), listDeliveries(), listWarranties(), listOrders(), listTasks(), listShiftReports(), employeeNameMap(),
  ]);

  const greet = (() => {
    const h = new Date().getHours();
    return h < 11 ? "Chào buổi sáng" : h < 14 ? "Chào buổi trưa" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  })();

  const followUps = leads.filter((l) => l.nextFollowUpAt && isSameDay(l.nextFollowUpAt) && l.stage !== "won" && l.stage !== "lost");
  const newLeads = leads.filter((l) => isSameDay(l.createdAt));
  const deliveriesToday = deliveries.filter((d) => isSameDay(d.scheduledAt) && d.status !== "done" && d.status !== "failed");
  const warrantiesDue = warranties.filter((w) => w.status === "due" || (w.nextCareAt && w.nextCareAt <= new Date().toISOString().slice(0, 10) && w.status !== "resolved"));
  const openOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const tasksDue = tasks.filter((t) => (t.status === "open" || t.status === "doing") && t.dueAt && t.dueAt <= new Date().toISOString().slice(0, 10));
  const lastShift = [...shifts].sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  const name = session.employee?.fullName || session.user.fullName;

  return (
    <div>
      <PageHero
        icon="today"
        title={`${greet} 👋`}
        subtitle={`${name} · Hôm nay ${fmtDate(new Date().toISOString())} — đây là việc cần làm.`}
        eyebrow="Hằng ngày"
        stats={[
          { label: "Lead mới", value: newLeads.length },
          { label: "Cần liên hệ", value: followUps.length, tone: followUps.length ? "down" : "flat" },
          { label: "Giao – lắp", value: deliveriesToday.length },
        ]}
        actions={<Link href="/crm" className="btn primary"><Icon name="plus" /> Thêm khách hàng</Link>}
      />

      <div className="grid-k g-4 stagger">
        <Kpi icon="leads" tone="gr-crimson" value={newLeads.length} label="Lead mới hôm nay" sub={`${leads.length} lead tổng`} />
        <Kpi icon="phone" tone="gr-sunny" value={followUps.length} label="Cần liên hệ hôm nay" />
        <Kpi icon="truck" tone="gr-mint" value={deliveriesToday.length} label="Giao – lắp hôm nay" />
        <Kpi icon="warranty" tone="gr-malinka" value={warrantiesDue.length} label="Bảo hành đến hạn" />
      </div>

      <div className="grid-k g-2 mt">
        {/* Cần liên hệ hôm nay */}
        <div className="card">
          <div className="card-h">
            <h3>Cần liên hệ hôm nay</h3>
            <Link href="/crm" className="badge b-indigo">Xem CRM</Link>
          </div>
          {followUps.length === 0 ? (
            <p className="muted small" style={{ padding: "14px 0" }}>Không có lead cần follow-up hôm nay. 🎉</p>
          ) : (
            <table>
              <tbody>
                {followUps.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="uname">{l.name}</div>
                      <div className="urole">{l.phone} · {LEAD_SOURCE_LABEL[l.source]}</div>
                    </td>
                    <td className="small muted">{l.need || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/crm/${l.id}`} className="badge b-amber">Liên hệ</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bàn giao ca gần nhất */}
        <div className="card">
          <div className="card-h">
            <h3>Bàn giao ca gần nhất</h3>
            <Link href="/shift-report" className="badge b-indigo">Báo cáo ca</Link>
          </div>
          {!lastShift ? (
            <p className="muted small" style={{ padding: "14px 0" }}>Chưa có báo cáo ca.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div className="flex between aic">
                <b>{SHIFT_LABEL[lastShift.shift]} · {fmtDate(lastShift.date)}</b>
                <span className="badge b-green">{fmtVnd(lastShift.revenue || 0)}</span>
              </div>
              <div className="flex gap" style={{ flexWrap: "wrap" }}>
                <span className="badge b-gray">{lastShift.orders || 0} đơn</span>
                <span className="badge b-gray">{lastShift.leads || 0} lead</span>
                <span className="badge b-gray">{lastShift.visitors || 0} khách ghé</span>
              </div>
              {lastShift.issues && <p className="small"><b>Sự cố:</b> {lastShift.issues}</p>}
              {lastShift.handover && <p className="small muted"><b>Bàn giao:</b> {lastShift.handover}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="grid-k g-3 mt">
        {/* Giao - lắp hôm nay */}
        <div className="card">
          <div className="card-h"><h3>Lịch giao – lắp hôm nay</h3><Link href="/delivery" className="badge b-indigo">Tất cả</Link></div>
          {deliveriesToday.length === 0 ? (
            <p className="muted small" style={{ padding: "14px 0" }}>Không có lịch hôm nay.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {deliveriesToday.map((d) => (
                <div key={d.id} style={{ display: "grid", gap: 4 }}>
                  <div className="flex between aic">
                    <b className="small">{d.code}</b>
                    <span className={`badge ${DELIVERY_STATUS_BADGE[d.status]}`}>{DELIVERY_STATUS_LABEL[d.status]}</span>
                  </div>
                  <div className="urole">{fmtDateTime(d.scheduledAt)} · {d.address || "—"}</div>
                  <div className="urole">KT: {d.teamId ? names[d.teamId] || d.teamId : "Chưa phân"}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bảo hành đến hạn */}
        <div className="card">
          <div className="card-h"><h3>Bảo hành cần chăm sóc</h3><Link href="/warranty" className="badge b-indigo">Tất cả</Link></div>
          {warrantiesDue.length === 0 ? (
            <p className="muted small" style={{ padding: "14px 0" }}>Không có phiếu đến hạn.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {warrantiesDue.map((w) => (
                <div key={w.id} style={{ display: "grid", gap: 4 }}>
                  <div className="flex between aic">
                    <b className="small">{w.code}</b>
                    <span className="badge b-amber">Đến hạn</span>
                  </div>
                  <div className="urole">{w.productName || "—"}</div>
                  <div className="urole">Lắp: {fmtDate(w.installedAt)} · Mốc đã chăm: {(w.careDone || []).join("/") || "—"} ngày</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Việc nội bộ đến hạn */}
        <div className="card">
          <div className="card-h"><h3>Việc nội bộ đến hạn</h3><Link href="/tasks" className="badge b-indigo">Tất cả</Link></div>
          {tasksDue.length === 0 ? (
            <p className="muted small" style={{ padding: "14px 0" }}>Không có việc đến hạn.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {tasksDue.map((t) => (
                <div key={t.id} style={{ display: "grid", gap: 4 }}>
                  <div className="flex between aic">
                    <b className="small">{t.title}</b>
                    <span className={`badge ${PRIORITY_BADGE[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                  </div>
                  <div className="urole">{t.assigneeId ? names[t.assigneeId] || t.assigneeId : "Chưa giao"} · Hạn {fmtDate(t.dueAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Đơn đang xử lý nhanh */}
      <div className="card mt">
        <div className="card-h"><h3>Đơn đang xử lý ({openOrders.length})</h3><Link href="/orders" className="badge b-indigo">Quản lý đơn</Link></div>
        {openOrders.length === 0 ? (
          <p className="muted small" style={{ padding: "14px 0" }}>Không có đơn đang mở.</p>
        ) : (
          <table>
            <thead><tr><th>Mã đơn</th><th>Phụ trách</th><th>Trạng thái</th><th style={{ textAlign: "right" }}>Còn lại</th></tr></thead>
            <tbody>
              {openOrders.map((o) => (
                <tr key={o.id}>
                  <td><Link href="/orders" className="uname">{o.code}</Link></td>
                  <td className="small muted">{o.assigneeId ? names[o.assigneeId] || o.assigneeId : "—"}</td>
                  <td className="small">{o.status}</td>
                  <td style={{ textAlign: "right" }}><b>{fmtVnd(Math.max(0, o.total - o.paid))}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
