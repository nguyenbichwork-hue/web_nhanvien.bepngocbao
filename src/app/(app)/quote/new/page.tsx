import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { listProducts, listCustomers, listLeads } from "@/lib/bnb/store";
import { QuoteBuilder } from "../quote-builder";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  await requirePermission("quote.manage");
  const [products, customers, leads] = await Promise.all([
    listProducts(), listCustomers(), listLeads(),
  ]);

  return (
    <div>
      <PageHero
        icon="quote"
        title="Tạo báo giá mới"
        subtitle="Chọn khách, thêm sản phẩm và xem thành tiền cập nhật ngay."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Báo giá", "/quote"], ["Tạo báo giá"]]}
        actions={<Link href="/quote" className="btn ghost"><Icon name="chev" /> Quay lại</Link>}
      />

      <QuoteBuilder
        products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, price: p.price, brand: p.brand }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
        leads={leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone }))}
      />
    </div>
  );
}
