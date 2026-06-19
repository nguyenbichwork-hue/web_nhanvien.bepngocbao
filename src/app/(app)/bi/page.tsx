import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp, HBars, ProgressBar } from "@/components/charts";
import { AreaTrend } from "@/components/charts/rich";
import {
  listOrders, listLeads, listNpsResponses, listAdCampaigns, listBankTxns, costBySku,
} from "@/lib/bnb/store";
import { fmtVnd, compactVnd } from "@/lib/bnb/util";
import {
  LEAD_STAGES, LEAD_STAGE_LABEL,
  MKT_CHANNEL_LABEL, MKT_CHANNELS,
  npsCategory, NPS_LABEL, NPS_BADGE,
  type LeadStage,
} from "@/lib/bnb/types";

export const dynamic = "force-dynamic";

const STAGE_COLOR: Record<LeadStage, string> = {
  new: "var(--c-sky)", consulting: "var(--c-indigo)", quoted: "var(--c-amber)",
  won: "var(--c-teal)", lost: "var(--c-rose)",
};
const VI_MONTH = (d: Date) => `T${d.getMonth() + 1}`;

export default async function BIPage() {
  await requirePermission("bizdash.read");
  const [orders, leads, nps, ads, txns, costMap] = await Promise.all([
    listOrders(), listLeads(), listNpsResponses(), listAdCampaigns(), listBankTxns(), costBySku(),
  ]);

  const now = new Date();
  const billable = orders.filter((o) => o.status !== "cancelled");

  /* ---- KPI ---- */
  const revenue = orders.reduce((s, o) => s + (o.paid || 0), 0);
  const gmv = billable.reduce((s, o) => s + (o.total || 0), 0);
  // Lãi gộp ước tính = doanh số − giá vốn (theo sku trong PO). Dòng thiếu sku/giá vốn → COGS 0.
  const cogs = billable.reduce((s, o) =>
    s + o.lines.reduce((a, l) => a + (l.sku && costMap[l.sku] ? costMap[l.sku] * l.qty : 0), 0), 0);
  const grossProfit = Math.max(0, gmv - cogs);
  const marginPct = gmv ? Math.round((grossProfit / gmv) * 100) : 0;
  const receivable = orders
    .filter((o) => !["completed", "cancelled"].includes(o.status))
    .reduce((s, o) => s + Math.max(0, (o.total || 0) - (o.paid || 0)), 0);
  const aov = billable.length ? Math.round(gmv / billable.length) : 0;

  const wonCount = leads.filter((l) => l.stage === "won").length;
  const convRate = leads.length ? Math.round((wonCount / leads.length) * 100) : 0;

  // NPS = %promoter − %detractor.
  const npsTotal = nps.length;
  const prom = nps.filter((r) => npsCategory(r.score) === "promoter").length;
  const det = nps.filter((r) => npsCategory(r.score) === "detractor").length;
  const npsScore = npsTotal ? Math.round(((prom - det) / npsTotal) * 100) : 0;

  /* ---- Doanh thu 6 tháng ---- */
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: VI_MONTH(d) });
  }
  const revByMonth = months.map((m) => {
    const sum = orders.reduce((s, o) => {
      const ps = (o.payments || []).filter((p) => (p.at || "").slice(0, 7) === m.key);
      return s + ps.reduce((a, p) => a + (p.amount || 0), 0);
    }, 0);
    return { label: m.label, value: sum };
  });
  const maxRev = Math.max(1, ...revByMonth.map((d) => d.value));

  /* ---- Phễu lead ---- */
  const funnel = LEAD_STAGES.map((st) => ({
    label: LEAD_STAGE_LABEL[st],
    count: leads.filter((l) => l.stage === st).length,
    color: STAGE_COLOR[st],
  }));

  /* ---- Hiệu quả Ads theo kênh (CPL) ---- */
  const channelRoi = MKT_CHANNELS.map((ch) => {
    const cs = ads.filter((a) => a.channel === ch);
    const spend = cs.reduce((s, a) => s + (a.spend || 0), 0);
    const adLeads = cs.reduce((s, a) => s + (a.leads || 0), 0);
    return { ch, spend, leads: adLeads, cpl: adLeads ? Math.round(spend / adLeads) : 0 };
  }).filter((x) => x.spend > 0 || x.leads > 0);
  const totalSpend = channelRoi.reduce((s, x) => s + x.spend, 0);
  const totalAdLeads = channelRoi.reduce((s, x) => s + x.leads, 0);
  const blendedCpl = totalAdLeads ? Math.round(totalSpend / totalAdLeads) : 0;

  /* ---- Top sản phẩm theo doanh số (gộp theo tên dòng) ---- */
  const prodMap: Record<string, number> = {};
  for (const o of billable) for (const l of o.lines) prodMap[l.name] = (prodMap[l.name] || 0) + l.unitPrice * l.qty;
  const topProducts = Object.entries(prodMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, val]) => ({ label: name.length > 28 ? name.slice(0, 27) + "…" : name, count: Math.round(val / 1_000_000), color: "var(--c-indigo)" }));

  /* ---- Tuổi nợ công nợ (AR aging) ---- */
  const arOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status) && (o.total || 0) - (o.paid || 0) > 0);
  const buckets = [
    { label: "0–7 ngày", max: 7, sum: 0 },
    { label: "8–30 ngày", max: 30, sum: 0 },
    { label: "31–60 ngày", max: 60, sum: 0 },
    { label: "60+ ngày", max: Infinity, sum: 0 },
  ];
  for (const o of arOrders) {
    const due = Math.max(0, (o.total || 0) - (o.paid || 0));
    const age = Math.floor((now.getTime() - new Date(o.createdAt).getTime()) / 86400000);
    (buckets.find((b) => age <= b.max) || buckets[3]).sum += due;
  }
  const arData = buckets.map((b, i) => ({
    label: b.label, count: Math.round(b.sum / 1_000_000),
    color: i < 2 ? "var(--c-teal)" : i === 2 ? "var(--c-amber)" : "var(--c-rose)",
  }));

  // Dòng tiền vào/ra (đối soát ngân hàng).
  const cashIn = txns.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
  const cashOut = txns.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <PageHero
        icon="chart"
        title="BI · Phân tích kinh doanh"
        subtitle="Bức tranh đa phân hệ: doanh thu, lãi gộp, phễu, hiệu quả marketing, NPS và công nợ — chỉ đọc."
        crumb={[["Trang chủ", "/dashboard"], ["Quản trị"], ["BI · Phân tích"]]}
        stats={[
          { label: "Doanh thu", value: compactVnd(revenue), tone: "up" },
          { label: "Lãi gộp", value: compactVnd(grossProfit) },
          { label: "Biên lãi", value: `${marginPct}%` },
          { label: "NPS", value: npsScore, tone: npsScore >= 0 ? "up" : "down" },
        ]}
      />

      {/* KPI */}
      <div className="grid-k stagger" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        <div className="card kpi hover tone-t"><div className="ic"><Icon name="wallet" /></div><div className="val" style={{ fontSize: 22 }}><CountUp to={revenue} /></div><div className="lbl">Doanh thu đã thu (đ)</div></div>
        <div className="card kpi hover tone-accent"><div className="ic"><Icon name="chart" /></div><div className="val" style={{ fontSize: 22 }}><CountUp to={grossProfit} /></div><div className="lbl">Lãi gộp ước tính (đ)</div></div>
        <div className="card kpi hover tone-a"><div className="ic"><Icon name="target" /></div><div className="val"><CountUp to={marginPct} />%</div><div className="lbl">Biên lãi gộp</div></div>
        <div className="card kpi hover tone-accent"><div className="ic"><Icon name="cart" /></div><div className="val" style={{ fontSize: 22 }}><CountUp to={aov} /></div><div className="lbl">AOV · đơn TB (đ)</div></div>
        <div className="card kpi hover tone-t"><div className="ic"><Icon name="award" /></div><div className="val"><CountUp to={npsScore} /></div><div className="lbl">NPS ({npsTotal} phản hồi)</div></div>
        <div className="card kpi hover tone-r"><div className="ic"><Icon name="alert" /></div><div className="val" style={{ fontSize: 22 }}><CountUp to={receivable} /></div><div className="lbl">Công nợ phải thu (đ)</div></div>
      </div>

      {/* Doanh thu 6 tháng + Phễu */}
      <div className="grid-k g-2 mt">
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Doanh thu thu được · 6 tháng</h3><span className="badge b-green">{fmtVnd(revByMonth.reduce((s, d) => s + d.value, 0))}</span></div>
          <AreaTrend data={revByMonth} money height={250} name="Đã thu" />
          <p className="muted small mt">Tháng cao nhất: {fmtVnd(maxRev)}. Tỷ lệ chốt lead: {convRate}%.</p>
        </div>
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Phễu lead theo trạng thái</h3><Link href="/crm" className="badge b-indigo">CRM</Link></div>
          <HBars data={funnel} />
        </div>
      </div>

      {/* Marketing ROI + Top sản phẩm */}
      <div className="grid-k g-2 mt">
        <div className="card">
          <div className="card-h"><h3>Hiệu quả marketing theo kênh</h3><Link href="/marketing" className="badge b-indigo">Marketing</Link></div>
          {channelRoi.length === 0 ? (
            <p className="muted small" style={{ padding: "14px 0" }}>Chưa có dữ liệu chiến dịch.</p>
          ) : (
            <table>
              <thead><tr><th>Kênh</th><th style={{ textAlign: "right" }}>Chi phí</th><th style={{ textAlign: "right" }}>Lead</th><th style={{ textAlign: "right" }}>CPL</th></tr></thead>
              <tbody>
                {channelRoi.map((x) => (
                  <tr key={x.ch}>
                    <td className="small"><b>{MKT_CHANNEL_LABEL[x.ch]}</b></td>
                    <td className="small muted" style={{ textAlign: "right" }}>{fmtVnd(x.spend)}</td>
                    <td className="small" style={{ textAlign: "right" }}>{x.leads}</td>
                    <td className="small" style={{ textAlign: "right" }}><b>{fmtVnd(x.cpl)}</b></td>
                  </tr>
                ))}
                <tr>
                  <td className="small"><b>Tổng / CPL hợp nhất</b></td>
                  <td className="small" style={{ textAlign: "right" }}><b>{fmtVnd(totalSpend)}</b></td>
                  <td className="small" style={{ textAlign: "right" }}><b>{totalAdLeads}</b></td>
                  <td className="small" style={{ textAlign: "right" }}><b>{fmtVnd(blendedCpl)}</b></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div className="card-h"><h3>Top sản phẩm theo doanh số</h3><span className="badge b-gray">triệu đ</span></div>
          <HBars data={topProducts} unit=" tr" />
        </div>
      </div>

      {/* NPS + AR aging + dòng tiền */}
      <div className="grid-k g-3 mt">
        <div className="card">
          <div className="card-h"><h3>Cơ cấu NPS</h3><Link href="/cx" className="badge b-indigo">CX</Link></div>
          {npsTotal === 0 ? <p className="muted small" style={{ padding: "14px 0" }}>Chưa có phản hồi.</p> : (
            <div style={{ display: "grid", gap: 12 }}>
              {(["promoter", "passive", "detractor"] as const).map((cat) => {
                const n = nps.filter((r) => npsCategory(r.score) === cat).length;
                return (
                  <div key={cat} style={{ display: "grid", gridTemplateColumns: "minmax(120px,40%) 1fr auto", alignItems: "center", gap: 10 }}>
                    <span className={`badge ${NPS_BADGE[cat]}`} style={{ justifySelf: "start" }}>{NPS_LABEL[cat]}</span>
                    <ProgressBar value={(n / npsTotal) * 100} color="var(--brand-grad)" />
                    <b className="small" style={{ minWidth: 24, textAlign: "right" }}>{n}</b>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-h"><h3>Tuổi nợ công nợ (triệu đ)</h3><Link href="/finance" className="badge b-amber">Tài chính</Link></div>
          <HBars data={arData} unit=" tr" />
        </div>
        <div className="card">
          <div className="card-h"><h3>Dòng tiền (đối soát NH)</h3><Link href="/finance" className="badge b-indigo">Chi tiết</Link></div>
          <div style={{ display: "grid", gap: 14, paddingTop: 6 }}>
            <div><div className="lbl">Tiền vào</div><div className="val" style={{ fontSize: 22, color: "var(--c-teal)" }}>{fmtVnd(cashIn)}</div></div>
            <div><div className="lbl">Tiền ra</div><div className="val" style={{ fontSize: 22, color: "var(--c-rose)" }}>{fmtVnd(cashOut)}</div></div>
            <div><div className="lbl">Ròng</div><div className="val" style={{ fontSize: 22 }}>{fmtVnd(cashIn - cashOut)}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
