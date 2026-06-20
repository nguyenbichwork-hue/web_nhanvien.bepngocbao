import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { AreaTrend, DonutChart } from "@/components/charts/rich";
import { listOrders, listCustomers } from "@/lib/bnb/store";
import { TableFilter } from "@/components/table-filter";
import { fmtVnd, fmtDate, dayKey, orderRemaining, compactVnd } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE, type OrderStatus } from "@/lib/bnb/types";

export const dynamic = "force-dynamic";

const MIX_COLORS = ["#2b78c5", "#7c3aed", "#d98309", "#0e9d6e", "#e23b54", "#0d9488", "#9aa1ab"];

export default async function OrdersPage() {
  await requirePermission("order.read");
  const [orders, customers, names] = await Promise.all([listOrders(), listCustomers(), employeeNameMap()]);
  const custName = Object.fromEntries(customers.map((c) => [c.id, c.name]));
  const sorted = [...orders].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const openOrders = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
  const revenue = orders.reduce((s, o) => s + (o.paid || 0), 0);
  const debt = openOrders.reduce((s, o) => s + orderRemaining(o), 0);

  // Doanh thu thu được theo ngày — 14 ngày gần nhất.
  const now = new Date();
  const days: { key: string; label: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({ key: dayKey(d), label: `${d.getDate()}/${d.getMonth() + 1}` });
  }
  const revByDay = days.map((d) => ({
    label: d.label,
    value: orders.reduce((s, o) => s + (o.payments || []).filter((p) => dayKey(p.at) === d.key).reduce((a, p) => a + (p.amount || 0), 0), 0),
  }));

  // Cơ cấu đơn theo trạng thái (donut).
  const statuses = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];
  const mix = statuses
    .map((st, i) => ({ name: ORDER_STATUS_LABEL[st], value: orders.filter((o) => o.status === st).length, color: MIX_COLORS[i % MIX_COLORS.length] }))
    .filter((x) => x.value > 0);

  return (
    <div>
      <PageHero
        icon="cart"
        title="Quản lý đơn hàng"
        subtitle="Vòng đời đơn: báo giá → chốt → thanh toán → giao & lắp đặt."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Đơn hàng"]]}
        stats={[
          { label: "Đang mở", value: openOrders.length },
          { label: "Đã thu", value: compactVnd(revenue), tone: "up" },
          { label: "Công nợ", value: compactVnd(debt), tone: debt > 0 ? "down" : "flat" },
        ]}
        actions={<Link href="/orders/new" className="btn primary"><Icon name="plus" /> Tạo đơn</Link>}
      />

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card kpi grad hover gr-crimson">
          <div className="ic"><Icon name="cart" /></div>
          <div className="val"><CountUp to={openOrders.length} /></div>
          <div className="lbl">đơn đang mở</div>
        </div>
        <div className="card kpi grad hover gr-mint">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 24 }}>{fmtVnd(revenue)}</div>
          <div className="lbl">doanh thu đã thu</div>
        </div>
        <div className="card kpi grad hover gr-sunny">
          <div className="ic"><Icon name="alert" /></div>
          <div className="val" style={{ fontSize: 24 }}>{fmtVnd(debt)}</div>
          <div className="lbl">công nợ còn lại</div>
        </div>
      </div>

      {/* Biểu đồ: doanh thu 14 ngày + cơ cấu trạng thái */}
      <div className="grid-k g-2 mt">
        <div className="card hover">
          <div className="card-h">
            <h3 className="sec-title">Doanh thu thu được · 14 ngày</h3>
            <span className="badge b-green">{fmtVnd(revByDay.reduce((s, d) => s + d.value, 0))}</span>
          </div>
          <AreaTrend data={revByDay} money height={250} name="Đã thu" />
        </div>
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Cơ cấu đơn theo trạng thái</h3></div>
          {mix.length === 0 ? (
            <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Chưa có đơn nào.</p>
          ) : (
            <DonutChart data={mix} height={250} centerValue={orders.length} centerLabel="đơn" unit=" đơn" />
          )}
        </div>
      </div>

      {/* Danh sách đơn */}
      <div className="card mt">
        <div className="card-h"><h3 className="sec-title">Tất cả đơn ({orders.length})</h3></div>
        <TableFilter
          targetId="orders-tbl"
          placeholder="Tìm mã đơn, khách, phụ trách…"
          filters={[{
            key: "status",
            label: "Trạng thái",
            options: (Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s] })),
          }]}
        />
        <table id="orders-tbl">
          <thead>
            <tr>
              <th>Mã đơn</th><th>Khách</th><th>Trạng thái</th>
              <th style={{ textAlign: "right" }}>Tổng</th>
              <th style={{ textAlign: "right" }}>Đã thu</th>
              <th style={{ textAlign: "right" }}>Còn lại</th>
              <th>Phụ trách</th><th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => (
              <tr key={o.id} data-status={o.status} data-search={`${o.code} ${o.customerId ? custName[o.customerId] || "" : ""} ${ORDER_STATUS_LABEL[o.status]} ${o.assigneeId ? names[o.assigneeId] || "" : ""}`}>
                <td>
                  <div className="uname">{o.code}</div>
                  <div className="urole">{fmtDate(o.createdAt)}</div>
                </td>
                <td className="small">
                  {o.customerId
                    ? <Link href={`/customers/${o.customerId}`} style={{ color: "var(--accent)" }}>{custName[o.customerId] || o.customerId}</Link>
                    : <span className="muted">Khách lẻ</span>}
                </td>
                <td><span className={`badge ${ORDER_STATUS_BADGE[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                <td className="small" style={{ textAlign: "right", fontWeight: 600 }}>{fmtVnd(o.total)}</td>
                <td className="small" style={{ textAlign: "right" }}>{fmtVnd(o.paid)}</td>
                <td className="small" style={{ textAlign: "right", color: orderRemaining(o) > 0 ? "var(--c-amber)" : "var(--tx-soft)" }}>{fmtVnd(orderRemaining(o))}</td>
                <td className="small muted">{o.assigneeId ? names[o.assigneeId] || "—" : "—"}</td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/orders/${o.id}`} className="btn ghost" style={{ padding: "7px 12px" }}>Chi tiết</Link>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={8} className="muted small" style={{ padding: "18px 0", textAlign: "center" }}>Chưa có đơn hàng nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
