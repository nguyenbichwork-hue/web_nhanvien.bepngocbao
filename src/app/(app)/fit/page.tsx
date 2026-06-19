import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { listProducts } from "@/lib/bnb/store";
import FitWizard from "./wizard";

export const dynamic = "force-dynamic";

export default async function FitPage() {
  await requirePermission("fit.read");
  const products = await listProducts();

  return (
    <div>
      <PageHero
        icon="fit"
        title="Fit Diagnostic"
        subtitle="Chẩn đoán nhu cầu bếp và đề xuất phương án phù hợp."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Fit Diagnostic"]]}
        stats={[{ label: "Sản phẩm có thể đề xuất", value: products.length }]}
      />

      <FitWizard products={products} />
    </div>
  );
}
