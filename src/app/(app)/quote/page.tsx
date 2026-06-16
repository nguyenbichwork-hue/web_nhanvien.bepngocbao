import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { listQuotes, listCustomers, listLeads } from "@/lib/bnb/store";
import { fmtVnd, fmtDate, quoteTotal } from "@/lib/bnb/util";
import {
  QUOTE_STATUS_LABEL, QUOTE_STATUS_BADGE, TIER_LABEL,
} from "@/lib/bnb/types";

export const dynamic = "force-dynamic";

export default async function QuotePage() {
  const session = await requirePermission("quote.read");
  const canManage = session.permissions.has("quote.manage");
  const [quotes, customers, leads] = await Promise.all([
    listQuotes(), listCustomers(), listLeads(),
  ]);

  const cusName: Record<string, string> = {};
  for (const c of customers) cusName[c.id] = c.name;
  const leadName: Record<string, string> = {};
  for (const l of leads) leadName[l.id] = l.name;

  const sorted = [...quotes].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const count = (st: string) => quotes.filter((q) => q.status === st).length;

  const kpis = [
    { st: "draft", label: "Nháp", tone: "tone-i" as const, icon: "doc" },
    { st: "sent", label: "Đã gửi", tone: "tone-a" as const, icon: "quote" },
    { st: "accepted", label: "Đã chốt", tone: "tone-t" as const, icon: "check" },
  ];

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Báo giá</div>
      <div className="page-head">
        <div>
          <h1>Tư vấn & Báo giá</h1>
          <p>Soạn báo giá nhiều phương án (cơ bản · cân bằng · cao cấp), gửi khách & chốt đơn.</p>
        </div>
        {canManage && (
          <Link href="/quote/new" className="btn primary"><Icon name="plus" /> Tạo báo giá</Link>
        )}
      </div>

      {/* KPI */}
      <div className="grid-k g-3 stagger">
        {kpis.map((k) => (
          <div key={k.st} className={`card kpi hover ${k.tone}`}>
            <div className="ic"><Icon name={k.icon} /></div>
            <div className="val">{count(k.st)}</div>
            <div className="lbl">báo giá {k.label.toLowerCase()}</div>
          </div>
        ))}
      </div>

      {/* Danh sách */}
      <div className="card mt">
        <div className="card-h"><h3>Tất cả báo giá ({quotes.length})</h3></div>
        {sorted.length === 0 ? (
          <p className="muted small" style={{ padding: "16px 0" }}>
            Chưa có báo giá nào. {canManage && <Link href="/quote/new" className="badge b-indigo">Tạo báo giá đầu tiên</Link>}
          </p>
        ) : (
          <table>
            <thead>
              <tr><th>Mã</th><th>Khách / Lead</th><th>Phương án</th><th>Trạng thái</th><th style={{ textAlign: "right" }}>Tổng tiền</th><th>Ngày tạo</th><th></th></tr>
            </thead>
            <tbody>
              {sorted.map((q) => {
                const who = q.customerId ? cusName[q.customerId] : q.leadId ? leadName[q.leadId] : undefined;
                return (
                  <tr key={q.id}>
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
        )}
        {sorted[0] && <p className="muted small mt">Cập nhật lần cuối {fmtDate(sorted[0].updatedAt)}.</p>}
      </div>
    </div>
  );
}
