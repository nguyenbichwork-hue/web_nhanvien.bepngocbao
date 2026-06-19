import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { listAllProducts, listCustomers } from "@/lib/bnb/store";
import { haravanConfigured } from "@/lib/haravan/client";
import { POSTerminal } from "./pos-terminal";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  await requirePermission("order.manage");
  const [products, customers] = await Promise.all([listAllProducts(), listCustomers()]);

  const productLite = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    brand: p.brand,
    category: p.category,
    image: p.image,
    stock: p.stock,
    available: p.available,
  }));
  const customerLite = customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }));

  return (
    <div>
      <PageHero
        icon="wallet"
        title="POS quầy"
        subtitle="Bán nhanh tại quầy — chọn hàng, thu tiền, xuất đơn."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["POS quầy"]]}
        stats={[{ label: "Mặt hàng", value: productLite.length }]}
      />
      <POSTerminal products={productLite} customers={customerLite} canPushHaravan={haravanConfigured()} />
    </div>
  );
}
