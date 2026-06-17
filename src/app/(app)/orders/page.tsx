import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { listOrders } from "@/lib/bnb/store";
import { TableFilter } from "@/components/table-filter";
import { employeeNameMap, fmtVnd, fmtDate, orderRemaining } from "@/lib/bnb/util";
import { ORDER_STATUS_LABEL, ORDER_STATUS_BADGE, type OrderStatus } from "@/lib/bnb/types";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await requirePermission("order.read");
  const [orders, names] = await Promise.all([listOrders(), employeeNameMap()]);
  const sorted = [...orders].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const openOrders = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
  const revenue = orders.reduce((s, o) => s + (o.paid || 0), 0);
  const debt = openOrders.reduce((s, o) => s + orderRemaining(o), 0);

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Quản lý đơn hàng</div>
      <div className="page-head">
        <div>
          <h1>Quản lý đơn hàng</h1>
          <p>Vòng đời đơn: báo giá → chốt → thanh toán → giao &amp; lắp đặt.</p>
        </div>
        <Link href="/orders/new" className="btn primary"><Icon name="plus" /> Tạo đơn</Link>
      </div>

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card kpi">
          <div className="ic" style={{ background: "var(--c-indigo-soft)", color: "var(--c-indigo)" }}><Icon name="cart" /></div>
          <div className="val">{openOrders.length}</div>
          <div className="lbl">đơn đang mở</div>
        </div>
        <div className="card kpi">
          <div className="ic" style={{ background: "var(--c-teal-soft)", color: "var(--c-teal)" }}><Icon name="wallet" /></div>
          <div className="val">{fmtVnd(revenue)}</div>
          <div className="lbl">doanh thu đã thu</div>
        </div>
        <div className="card kpi">
          <div className="ic" style={{ background: "var(--c-amber-soft)", color: "var(--c-amber)" }}><Icon name="alert" /></div>
          <div className="val">{fmtVnd(debt)}</div>
          <div className="lbl">công nợ còn lại</div>
        </div>
      </div>

      {/* Danh sách đơn */}
      <div className="card mt">
        <div className="card-h"><h3>Tất cả đơn ({orders.length})</h3></div>
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
              <tr key={o.id} data-status={o.status} data-search={`${o.code} ${o.customerId || ""} ${ORDER_STATUS_LABEL[o.status]} ${o.assigneeId ? names[o.assigneeId] || "" : ""}`}>
                <td>
                  <div className="uname">{o.code}</div>
                  <div className="urole">{fmtDate(o.createdAt)}</div>
                </td>
                <td className="small muted">{o.customerId || "—"}</td>
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
