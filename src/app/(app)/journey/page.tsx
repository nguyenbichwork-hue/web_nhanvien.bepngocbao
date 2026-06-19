import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { listCxJourneys, listLeads, listOrders } from "@/lib/bnb/store";
import { employeeNameMap } from "@/lib/bnb/names";
import { compactVnd, orderRemaining } from "@/lib/bnb/util";
import { JourneyBoard } from "./journey-board";

export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  await requirePermission("lead.read");
  const [journeys, names, leads, orders] = await Promise.all([
    listCxJourneys(), employeeNameMap(), listLeads(), listOrders(),
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
  return (
    <div>
      <PageHero
        icon="award"
        title="Hành trình khách hàng (CX OS)"
        subtitle="Mỗi khách ở bước nào · ai phụ trách · vướng gì · cần follow-up · sẵn sàng giới thiệu — Visible · Measurable · Improving."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Hành trình CX"]]}
      />
      <JourneyBoard journeys={journeys} owners={owners} ops={ops} />
    </div>
  );
}
