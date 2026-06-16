import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { CountUp } from "@/components/charts";
import { TableFilter } from "@/components/table-filter";
import { listCustomers, listOrders } from "@/lib/bnb/store";
import { fmtVnd, fmtDate, initials, avatarBg } from "@/lib/bnb/util";

export const dynamic = "force-dynamic";

type Agg = { spent: number; count: number; lastAt?: string };

export default async function CustomersPage() {
  await requirePermission("customer.read");
  const [customers, orders] = await Promise.all([listCustomers(), listOrders()]);

  // Gom đơn theo khách (chỉ đơn chưa huỷ tính vào doanh thu/AOV).
  const byCustomer = new Map<string, Agg>();
  for (const o of orders) {
    if (!o.customerId || o.status === "cancelled") continue;
    const a = byCustomer.get(o.customerId) || { spent: 0, count: 0 };
    a.spent += o.total || 0;
    a.count += 1;
    if (!a.lastAt || (o.createdAt && o.createdAt > a.lastAt)) a.lastAt = o.createdAt;
    byCustomer.set(o.customerId, a);
  }

  // Số liệu mỗi khách: ưu tiên đơn thực, fallback về trường tổng hợp trên hồ sơ.
  const rows = customers.map((c) => {
    const agg = byCustomer.get(c.id);
    const spent = agg?.spent ?? c.totalSpent ?? 0;
    const count = agg?.count ?? c.orderCount ?? 0;
    const lastAt = agg?.lastAt ?? c.lastOrderAt;
    const aov = count ? spent / count : 0;
    return { c, spent, count, lastAt, aov };
  });
  rows.sort((a, b) => b.spent - a.spent);

  const totalCustomers = customers.length;
  const totalRevenue = rows.reduce((s, r) => s + r.spent, 0);
  const totalOrders = rows.reduce((s, r) => s + r.count, 0);
  const avgAov = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Khách hàng 360</div>
      <div className="page-head">
        <div>
          <h1><Icon name="users" /> Khách hàng 360</h1>
          <p>Hồ sơ hợp nhất mọi khách — gồm cả khách đồng bộ từ Haravan.</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card kpi hover tone-i">
          <div className="ic"><Icon name="users" /></div>
          <div className="val"><CountUp to={totalCustomers} /></div>
          <div className="lbl">Tổng khách hàng</div>
        </div>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 24 }}><CountUp to={totalRevenue} /></div>
          <div className="lbl">Tổng doanh thu (đ)</div>
        </div>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="cart" /></div>
          <div className="val" style={{ fontSize: 24 }}><CountUp to={avgAov} /></div>
          <div className="lbl">AOV trung bình (đ/đơn)</div>
        </div>
      </div>

      {/* Danh sách khách */}
      <div className="card mt">
        <div className="card-h">
          <h3>Tất cả khách hàng ({rows.length})</h3>
          <TableFilter targetId="cus-table" placeholder="Tìm tên / SĐT…" />
        </div>
        <table id="cus-table">
          <thead>
            <tr>
              <th>Khách hàng</th><th>SĐT</th>
              <th style={{ textAlign: "right" }}>Số đơn</th>
              <th style={{ textAlign: "right" }}>Tổng chi tiêu</th>
              <th style={{ textAlign: "right" }}>AOV</th>
              <th>Đơn gần nhất</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, spent, count, lastAt, aov }) => (
              <tr key={c.id} data-search={`${c.name} ${c.phone} ${c.code || ""}`}>
                <td>
                  <div className="urow">
                    <div className="av" style={{ background: avatarBg(c.name) }}>{initials(c.name)}</div>
                    <div>
                      <div className="uname">{c.name}</div>
                      <div className="urole">{c.email || c.code || "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="small muted">{c.phone || "—"}</td>
                <td className="small" style={{ textAlign: "right" }}>{count}</td>
                <td className="small" style={{ textAlign: "right", fontWeight: 600 }}>{fmtVnd(spent)}</td>
                <td className="small" style={{ textAlign: "right" }}>{fmtVnd(aov)}</td>
                <td className="small muted">{lastAt ? fmtDate(lastAt) : "—"}</td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/customers/${c.id}`} className="btn ghost" style={{ padding: "7px 12px" }}>Hồ sơ 360</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="muted small" style={{ padding: "18px 0", textAlign: "center" }}>Chưa có khách hàng nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
