import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { CountUp, HBars, BarChart, ProgressBar } from "@/components/charts";
import {
  listLeads, listOrders, listWarranties, listShiftReports, listTasks,
} from "@/lib/bnb/store";
import { employeeNameMap, fmtVnd, fmtDate, dayKey } from "@/lib/bnb/util";
import {
  LEAD_STAGES, LEAD_STAGE_LABEL,
  ORDER_STATUS_LABEL, ORDER_STATUS_BADGE,
  PRIORITY_LABEL, PRIORITY_BADGE, TASK_CAT_LABEL,
  SHIFT_LABEL,
  type OrderStatus, type LeadStage,
} from "@/lib/bnb/types";

export const dynamic = "force-dynamic";

const STAGE_COLOR: Record<LeadStage, string> = {
  new: "var(--c-sky)",
  consulting: "var(--c-indigo)",
  quoted: "var(--c-amber)",
  won: "var(--c-teal)",
  lost: "var(--c-rose)",
};

export default async function AdminPage() {
  await requirePermission("bizdash.read");
  const [leads, orders, warranties, shifts, tasks, names] = await Promise.all([
    listLeads(), listOrders(), listWarranties(), listShiftReports(), listTasks(), employeeNameMap(),
  ]);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // ---- KPI ----
  const revenue = orders.reduce((s, o) => s + (o.paid || 0), 0);
  const orderCount = orders.length;
  // AOV = giá trị đơn trung bình (đơn chưa huỷ).
  const billableOrders = orders.filter((o) => o.status !== "cancelled");
  const aov = billableOrders.length
    ? Math.round(billableOrders.reduce((s, o) => s + (o.total || 0), 0) / billableOrders.length)
    : 0;
  const leadsThisMonth = leads.filter((l) => (l.createdAt || "").slice(0, 7) === monthKey).length;
  const wonCount = leads.filter((l) => l.stage === "won").length;
  const convRate = leads.length ? Math.round((wonCount / leads.length) * 100) : 0;
  const receivable = orders
    .filter((o) => !["completed", "cancelled"].includes(o.status))
    .reduce((s, o) => s + Math.max(0, (o.total || 0) - (o.paid || 0)), 0);

  // ---- Phễu lead ----
  const funnel = LEAD_STAGES.map((st) => ({
    label: LEAD_STAGE_LABEL[st],
    count: leads.filter((l) => l.stage === st).length,
    color: STAGE_COLOR[st],
  }));

  // ---- Cơ cấu đơn theo trạng thái ----
  const orderStatuses = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];
  const orderMix = orderStatuses
    .map((st) => ({ st, count: orders.filter((o) => o.status === st).length }))
    .filter((x) => x.count > 0);

  // ---- Doanh thu (đã thu) 7 ngày gần nhất ----
  const days: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({ key: dayKey(d), label: `${d.getDate()}/${d.getMonth() + 1}` });
  }
  const revByDay = days.map((d) => {
    const sum = orders.reduce((s, o) => {
      const ps = (o.payments || []).filter((p) => dayKey(p.at) === d.key);
      return s + ps.reduce((a, p) => a + (p.amount || 0), 0);
    }, 0);
    return { label: d.label, value: sum };
  });
  const maxRev = Math.max(1, ...revByDay.map((d) => d.value));
  const barData: [string, number][] = revByDay.map((d) => [d.label, Math.round((d.value / maxRev) * 100)]);

  // ---- Sự cố / việc khẩn đang mở ----
  const openIssues = tasks
    .filter((t) => (t.status === "open" || t.status === "doing") && (t.type === "incident" || t.priority === "urgent" || t.priority === "high"))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  // ---- Bảo hành đến hạn ----
  const todayStr = now.toISOString().slice(0, 10);
  const warrantiesDue = warranties
    .filter((w) => w.status === "due" || (w.nextCareAt && w.nextCareAt <= todayStr && w.status !== "resolved" && w.status !== "expired"))
    .sort((a, b) => ((a.nextCareAt || "") < (b.nextCareAt || "") ? -1 : 1));

  // ---- Showroom: báo cáo ca gần nhất ----
  const recentShifts = [...shifts].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Dashboard quản trị</div>
      <div className="page-head">
        <div>
          <h1><Icon name="crown" /> Dashboard quản trị</h1>
          <p>Bức tranh toàn hệ: doanh thu, lead, tỷ lệ chốt và lỗi vận hành — chỉ đọc.</p>
        </div>
      </div>

      {/* KPI lớn */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 24 }}><CountUp to={revenue} /></div>
          <div className="lbl">Doanh thu đã thu (đ)</div>
        </div>
        <div className="card kpi hover tone-i">
          <div className="ic"><Icon name="cart" /></div>
          <div className="val"><CountUp to={orderCount} /></div>
          <div className="lbl">Tổng số đơn</div>
        </div>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="target" /></div>
          <div className="val" style={{ fontSize: 24 }}><CountUp to={aov} /></div>
          <div className="lbl">AOV · giá trị đơn TB (đ)</div>
        </div>
        <div className="card kpi hover tone-i">
          <div className="ic"><Icon name="leads" /></div>
          <div className="val"><CountUp to={leadsThisMonth} /></div>
          <div className="lbl">Lead trong tháng</div>
        </div>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="target" /></div>
          <div className="val"><CountUp to={convRate} />%</div>
          <div className="lbl">Tỷ lệ chốt (won/total)</div>
        </div>
        <div className="card kpi hover tone-r">
          <div className="ic"><Icon name="alert" /></div>
          <div className="val" style={{ fontSize: 24 }}><CountUp to={receivable} /></div>
          <div className="lbl">Công nợ phải thu (đ)</div>
        </div>
      </div>

      {/* Phễu lead + Doanh thu 7 ngày */}
      <div className="grid-k g-2 mt">
        <div className="card">
          <div className="card-h">
            <h3>Phễu lead theo trạng thái</h3>
            <Link href="/crm" className="badge b-indigo">CRM</Link>
          </div>
          <HBars data={funnel} />
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Doanh thu thu được · 7 ngày</h3>
            <span className="badge b-green">{fmtVnd(revByDay.reduce((s, d) => s + d.value, 0))}</span>
          </div>
          <BarChart data={barData} />
          <p className="muted small mt">Cao nhất trong ngày: {fmtVnd(maxRev)}.</p>
        </div>
      </div>

      {/* Cơ cấu đơn */}
      <div className="card mt">
        <div className="card-h">
          <h3>Cơ cấu đơn theo trạng thái</h3>
          <Link href="/orders" className="badge b-indigo">Quản lý đơn</Link>
        </div>
        {orderMix.length === 0 ? (
          <p className="muted small" style={{ padding: "14px 0" }}>Chưa có đơn nào.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {orderMix.map(({ st, count }) => (
              <div key={st} style={{ display: "grid", gridTemplateColumns: "minmax(120px,26%) 1fr auto", alignItems: "center", gap: 12 }}>
                <span className={`badge ${ORDER_STATUS_BADGE[st]}`} style={{ justifySelf: "start" }}>{ORDER_STATUS_LABEL[st]}</span>
                <ProgressBar value={(count / orderCount) * 100} color="var(--brand-grad)" />
                <b className="small" style={{ minWidth: 28, textAlign: "right" }}>{count}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lỗi vận hành + Bảo hành đến hạn */}
      <div className="grid-k g-2 mt">
        <div className="card">
          <div className="card-h">
            <h3>Lỗi vận hành / sự cố mở</h3>
            <Link href="/tasks" className="badge b-rose">{openIssues.length}</Link>
          </div>
          {openIssues.length === 0 ? (
            <p className="muted small" style={{ padding: "14px 0" }}>Không có sự cố/việc khẩn đang mở. 🎉</p>
          ) : (
            <table>
              <tbody>
                {openIssues.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="uname">{t.type === "incident" ? "⚠ " : ""}{t.title}</div>
                      <div className="urole">{TASK_CAT_LABEL[t.category]} · {t.assigneeId ? names[t.assigneeId] || "—" : "Chưa giao"}</div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge ${PRIORITY_BADGE[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Bảo hành đến hạn</h3>
            <Link href="/warranty" className="badge b-amber">{warrantiesDue.length}</Link>
          </div>
          {warrantiesDue.length === 0 ? (
            <p className="muted small" style={{ padding: "14px 0" }}>Không có phiếu đến hạn.</p>
          ) : (
            <table>
              <tbody>
                {warrantiesDue.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div className="uname">{w.productName || w.code}</div>
                      <div className="urole">Lắp {fmtDate(w.installedAt)} · {w.assigneeId ? names[w.assigneeId] || "—" : "—"}</div>
                    </td>
                    <td style={{ textAlign: "right" }} className="small muted">{fmtDate(w.nextCareAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Tổng quan showroom */}
      <div className="card mt">
        <div className="card-h">
          <h3>Tổng quan showroom · ca gần nhất</h3>
          <Link href="/shift-report" className="badge b-indigo">Báo cáo ca</Link>
        </div>
        {recentShifts.length === 0 ? (
          <p className="muted small" style={{ padding: "14px 0" }}>Chưa có báo cáo ca.</p>
        ) : (
          <div className="grid-k g-3">
            {recentShifts.map((r) => (
              <div key={r.id} className="card" style={{ background: "var(--surface-2)" }}>
                <div className="flex between aic">
                  <b>{SHIFT_LABEL[r.shift]}</b>
                  <span className="small muted">{fmtDate(r.date)}</span>
                </div>
                <div className="val" style={{ fontSize: 22, margin: "8px 0" }}>{fmtVnd(r.revenue || 0)}</div>
                <div className="flex gap" style={{ flexWrap: "wrap" }}>
                  <span className="badge b-gray">{r.orders || 0} đơn</span>
                  <span className="badge b-gray">{r.leads || 0} lead</span>
                  <span className="badge b-gray">{r.visitors || 0} khách</span>
                </div>
                {r.issues && <p className="small mt"><b>Sự cố:</b> {r.issues}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
