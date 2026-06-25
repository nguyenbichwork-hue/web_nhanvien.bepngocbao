import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CopyButton } from "@/components/copy-button";
import { getQuote, getCustomer, getLead, listAllProducts } from "@/lib/bnb/store";
import { fmtVnd, fmtDate, lineAmount, quoteSubtotal, quoteTotal } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import {
  QUOTE_STATUS_LABEL, QUOTE_STATUS_BADGE, TIER_LABEL,
} from "@/lib/bnb/types";
import {
  SHOP_NAME, SHOP_TAGLINE, SHOP_ADDRESS, SHOP_PHONE, SHOP_EMAIL, SHOP_WEB,
  BNB_COMMITMENTS, QUOTE_TERMS, salutation, numberToVietnameseWords,
  vatInclusiveBreakdown, validUntilFrom, quoteZaloText,
  COST_ANALYSIS_ROWS, bnbCommitments6,
} from "@/lib/bnb/quote-standard";
import { setQuoteStatusAction } from "../actions";
import { PrintButton } from "../print-button";
import { QuotePdfButton, type QuotePdfData } from "../quote-pdf";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission("quote.read");
  const canManage = session.permissions.has("quote.manage");
  const quote = await getQuote(id);
  if (!quote) notFound();

  const [customer, lead, names, products] = await Promise.all([
    quote.customerId ? getCustomer(quote.customerId) : Promise.resolve(undefined),
    quote.leadId ? getLead(quote.leadId) : Promise.resolve(undefined),
    employeeNameMap(),
    listAllProducts().catch(() => []),
  ]);
  const who = customer || lead;
  const sal = salutation((who as { gender?: string } | undefined)?.gender);

  // Map SKU (lowercase) → ảnh sản phẩm để gắn thumbnail vào PDF.
  const skuImage = new Map<string, string>();
  for (const p of products) {
    if (p.sku && p.image) skuImage.set(p.sku.toLowerCase(), p.image);
  }
  const imgForSku = (sku?: string) => (sku ? skuImage.get(sku.trim().toLowerCase()) : undefined);

  const subtotal = quoteSubtotal(quote);
  const total = quoteTotal(quote);
  const { vat } = vatInclusiveBreakdown(total);
  const validUntil = validUntilFrom(quote.createdAt, quote.validUntil);
  const advisor = quote.byId ? names[quote.byId] : "";
  const proposal = quote.proposal;
  const recTier = proposal?.tiers.find((t) => t.key === proposal.recommended);

  const zalo = quoteZaloText({
    code: quote.code,
    customerName: who?.name,
    gender: (who as { gender?: string } | undefined)?.gender,
    lines: quote.lines,
    total,
    proposal: proposal
      ? { recommended: proposal.recommended, tiers: proposal.tiers.map((t) => ({ key: t.key, label: t.label, role: t.role, total: t.total })) }
      : undefined,
  });

  const pdfData: QuotePdfData = {
    code: quote.code,
    dateLabel: fmtDate(quote.createdAt),
    validLabel: fmtDate(validUntil),
    advisor,
    salutation: sal,
    shop: { name: SHOP_NAME, tagline: SHOP_TAGLINE, address: SHOP_ADDRESS, phone: SHOP_PHONE, email: SHOP_EMAIL, web: SHOP_WEB },
    customer: { salutation: sal, name: who?.name ?? "", phone: who?.phone, address: who?.address, email: who?.email },
    lines: quote.lines.map((l) => ({ name: l.name, sku: l.sku, qty: l.qty, unitPrice: l.unitPrice, amount: lineAmount(l), image: imgForSku(l.sku) })),
    subtotal, discount: quote.discount ?? 0, vat, total,
    totalWords: numberToVietnameseWords(total),
    terms: QUOTE_TERMS, commitments: BNB_COMMITMENTS,
    proposal: proposal
      ? {
          recommended: proposal.recommended,
          tiers: proposal.tiers.map((t) => ({
            key: t.key, label: t.label, role: t.role, total: t.total,
            items: t.lines.map((l) => ({ name: l.name, price: l.unitPrice, image: imgForSku(l.sku) })),
            recommended: t.key === proposal.recommended,
          })),
        }
      : undefined,
  };

  // Bảng màu maroon/cream/gold khớp mẫu PDF (đồng bộ bản in HTML).
  const M = "#7a1b29";        // maroon
  const MD = "#5c121d";       // maroon dark
  const CREAM = "#f7efe0";
  const GOLD = "#b8923a";
  const GRAY = "#6e655c";
  const LINE = "#e6ddcf";
  const xungName = who?.name ? `${sal} ${who.name}` : sal;

  // Thanh tiêu đề phần (maroon) + ô tag "Phần 0X" — khớp sectionBar của PDF.
  const sectionBar = (tag: string, title: string) => (
    <div style={{ display: "flex", alignItems: "center", background: M, padding: "8px 12px", borderRadius: 4, margin: "18px 0 10px", breakInside: "avoid" }}>
      <span style={{ background: MD, color: "#e7c4ca", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 3, marginRight: 10 }}>{tag}</span>
      <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{title}</span>
    </div>
  );

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
        {/* ===== Chứng từ báo giá chuẩn BNB (in được) — đồng bộ mẫu PDF ===== */}
        <div className="card">
          {/* Header thương hiệu + title box cream */}
          <div className="flex between" style={{ alignItems: "flex-start", gap: 16 }}>
            <div className="flex aic" style={{ gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt={SHOP_NAME} style={{ height: 46, width: "auto" }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.3px", color: M }}>{SHOP_NAME}</div>
                <div className="urole" style={{ fontStyle: "italic", color: GRAY }}>{SHOP_TAGLINE}</div>
                <div className="small" style={{ marginTop: 4, lineHeight: 1.5, color: GRAY }}>
                  {SHOP_ADDRESS}<br />
                  {SHOP_PHONE} · {SHOP_EMAIL} · {SHOP_WEB}
                </div>
              </div>
            </div>
            <div style={{ background: CREAM, borderRadius: 6, padding: "10px 16px", textAlign: "center", minWidth: 190 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: M, letterSpacing: "0.5px", textTransform: "uppercase" }}>Phiếu báo giá</div>
              <div className="small" style={{ marginTop: 4 }}>Số: <b>{quote.code}</b></div>
              <div className="small" style={{ marginTop: 2 }}>Ngày lập: {fmtDate(quote.createdAt)}</div>
              <div className="small" style={{ marginTop: 2 }}>Hiệu lực đến: <b>{fmtDate(validUntil)}</b></div>
              {quote.tier && <div className="small" style={{ marginTop: 2 }}>Phương án: {TIER_LABEL[quote.tier]}</div>}
            </div>
          </div>

          {/* Greeting callout (cream) */}
          <div style={{ background: CREAM, borderRadius: 6, padding: "12px 14px", margin: "16px 0" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Kính gửi {xungName},</div>
            <div className="small" style={{ lineHeight: 1.6 }}>
              {SHOP_NAME} xin gửi báo giá chi tiết cho gia đình. Báo giá minh bạch theo tổng chi phí
              (không chỉ giá tem), đã gồm VAT và không có phí ẩn — {sal} có thể yên tâm đối chiếu trước khi quyết định.
            </div>
            {(who?.phone || who?.address || advisor) && (
              <div className="small muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                {who?.phone && <>{who.phone}{who.email ? ` · ${who.email}` : ""}<br /></>}
                {who?.address && <>{who.address}<br /></>}
                {advisor && <>Tư vấn viên: {advisor}</>}
              </div>
            )}
          </div>

          {/* ===== PHẦN 01 — Phân tích chi phí ===== */}
          {sectionBar("Phần 01", "Phân tích chi phí (không chỉ giá tem)")}
          <p className="small muted" style={{ marginBottom: 8 }}>
            Mua thiết bị bếp không chỉ là giá niêm yết. Để {xungName} so sánh chính xác giữa các nơi, {SHOP_NAME} minh bạch theo công thức:
          </p>
          <div style={{ textAlign: "center", fontSize: 16, fontWeight: 800, color: M, margin: "10px 0 12px", letterSpacing: "0.5px" }}>
            MUA + LẮP + DÙNG + BẢO TRÌ
          </div>
          <table style={{ breakInside: "avoid" }}>
            <thead>
              <tr style={{ background: M }}>
                <th style={{ color: "#fff", width: "34%" }}>Hạng mục chi phí</th>
                <th style={{ color: "#fff", width: "16%" }}>Khi nào</th>
                <th style={{ color: "#fff" }}>Ghi chú minh bạch</th>
              </tr>
            </thead>
            <tbody>
              {COST_ANALYSIS_ROWS.map((r, i) => (
                <tr key={i}>
                  <td className="small" style={{ fontWeight: 700, color: M, background: "#fbf7ef" }}>{r[0]}</td>
                  <td className="small" style={{ fontWeight: 700, color: M, textAlign: "center" }}>{r[1]}</td>
                  <td className="small muted">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ===== PHẦN 02 — Chi tiết báo giá ===== */}
          {sectionBar("Phần 02", "Chi tiết báo giá")}
          {proposal ? (
            <>
              <p className="small muted" style={{ marginBottom: 8 }}>
                {SHOP_NAME} đề xuất {proposal.tiers.length} phương án để {xungName} so sánh đúng giá trị tổng thể.
                Phương án {SHOP_NAME} khuyến nghị được đánh dấu nổi bật:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${proposal.tiers.length}, 1fr)`, gap: 10, breakInside: "avoid" }}>
                {proposal.tiers.map((t) => {
                  const rec = t.key === proposal.recommended;
                  return (
                    <div key={t.key} style={{ border: `1px solid ${LINE}`, borderRadius: 10, overflow: "hidden", background: rec ? CREAM : "var(--surface)" }}>
                      <div style={{ background: rec ? MD : M, color: "#fff", padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ fontWeight: 800 }}>{t.label}</div>
                        <div style={{ fontSize: 11, color: "#f0d9b0", marginTop: 1 }}>{rec ? "★ BNB khuyến nghị" : t.role}</div>
                      </div>
                      <div style={{ padding: 10 }}>
                        {rec && <span className="badge" style={{ background: M, color: "#fff", fontSize: 10, marginBottom: 6, display: "inline-block" }}>KHUYẾN NGHỊ</span>}
                        {t.lines.map((l, i) => {
                          const img = imgForSku(l.sku);
                          return (
                            <div key={i} className="small" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              {img && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={img} alt="" style={{ width: 26, height: 26, objectFit: "contain", borderRadius: 3, border: `1px solid ${LINE}`, flexShrink: 0 }} />
                              )}
                              <span>{l.name} — <b>{fmtVnd(l.unitPrice)}</b></span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ background: rec ? MD : M, color: "#fff", padding: "7px 10px", textAlign: "center", fontWeight: 800, fontSize: 15 }}>
                        {fmtVnd(t.total)}
                      </div>
                    </div>
                  );
                })}
              </div>
              {recTier && <p className="small muted" style={{ marginTop: 8 }}>Gói khuyến nghị của BNB: <b>{recTier.label}</b>.</p>}
            </>
          ) : (
            <>
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
                  {quote.lines.map((l, i) => {
                    const img = imgForSku(l.sku);
                    return (
                      <tr key={i}>
                        <td className="small muted">{i + 1}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {img && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt="" style={{ width: 34, height: 34, objectFit: "contain", borderRadius: 3, border: `1px solid ${LINE}`, flexShrink: 0 }} />
                            )}
                            <div>
                              <div className="small" style={{ fontWeight: 600 }}>{l.name}</div>
                              {l.sku && <div className="urole">SKU {l.sku}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="small" style={{ textAlign: "right" }}>{l.qty}</td>
                        <td className="small" style={{ textAlign: "right" }}>{fmtVnd(l.unitPrice)}</td>
                        <td className="small" style={{ textAlign: "right" }}>{l.discount ? fmtVnd(l.discount) : "—"}</td>
                        <td className="small" style={{ textAlign: "right", fontWeight: 700 }}>{fmtVnd(lineAmount(l))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Tổng kết */}
              <div style={{ marginTop: 16, marginLeft: "auto", maxWidth: 340, breakInside: "avoid" }}>
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
                <div className="flex between" style={{ padding: "10px 0 0", marginTop: 6, borderTop: `2px solid ${M}` }}>
                  <b>Thành tiền (đã gồm VAT)</b>
                  <b style={{ fontSize: 20, color: M }}>{fmtVnd(total)}</b>
                </div>
                <div className="small" style={{ textAlign: "right", marginTop: 4, fontStyle: "italic" }}>
                  Bằng chữ: {numberToVietnameseWords(total)}
                </div>
              </div>
            </>
          )}

          {quote.note && (
            <div style={{ marginTop: 16, borderTop: `1px dashed ${LINE}`, paddingTop: 12 }}>
              <div className="urole" style={{ marginBottom: 2 }}>Ghi chú</div>
              <p className="small muted">{quote.note}</p>
            </div>
          )}

          {/* ===== PHẦN 03 — Điều khoản & Cam kết ===== */}
          {sectionBar("Phần 03", "Điều khoản & Cam kết")}
          <p className="small muted" style={{ marginBottom: 8 }}>
            {SHOP_NAME} cam kết minh bạch điều khoản và đồng hành với {xungName} trước, trong và sau khi mua:
          </p>
          <ul style={{ margin: "0 0 14px", paddingLeft: 18, lineHeight: 1.8 }} className="small muted">
            {QUOTE_TERMS.map((t, i) => <li key={i}>{t}</li>)}
          </ul>

          <div style={{ background: M, color: "#fff", textAlign: "center", fontWeight: 700, padding: "8px 0", borderRadius: 4, marginBottom: 10 }}>
            6 cam kết của {SHOP_NAME}
          </div>
          <div>
            {bnbCommitments6(sal).map((c, i, arr) => (
              <div key={i} style={{ paddingBottom: 8, marginBottom: 8, borderBottom: i === arr.length - 1 ? "none" : `1px solid ${LINE}`, breakInside: "avoid" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: GOLD }}>{c.no}</div>
                <div className="small" style={{ fontWeight: 700, color: M }}>{c.title}</div>
                <div className="small muted">{c.desc}</div>
              </div>
            ))}
          </div>

          {/* Chữ ký */}
          <div className="flex between" style={{ marginTop: 26, textAlign: "center", gap: 20, breakInside: "avoid" }}>
            <div style={{ flex: 1 }}>
              <div className="small" style={{ fontWeight: 700, color: M }}>KHÁCH HÀNG</div>
              <div className="urole">(Ký, ghi rõ họ tên)</div>
              <div style={{ borderTop: "1px solid #2b2724", width: "80%", margin: "46px auto 0" }} />
              <div className="small" style={{ marginTop: 4 }}>{who?.name || ""}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="small" style={{ fontWeight: 700, color: M }}>NGƯỜI LẬP BÁO GIÁ</div>
              <div className="urole">(Ký, ghi rõ họ tên)</div>
              <div style={{ borderTop: "1px solid #2b2724", width: "80%", margin: "46px auto 0" }} />
              <div className="small" style={{ marginTop: 4 }}>{advisor || SHOP_NAME}</div>
            </div>
          </div>
          <p className="small muted" style={{ textAlign: "center", marginTop: 20 }}>
            Cảm ơn {xungName} đã tin tưởng {SHOP_NAME}. Bên em mong được đồng hành cùng căn bếp của gia đình {sal} trong nhiều năm tới.
          </p>
        </div>

        {/* ===== Thao tác (không in) ===== */}
        <div className="card no-print">
          <div className="card-h"><h3 className="sec-title">Thao tác</h3></div>
          <div style={{ display: "grid", gap: 12 }}>
            <QuotePdfButton data={pdfData} />
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
