import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import {
  getCustomer, listOrders, listWarranties, listNpsResponses,
  listLeads, listSurveys, listActivities, listCxJourneys, listReferrals,
} from "@/lib/bnb/store";
import { fmtVnd, fmtDate, fmtDateTime } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import {
  ORDER_STATUS_LABEL, ORDER_STATUS_BADGE,
  WARRANTY_STATUS_LABEL, WARRANTY_STATUS_BADGE,
  LEAD_STAGE_LABEL, LEAD_STAGE_BADGE, LEAD_SOURCE_LABEL,
  npsCategory, NPS_BADGE, NPS_CHANNEL_LABEL,
  ACTIVITY_LABEL,
  CX_JOURNEY_STAGES, CX_PHASE_LABEL, REFERRAL_STATUS_LABEL,
} from "@/lib/bnb/types";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("customer.read");
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const [allOrders, allWarranties, allNps, allLeads, allSurveys, allJourneys, allReferrals, activities, names] = await Promise.all([
    listOrders(), listWarranties(), listNpsResponses(), listLeads(), listSurveys(), listCxJourneys(), listReferrals(), listActivities(id), employeeNameMap(),
  ]);

  const orders = allOrders
    .filter((o) => o.customerId === id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const warranties = allWarranties.filter((w) => w.customerId === id);
  const nps = allNps.filter((r) => r.customerId === id);
  const leads = allLeads.filter((l) => l.customerId === id);
  const surveys = allSurveys.filter((s) => s.customerId === id);
  // Hành trình CX của khách: ưu tiên match theo customerId, dự phòng theo SĐT.
  const journey = allJourneys.find((j) => j.customerId === id)
    || (customer.phone ? allJourneys.find((j) => j.phone === customer.phone) : undefined);
  const journeyStage = journey ? CX_JOURNEY_STAGES.find((sg) => sg.key === journey.stage) : undefined;
  const journeyIdx = journey ? CX_JOURNEY_STAGES.findIndex((sg) => sg.key === journey.stage) : -1;
  // Referral liên quan: khách là người giới thiệu hoặc được giới thiệu.
  const refs = allReferrals.filter((r) =>
    r.referrerCustomerId === id
    || (customer.phone && (r.referrerPhone === customer.phone || r.refereePhone === customer.phone)));

  // KPI khách: doanh thu = Σ tổng đơn chưa huỷ; AOV = doanh thu / số đơn.
  const billable = orders.filter((o) => o.status !== "cancelled");
  const spent = billable.reduce((s, o) => s + (o.total || 0), 0) || customer.totalSpent || 0;
  const orderCount = billable.length || customer.orderCount || 0;
  const aov = orderCount ? Math.round(spent / orderCount) : 0;
  const latestNps = nps[0];

  return (
    <div>
      <PageHero
        icon="users"
        title={customer.name}
        subtitle={`${customer.phone || "—"}${customer.email ? ` · ${customer.email}` : ""}${customer.address ? ` · ${customer.address}` : ""}`}
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Khách hàng 360", "/customers"], [customer.code || customer.name]]}
        stats={[
          { label: "Tổng chi tiêu", value: fmtVnd(spent), tone: "up" },
          { label: "Số đơn", value: orderCount },
          { label: "AOV", value: fmtVnd(aov) },
        ]}
        actions={
          <>
            {customer.source && <span className="badge b-indigo" style={{ fontSize: 13, padding: "7px 14px" }}>{LEAD_SOURCE_LABEL[customer.source]}</span>}
            <Link href="/customers" className="btn ghost"><Icon name="chev" /> Quay lại</Link>
          </>
        }
      />

      {/* KPI khách */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="card kpi tone-t">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 22 }}>{fmtVnd(spent)}</div>
          <div className="lbl">Tổng chi tiêu</div>
        </div>
        <div className="card kpi tone-i">
          <div className="ic"><Icon name="cart" /></div>
          <div className="val">{orderCount}</div>
          <div className="lbl">Số đơn</div>
        </div>
        <div className="card kpi tone-a">
          <div className="ic"><Icon name="target" /></div>
          <div className="val" style={{ fontSize: 22 }}>{fmtVnd(aov)}</div>
          <div className="lbl">AOV (đ/đơn)</div>
        </div>
        <div className="card kpi tone-r">
          <div className="ic"><Icon name="award" /></div>
          <div className="val">{latestNps ? `${latestNps.score}/10` : "—"}</div>
          <div className="lbl">NPS gần nhất</div>
        </div>
      </div>

      {/* Hành trình CX của khách — một mạch xuyên các phân hệ */}
      <div className="card mt">
        <div className="card-h">
          <h3 className="sec-title">Hành trình CX</h3>
          {journeyStage ? (
            <Link href="/journey" className={`badge ${journeyStage.phase === "acquisition" ? "b-indigo" : journeyStage.phase === "success" ? "b-green" : "b-amber"}`}>
              Bước {journeyStage.no}/{CX_JOURNEY_STAGES.length}: {journeyStage.label} · {CX_PHASE_LABEL[journeyStage.phase]}
            </Link>
          ) : <Link href="/journey" className="badge b-gray">Chưa vào hành trình</Link>}
        </div>
        <div className="flex" style={{ gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
          {CX_JOURNEY_STAGES.map((sg, i) => (
            <span key={sg.key} title={sg.label}
              style={{
                flex: 1, minWidth: 16, height: 6, borderRadius: 3,
                background: journeyIdx >= 0 && i <= journeyIdx ? "var(--c-green)" : "var(--line)",
              }} />
          ))}
        </div>
        {/* Lối tắt liên thông sang mọi mắt xích của khách này */}
        <div className="flex gap" style={{ flexWrap: "wrap" }}>
          {leads[0] && <Link href={`/crm/${leads[0].id}`} className="btn ghost sm"><Icon name="customer" /> Lead nguồn</Link>}
          <Link href="/quote" className="btn ghost sm"><Icon name="quote" /> Báo giá</Link>
          {orders[0] && <Link href={`/orders/${orders[0].id}`} className="btn ghost sm"><Icon name="cart" /> Đơn mới nhất</Link>}
          <Link href="/delivery" className="btn ghost sm"><Icon name="truck" /> Giao-lắp</Link>
          <Link href="/warranty" className="btn ghost sm"><Icon name="warranty" /> Bảo hành</Link>
          <Link href="/referral" className="btn ghost sm"><Icon name="users" /> Giới thiệu</Link>
        </div>
        {refs.length > 0 && (
          <div className="flex gap aic small muted" style={{ flexWrap: "wrap", marginTop: 10 }}>
            <b style={{ color: "var(--tx)" }}>Giới thiệu:</b>
            {refs.map((r) => (
              <span key={r.id} className="badge b-gray">
                {r.referrerCustomerId === id ? "Đã giới thiệu" : "Được giới thiệu"} {r.refereeName || r.referrerName} · {REFERRAL_STATUS_LABEL[r.status]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid-k g-2 mt">
        {/* Cột trái: đơn hàng + bảo hành */}
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <div className="card-h"><h3 className="sec-title">Đơn hàng</h3><span className="badge b-gray">{orders.length}</span></div>
            {orders.length === 0 ? (
              <p className="muted small" style={{ padding: "14px 0" }}>Chưa có đơn hàng.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn</th><th>Trạng thái</th>
                    <th style={{ textAlign: "right" }}>Tổng</th>
                    <th style={{ textAlign: "right" }}>Đã thu</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/orders/${o.id}`} className="uname" style={{ color: "var(--accent)" }}>{o.code}</Link>
                        <div className="urole">{fmtDate(o.createdAt)}</div>
                      </td>
                      <td><span className={`badge ${ORDER_STATUS_BADGE[o.status]}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                      <td className="small" style={{ textAlign: "right", fontWeight: 600 }}>{fmtVnd(o.total)}</td>
                      <td className="small" style={{ textAlign: "right" }}>{fmtVnd(o.paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <div className="card-h"><h3 className="sec-title">Bảo hành & chăm sóc</h3><span className="badge b-gray">{warranties.length}</span></div>
            {warranties.length === 0 ? (
              <p className="muted small" style={{ padding: "14px 0" }}>Chưa có phiếu bảo hành.</p>
            ) : (
              <div style={{ display: "grid", gap: 0 }}>
                {warranties.map((w) => (
                  <div key={w.id} className="flex between aic" style={{ padding: "12px 0", borderTop: "1px solid var(--line)", gap: 12 }}>
                    <div>
                      <div className="uname">{w.productName || w.code}</div>
                      <div className="urole">
                        Lắp {fmtDate(w.installedAt)}
                        {w.nextCareAt ? ` · Mốc chăm kế: ${fmtDate(w.nextCareAt)}` : ""}
                      </div>
                    </div>
                    <span className={`badge ${WARRANTY_STATUS_BADGE[w.status]}`}>{WARRANTY_STATUS_LABEL[w.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lead & khảo sát liên quan */}
          {(leads.length > 0 || surveys.length > 0) && (
            <div className="card">
              <div className="card-h"><h3 className="sec-title">Lead & khảo sát</h3></div>
              <div style={{ display: "grid", gap: 0 }}>
                {leads.map((l) => (
                  <Link key={l.id} href={`/crm/${l.id}`} className="flex between aic" style={{ padding: "12px 0", borderTop: "1px solid var(--line)", gap: 12, color: "inherit" }}>
                    <div>
                      <div className="uname" style={{ color: "var(--accent)" }}>{l.code} · {LEAD_SOURCE_LABEL[l.source]}</div>
                      <div className="urole">{l.need || "—"}</div>
                    </div>
                    <span className={`badge ${LEAD_STAGE_BADGE[l.stage]}`}>{LEAD_STAGE_LABEL[l.stage]}</span>
                  </Link>
                ))}
                {surveys.map((s) => (
                  <div key={s.id} className="flex between aic" style={{ padding: "12px 0", borderTop: "1px solid var(--line)", gap: 12 }}>
                    <div>
                      <div className="uname">Khảo sát {s.code}</div>
                      <div className="urole">{s.address || s.needs || "—"}</div>
                    </div>
                    <span className="small muted">{fmtDate(s.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cột phải: NPS + timeline */}
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <div className="card-h"><h3 className="sec-title">Phản hồi NPS</h3><span className="badge b-gray">{nps.length}</span></div>
            {nps.length === 0 ? (
              <p className="muted small" style={{ padding: "14px 0" }}>Chưa có phản hồi NPS.</p>
            ) : (
              <div style={{ display: "grid", gap: 0 }}>
                {nps.map((r) => (
                  <div key={r.id} style={{ padding: "12px 0", borderTop: "1px solid var(--line)" }}>
                    <div className="flex between aic">
                      <span className={`badge ${NPS_BADGE[npsCategory(r.score)]}`}>{r.score}/10</span>
                      <span className="urole">{r.channel ? NPS_CHANNEL_LABEL[r.channel] : "—"} · {fmtDateTime(r.createdAt)}</span>
                    </div>
                    {r.comment && <p className="small muted mt">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-h"><h3 className="sec-title">Lịch sử hoạt động</h3><span className="badge b-gray">{activities.length}</span></div>
            {activities.length === 0 ? (
              <p className="muted small" style={{ padding: "14px 0" }}>Chưa có hoạt động.</p>
            ) : (
              <div style={{ display: "grid", gap: 0 }}>
                {activities.map((a) => (
                  <div key={a.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: "1px solid var(--line)" }}>
                    <div className="ic" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--c-indigo-soft)", color: "var(--c-indigo)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon name="chat" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="flex between aic">
                        <b className="small">{ACTIVITY_LABEL[a.type]}</b>
                        <span className="urole">{fmtDateTime(a.at)}</span>
                      </div>
                      <p className="small muted">{a.content}{a.byId ? ` — ${names[a.byId] || ""}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
