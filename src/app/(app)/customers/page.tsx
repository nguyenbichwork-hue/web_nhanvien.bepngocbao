import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { DonutChart } from "@/components/charts/rich";
import { TableFilter } from "@/components/table-filter";
import { listCustomers, listOrders } from "@/lib/bnb/store";
import { fmtVnd, fmtDate, initials, avatarBg, compactVnd } from "@/lib/bnb/util";

export const dynamic = "force-dynamic";

const MIX_COLORS = ["#2b78c5", "#7c3aed", "#d98309", "#0e9d6e", "#e23b54", "#0d9488", "#9aa1ab"];

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

  // Phân bố khách theo bậc chi tiêu (donut).
  const tiers = [
    { name: "Chưa mua", test: (s: number) => s <= 0 },
    { name: "< 10tr", test: (s: number) => s > 0 && s < 10e6 },
    { name: "10–50tr", test: (s: number) => s >= 10e6 && s < 50e6 },
    { name: "50–100tr", test: (s: number) => s >= 50e6 && s < 100e6 },
    { name: "≥ 100tr", test: (s: number) => s >= 100e6 },
  ];
  const spendMix = tiers
    .map((t, i) => ({ name: t.name, value: rows.filter((r) => t.test(r.spent)).length, color: MIX_COLORS[i % MIX_COLORS.length] }))
    .filter((x) => x.value > 0);

  return (
    <div>
      <PageHero
        icon="users"
        title="Khách hàng 360"
        subtitle="Hồ sơ hợp nhất mọi khách — gồm cả khách đồng bộ từ Haravan."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Khách hàng 360"]]}
        stats={[
          { label: "Khách hàng", value: totalCustomers },
          { label: "Doanh thu", value: compactVnd(totalRevenue), tone: "up" },
          { label: "AOV", value: compactVnd(avgAov), tone: "flat" },
        ]}
      />

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card kpi grad hover gr-deepblue">
          <div className="ic"><Icon name="users" /></div>
          <div className="val"><CountUp to={totalCustomers} /></div>
          <div className="lbl">Tổng khách hàng</div>
        </div>
        <div className="card kpi grad hover gr-mint">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 24 }}>{fmtVnd(totalRevenue)}</div>
          <div className="lbl">Tổng doanh thu</div>
        </div>
        <div className="card kpi grad hover gr-malinka">
          <div className="ic"><Icon name="cart" /></div>
          <div className="val" style={{ fontSize: 24 }}>{fmtVnd(avgAov)}</div>
          <div className="lbl">AOV trung bình (đ/đơn)</div>
        </div>
      </div>

      {/* Biểu đồ: phân bố khách theo bậc chi tiêu */}
      <div className="grid-k g-2 mt">
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Phân bố khách theo bậc chi tiêu</h3></div>
          {spendMix.length === 0 ? (
            <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Chưa có khách hàng nào.</p>
          ) : (
            <DonutChart data={spendMix} height={250} centerValue={totalCustomers} centerLabel="khách" unit=" khách" />
          )}
        </div>
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Top khách hàng theo chi tiêu</h3></div>
          <table>
            <thead>
              <tr><th>Khách hàng</th><th style={{ textAlign: "right" }}>Số đơn</th><th style={{ textAlign: "right" }}>Tổng chi tiêu</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map(({ c, spent, count }) => (
                <tr key={c.id}>
                  <td>
                    <div className="urow">
                      <div className="av" style={{ background: avatarBg(c.name) }}>{initials(c.name)}</div>
                      <div className="uname">{c.name}</div>
                    </div>
                  </td>
                  <td className="small" style={{ textAlign: "right" }}>{count}</td>
                  <td className="small" style={{ textAlign: "right", fontWeight: 600 }}>{fmtVnd(spent)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={3} className="muted small" style={{ padding: "18px 0", textAlign: "center" }}>Chưa có khách hàng nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danh sách khách */}
      <div className="card mt">
        <div className="card-h">
          <h3 className="sec-title">Tất cả khách hàng ({rows.length})</h3>
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
