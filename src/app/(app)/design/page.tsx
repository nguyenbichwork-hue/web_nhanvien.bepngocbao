import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { listProducts } from "@/lib/bnb/store";
import { FIT_SCENARIOS } from "@/lib/bnb/fit";
import Designer from "./designer";

export const dynamic = "force-dynamic";

export default async function DesignPage() {
  await requirePermission("design.read");
  const products = await listProducts();

  // Rút gọn scenario (id/name/desc + sku theo tier) để client gợi ý thiết bị.
  const scenarios = FIT_SCENARIOS.map((s) => ({
    id: s.id,
    name: s.name,
    desc: s.desc,
    tiers: {
      basic: s.tiers.basic.skus,
      balanced: s.tiers.balanced.skus,
      premium: s.tiers.premium.skus,
    },
  }));

  return (
    <div>
      <PageHero
        icon="sparkle"
        title="Thiết kế bếp AI"
        subtitle="Chọn bố cục, phong cách, phân tầng và tông màu — hệ thống dựng phối cảnh căn bếp bằng AI kèm gợi ý thiết bị phù hợp."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Thiết kế bếp AI"]]}
      />

      <Designer products={products} scenarios={scenarios} />
    </div>
  );
}
