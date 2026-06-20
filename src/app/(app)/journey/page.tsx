import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { listCxJourneys, listLeads, listOrders, listNpsResponses, listDeliveries } from "@/lib/bnb/store";
import { employeeNameMap } from "@/lib/bnb/names";
import { computeNps } from "@/lib/bnb/cx";
import { compactVnd, orderRemaining } from "@/lib/bnb/util";
import { JourneyBoard } from "./journey-board";

export const dynamic = "force-dynamic";

const HOUR = 3600000;

export default async function JourneyPage() {
  await requirePermission("lead.read");
  const [journeys, names, leads, orders, nps, deliveries] = await Promise.all([
    listCxJourneys(), employeeNameMap(), listLeads(), listOrders(), listNpsResponses(), listDeliveries(),
  ]);
  const owners = Object.entries(names).map(([id, name]) => ({ id, name }));

  // Chỉ số vận hành (trả lời "tháng này BNB ra sao" < 60s).
  const billable = orders.filter((o) => o.status !== "cancelled");
  const won = leads.filter((l) => l.stage === "won").length;
  const ops = {
    leads: leads.length,
    conv: leads.length ? Math.round((won / leads.length) * 100) : 0,
    revenue: compactVnd(orders.reduce((s, o) => s + (o.paid || 0), 0)),
    pipeline: compactVnd(orders.filter((o) => !["completed", "cancelled"].includes(o.status)).reduce((s, o) => s + orderRemaining(o), 0)),
    aov: compactVnd(billable.length ? Math.round(billable.reduce((s, o) => s + (o.total || 0), 0) / billable.length) : 0),
  };

  // North Star THẬT = % khách trả lời "sẽ giới thiệu" (promoter NPS ≥ 9).
  const npsStat = computeNps(nps);
  const recommendPct = npsStat.total ? Math.round((npsStat.promoters / npsStat.total) * 100) : 0;
  const csatAvg = nps.length ? (nps.reduce((s, r) => s + r.score, 0) / nps.length) : 0;

  // KPI Success (đo từ dữ liệu thật theo handbook).
  const confirmedOrders = orders.filter((o) => o.confirmedAt);
  const confirm2h = confirmedOrders.length
    ? Math.round(confirmedOrders.filter((o) => new Date(o.confirmedAt!).getTime() - new Date(o.createdAt).getTime() <= 2 * HOUR).length / confirmedOrders.length * 100)
    : 0;
  const doneDeliv = deliveries.filter((d) => d.status === "done" && d.doneAt && d.scheduledAt);
  const install48h = doneDeliv.length
    ? Math.round(doneDeliv.filter((d) => new Date(d.doneAt!).getTime() - new Date(d.scheduledAt).getTime() <= 48 * HOUR).length / doneDeliv.length * 100)
    : 0;
  const north = {
    recommendPct, npsScore: npsStat.score, npsTotal: npsStat.total,
    csatAvg: Math.round(csatAvg * 10) / 10,
    confirm2h, confirm2hBase: confirmedOrders.length,
    install48h, install48hBase: doneDeliv.length,
  };
  return (
    <div>
      <PageHero
        icon="award"
        title="Hành trình khách hàng (CX OS)"
        subtitle="Mỗi khách ở bước nào · ai phụ trách · vướng gì · cần follow-up · sẵn sàng giới thiệu — Visible · Measurable · Improving."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Hành trình CX"]]}
      />
      <JourneyBoard journeys={journeys} owners={owners} ops={ops} north={north} />
    </div>
  );
}
