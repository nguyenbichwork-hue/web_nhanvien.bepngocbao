import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp, HBars } from "@/components/charts";
import { AreaTrend, DonutChart } from "@/components/charts/rich";
import {
  listLeads, listOrders, listWarranties, listShiftReports, listTasks,
} from "@/lib/bnb/store";
import { fmtVnd, fmtDate, dayKey, compactVnd } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
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

// Bảng màu cho donut cơ cấu đơn — tông trung tính → đậm dần.
const MIX_COLORS = ["#2b78c5", "#7c3aed", "#d98309", "#0e9d6e", "#e23b54", "#0d9488", "#9aa1ab"];

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

  // ---- Cơ cấu đơn theo trạng thái (donut) ----
  const orderStatuses = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];
  const orderMix = orderStatuses
    .map((st, i) => ({ name: ORDER_STATUS_LABEL[st], value: orders.filter((o) => o.status === st).length, color: MIX_COLORS[i % MIX_COLORS.length] }))
    .filter((x) => x.value > 0);

  // ---- Doanh thu (đã thu) 14 ngày gần nhất (area chart) ----
  const days: { key: string; label: string }[] = [];
  for (let i = 13; i >= 0; i--) {
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
  const rev14 = revByDay.reduce((s, d) => s + d.value, 0);

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
    <div>
      <PageHero
        icon="crown"
        title="Dashboard quản trị"
        subtitle="Bức tranh toàn hệ: doanh thu, lead, tỷ lệ chốt và lỗi vận hành — chỉ đọc."
        crumb={[["Trang chủ", "/dashboard"], ["Quản trị"], ["Dashboard quản trị"]]}
        stats={[
          { label: "Doanh thu đã thu", value: compactVnd(revenue) },
          { label: "Tỷ lệ chốt", value: `${convRate}%`, tone: convRate >= 30 ? "up" : "flat" },
          { label: "Công nợ", value: compactVnd(receivable), tone: receivable > 0 ? "down" : "flat" },
        ]}
      />

      {/* KPI lớn */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 24 }}><CountUp to={revenue} /></div>
          <div className="lbl">Doanh thu đã thu (đ)</div>
        </div>
        <div className="card kpi hover tone-accent">
          <div className="ic"><Icon name="cart" /></div>
          <div className="val"><CountUp to={orderCount} /></div>
          <div className="lbl">Tổng số đơn</div>
        </div>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="target" /></div>
          <div className="val" style={{ fontSize: 24 }}><CountUp to={aov} /></div>
          <div className="lbl">AOV · giá trị đơn TB (đ)</div>
        </div>
        <div className="card kpi hover tone-accent">
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

      {/* Doanh thu 14 ngày (area) + Cơ cấu đơn (donut) */}
      <div className="grid-k g-2 mt">
        <div className="card hover">
          <div className="card-h">
            <h3 className="sec-title">Doanh thu thu được · 14 ngày</h3>
            <span className="badge b-green">{fmtVnd(rev14)}</span>
          </div>
          <AreaTrend data={revByDay} money height={260} name="Đã thu" />
        </div>

        <div className="card hover">
          <div className="card-h">
            <h3 className="sec-title">Cơ cấu đơn theo trạng thái</h3>
            <Link href="/orders" className="badge b-indigo">Quản lý đơn</Link>
          </div>
          {orderMix.length === 0 ? (
            <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Chưa có đơn nào.</p>
          ) : (
            <DonutChart data={orderMix} height={260} centerValue={orderCount} centerLabel="đơn" unit=" đơn" />
          )}
        </div>
      </div>

      {/* Phễu lead */}
      <div className="card mt hover">
        <div className="card-h">
          <h3 className="sec-title">Phễu lead theo trạng thái</h3>
          <Link href="/crm" className="badge b-indigo">CRM</Link>
        </div>
        <HBars data={funnel} />
      </div>

      {/* Lỗi vận hành + Bảo hành đến hạn */}
      <div className="grid-k g-2 mt">
        <div className="card">
          <div className="card-h">
            <h3 className="sec-title">Lỗi vận hành / sự cố mở</h3>
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
            <h3 className="sec-title">Bảo hành đến hạn</h3>
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
          <h3 className="sec-title">Tổng quan showroom · ca gần nhất</h3>
          <Link href="/shift-report" className="badge b-indigo">Báo cáo ca</Link>
        </div>
        {recentShifts.length === 0 ? (
          <p className="muted small" style={{ padding: "14px 0" }}>Chưa có báo cáo ca.</p>
        ) : (
          <div className="grid-k g-3">
            {recentShifts.map((r) => (
              <div key={r.id} className="card accent-l" style={{ background: "var(--surface-2)" }}>
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
