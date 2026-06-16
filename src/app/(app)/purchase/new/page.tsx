import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { POBuilder } from "./po-builder";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  await requirePermission("purchase.manage");
  return (
    <div className="view-in">
      <div className="crumbs">
        <Link href="/purchase">Nhập hàng</Link> <Icon name="chev" /> Tạo PO
      </div>
      <div className="page-head">
        <div>
          <h1>Tạo phiếu nhập hàng</h1>
          <p>Chọn nhà cung cấp, thêm dòng hàng và giá vốn — tổng tính tự động.</p>
        </div>
      </div>
      <POBuilder />
    </div>
  );
}
