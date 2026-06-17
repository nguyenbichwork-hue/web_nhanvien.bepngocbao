import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { CountUp } from "@/components/charts";
import { TableFilter } from "@/components/table-filter";
import { ProductThumb } from "@/components/product-thumb";
import { listInventory } from "@/lib/bnb/store";
import { haravanConfigured } from "@/lib/haravan/client";
import { fmtVnd } from "@/lib/bnb/util";

export const dynamic = "force-dynamic";

const LOW = 5; // ngưỡng sắp hết

function Kpi({ icon, tone, value, label }: { icon: string; tone: string; value: number; label: string }) {
  return (
    <div className={`card kpi hover ${tone}`}>
      <div className="ic"><Icon name={icon} /></div>
      <div className="val"><CountUp to={value} /></div>
      <div className="lbl">{label}</div>
    </div>
  );
}

export default async function InventoryPage() {
  await requirePermission("order.read");
  const products = await listInventory();
  const live = haravanConfigured();

  const totalStock = products.reduce((s, p) => s + (p.stock ?? 0), 0);
  const out = products.filter((p) => (p.stock ?? 0) <= 0);
  const low = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= LOW);
  const sorted = [...products].sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Tồn kho</div>
      <div className="page-head">
        <div>
          <h1>Tồn kho</h1>
          <p>
            {live ? "Cập nhật real-time từ Haravan" : "Dữ liệu mẫu (chưa cấu hình Haravan)"} · ngưỡng sắp hết ≤ {LOW}
          </p>
        </div>
        {live && <span className="badge b-green" style={{ height: "fit-content" }}>● Live Haravan</span>}
      </div>

      <div className="grid-k g-4 stagger">
        <Kpi icon="box" tone="tone-i" value={products.length} label="Mặt hàng" />
        <Kpi icon="cart" tone="tone-t" value={totalStock} label="Tổng tồn kho" />
        <Kpi icon="alert" tone="tone-a" value={low.length} label={`Sắp hết (≤${LOW})`} />
        <Kpi icon="x" tone="tone-r" value={out.length} label="Hết hàng" />
      </div>

      <div className="card mt">
        <div className="card-h">
          <h3>Danh sách tồn kho ({products.length})</h3>
        </div>
        <TableFilter
          targetId="inv-table"
          placeholder="Tìm sản phẩm, hãng, SKU…"
          filters={[{ key: "stock", label: "Tồn kho", options: [
            { value: "ok", label: "Còn hàng" },
            { value: "low", label: `Sắp hết (≤${LOW})` },
            { value: "out", label: "Hết hàng" },
          ] }]}
        />
        <table id="inv-table" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>SKU</th>
              <th>Hãng</th>
              <th style={{ textAlign: "right" }}>Giá</th>
              <th style={{ textAlign: "right" }}>Tồn</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const st = p.stock ?? 0;
              const badge = st <= 0 ? "b-rose" : st <= LOW ? "b-amber" : "b-green";
              const label = st <= 0 ? "Hết hàng" : st <= LOW ? "Sắp hết" : "Còn hàng";
              const stockKey = st <= 0 ? "out" : st <= LOW ? "low" : "ok";
              return (
                <tr key={p.id} data-stock={stockKey} data-search={`${p.name} ${p.sku || ""} ${p.brand || ""}`}>
                  <td className="small" style={{ fontWeight: 600, maxWidth: 340 }}>
                    <div className="flex aic" style={{ gap: 10 }}>
                      <ProductThumb src={p.image} name={p.name} />
                      <span>{p.name}</span>
                    </div>
                  </td>
                  <td className="small muted">{p.sku || "—"}</td>
                  <td className="small">{p.brand || "—"}</td>
                  <td className="small" style={{ textAlign: "right" }}>{fmtVnd(p.price)}</td>
                  <td className="small" style={{ textAlign: "right", fontWeight: 700 }}>{p.stock ?? "—"}</td>
                  <td><span className={`badge ${badge}`}>{label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
