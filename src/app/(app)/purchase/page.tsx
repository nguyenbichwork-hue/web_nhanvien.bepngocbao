import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { AreaTrend, DonutChart } from "@/components/charts/rich";
import { TableFilter } from "@/components/table-filter";
import { listPurchaseOrders } from "@/lib/bnb/store";
import { fmtVnd, fmtDate, compactVnd } from "@/lib/bnb/util";
import { PO_STATUS_LABEL, PO_STATUS_BADGE, type POStatus } from "@/lib/bnb/types";

export const dynamic = "force-dynamic";

const MIX_COLORS = ["#7c3aed", "#2563eb", "#0e9d6e", "#d98309", "#e23b54", "#0d9488", "#9aa1ab"];

export default async function PurchasePage() {
  await requirePermission("purchase.read");
  const pos = await listPurchaseOrders();
  const sorted = [...pos].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const ordering = pos.filter((p) => p.status === "ordered");
  const received = pos.filter((p) => p.status === "received");
  const draft = pos.filter((p) => p.status === "draft");
  const totalValue = pos
    .filter((p) => p.status !== "cancelled")
    .reduce((s, p) => s + (p.total || 0), 0);

  // Cơ cấu PO theo trạng thái — DonutChart.
  const statuses = Object.keys(PO_STATUS_LABEL) as POStatus[];
  const mix = statuses
    .map((st, i) => ({ name: PO_STATUS_LABEL[st], value: pos.filter((p) => p.status === st).length, color: MIX_COLORS[i % MIX_COLORS.length] }))
    .filter((x) => x.value > 0);

  // Giá trị PO theo tháng — 6 tháng gần nhất (AreaTrend), theo ngày tạo, bỏ PO huỷ.
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `T${d.getMonth() + 1}` });
  }
  const valByMonth = months.map((m) => ({
    label: m.label,
    value: pos
      .filter((p) => p.status !== "cancelled" && (p.createdAt || "").slice(0, 7) === m.key)
      .reduce((s, p) => s + (p.total || 0), 0),
  }));

  return (
    <div>
      <PageHero
        icon="truck"
        title="Nhập hàng (PO)"
        subtitle="Đặt hàng nhà cung cấp, theo dõi hàng về và nhập kho."
        crumb={[["Trang chủ", "/dashboard"], ["Marketing & Kho"], ["Nhập hàng"]]}
        stats={[
          { label: "Đang đặt", value: ordering.length },
          { label: "Đã nhận", value: received.length, tone: "up" },
          { label: "Giá trị PO", value: compactVnd(totalValue) },
        ]}
        actions={<Link href="/purchase/new" className="btn primary"><Icon name="plus" /> Tạo PO</Link>}
      />

      {/* KPI */}
      <div className="grid-k g-4 stagger">
        <div className="card kpi grad hover gr-sunny">
          <div className="ic"><Icon name="truck" /></div>
          <div className="val"><CountUp to={ordering.length} /></div>
          <div className="lbl">PO đang đặt</div>
        </div>
        <div className="card kpi grad hover gr-mint">
          <div className="ic"><Icon name="box" /></div>
          <div className="val"><CountUp to={received.length} /></div>
          <div className="lbl">PO đã nhận</div>
        </div>
        <div className="card kpi grad hover gr-azure">
          <div className="ic"><Icon name="edit" /></div>
          <div className="val"><CountUp to={draft.length} /></div>
          <div className="lbl">PO nháp</div>
        </div>
        <div className="card kpi grad hover gr-plum">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 24 }}>{fmtVnd(totalValue)}</div>
          <div className="lbl">tổng giá trị PO</div>
        </div>
      </div>

      {/* Biểu đồ: giá trị PO theo tháng + cơ cấu trạng thái */}
      <div className="grid-k g-2 mt">
        <div className="card hover">
          <div className="card-h">
            <h3 className="sec-title">Giá trị PO · 6 tháng</h3>
            <span className="badge b-green">{fmtVnd(valByMonth.reduce((s, m) => s + m.value, 0))}</span>
          </div>
          <AreaTrend data={valByMonth} money height={250} name="Giá trị PO" />
        </div>
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Cơ cấu PO theo trạng thái</h3></div>
          {mix.length === 0 ? (
            <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Chưa có PO nào.</p>
          ) : (
            <DonutChart data={mix} height={250} centerValue={pos.length} centerLabel="PO" unit=" PO" />
          )}
        </div>
      </div>

      {/* Danh sách PO */}
      <div className="card mt">
        <div className="card-h"><h3 className="sec-title">Tất cả PO ({pos.length})</h3></div>
        <TableFilter
          targetId="po-tbl"
          placeholder="Tìm mã PO, nhà cung cấp…"
          filters={[{ key: "status", label: "Trạng thái", options: (Object.keys(PO_STATUS_LABEL) as (keyof typeof PO_STATUS_LABEL)[]).map((s) => ({ value: s, label: PO_STATUS_LABEL[s] })) }]}
        />
        <table id="po-tbl">
          <thead>
            <tr>
              <th>Mã PO</th><th>Nhà cung cấp</th>
              <th style={{ textAlign: "right" }}>Số mặt hàng</th>
              <th style={{ textAlign: "right" }}>Tổng tiền</th>
              <th>Trạng thái</th><th>Dự kiến về</th><th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} data-status={p.status} data-search={`${p.code} ${p.supplierName}`}>
                <td>
                  <div className="uname">{p.code}</div>
                  <div className="urole">{fmtDate(p.createdAt)}</div>
                </td>
                <td className="small" style={{ fontWeight: 600 }}>{p.supplierName}</td>
                <td className="small" style={{ textAlign: "right" }}>{p.items.length}</td>
                <td className="small" style={{ textAlign: "right", fontWeight: 600 }}>{fmtVnd(p.total)}</td>
                <td><span className={`badge ${PO_STATUS_BADGE[p.status]}`}>{PO_STATUS_LABEL[p.status]}</span></td>
                <td className="small muted">{p.expectedAt ? fmtDate(p.expectedAt) : "—"}</td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/purchase/${p.id}`} className="btn ghost" style={{ padding: "7px 12px" }}>Chi tiết</Link>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="muted small" style={{ padding: "18px 0", textAlign: "center" }}>Chưa có phiếu nhập hàng nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
