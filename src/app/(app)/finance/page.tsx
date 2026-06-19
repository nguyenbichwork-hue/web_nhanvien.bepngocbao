import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { ProgressBar } from "@/components/charts";
import { DonutChart, BarsChart } from "@/components/charts/rich";
import { listOrders, listBankTxns, costBySku, listCustomers } from "@/lib/bnb/store";
import { fmtVnd, fmtDate, orderRemaining, compactVnd } from "@/lib/bnb/util";
import {
  ORDER_STATUS_LABEL, ORDER_STATUS_BADGE, TXN_DIR_LABEL,
  type Order, type TxnDirection,
} from "@/lib/bnb/types";
import { createBankTxnAction, matchTxnAction } from "./actions";

export const dynamic = "force-dynamic";

const DAY = 86400000;

// Giá vốn (COGS) một đơn = Σ (giá vốn sku × SL). Dòng không có sku → coi 0.
function orderCogs(o: Order, cost: Record<string, number>): number {
  return o.lines.reduce((s, l) => s + (l.sku ? (cost[l.sku] || 0) * l.qty : 0), 0);
}

// Nhóm tuổi nợ theo số ngày từ createdAt.
function ageBucket(createdAt: string): "0-30" | "31-60" | ">60" {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / DAY);
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  return ">60";
}
const AGE_BADGE: Record<string, string> = { "0-30": "b-green", "31-60": "b-amber", ">60": "b-rose" };

export default async function FinancePage() {
  const session = await requirePermission("finance.read");
  const canManage = session.permissions.has("finance.manage");

  const [orders, txns, cost, customers] = await Promise.all([
    listOrders(), listBankTxns(), costBySku(), listCustomers(),
  ]);
  const custName = new Map(customers.map((c) => [c.id, c.name]));
  const orderCode = new Map(orders.map((o) => [o.id, o.code]));
  const nameOf = (id?: string) => (id ? custName.get(id) || id : "—");

  const active = orders.filter((o) => o.status !== "cancelled");

  // KPI
  const receivable = active.reduce((s, o) => s + orderRemaining(o), 0);
  const revenue = active.reduce((s, o) => s + (o.total || 0), 0);
  const cogs = active.reduce((s, o) => s + orderCogs(o, cost), 0);
  const grossProfit = revenue - cogs;
  const grossMarginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;
  const cashIn = txns.filter((t) => t.direction === "in").reduce((s, t) => s + (t.amount || 0), 0);
  const cashOut = txns.filter((t) => t.direction === "out").reduce((s, t) => s + (t.amount || 0), 0);
  const netCash = cashIn - cashOut;

  // Công nợ phải thu (AR aging) — đơn còn nợ, gom theo nhóm tuổi.
  const debtOrders = active
    .filter((o) => orderRemaining(o) > 0)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const buckets: Record<string, { count: number; total: number }> = {
    "0-30": { count: 0, total: 0 },
    "31-60": { count: 0, total: 0 },
    ">60": { count: 0, total: 0 },
  };
  for (const o of debtOrders) {
    const b = buckets[ageBucket(o.createdAt)];
    b.count += 1;
    b.total += orderRemaining(o);
  }

  // Giá vốn & lãi gộp — vài đơn gần nhất.
  const recent = [...active].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 8);

  const arDonut = (["0-30", "31-60", ">60"] as const)
    .map((k, i) => ({ name: `${k} ngày`, value: buckets[k].total, color: ["#0e9d6e", "#d98309", "#e23b54"][i] }))
    .filter((x) => x.value > 0);
  const cashBars = [
    { label: "Tiền vào", value: cashIn },
    { label: "Tiền ra", value: cashOut },
    { label: "Ròng", value: Math.max(0, netCash) },
  ];

  return (
    <div>
      <PageHero
        icon="wallet"
        title="Tài chính – Kế toán"
        subtitle="Công nợ phải thu, giá vốn & lãi gộp, đối soát ngân hàng — sổ sách thay cho Excel rời rạc."
        crumb={[["Trang chủ", "/dashboard"], ["Quản trị"], ["Tài chính – Kế toán"]]}
        stats={[
          { label: "Công nợ", value: compactVnd(receivable), tone: receivable > 0 ? "down" : "flat" },
          { label: "Lãi gộp", value: compactVnd(grossProfit), tone: grossProfit >= 0 ? "up" : "down" },
          { label: "Dòng tiền ròng", value: compactVnd(netCash), tone: netCash >= 0 ? "up" : "down" },
        ]}
        actions={
          <Link href="/finance/export" className="btn primary" prefetch={false}>
            <Icon name="download" /> Xuất kế toán (AMIS)
          </Link>
        }
      />

      {/* KPI */}
      <div className="grid-k g-4 stagger">
        <div className="card kpi grad hover gr-sunny">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 24 }}>{fmtVnd(receivable)}</div>
          <div className="lbl">Công nợ phải thu</div>
        </div>
        <div className="card kpi grad hover gr-deepblue">
          <div className="ic"><Icon name="chart" /></div>
          <div className="val" style={{ fontSize: 24 }}>{fmtVnd(revenue)}</div>
          <div className="lbl">Doanh thu (Σ tổng đơn)</div>
        </div>
        <div className="card kpi grad hover gr-mint">
          <div className="ic"><Icon name="award" /></div>
          <div className="val" style={{ fontSize: 24 }}>{fmtVnd(grossProfit)}</div>
          <div className="lbl">Lãi gộp · tỷ suất {grossMarginPct}%</div>
        </div>
        <div className="card kpi grad hover gr-plum">
          <div className="ic"><Icon name="building" /></div>
          <div className="val" style={{ fontSize: 24 }}>{fmtVnd(netCash)}</div>
          <div className="lbl">Dòng tiền ròng (vào − ra)</div>
        </div>
      </div>

      {/* Biểu đồ: tuổi nợ + dòng tiền */}
      <div className="grid-k g-2 mt">
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Công nợ theo tuổi nợ</h3><span className="badge b-gray">{debtOrders.length} đơn</span></div>
          {arDonut.length === 0 ? (
            <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Không có đơn nào còn nợ. 🎉</p>
          ) : (
            <DonutChart data={arDonut} height={250} centerValue={compactVnd(receivable)} centerLabel="phải thu" unit=" đ" />
          )}
        </div>
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Dòng tiền (đối soát NH)</h3><span className="badge b-indigo">{txns.length} GD</span></div>
          <BarsChart data={cashBars} money height={250} name="Số tiền" />
        </div>
      </div>

      {/* Công nợ phải thu (AR aging) */}
      <div className="card mt">
        <div className="card-h">
          <h3>Công nợ phải thu — tuổi nợ</h3>
          <span className="badge b-gray">{debtOrders.length} đơn còn nợ</span>
        </div>
        <div className="grid-k g-3" style={{ gap: 12, marginBottom: 8 }}>
          {(["0-30", "31-60", ">60"] as const).map((k) => (
            <div key={k} className="card" style={{ margin: 0, padding: 14 }}>
              <div className="flex aic" style={{ gap: 10, justifyContent: "space-between" }}>
                <span className={`badge ${AGE_BADGE[k]}`}>{k} ngày</span>
                <b className="small">{buckets[k].count} đơn</b>
              </div>
              <div className="val" style={{ fontSize: 20, marginTop: 8 }}>{fmtVnd(buckets[k].total)}</div>
            </div>
          ))}
        </div>
        {debtOrders.length === 0 ? (
          <p className="muted small" style={{ padding: "10px 0" }}>Không có đơn nào còn nợ.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th><th>Khách</th><th>Trạng thái</th><th>Nhóm tuổi</th>
                <th style={{ textAlign: "right" }}>Tổng</th>
                <th style={{ textAlign: "right" }}>Đã thu</th>
                <th style={{ textAlign: "right" }}>Còn nợ</th>
              </tr>
            </thead>
            <tbody>
              {debtOrders.map((o) => {
                const b = ageBucket(o.createdAt);
                return (
                  <tr key={o.id}>
                    <td>
                      <div className="uname">{o.code}</div>
                      <div className="urole">{fmtDate(o.createdAt)}</div>
                    </td>
                    <td className="small muted">{nameOf(o.customerId)}</td>
                    <td><span className={`badge ${ORDER_STATUS_BADGE[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                    <td><span className={`badge ${AGE_BADGE[b]}`}>{b} ngày</span></td>
                    <td className="small" style={{ textAlign: "right" }}>{fmtVnd(o.total)}</td>
                    <td className="small" style={{ textAlign: "right" }}>{fmtVnd(o.paid)}</td>
                    <td className="small" style={{ textAlign: "right", fontWeight: 600, color: "var(--c-amber)" }}>{fmtVnd(orderRemaining(o))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Giá vốn & lãi gộp */}
      <div className="card mt">
        <div className="card-h">
          <h3>Giá vốn &amp; lãi gộp — đơn gần nhất</h3>
          <span className="badge b-indigo">tỷ suất TB {grossMarginPct}%</span>
        </div>
        {recent.length === 0 ? (
          <p className="muted small" style={{ padding: "10px 0" }}>Chưa có đơn nào.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th><th>Khách</th>
                <th style={{ textAlign: "right" }}>Doanh thu</th>
                <th style={{ textAlign: "right" }}>Giá vốn</th>
                <th style={{ textAlign: "right" }}>Lãi gộp</th>
                <th style={{ minWidth: 140 }}>Tỷ suất</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => {
                const rev = o.total || 0;
                const cg = orderCogs(o, cost);
                const gp = rev - cg;
                const pct = rev > 0 ? Math.round((gp / rev) * 100) : 0;
                return (
                  <tr key={o.id}>
                    <td className="uname">{o.code}</td>
                    <td className="small muted">{nameOf(o.customerId)}</td>
                    <td className="small" style={{ textAlign: "right" }}>{fmtVnd(rev)}</td>
                    <td className="small" style={{ textAlign: "right" }}>{fmtVnd(cg)}</td>
                    <td className="small" style={{ textAlign: "right", fontWeight: 600, color: gp >= 0 ? "var(--c-teal)" : "var(--c-rose)" }}>{fmtVnd(gp)}</td>
                    <td>
                      <div className="flex aic" style={{ gap: 8 }}>
                        <ProgressBar value={Math.max(0, Math.min(100, pct))} color="var(--c-teal)" />
                        <b className="small" style={{ minWidth: 34, textAlign: "right" }}>{pct}%</b>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Đối soát ngân hàng */}
      <div className="card mt">
        <div className="card-h">
          <h3>Đối soát ngân hàng</h3>
          <span className="badge b-gray">{txns.length} giao dịch</span>
        </div>
        {txns.length === 0 ? (
          <p className="muted small" style={{ padding: "10px 0" }}>Chưa có giao dịch ngân hàng nào.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Ngày</th><th>Loại</th>
                <th style={{ textAlign: "right" }}>Số tiền</th>
                <th>Ngân hàng</th><th>Đối tác</th><th>Khớp đơn</th>
                {canManage && <th></th>}
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => {
                const isIn = t.direction === "in";
                return (
                  <tr key={t.id}>
                    <td className="small muted">{fmtDate(t.date)}</td>
                    <td>
                      <span className={`badge ${isIn ? "b-green" : "b-rose"}`}>{TXN_DIR_LABEL[t.direction]}</span>
                    </td>
                    <td className="small" style={{ textAlign: "right", fontWeight: 600, color: isIn ? "var(--c-teal)" : "var(--c-rose)" }}>
                      {isIn ? "+" : "−"}{fmtVnd(t.amount)}
                    </td>
                    <td className="small muted">{t.bank || "—"}</td>
                    <td className="small muted">{t.counterparty || "—"}</td>
                    <td>
                      {t.matchedOrderId ? (
                        <span className="badge b-green">{orderCode.get(t.matchedOrderId) || "Đã khớp"}</span>
                      ) : (
                        <span className="badge b-amber">Chưa khớp</span>
                      )}
                    </td>
                    {canManage && (
                      <td style={{ textAlign: "right" }}>
                        <form action={matchTxnAction} style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          <input type="hidden" name="id" value={t.id} />
                          <select name="matchedOrderId" defaultValue={t.matchedOrderId || ""} style={{ padding: "5px 8px", maxWidth: 150 }}>
                            <option value="">— Không khớp —</option>
                            {active.map((o) => (
                              <option key={o.id} value={o.id}>{o.code} · {fmtVnd(orderRemaining(o))}</option>
                            ))}
                          </select>
                          <button type="submit" className="btn ghost" style={{ padding: "6px 11px" }}>Lưu</button>
                        </form>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {canManage && (
          <details className="mt">
            <summary style={{ fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Icon name="plus" /> Thêm giao dịch ngân hàng
            </summary>
            <form action={createBankTxnAction} className="mt" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <div className="field" style={{ margin: 0 }}><label>Ngày</label><input name="date" type="date" /></div>
              <div className="field" style={{ margin: 0 }}><label>Loại</label>
                <select name="direction" defaultValue="in">
                  {(Object.keys(TXN_DIR_LABEL) as TxnDirection[]).map((d) => <option key={d} value={d}>{TXN_DIR_LABEL[d]}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}><label>Số tiền (đ) *</label><input name="amount" inputMode="numeric" required placeholder="5000000" /></div>
              <div className="field" style={{ margin: 0 }}><label>Ngân hàng</label><input name="bank" placeholder="VD: Vietcombank" /></div>
              <div className="field" style={{ margin: 0 }}><label>Đối tác</label><input name="counterparty" placeholder="Tên người/đơn vị CK" /></div>
              <div className="field" style={{ margin: 0 }}><label>Tham chiếu</label><input name="ref" placeholder="Mã GD / nội dung CK" /></div>
              <div className="field" style={{ margin: 0 }}><label>Khớp đơn</label>
                <select name="matchedOrderId" defaultValue="">
                  <option value="">— Không khớp —</option>
                  {active.map((o) => (
                    <option key={o.id} value={o.id}>{o.code} · {fmtVnd(orderRemaining(o))}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}><label>Ghi chú</label><input name="note" placeholder="Ghi chú" /></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="btn primary"><Icon name="check" /> Lưu giao dịch</button>
              </div>
            </form>
          </details>
        )}
      </div>
    </div>
  );
}
