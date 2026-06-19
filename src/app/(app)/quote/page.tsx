import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { DonutChart } from "@/components/charts/rich";
import { TableFilter } from "@/components/table-filter";
import { ComboGallery } from "@/components/combo-gallery";
import { listQuotes, listCustomers, listLeads, listProducts } from "@/lib/bnb/store";
import { comboImageMap } from "@/lib/drive/combo-images";
import { fmtVnd, fmtDate, quoteTotal, compactVnd } from "@/lib/bnb/util";
import {
  QUOTE_STATUS_LABEL, QUOTE_STATUS_BADGE, TIER_LABEL,
} from "@/lib/bnb/types";

export const dynamic = "force-dynamic";

const MIX_COLORS = ["#2b78c5", "#7c3aed", "#d98309", "#0e9d6e", "#e23b54", "#0d9488", "#9aa1ab"];

export default async function QuotePage() {
  const session = await requirePermission("quote.read");
  const canManage = session.permissions.has("quote.manage");
  const [quotes, customers, leads, products, comboImages] = await Promise.all([
    listQuotes(), listCustomers(), listLeads(), listProducts(), comboImageMap(),
  ]);

  const cusName: Record<string, string> = {};
  for (const c of customers) cusName[c.id] = c.name;
  const leadName: Record<string, string> = {};
  for (const l of leads) leadName[l.id] = l.name;

  const sorted = [...quotes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const count = (st: string) => quotes.filter((q) => q.status === st).length;

  const acceptedValue = quotes
    .filter((q) => q.status === "accepted")
    .reduce((s, q) => s + quoteTotal(q), 0);

  const kpis = [
    { st: "draft", label: "Nháp", grad: "gr-azure", icon: "doc" },
    { st: "sent", label: "Đã gửi", grad: "gr-sunny", icon: "quote" },
    { st: "accepted", label: "Đã chốt", grad: "gr-mint", icon: "check" },
  ];

  // Cơ cấu báo giá theo trạng thái (donut).
  const statusKeys = Object.keys(QUOTE_STATUS_LABEL) as (keyof typeof QUOTE_STATUS_LABEL)[];
  const statusMix = statusKeys
    .map((st, i) => ({ name: QUOTE_STATUS_LABEL[st], value: count(st), color: MIX_COLORS[i % MIX_COLORS.length] }))
    .filter((x) => x.value > 0);

  return (
    <div>
      <PageHero
        icon="quote"
        title="Tư vấn & Báo giá"
        subtitle="Soạn báo giá nhiều phương án (cơ bản · cân bằng · cao cấp), gửi khách & chốt đơn."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Báo giá"]]}
        stats={[
          { label: "Tổng báo giá", value: quotes.length },
          { label: "Đã chốt", value: count("accepted"), tone: "up" },
          { label: "Giá trị chốt", value: compactVnd(acceptedValue), tone: "up" },
        ]}
        actions={canManage ? <Link href="/quote/new" className="btn primary"><Icon name="plus" /> Tạo báo giá</Link> : undefined}
      />

      {/* KPI */}
      <div className="grid-k g-3 stagger">
        {kpis.map((k) => (
          <div key={k.st} className={`card kpi grad hover ${k.grad}`}>
            <div className="ic"><Icon name={k.icon} /></div>
            <div className="val"><CountUp to={count(k.st)} /></div>
            <div className="lbl">báo giá {k.label.toLowerCase()}</div>
          </div>
        ))}
      </div>

      {/* Biểu đồ: cơ cấu báo giá theo trạng thái */}
      {statusMix.length > 0 && (
        <div className="grid-k g-2 mt">
          <div className="card hover">
            <div className="card-h"><h3 className="sec-title">Cơ cấu báo giá theo trạng thái</h3></div>
            <DonutChart data={statusMix} height={250} centerValue={quotes.length} centerLabel="báo giá" unit=" báo giá" />
          </div>
          <div className="card hover">
            <div className="card-h"><h3 className="sec-title">Báo giá gần đây</h3></div>
            <table>
              <thead>
                <tr><th>Mã</th><th>Khách / Lead</th><th style={{ textAlign: "right" }}>Tổng tiền</th></tr>
              </thead>
              <tbody>
                {sorted.slice(0, 5).map((q) => {
                  const who = q.customerId ? cusName[q.customerId] : q.leadId ? leadName[q.leadId] : undefined;
                  return (
                    <tr key={q.id}>
                      <td><b className="small">{q.code}</b></td>
                      <td className="small">{who || <span className="muted">— khách lẻ —</span>}</td>
                      <td className="small" style={{ textAlign: "right", fontWeight: 700 }}>{fmtVnd(quoteTotal(q))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Thư viện 12 combo mẫu — ảnh dựng sẵn lấy từ Google Drive qua API */}
      <div className="card mt">
        <div className="card-h">
          <h3 className="sec-title">Combo mẫu · 12 kịch bản</h3>
          <Link href="/fit" className="badge b-indigo">Chẩn đoán combo cho khách</Link>
        </div>
        <ComboGallery products={products} comboImages={comboImages} />
      </div>

      {/* Danh sách */}
      <div className="card mt">
        <div className="card-h"><h3 className="sec-title">Tất cả báo giá ({quotes.length})</h3></div>
        {sorted.length === 0 ? (
          <p className="muted small" style={{ padding: "16px 0" }}>
            Chưa có báo giá nào. {canManage && <Link href="/quote/new" className="badge b-indigo">Tạo báo giá đầu tiên</Link>}
          </p>
        ) : (
          <>
          <TableFilter
            targetId="quote-tbl"
            placeholder="Tìm mã, khách/lead…"
            filters={[{ key: "status", label: "Trạng thái", options: (Object.keys(QUOTE_STATUS_LABEL) as (keyof typeof QUOTE_STATUS_LABEL)[]).map((s) => ({ value: s, label: QUOTE_STATUS_LABEL[s] })) }]}
          />
          <table id="quote-tbl">
            <thead>
              <tr><th>Mã</th><th>Khách / Lead</th><th>Phương án</th><th>Trạng thái</th><th style={{ textAlign: "right" }}>Tổng tiền</th><th>Ngày tạo</th><th></th></tr>
            </thead>
            <tbody>
              {sorted.map((q) => {
                const who = q.customerId ? cusName[q.customerId] : q.leadId ? leadName[q.leadId] : undefined;
                return (
                  <tr key={q.id} data-status={q.status} data-search={`${q.code} ${who || ""} ${q.tier ? TIER_LABEL[q.tier] : ""}`}>
                    <td><b className="small">{q.code}</b></td>
                    <td className="small">{who || <span className="muted">— khách lẻ —</span>}</td>
                    <td className="small">{q.tier ? <span className="badge b-gray">{TIER_LABEL[q.tier]}</span> : "—"}</td>
                    <td><span className={`badge ${QUOTE_STATUS_BADGE[q.status]}`}>{QUOTE_STATUS_LABEL[q.status]}</span></td>
                    <td className="small" style={{ textAlign: "right", fontWeight: 700 }}>{fmtVnd(quoteTotal(q))}</td>
                    <td className="small muted">{fmtDate(q.createdAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/quote/${q.id}`} className="btn ghost" style={{ padding: "7px 12px" }}>Chi tiết</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </>
        )}
        {sorted[0] && <p className="muted small mt">Cập nhật lần cuối {fmtDate(sorted[0].updatedAt)}.</p>}
      </div>
    </div>
  );
}
