import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { listReceptionLogs } from "@/lib/bnb/store";
import { ReceptionApp } from "./reception-app";

export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  await requirePermission("lead.read");
  const logs = await listReceptionLogs();
  return (
    <div>
      <PageHero
        icon="doc"
        title="Nhật ký tiếp khách"
        subtitle="Ghi lượt tiếp khách tại showroom kèm hành trình khách hàng — dùng chung toàn team (lưu Supabase)."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Nhật ký tiếp khách"]]}
      />
      <ReceptionApp logs={logs} />
    </div>
  );
}
