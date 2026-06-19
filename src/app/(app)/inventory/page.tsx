import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { BarsChart, DonutChart } from "@/components/charts/rich";
import { TableFilter } from "@/components/table-filter";
import { ProductThumb } from "@/components/product-thumb";
import { listInventory } from "@/lib/bnb/store";
import { haravanConfigured } from "@/lib/haravan/client";
import { fmtVnd, compactVnd } from "@/lib/bnb/util";

export const dynamic = "force-dynamic";

const LOW = 5; // ngưỡng sắp hết
const MIX_COLORS = ["#7c3aed", "#2563eb", "#0e9d6e", "#d98309", "#e23b54", "#0d9488", "#9aa1ab"];

export default async function InventoryPage() {
  await requirePermission("order.read");
  const products = await listInventory();
  const live = haravanConfigured();

  const totalStock = products.reduce((s, p) => s + (p.stock ?? 0), 0);
  const out = products.filter((p) => (p.stock ?? 0) <= 0);
  const low = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= LOW);
  const sorted = [...products].sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));

  // Tổng giá trị tồn (giá × tồn) — chỉ số tổng hợp từ dữ liệu sẵn có.
  const stockValue = products.reduce((s, p) => s + (p.price || 0) * (p.stock ?? 0), 0);

  // Top SKU theo giá trị tồn kho (giá × tồn) — BarsChart.
  // Làm sạch nhãn: bỏ các tiền tố trong ngoặc như "[CHÍNH HÃNG]" (gây trùng nhau),
  // ưu tiên brand + phần phân biệt; quá dài thì cắt gọn.
  const cleanName = (n: string) => n.replace(/^\s*(\[[^\]]*\]|\([^)]*\))\s*/g, "").trim() || n;
  const shortLabel = (p: { name: string; brand?: string; sku?: string }) => {
    const base = cleanName(p.name) || p.brand || p.sku || "—";
    return base.length > 20 ? base.slice(0, 19) + "…" : base;
  };
  const topValue = [...products]
    .map((p) => ({ label: shortLabel(p), value: (p.price || 0) * (p.stock ?? 0) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Cơ cấu tồn kho theo trạng thái — DonutChart.
  const okCount = products.length - out.length - low.length;
  const stockMix = [
    { name: "Còn hàng", value: okCount, color: MIX_COLORS[2] },
    { name: `Sắp hết (≤${LOW})`, value: low.length, color: MIX_COLORS[3] },
    { name: "Hết hàng", value: out.length, color: MIX_COLORS[4] },
  ].filter((x) => x.value > 0);

  return (
    <div>
      <PageHero
        icon="box"
        title="Tồn kho"
        subtitle={`${live ? "Cập nhật real-time từ Haravan" : "Dữ liệu mẫu (chưa cấu hình Haravan)"} · ngưỡng sắp hết ≤ ${LOW}`}
        crumb={[["Trang chủ", "/dashboard"], ["Marketing & Kho"], ["Tồn kho"]]}
        stats={[
          { label: "Mặt hàng", value: products.length },
          { label: "Tổng tồn", value: totalStock },
          { label: "Giá trị tồn", value: compactVnd(stockValue) },
        ]}
        actions={live ? <span className="badge b-green">● Live Haravan</span> : undefined}
      />

      <div className="grid-k g-4 stagger">
        <div className="card kpi grad hover gr-plum">
          <div className="ic"><Icon name="box" /></div>
          <div className="val"><CountUp to={products.length} /></div>
          <div className="lbl">Mặt hàng</div>
        </div>
        <div className="card kpi grad hover gr-azure">
          <div className="ic"><Icon name="cart" /></div>
          <div className="val"><CountUp to={totalStock} /></div>
          <div className="lbl">Tổng tồn kho</div>
        </div>
        <div className="card kpi grad hover gr-sunny">
          <div className="ic"><Icon name="alert" /></div>
          <div className="val"><CountUp to={low.length} /></div>
          <div className="lbl">Sắp hết (≤{LOW})</div>
        </div>
        <div className="card kpi grad hover gr-crimson">
          <div className="ic"><Icon name="x" /></div>
          <div className="val"><CountUp to={out.length} /></div>
          <div className="lbl">Hết hàng</div>
        </div>
      </div>

      {/* Biểu đồ: top SKU theo giá trị tồn + cơ cấu tồn kho */}
      <div className="grid-k g-2 mt">
        <div className="card hover">
          <div className="card-h">
            <h3 className="sec-title">Top SKU theo giá trị tồn</h3>
            <span className="badge b-indigo">{fmtVnd(stockValue)}</span>
          </div>
          {topValue.length === 0 ? (
            <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Chưa có giá trị tồn.</p>
          ) : (
            <BarsChart data={topValue} money height={260} name="Giá trị tồn" />
          )}
        </div>
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Cơ cấu tồn kho</h3></div>
          {stockMix.length === 0 ? (
            <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Chưa có sản phẩm.</p>
          ) : (
            <DonutChart data={stockMix} height={260} centerValue={products.length} centerLabel="mặt hàng" unit=" SP" />
          )}
        </div>
      </div>

      <div className="card mt">
        <div className="card-h">
          <h3 className="sec-title">Danh sách tồn kho ({products.length})</h3>
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
