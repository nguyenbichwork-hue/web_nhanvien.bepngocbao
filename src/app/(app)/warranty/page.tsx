import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { CountUp } from "@/components/charts";
import { TableFilter } from "@/components/table-filter";
import { listWarranties, listOrders, listCustomers } from "@/lib/bnb/store";
import { employeeNameMap, fmtDate } from "@/lib/bnb/util";
import {
  WARRANTY_STATUS_LABEL, WARRANTY_STATUS_BADGE, CARE_MILESTONES,
} from "@/lib/bnb/types";
import type { WarrantyTicket } from "@/lib/bnb/types";
import { createWarrantyAction, markCareDoneAction } from "./actions";

export const dynamic = "force-dynamic";

const MILESTONES = [...CARE_MILESTONES] as number[];

function Kpi({ icon, tone, value, label, sub }: { icon: string; tone: string; value: number; label: string; sub?: string }) {
  return (
    <div className={`card kpi hover ${tone}`}>
      <div className="ic"><Icon name={icon} /></div>
      <div className="val"><CountUp to={value} /></div>
      <div className="lbl">{label}</div>
      {sub && <div className="trend up" style={{ background: "var(--surface-2)", color: "var(--tx-muted)" }}>{sub}</div>}
    </div>
  );
}

/** Chip các mốc 1/7/30/90: mốc đã chăm = xanh, chưa = xám. */
function CareChips({ careDone }: { careDone: number[] }) {
  return (
    <div className="flex gap" style={{ flexWrap: "wrap" }}>
      {MILESTONES.map((m) => {
        const on = careDone.includes(m);
        return (
          <span key={m} className={`badge ${on ? "b-green" : "b-gray"}`} title={on ? `Đã chăm mốc ${m} ngày` : `Chưa chăm mốc ${m} ngày`}>
            {on ? <Icon name="check" /> : null} {m}n
          </span>
        );
      })}
    </div>
  );
}

const nextMilestone = (careDone: number[]) => MILESTONES.find((m) => !careDone.includes(m));

export default async function WarrantyPage() {
  const session = await requirePermission("warranty.read");
  const canManage = session.permissions.has("warranty.manage");
  const [warranties, orders, customers, names] = await Promise.all([
    listWarranties(), listOrders(), listCustomers(), employeeNameMap(),
  ]);

  const cusName = (id?: string) => (id ? customers.find((c) => c.id === id)?.name : undefined);

  const tracking = warranties.filter((w) => w.status === "active" || w.status === "contacted").length;
  const due = warranties.filter((w) => w.status === "due").length;
  const resolved = warranties.filter((w) => w.status === "resolved").length;

  // Đến hạn nổi bật lên đầu, rồi sort theo nextCareAt.
  const sorted = [...warranties].sort((a, b) => {
    const da = a.status === "due" ? 0 : 1;
    const db = b.status === "due" ? 0 : 1;
    if (da !== db) return da - db;
    const na = a.nextCareAt || "9999";
    const nb = b.nextCareAt || "9999";
    return na < nb ? -1 : na > nb ? 1 : 0;
  });

  const dueList = sorted.filter((w) => w.status === "due");
  const today = new Date().toISOString().slice(0, 10);

  const CareButton = ({ w }: { w: WarrantyTicket }) => {
    const ms = nextMilestone(w.careDone || []);
    if (!canManage || ms === undefined) return null;
    return (
      <form action={markCareDoneAction}>
        <input type="hidden" name="id" value={w.id} />
        <input type="hidden" name="milestone" value={ms} />
        <button type="submit" className="btn ghost" style={{ padding: "6px 12px" }}>
          <Icon name="phone" /> Đã chăm mốc {ms} ngày
        </button>
      </form>
    );
  };

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Bảo hành & Hậu mãi</div>
      <div className="page-head">
        <div>
          <h1>Bảo hành & Hậu mãi</h1>
          <p>Tự động nhắc chăm sóc sau 1 / 7 / 30 / 90 ngày kể từ ngày lắp — giữ khách quay lại và an tâm.</p>
        </div>
      </div>

      <div className="grid-k g-4 stagger">
        <Kpi icon="warranty" tone="tone-i" value={tracking} label="Đang theo dõi" sub={`${warranties.length} phiếu tổng`} />
        <Kpi icon="phone" tone="tone-a" value={due} label="Đến hạn chăm sóc" />
        <Kpi icon="check" tone="tone-t" value={resolved} label="Đã xử lý" />
        <Kpi icon="sparkle" tone="tone-r" value={MILESTONES.length} label="Mốc chăm sóc" sub="1/7/30/90 ngày" />
      </div>

      {/* Tạo phiếu bảo hành */}
      {canManage && (
        <details className="card mt">
          <summary style={{ fontWeight: 700, fontSize: 15.5, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="plus" /> Tạo phiếu bảo hành
          </summary>
          <form action={createWarrantyAction} className="mt" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div className="field" style={{ margin: 0 }}><label>Khách hàng</label>
              <select name="customerId" defaultValue="">
                <option value="">— Theo đơn / chọn khách —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}><label>Đơn hàng</label>
              <select name="orderId" defaultValue="">
                <option value="">— Không gắn đơn —</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>{o.code}{cusName(o.customerId) ? ` · ${cusName(o.customerId)}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}><label>Ngày lắp đặt</label><input name="installedAt" type="date" defaultValue={today} /></div>
            <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}><label>Sản phẩm</label><input name="productName" placeholder="VD: Bếp từ Bosch + Hút mùi Malloca" /></div>
            <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}><label>Ghi chú</label><input name="note" placeholder="VD: Khách dặn gọi sau 18h" /></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn primary"><Icon name="check" /> Lưu phiếu</button>
            </div>
          </form>
        </details>
      )}

      {/* Phiếu đến hạn nổi bật */}
      {dueList.length > 0 && (
        <div className="card mt" style={{ borderColor: "var(--brand)", boxShadow: "0 0 0 1px var(--brand) inset" }}>
          <div className="card-h">
            <h3 className="flex aic" style={{ gap: 10 }}><Icon name="phone" /> Cần chăm sóc ngay</h3>
            <span className="badge b-amber">{dueList.length} phiếu</span>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {dueList.map((w) => (
              <div key={w.id} className="flex between" style={{ gap: 14, padding: "12px 0", borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 4, minWidth: 240 }}>
                  <div className="flex aic" style={{ gap: 8 }}>
                    <b className="small">{w.code}</b>
                    <span className="badge b-amber">{WARRANTY_STATUS_LABEL.due}</span>
                  </div>
                  <div className="uname">{cusName(w.customerId) || "Khách lẻ"}</div>
                  <div className="urole">{w.productName || "—"} · Lắp {fmtDate(w.installedAt)}</div>
                  <CareChips careDone={w.careDone || []} />
                </div>
                <div className="flex gap aic" style={{ alignSelf: "center" }}>
                  <CareButton w={w} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bảng tất cả phiếu */}
      <div className="card mt">
        <div className="card-h"><h3>Phiếu bảo hành ({warranties.length})</h3></div>
        {warranties.length === 0 ? (
          <p className="muted small" style={{ padding: "14px 0" }}>Chưa có phiếu bảo hành nào.</p>
        ) : (
          <>
          <TableFilter
            targetId="wty-tbl"
            placeholder="Tìm mã, khách, sản phẩm…"
            filters={[{ key: "status", label: "Trạng thái", options: (Object.keys(WARRANTY_STATUS_LABEL) as (keyof typeof WARRANTY_STATUS_LABEL)[]).map((s) => ({ value: s, label: WARRANTY_STATUS_LABEL[s] })) }]}
          />
          <table id="wty-tbl">
            <thead>
              <tr><th>Mã</th><th>Khách hàng</th><th>Sản phẩm</th><th>Ngày lắp</th><th>Mốc chăm sóc</th><th>Trạng thái</th><th>Chăm kế</th><th></th></tr>
            </thead>
            <tbody>
              {sorted.map((w) => (
                <tr key={w.id} data-status={w.status} data-search={`${w.code} ${cusName(w.customerId) || ""} ${w.productName || ""} ${w.assigneeId ? names[w.assigneeId] || "" : ""}`} style={w.status === "due" ? { background: "var(--surface-2)" } : undefined}>
                  <td className="small"><b>{w.code}</b></td>
                  <td>
                    <div className="uname">{cusName(w.customerId) || "Khách lẻ"}</div>
                    <div className="urole">{w.assigneeId ? names[w.assigneeId] || w.assigneeId : "—"}</div>
                  </td>
                  <td className="small muted" style={{ maxWidth: 220 }}>{w.productName || "—"}</td>
                  <td className="small">{fmtDate(w.installedAt)}</td>
                  <td><CareChips careDone={w.careDone || []} /></td>
                  <td><span className={`badge ${WARRANTY_STATUS_BADGE[w.status]}`}>{WARRANTY_STATUS_LABEL[w.status]}</span></td>
                  <td className="small">{w.status === "resolved" ? "Hoàn tất" : fmtDate(w.nextCareAt)}</td>
                  <td style={{ textAlign: "right" }}><CareButton w={w} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>
    </div>
  );
}
