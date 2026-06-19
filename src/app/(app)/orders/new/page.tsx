import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { listCustomers } from "@/lib/bnb/store";
import { createOrderAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  await requirePermission("order.manage");
  const customers = await listCustomers();
  const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <div>
      <PageHero
        icon="cart"
        title="Tạo đơn hàng"
        subtitle="Nhập nhanh thông tin đơn — có thể bổ sung dòng hàng & thanh toán sau khi tạo."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Đơn hàng", "/orders"], ["Tạo đơn"]]}
        actions={<Link href="/orders" className="btn ghost"><Icon name="chev" /> Quay lại</Link>}
      />

      <div className="card" style={{ maxWidth: 760 }}>
        <form action={createOrderAction} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Khách hàng</label>
            <select name="customerId" defaultValue="">
              <option value="">— Khách lẻ —</option>
              {sorted.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Ngày giao dự kiến</label>
            <input name="deliveryDate" type="date" />
          </div>

          <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}>
            <label>Địa chỉ giao</label>
            <input name="address" placeholder="Số nhà, đường, phường/quận..." />
          </div>

          <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}>
            <label>Mô tả dòng hàng *</label>
            <input name="lineDesc" required placeholder="VD: Trọn gói bếp từ Bosch + máy hút mùi + lắp đặt" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Số lượng</label>
            <input name="qty" inputMode="numeric" defaultValue="1" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Tổng tiền (đ) *</label>
            <input name="total" inputMode="numeric" required placeholder="35000000" />
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label>Đặt cọc (đ)</label>
            <input name="deposit" inputMode="numeric" placeholder="0" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Ghi chú</label>
            <input name="note" placeholder="Ghi chú nội bộ..." />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12 }}>
            <button type="submit" className="btn primary"><Icon name="check" /> Tạo đơn</button>
            <Link href="/orders" className="btn ghost">Huỷ</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
