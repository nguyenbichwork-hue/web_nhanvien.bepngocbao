import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CopyButton } from "@/components/copy-button";
import { getQuote, getCustomer, getLead } from "@/lib/bnb/store";
import { fmtVnd, fmtDate, lineAmount, quoteSubtotal, quoteTotal } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import {
  QUOTE_STATUS_LABEL, QUOTE_STATUS_BADGE, TIER_LABEL,
} from "@/lib/bnb/types";
import {
  SHOP_NAME, SHOP_TAGLINE, SHOP_ADDRESS, SHOP_PHONE, SHOP_EMAIL, SHOP_WEB,
  BNB_COMMITMENTS, QUOTE_TERMS, salutation, numberToVietnameseWords,
  vatInclusiveBreakdown, validUntilFrom, quoteZaloText,
} from "@/lib/bnb/quote-standard";
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
  const sal = salutation((who as { gender?: string } | undefined)?.gender);

  const subtotal = quoteSubtotal(quote);
  const total = quoteTotal(quote);
  const { vat } = vatInclusiveBreakdown(total);
  const validUntil = validUntilFrom(quote.createdAt, quote.validUntil);
  const advisor = quote.byId ? names[quote.byId] : "";
  const zalo = quoteZaloText({
    code: quote.code,
    customerName: who?.name,
    gender: (who as { gender?: string } | undefined)?.gender,
    lines: quote.lines,
    total,
  });

  return (
    <div>
      <div className="no-print">
        <PageHero
          icon="quote"
          title={`Báo giá ${quote.code}`}
          subtitle={`Tạo ${fmtDate(quote.createdAt)}${advisor ? ` · ${advisor}` : ""}`}
          crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Báo giá", "/quote"], [quote.code]]}
          actions={
            <>
              <span className={`badge ${QUOTE_STATUS_BADGE[quote.status]}`} style={{ fontSize: 13, padding: "7px 14px" }}>{QUOTE_STATUS_LABEL[quote.status]}</span>
              <PrintButton label="In / Lưu PDF" />
            </>
          }
        />
      </div>

      <div className="grid-k g-2" style={{ alignItems: "start" }}>
        {/* ===== Chứng từ báo giá chuẩn BNB (in được) ===== */}
        <div className="card">
          {/* Header thương hiệu */}
          <div className="flex between" style={{ alignItems: "flex-start", gap: 16 }}>
            <div className="flex aic" style={{ gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt={SHOP_NAME} style={{ height: 46, width: "auto" }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px", color: "var(--brand-1)" }}>{SHOP_NAME}</div>
                <div className="urole" style={{ fontStyle: "italic" }}>{SHOP_TAGLINE}</div>
                <div className="small muted" style={{ marginTop: 4, lineHeight: 1.5 }}>
                  {SHOP_ADDRESS}<br />
                  {SHOP_PHONE} · {SHOP_EMAIL} · {SHOP_WEB}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--brand-1)", letterSpacing: "0.5px" }}>PHIẾU BÁO GIÁ</div>
              <div className="small" style={{ fontWeight: 700, marginTop: 2 }}>{quote.code}</div>
              <div className="small muted" style={{ marginTop: 4, lineHeight: 1.6 }}>
                Ngày lập: {fmtDate(quote.createdAt)}<br />
                Hiệu lực đến: <b>{fmtDate(validUntil)}</b>
                {quote.tier && <><br />Phương án: {TIER_LABEL[quote.tier]}</>}
              </div>
            </div>
          </div>

          {/* Khách hàng */}
          <div style={{ borderTop: "2px solid var(--brand-1)", borderBottom: "1px solid var(--line)", padding: "12px 0", margin: "16px 0" }}>
            <div className="urole" style={{ marginBottom: 2 }}>Kính gửi {sal}</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{who?.name || "Quý khách"}</div>
            {who?.phone && <div className="small muted">{who.phone}{who.email ? ` · ${who.email}` : ""}</div>}
            {who?.address && <div className="small muted">{who.address}</div>}
            {advisor && <div className="small muted" style={{ marginTop: 4 }}>Tư vấn viên: {advisor}</div>}
          </div>

          {/* Dòng hàng */}
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}>#</th>
                <th>Hạng mục</th>
                <th style={{ width: 46, textAlign: "right" }}>SL</th>
                <th style={{ width: 116, textAlign: "right" }}>Đơn giá</th>
                <th style={{ width: 90, textAlign: "right" }}>CK</th>
                <th style={{ width: 116, textAlign: "right" }}>Thành tiền</th>
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

          {/* Tổng kết */}
          <div style={{ marginTop: 16, marginLeft: "auto", maxWidth: 340 }}>
            <div className="flex between small" style={{ padding: "5px 0" }}>
              <span className="muted">Tạm tính</span><span style={{ fontWeight: 600 }}>{fmtVnd(subtotal)}</span>
            </div>
            {quote.discount ? (
              <div className="flex between small" style={{ padding: "5px 0" }}>
                <span className="muted">Chiết khấu tổng</span><span style={{ fontWeight: 600 }}>− {fmtVnd(quote.discount)}</span>
              </div>
            ) : null}
            <div className="flex between small" style={{ padding: "5px 0" }}>
              <span className="muted">Trong đó VAT 8%</span><span style={{ fontWeight: 600 }}>{fmtVnd(vat)}</span>
            </div>
            <div className="flex between" style={{ padding: "10px 0 0", marginTop: 6, borderTop: "2px solid var(--brand-1)" }}>
              <b>Thành tiền (đã gồm VAT)</b>
              <b style={{ fontSize: 20, color: "var(--brand-1)" }}>{fmtVnd(total)}</b>
            </div>
            <div className="small" style={{ textAlign: "right", marginTop: 4, fontStyle: "italic" }}>
              Bằng chữ: {numberToVietnameseWords(total)}
            </div>
          </div>

          {quote.note && (
            <div style={{ marginTop: 16, borderTop: "1px dashed var(--line)", paddingTop: 12 }}>
              <div className="urole" style={{ marginBottom: 2 }}>Ghi chú</div>
              <p className="small muted">{quote.note}</p>
            </div>
          )}

          {/* Điều khoản */}
          <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <div className="sec-title" style={{ fontSize: 13, marginBottom: 6 }}>Điều khoản & chính sách</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }} className="small muted">
              {QUOTE_TERMS.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>

          {/* 4 cam kết BNB */}
          <div style={{ marginTop: 16 }}>
            <div className="sec-title" style={{ fontSize: 13, marginBottom: 8 }}>Cam kết của {SHOP_NAME}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {BNB_COMMITMENTS.map((c, i) => (
                <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
                  <div className="small" style={{ fontWeight: 700, color: "var(--brand-1)" }}>
                    <Icon name="check" /> {c.title}
                  </div>
                  <div className="urole" style={{ marginTop: 3, lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Chữ ký */}
          <div className="flex between" style={{ marginTop: 26, textAlign: "center", gap: 20 }}>
            <div style={{ flex: 1 }}>
              <div className="small" style={{ fontWeight: 700 }}>KHÁCH HÀNG</div>
              <div className="urole">(Ký, ghi rõ họ tên)</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="small" style={{ fontWeight: 700 }}>NGƯỜI LẬP BÁO GIÁ</div>
              <div className="urole">{advisor || SHOP_NAME}</div>
            </div>
          </div>
        </div>

        {/* ===== Thao tác (không in) ===== */}
        <div className="card no-print">
          <div className="card-h"><h3 className="sec-title">Thao tác</h3></div>
          <div style={{ display: "grid", gap: 12 }}>
            <CopyButton text={zalo} label="Copy tin Zalo gửi khách" className="btn primary" />
            {canManage ? (
              <>
                <form action={setQuoteStatusAction}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="status" value="sent" />
                  <button type="submit" className="btn" style={{ width: "100%" }} disabled={quote.status === "sent" || quote.status === "accepted"}>
                    <Icon name="quote" /> Gửi báo giá
                  </button>
                </form>
                <form action={setQuoteStatusAction}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="status" value="accepted" />
                  <button type="submit" className="btn" style={{ width: "100%" }} disabled={quote.status === "accepted"}>
                    <Icon name="check" /> Chốt báo giá → tạo đơn
                  </button>
                </form>
                <form action={setQuoteStatusAction}>
                  <input type="hidden" name="id" value={quote.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <button type="submit" className="btn ghost" style={{ width: "100%" }} disabled={quote.status === "rejected"}>
                    <Icon name="x" /> Đánh dấu từ chối
                  </button>
                </form>
                <p className="muted small">Trạng thái: <b>{QUOTE_STATUS_LABEL[quote.status]}</b>.</p>
              </>
            ) : (
              <p className="muted small">Bạn không có quyền cập nhật báo giá.</p>
            )}
            {who && quote.customerId && (
              <Link href={`/customers/${quote.customerId}`} className="btn ghost" style={{ width: "100%" }}>
                <Icon name="users" /> Hồ sơ khách 360
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
