import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { listProducts, listCustomers } from "@/lib/bnb/store";
import { haravanConfigured } from "@/lib/haravan/client";
import { POSTerminal } from "./pos-terminal";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  await requirePermission("order.manage");
  const [products, customers] = await Promise.all([listProducts(), listCustomers()]);

  const productLite = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.price,
    brand: p.brand,
    image: p.image,
  }));
  const customerLite = customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }));

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> POS quầy</div>
      <div className="page-head">
        <div>
          <h1>POS quầy</h1>
          <p>Bán nhanh tại quầy — chọn hàng, thu tiền, xuất đơn.</p>
        </div>
      </div>
      <POSTerminal products={productLite} customers={customerLite} canPushHaravan={haravanConfigured()} />
    </div>
  );
}
