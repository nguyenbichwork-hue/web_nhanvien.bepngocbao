import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { getQuote, getCustomer, getLead } from "@/lib/bnb/store";
import { fmtVnd, fmtDate, lineAmount, quoteSubtotal, quoteTotal } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import {
  QUOTE_STATUS_LABEL, QUOTE_STATUS_BADGE, TIER_LABEL,
} from "@/lib/bnb/types";
import { setQuoteStatusAction } from "../actions";
import { PrintButton } from "../print-button";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission("quote.read");
  const canManage = session.permissions.has("quote.manage");
  const quote = await getQuote(id);
  if (!quote) notFound();

  const [customer, lead, names] = await Promise.all([
    quote.customerId ? getCustomer(quote.customerId) : Promise.resolve(undefined),
    quote.leadId ? getLead(quote.leadId) : Promise.resolve(undefined),
    employeeNameMap(),
  ]);
  const who = customer || lead;

  const subtotal = quoteSubtotal(quote);
  const total = quoteTotal(quote);

  return (
    <div className="view-in">
      <div className="crumbs no-print">
        <Link href="/quote">Báo giá</Link> <Icon name="chev" /> {quote.code}
      </div>
      <div className="page-head no-print">
        <div>
          <h1 style={{ fontSize: 22 }}>Báo giá {quote.code}</h1>
          <p>Tạo {fmtDate(quote.createdAt)}{quote.byId ? ` · ${names[quote.byId] || ""}` : ""}</p>
        </div>
        <div className="flex gap aic">
          <span className={`badge ${QUOTE_STATUS_BADGE[quote.status]}`} style={{ fontSize: 13, padding: "7px 14px" }}>{QUOTE_STATUS_LABEL[quote.status]}</span>
          <PrintButton />
        </div>
      </div>

      <div className="grid-k g-2" style={{ alignItems: "start" }}>
        {/* Chứng từ in được */}
        <div className="card">
          <div className="flex between" style={{ alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.3px" }}>Bếp Ngọc Bảo</div>
              <div className="urole">Phiếu báo giá · {quote.code}</div>
            </div>
            <div style={{ textAlign: "right" }} className="small muted">
              <div>Ngày: {fmtDate(quote.createdAt)}</div>
              {quote.validUntil && <div>Hiệu lực đến: {fmtDate(quote.validUntil)}</div>}
              {quote.tier && <div>Phương án: {TIER_LABEL[quote.tier]}</div>}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "14px 0", marginBottom: 16 }}>
            <div className="urole" style={{ marginBottom: 2 }}>Khách hàng</div>
            <div style={{ fontWeight: 700 }}>{who?.name || "Khách lẻ"}</div>
            {who?.phone && <div className="small muted">{who.phone}{who.email ? ` · ${who.email}` : ""}</div>}
            {who?.address && <div className="small muted">{who.address}</div>}
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Hạng mục</th>
                <th style={{ width: 50, textAlign: "right" }}>SL</th>
                <th style={{ width: 120, textAlign: "right" }}>Đơn giá</th>
                <th style={{ width: 100, textAlign: "right" }}>CK</th>
                <th style={{ width: 120, textAlign: "right" }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((l, i) => (
                <tr key={i}>
                  <td className="small muted">{i + 1}</td>
                  <td>
                    <div className="small" style={{ fontWeight: 600 }}>{l.name}</div>
                    {l.sku && <div className="urole">SKU {l.sku}</div>}
                  </td>
                  <td className="small" style={{ textAlign: "right" }}>{l.qty}</td>
                  <td className="small" style={{ textAlign: "right" }}>{fmtVnd(l.unitPrice)}</td>
                  <td className="small" style={{ textAlign: "right" }}>{l.discount ? fmtVnd(l.discount) : "—"}</td>
                  <td className="small" style={{ textAlign: "right", fontWeight: 700 }}>{fmtVnd(lineAmount(l))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 18, marginLeft: "auto", maxWidth: 320 }}>
            <div className="flex between small" style={{ padding: "5px 0" }}>
              <span className="muted">Tạm tính</span><span style={{ fontWeight: 600 }}>{fmtVnd(subtotal)}</span>
            </div>
            {quote.discount ? (
              <div className="flex between small" style={{ padding: "5px 0" }}>
                <span className="muted">Chiết khấu tổng</span><span style={{ fontWeight: 600 }}>− {fmtVnd(quote.discount)}</span>
              </div>
            ) : null}
            <div className="flex between" style={{ padding: "10px 0 0", marginTop: 6, borderTop: "1px solid var(--line)" }}>
              <b>Thành tiền</b>
              <b style={{ fontSize: 20, color: "var(--brand-1)" }}>{fmtVnd(total)}</b>
            </div>
          </div>

          {quote.note && (
            <div style={{ marginTop: 18, borderTop: "1px dashed var(--line)", paddingTop: 12 }}>
              <div className="urole" style={{ marginBottom: 2 }}>Ghi chú</div>
              <p className="small muted">{quote.note}</p>
            </div>
          )}
        </div>

        {/* Hành động */}
        <div className="card no-print">
          <div className="card-h"><h3>Thao tác</h3></div>
          {canManage ? (
            <div style={{ display: "grid", gap: 12 }}>
              <form action={setQuoteStatusAction}>
                <input type="hidden" name="id" value={quote.id} />
                <input type="hidden" name="status" value="sent" />
                <button type="submit" className="btn primary" style={{ width: "100%" }} disabled={quote.status === "sent" || quote.status === "accepted"}>
                  <Icon name="quote" /> Gửi báo giá
                </button>
              </form>
              <form action={setQuoteStatusAction}>
                <input type="hidden" name="id" value={quote.id} />
                <input type="hidden" name="status" value="accepted" />
                <button type="submit" className="btn" style={{ width: "100%" }} disabled={quote.status === "accepted"}>
                  <Icon name="check" /> Chốt báo giá
                </button>
              </form>
              <form action={setQuoteStatusAction}>
                <input type="hidden" name="id" value={quote.id} />
                <input type="hidden" name="status" value="rejected" />
                <button type="submit" className="btn ghost" style={{ width: "100%" }} disabled={quote.status === "rejected"}>
                  <Icon name="x" /> Đánh dấu từ chối
                </button>
              </form>
              <p className="muted small">Trạng thái hiện tại: <b>{QUOTE_STATUS_LABEL[quote.status]}</b>.</p>
            </div>
          ) : (
            <p className="muted small">Bạn không có quyền cập nhật báo giá.</p>
          )}
        </div>
      </div>
    </div>
  );
}
