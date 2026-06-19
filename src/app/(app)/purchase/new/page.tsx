import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { POBuilder } from "./po-builder";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  await requirePermission("purchase.manage");
  return (
    <div>
      <PageHero
        icon="truck"
        title="Tạo phiếu nhập hàng"
        subtitle="Chọn nhà cung cấp, thêm dòng hàng và giá vốn — tổng tính tự động."
        crumb={[["Trang chủ", "/dashboard"], ["Vận hành"], ["Nhập hàng", "/purchase"], ["Tạo PO"]]}
        actions={<Link href="/purchase" className="btn ghost"><Icon name="chev" /> Quay lại</Link>}
      />
      <POBuilder />
    </div>
  );
}
