import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { listCxJourneys } from "@/lib/bnb/store";
import { employeeNameMap } from "@/lib/bnb/names";
import { JourneyBoard } from "./journey-board";

export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  await requirePermission("lead.read");
  const [journeys, names] = await Promise.all([listCxJourneys(), employeeNameMap()]);
  const owners = Object.entries(names).map(([id, name]) => ({ id, name }));
  return (
    <div>
      <PageHero
        icon="award"
        title="Hành trình khách hàng (CX OS)"
        subtitle="Mỗi khách ở bước nào · ai phụ trách · vướng gì · cần follow-up · sẵn sàng giới thiệu — Visible · Measurable · Improving."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Hành trình CX"]]}
      />
      <JourneyBoard journeys={journeys} owners={owners} />
    </div>
  );
}
