import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { listPurchaseOrders } from "@/lib/bnb/store";
import { fmtVnd, fmtDate } from "@/lib/bnb/util";
import { PO_STATUS_LABEL, PO_STATUS_BADGE } from "@/lib/bnb/types";

export const dynamic = "force-dynamic";

export default async function PurchasePage() {
  await requirePermission("purchase.read");
  const pos = await listPurchaseOrders();
  const sorted = [...pos].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const ordering = pos.filter((p) => p.status === "ordered");
  const received = pos.filter((p) => p.status === "received");
  const totalValue = pos
    .filter((p) => p.status !== "cancelled")
    .reduce((s, p) => s + (p.total || 0), 0);

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Nhập hàng</div>
      <div className="page-head">
        <div>
          <h1>Nhập hàng (PO)</h1>
          <p>Đặt hàng nhà cung cấp, theo dõi hàng về và nhập kho.</p>
        </div>
        <Link href="/purchase/new" className="btn primary"><Icon name="plus" /> Tạo PO</Link>
      </div>

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card kpi">
          <div className="ic" style={{ background: "var(--c-amber-soft)", color: "var(--c-amber)" }}><Icon name="truck" /></div>
          <div className="val">{ordering.length}</div>
          <div className="lbl">PO đang đặt</div>
        </div>
        <div className="card kpi">
          <div className="ic" style={{ background: "var(--c-teal-soft)", color: "var(--c-teal)" }}><Icon name="box" /></div>
          <div className="val">{received.length}</div>
          <div className="lbl">PO đã nhận</div>
        </div>
        <div className="card kpi">
          <div className="ic" style={{ background: "var(--c-indigo-soft)", color: "var(--c-indigo)" }}><Icon name="wallet" /></div>
          <div className="val">{fmtVnd(totalValue)}</div>
          <div className="lbl">tổng giá trị PO</div>
        </div>
      </div>

      {/* Danh sách PO */}
      <div className="card mt">
        <div className="card-h"><h3>Tất cả PO ({pos.length})</h3></div>
        <table>
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
              <tr key={p.id}>
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
