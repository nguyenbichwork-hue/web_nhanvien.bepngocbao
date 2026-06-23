import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { getPurchaseOrder, getOrder } from "@/lib/bnb/store";
import { fmtVnd, fmtDate, fmtDateTime, poZaloText } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import {
  PO_STATUS_LABEL, PO_STATUS_BADGE, type POStatus,
} from "@/lib/bnb/types";
import { CopyButton } from "@/components/copy-button";
import { setPOStatusAction } from "../actions";

export const dynamic = "force-dynamic";

const PO_FLOW: POStatus[] = ["draft", "ordered", "received"];
const STEP_ICON: Record<string, string> = { draft: "doc", ordered: "truck", received: "box" };

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission("purchase.read");
  const canManage = session.permissions.has("purchase.manage");
  const po = await getPurchaseOrder(id);
  if (!po) notFound();
  const [names, srcOrder] = await Promise.all([
    employeeNameMap(),
    po.orderId ? getOrder(po.orderId) : Promise.resolve(undefined),
  ]);

  const cancelled = po.status === "cancelled";
  const curIdx = PO_FLOW.indexOf(po.status);
  const nextStatus = curIdx >= 0 && curIdx < PO_FLOW.length - 1 ? PO_FLOW[curIdx + 1] : undefined;

  return (
    <div>
      <PageHero
        icon="truck"
        title={`Phiếu nhập ${po.code}`}
        subtitle={`${po.supplierName} · Tạo ${fmtDate(po.createdAt)}`}
        crumb={[["Trang chủ", "/dashboard"], ["Vận hành"], ["Nhập hàng", "/purchase"], [po.code]]}
        stats={[
          { label: "Tổng giá trị", value: fmtVnd(po.total) },
          { label: "Số dòng", value: po.items.length },
        ]}
        actions={
          <>
            <span className={`badge ${PO_STATUS_BADGE[po.status]}`} style={{ fontSize: 13, padding: "7px 14px" }}>{PO_STATUS_LABEL[po.status]}</span>
            <Link href="/purchase" className="btn ghost"><Icon name="chev" /> Quay lại</Link>
          </>
        }
      />

      {/* Tiến trình PO */}
      <div className="card">
        <div className="card-h"><h3 className="sec-title">Tiến trình nhập hàng</h3>{cancelled && <span className="badge b-rose">Đã huỷ</span>}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "stretch", flexWrap: "wrap" }}>
          {PO_FLOW.map((st, i) => {
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
                  {PO_STATUS_LABEL[st]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-k g-2 mt">
        {/* Cột trái: thông tin + bảng hàng */}
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <div className="card-h"><h3 className="sec-title">Thông tin PO</h3></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Info label="Nhà cung cấp" value={po.supplierName} />
              <Info label="Dự kiến về" value={po.expectedAt ? fmtDate(po.expectedAt) : undefined} />
              <Info label="Người tạo" value={po.byId ? names[po.byId] : undefined} />
              <Info label="Cập nhật" value={fmtDateTime(po.updatedAt)} />
            </div>
            {srcOrder && (
              <p className="small mt">
                Tách từ đơn khách:{" "}
                <Link href={`/orders/${srcOrder.id}`} style={{ fontWeight: 700, color: "var(--accent)" }}>{srcOrder.code}</Link>
              </p>
            )}
            {po.note && <p className="small mt muted">Ghi chú: {po.note}</p>}
          </div>

          <div className="card">
            <div className="card-h"><h3 className="sec-title">Dòng hàng</h3><span className="badge b-gray">{po.items.length}</span></div>
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th style={{ textAlign: "right" }}>SL</th>
                  <th style={{ textAlign: "right" }}>Giá vốn</th>
                  <th style={{ textAlign: "right" }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((it, i) => (
                  <tr key={i}>
                    <td className="small" style={{ fontWeight: 600 }}>
                      {it.name}
                      {it.sku && <div className="urole" style={{ marginTop: 2 }}>SKU {it.sku}</div>}
                    </td>
                    <td className="small" style={{ textAlign: "right" }}>{it.qty}</td>
                    <td className="small" style={{ textAlign: "right" }}>{fmtVnd(it.unitCost)}</td>
                    <td className="small" style={{ textAlign: "right", fontWeight: 600 }}>{fmtVnd(it.qty * it.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 12 }}>
              <div className="flex between aic">
                <b>Tổng giá trị</b>
                <b style={{ fontSize: 18, color: "var(--brand-1)" }}>{fmtVnd(po.total)}</b>
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: hành động */}
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <div className="card-h"><h3 className="sec-title">Gửi NCC qua Zalo</h3></div>
            <p className="small muted" style={{ marginTop: 0 }}>Copy nội dung đặt hàng rồi dán vào Zalo gửi nhà cung cấp (thủ công).</p>
            <pre style={{
              whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, lineHeight: 1.6,
              background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, margin: "0 0 12px",
            }}>{poZaloText(po)}</pre>
            <CopyButton text={poZaloText(po)} className="btn primary" />
          </div>
          {canManage ? (
            <div className="card">
              <div className="card-h"><h3 className="sec-title">Chuyển trạng thái</h3></div>
              {!cancelled && nextStatus && (
                <form action={setPOStatusAction} style={{ marginBottom: 14 }}>
                  <input type="hidden" name="id" value={po.id} />
                  <input type="hidden" name="status" value={nextStatus} />
                  <button type="submit" className="btn primary" style={{ width: "100%" }}>
                    <Icon name={STEP_ICON[nextStatus] || "check"} /> Chuyển sang {PO_STATUS_LABEL[nextStatus]}
                  </button>
                </form>
              )}
              <div className="chips">
                {PO_FLOW.map((st) => (
                  <form key={st} action={setPOStatusAction}>
                    <input type="hidden" name="id" value={po.id} />
                    <input type="hidden" name="status" value={st} />
                    <button type="submit" className={`chip${po.status === st ? " on" : ""}`}>{PO_STATUS_LABEL[st]}</button>
                  </form>
                ))}
              </div>
              {!cancelled && po.status !== "received" && (
                <form action={setPOStatusAction} className="mt">
                  <input type="hidden" name="id" value={po.id} />
                  <input type="hidden" name="status" value="cancelled" />
                  <button type="submit" className="btn ghost" style={{ width: "100%", color: "var(--c-rose)" }}>
                    <Icon name="x" /> Huỷ PO
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="card"><p className="muted small">Bạn không có quyền thao tác phiếu nhập hàng.</p></div>
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
