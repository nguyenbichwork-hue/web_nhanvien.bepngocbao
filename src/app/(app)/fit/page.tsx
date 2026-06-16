import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { listProducts } from "@/lib/bnb/store";
import FitWizard from "./wizard";

export const dynamic = "force-dynamic";

export default async function FitPage() {
  await requirePermission("fit.read");
  const products = await listProducts();

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Fit Diagnostic
      </div>
      <div className="page-head">
        <div>
          <h1>Fit Diagnostic</h1>
          <p>Chẩn đoán nhu cầu bếp và đề xuất phương án phù hợp.</p>
        </div>
      </div>

      <FitWizard products={products} />
    </div>
  );
}
