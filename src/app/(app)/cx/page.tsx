import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { DonutChart } from "@/components/charts/rich";
import {
  listLeads, listSurveys, listQuotes, listOrders, listDeliveries,
  listWarranties, listCustomers, listNpsResponses,
} from "@/lib/bnb/store";
import { computeJourneyFunnel, computeNps } from "@/lib/bnb/cx";
import { fmtDateTime } from "@/lib/bnb/util";
import {
  npsCategory, NPS_BADGE, NPS_LABEL, NPS_CHANNEL_LABEL, type NpsChannel,
} from "@/lib/bnb/types";
import { recordNpsAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CxPage() {
  const session = await requirePermission("cx.read");
  const canManage = session.permissions.has("cx.manage");
  const [leads, surveys, quotes, orders, deliveries, warranties, customers, nps] = await Promise.all([
    listLeads(), listSurveys(), listQuotes(), listOrders(), listDeliveries(),
    listWarranties(), listCustomers(), listNpsResponses(),
  ]);

  const funnel = computeJourneyFunnel({ leads, surveys, quotes, orders, deliveries, warranties, customers });
  const maxCount = Math.max(1, ...funnel.map((f) => f.count));
  const stat = computeNps(nps);
  const pct = (n: number) => (stat.total ? Math.round((n / stat.total) * 100) : 0);

  // Cơ cấu NPS (donut): khuyến nghị / trung lập / không hài lòng.
  const npsMix = [
    { name: "Khuyến nghị", value: stat.promoters, color: "#0e9d6e" },
    { name: "Trung lập", value: stat.passives, color: "#d98309" },
    { name: "Không hài lòng", value: stat.detractors, color: "#e23b54" },
  ].filter((x) => x.value > 0);

  return (
    <div>
      <PageHero
        icon="award"
        title="CX · Hành trình & NPS"
        subtitle="Theo dõi trải nghiệm khách hàng qua 12 bước và đo lường mức độ hài lòng (NPS)."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["CX · Hành trình & NPS"]]}
        stats={[
          { label: "Chỉ số NPS", value: `${stat.score >= 0 ? "+" : ""}${stat.score}`, tone: stat.score >= 0 ? "up" : "down" },
          { label: "Phản hồi", value: stat.total },
          { label: "Khuyến nghị", value: `${pct(stat.promoters)}%`, tone: "up" },
        ]}
      />

      {/* Hành trình 12 bước */}
      <div className="card hover">
        <div className="card-h"><h3 className="sec-title">Hành trình khách hàng · 12 bước</h3><span className="badge b-indigo">Customer Journey</span></div>
        <div style={{ display: "grid", gap: 10 }}>
          {funnel.map(({ stage, count }, i) => (
            <div key={stage.key} style={{ display: "grid", gridTemplateColumns: "28px minmax(120px,22%) 1fr auto", alignItems: "center", gap: 12 }}>
              <div className="ic" style={{ width: 28, height: 28, borderRadius: 8, background: "var(--c-indigo-soft)", color: "var(--c-indigo)", display: "grid", placeItems: "center" }}>
                <Icon name={stage.icon} />
              </div>
              <div>
                <div className="small" style={{ fontWeight: 700 }}>{i + 1}. {stage.label}</div>
                <div className="urole">{stage.desc}</div>
              </div>
              <div className="bar"><i style={{ width: `${(count / maxCount) * 100}%`, background: "var(--brand-grad)" }} /></div>
              <b className="small" style={{ minWidth: 34, textAlign: "right" }}>{count}</b>
            </div>
          ))}
        </div>
      </div>

      {/* NPS */}
      <div className="grid-k g-4 stagger mt">
        <div className="card kpi grad hover gr-crimson">
          <div className="ic"><Icon name="award" /></div>
          <div className="val">
            {stat.score >= 0 ? "+" : ""}<CountUp to={stat.score} />
          </div>
          <div className="lbl">Chỉ số NPS</div>
        </div>
        <div className="card kpi grad hover gr-mint">
          <div className="ic"><Icon name="check" /></div>
          <div className="val"><CountUp to={pct(stat.promoters)} />%</div>
          <div className="lbl">Khuyến nghị ({stat.promoters})</div>
        </div>
        <div className="card kpi grad hover gr-sunny">
          <div className="ic"><Icon name="user" /></div>
          <div className="val"><CountUp to={pct(stat.passives)} />%</div>
          <div className="lbl">Trung lập ({stat.passives})</div>
        </div>
        <div className="card kpi grad hover gr-malinka">
          <div className="ic"><Icon name="x" /></div>
          <div className="val"><CountUp to={pct(stat.detractors)} />%</div>
          <div className="lbl">Không hài lòng ({stat.detractors})</div>
        </div>
      </div>

      {/* Cơ cấu NPS (donut) */}
      <div className="card mt hover">
        <div className="card-h"><h3 className="sec-title">Cơ cấu phản hồi NPS</h3><span className="badge b-gray">{stat.total}</span></div>
        {npsMix.length === 0 ? (
          <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Chưa có phản hồi NPS.</p>
        ) : (
          <DonutChart data={npsMix} height={260} centerValue={stat.total} centerLabel="phản hồi" unit=" phản hồi" />
        )}
      </div>

      <div className="grid-k g-2 mt">
        {/* Phản hồi gần đây */}
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Phản hồi NPS gần đây</h3><span className="badge b-gray">{stat.total}</span></div>
          {nps.length === 0 ? (
            <p className="muted small" style={{ padding: "14px 0" }}>Chưa có phản hồi.</p>
          ) : (
            <table>
              <thead><tr><th>Khách hàng</th><th>Điểm</th><th>Kênh</th><th>Thời gian</th></tr></thead>
              <tbody>
                {nps.map((r) => {
                  const cat = npsCategory(r.score);
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="uname">{r.customerName}</div>
                        {r.comment && <div className="urole">{r.comment}</div>}
                      </td>
                      <td><span className={`badge ${NPS_BADGE[cat]}`}>{r.score}/10</span></td>
                      <td className="small muted">{r.channel ? NPS_CHANNEL_LABEL[r.channel] : "—"}</td>
                      <td className="small muted">{fmtDateTime(r.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="legend mt" style={{ flexWrap: "wrap" }}>
            {(["promoter", "passive", "detractor"] as const).map((c) => (
              <span key={c} className={`badge ${NPS_BADGE[c]}`}>{NPS_LABEL[c]}</span>
            ))}
          </div>
        </div>

        {/* Ghi nhận NPS */}
        {canManage && (
          <div className="card hover">
            <div className="card-h"><h3 className="sec-title">Ghi nhận phản hồi NPS</h3></div>
            <form action={recordNpsAction} style={{ display: "grid", gap: 12 }}>
              <div className="field" style={{ margin: 0 }}><label>Khách hàng *</label><input name="customerName" required placeholder="Tên khách hàng" /></div>
              <div className="field" style={{ margin: 0 }}>
                <label>Điểm (0–10) *</label>
                <select name="score" defaultValue="10" required>
                  {Array.from({ length: 11 }, (_, i) => 10 - i).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Kênh</label>
                <select name="channel" defaultValue="zalo">
                  {(Object.keys(NPS_CHANNEL_LABEL) as NpsChannel[]).map((c) => <option key={c} value={c}>{NPS_CHANNEL_LABEL[c]}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}><label>Nhận xét</label><textarea name="comment" placeholder="Ý kiến của khách..." /></div>
              <button type="submit" className="btn primary"><Icon name="plus" /> Ghi nhận</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
