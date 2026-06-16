import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { listCustomers } from "@/lib/bnb/store";
import { createOrderAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  await requirePermission("order.manage");
  const customers = await listCustomers();
  const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <div className="view-in">
      <div className="crumbs">
        <Link href="/orders">Quản lý đơn hàng</Link> <Icon name="chev" /> Tạo đơn
      </div>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 22 }}>Tạo đơn hàng</h1>
          <p>Nhập nhanh thông tin đơn — có thể bổ sung dòng hàng &amp; thanh toán sau khi tạo.</p>
        </div>
      </div>

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
