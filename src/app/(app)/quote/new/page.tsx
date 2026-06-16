import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { listProducts, listCustomers, listLeads } from "@/lib/bnb/store";
import { QuoteBuilder } from "../quote-builder";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  await requirePermission("quote.manage");
  const [products, customers, leads] = await Promise.all([
    listProducts(), listCustomers(), listLeads(),
  ]);

  return (
    <div className="view-in">
      <div className="crumbs">
        <Link href="/quote">Báo giá</Link> <Icon name="chev" /> Tạo báo giá
      </div>
      <div className="page-head">
        <div>
          <h1>Tạo báo giá mới</h1>
          <p>Chọn khách, thêm sản phẩm và xem thành tiền cập nhật ngay.</p>
        </div>
      </div>

      <QuoteBuilder
        products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price, brand: p.brand }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
        leads={leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone }))}
      />
    </div>
  );
}
