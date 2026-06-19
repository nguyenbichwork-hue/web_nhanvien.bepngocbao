import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { getOrder, getCustomer } from "@/lib/bnb/store";
import { fmtVnd, fmtDate, fmtDateTime, orderRemaining } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import { lineAmount } from "@/lib/bnb/util";
import {
  ORDER_STATUS_LABEL, ORDER_STATUS_BADGE, ORDER_FLOW, PAYMENT_LABEL,
  type PaymentMethod,
} from "@/lib/bnb/types";
import { haravanConfigured } from "@/lib/haravan/client";
import { setOrderStatusAction, addPaymentAction, pushOrderToHaravanAction } from "../actions";

export const dynamic = "force-dynamic";

const STEP_ICON: Record<string, string> = {
  pending: "cart", confirmed: "check", paid: "wallet",
  delivering: "truck", installing: "wrench", completed: "award",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission("order.read");
  const canManage = session.permissions.has("order.manage");
  const order = await getOrder(id);
  if (!order) notFound();
  const [names, customer] = await Promise.all([
    employeeNameMap(),
    order.customerId ? getCustomer(order.customerId) : Promise.resolve(undefined),
  ]);

  const remaining = orderRemaining(order);
  const cancelled = order.status === "cancelled";
  const isHaravan = order.id.startsWith("hrv-ord-");
  const curIdx = ORDER_FLOW.indexOf(order.status);
  // Trạng thái kế tiếp trong vòng đời (để hiện nút chuyển nhanh).
  const nextStatus = curIdx >= 0 && curIdx < ORDER_FLOW.length - 1 ? ORDER_FLOW[curIdx + 1] : undefined;

  return (
    <div>
      <PageHero
        icon="cart"
        title={`Đơn hàng ${order.code}`}
        subtitle={`${customer ? `${customer.name} · ${customer.phone}` : "Khách lẻ"} · Tạo ${fmtDate(order.createdAt)}`}
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Đơn hàng", "/orders"], [order.code]]}
        stats={[
          { label: "Tổng đơn", value: fmtVnd(order.total) },
          { label: "Đã thu", value: fmtVnd(order.paid), tone: "up" },
          { label: "Còn lại", value: fmtVnd(remaining), tone: remaining > 0 ? "down" : "flat" },
        ]}
        actions={
          <>
            <span className={`badge ${ORDER_STATUS_BADGE[order.status]}`} style={{ fontSize: 13, padding: "7px 14px" }}>{ORDER_STATUS_LABEL[order.status]}</span>
            <Link href="/orders" className="btn ghost"><Icon name="chev" /> Quay lại</Link>
          </>
        }
      />

      {/* Thanh tiến trình theo ORDER_FLOW */}
      <div className="card">
        <div className="card-h"><h3 className="sec-title">Tiến trình đơn</h3>{cancelled && <span className="badge b-rose">Đã huỷ</span>}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "stretch", flexWrap: "wrap" }}>
          {ORDER_FLOW.map((st, i) => {
            const done = !cancelled && curIdx >= 0 && i < curIdx;
            const active = !cancelled && i === curIdx;
            const bg = active ? "var(--brand-grad)" : done ? "var(--c-teal-soft)" : "var(--surface-2)";
            const col = active ? "#fff" : done ? "var(--c-teal)" : "var(--tx-soft)";
            return (
              <div key={st} style={{ flex: 1, minWidth: 110, textAlign: "center" }}>
                <div style={{
                  display: "grid", placeItems: "center", height: 44, borderRadius: 12,
                  background: bg, color: col, fontWeight: 700,
                  border: active ? "none" : "1px solid var(--line)",
                  boxShadow: active ? "var(--sh)" : "none",
                }}>
                  <Icon name={STEP_ICON[st] || "chev"} />
                </div>
                <div className="small" style={{ marginTop: 7, fontWeight: active ? 700 : 600, color: active ? "var(--tx)" : "var(--tx-soft)" }}>
                  {ORDER_STATUS_LABEL[st]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-k g-2 mt">
        {/* Cột trái: thông tin + dòng hàng + thanh toán */}
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <div className="card-h"><h3 className="sec-title">Thông tin giao nhận</h3></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Info label="Khách hàng" value={customer ? `${customer.name}` : undefined} />
              <Info label="Điện thoại" value={customer?.phone} />
              <Info label="Địa chỉ giao" value={order.address || customer?.address} />
              <Info label="Ngày giao" value={order.deliveryDate ? fmtDate(order.deliveryDate) : undefined} />
              <Info label="Phụ trách" value={order.assigneeId ? names[order.assigneeId] : undefined} />
              <Info label="Cập nhật" value={fmtDateTime(order.updatedAt)} />
            </div>
            {order.note && <p className="small mt muted">Ghi chú: {order.note}</p>}
          </div>

          <div className="card">
            <div className="card-h"><h3 className="sec-title">Dòng hàng</h3><span className="badge b-gray">{order.lines.length}</span></div>
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th style={{ textAlign: "right" }}>SL</th>
                  <th style={{ textAlign: "right" }}>Đơn giá</th>
                  <th style={{ textAlign: "right" }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="small" style={{ fontWeight: 600 }}>{l.name}</td>
                    <td className="small" style={{ textAlign: "right" }}>{l.qty}</td>
                    <td className="small" style={{ textAlign: "right" }}>{fmtVnd(l.unitPrice)}</td>
                    <td className="small" style={{ textAlign: "right", fontWeight: 600 }}>{fmtVnd(lineAmount(l))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12, display: "grid", gap: 6 }}>
              <Row label="Tổng đơn" value={fmtVnd(order.total)} strong />
              <Row label="Đã thu" value={fmtVnd(order.paid)} />
              <Row label="Còn lại" value={fmtVnd(remaining)} accent={remaining > 0} />
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3 className="sec-title">Lịch sử thanh toán</h3><span className="badge b-gray">{order.payments?.length || 0}</span></div>
            {(!order.payments || order.payments.length === 0) ? (
              <p className="muted small" style={{ padding: "12px 0" }}>Chưa ghi nhận thanh toán.</p>
            ) : (
              <div style={{ display: "grid", gap: 0 }}>
                {order.payments.map((p) => (
                  <div key={p.id} className="flex between aic" style={{ padding: "11px 0", borderTop: "1px solid var(--line)" }}>
                    <div>
                      <b className="small">{fmtVnd(p.amount)}</b>
                      <span className="badge b-sky" style={{ marginLeft: 8 }}>{PAYMENT_LABEL[p.method]}</span>
                      {p.note && <div className="urole">{p.note}</div>}
                    </div>
                    <span className="urole">{fmtDateTime(p.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: hành động */}
        <div style={{ display: "grid", gap: 20 }}>
          {isHaravan ? (
            <div className="card">
              <div className="card-h"><h3 className="sec-title">Đơn đồng bộ Haravan</h3><span className="badge b-sky">Live</span></div>
              <p className="muted small">
                Đơn này được đồng bộ trực tiếp từ Haravan (chỉ đọc). Cập nhật trạng thái,
                thanh toán và giao hàng thực hiện trên hệ thống Haravan; dữ liệu tự làm mới sau ~5 phút.
              </p>
              {order.haravanId && <p className="small mt">Mã Haravan: <b>{order.haravanId}</b></p>}
            </div>
          ) : canManage ? (
            <>
              {haravanConfigured() && (
                <div className="card">
                  <div className="card-h"><h3 className="sec-title">Đồng bộ Haravan</h3>{order.haravanId && <span className="badge b-green">Đã đẩy</span>}</div>
                  {order.haravanId ? (
                    <p className="small muted">Đơn đã tạo trên Haravan (mã <b>{order.haravanId}</b>).</p>
                  ) : (
                    <form action={pushOrderToHaravanAction}>
                      <input type="hidden" name="id" value={order.id} />
                      <button type="submit" className="btn primary" style={{ width: "100%" }}>
                        <Icon name="truck" /> Đẩy đơn lên Haravan
                      </button>
                      <p className="small muted mt">Tạo đơn (và khách hàng nếu cần) trên Haravan từ đơn này.</p>
                    </form>
                  )}
                </div>
              )}
              <div className="card">
                <div className="card-h"><h3 className="sec-title">Chuyển trạng thái</h3></div>
                {!cancelled && nextStatus && (
                  <form action={setOrderStatusAction} style={{ marginBottom: 14 }}>
                    <input type="hidden" name="id" value={order.id} />
                    <input type="hidden" name="status" value={nextStatus} />
                    <button type="submit" className="btn primary" style={{ width: "100%" }}>
                      <Icon name={STEP_ICON[nextStatus] || "check"} /> {ORDER_STATUS_LABEL[nextStatus]}
                    </button>
                  </form>
                )}
                <div className="chips">
                  {ORDER_FLOW.map((st) => (
                    <form key={st} action={setOrderStatusAction}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value={st} />
                      <button type="submit" className={`chip${order.status === st ? " on" : ""}`}>{ORDER_STATUS_LABEL[st]}</button>
                    </form>
                  ))}
                </div>
                {!cancelled && order.status !== "completed" && (
                  <form action={setOrderStatusAction} className="mt">
                    <input type="hidden" name="id" value={order.id} />
                    <input type="hidden" name="status" value="cancelled" />
                    <button type="submit" className="btn ghost" style={{ width: "100%", color: "var(--c-rose)" }}>
                      <Icon name="x" /> Huỷ đơn
                    </button>
                  </form>
                )}
              </div>

              <div className="card">
                <div className="card-h"><h3 className="sec-title">Ghi nhận thanh toán</h3></div>
                <form action={addPaymentAction} style={{ display: "grid", gap: 12 }}>
                  <input type="hidden" name="id" value={order.id} />
                  <div className="field" style={{ margin: 0 }}>
                    <label>Số tiền (đ) *</label>
                    <input name="amount" inputMode="numeric" required placeholder={remaining > 0 ? String(remaining) : "0"} />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Phương thức</label>
                    <select name="method" defaultValue="transfer">
                      {(["cash", "transfer", "card", "cod"] as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>{PAYMENT_LABEL[m]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label>Ghi chú</label>
                    <input name="note" placeholder="VD: Đặt cọc 50%" />
                  </div>
                  <button type="submit" className="btn primary"><Icon name="wallet" /> Ghi nhận</button>
                </form>
                <p className="small muted mt">Còn lại cần thu: <b>{fmtVnd(remaining)}</b></p>
              </div>
            </>
          ) : (
            <div className="card"><p className="muted small">Bạn không có quyền thao tác đơn hàng.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="urole" style={{ marginBottom: 2 }}>{label}</div>
      <div className="small" style={{ fontWeight: 600 }}>{value || "—"}</div>
    </div>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex between aic">
      <span className="small" style={{ color: "var(--tx-muted)", fontWeight: strong ? 700 : 500 }}>{label}</span>
      <span className="small" style={{ fontWeight: strong ? 800 : 600, color: accent ? "var(--c-amber)" : "var(--tx)" }}>{value}</span>
    </div>
  );
}
