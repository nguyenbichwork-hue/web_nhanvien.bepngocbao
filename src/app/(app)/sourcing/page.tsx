import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { fmtVnd } from "@/lib/bnb/util";
import { listCostItems } from "@/lib/bnb/cost-store";
import {
  searchCatalog, catalogStats, distinctBrands, distinctCats, byNameVi, MARKUP, marginPct, sellFromCost,
  type CostItem,
} from "@/lib/bnb/sourcing";
import { quoteFromItemAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SourcingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brand?: string; cat?: string; onlyCost?: string }>;
}) {
  await requirePermission("quote.read");
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const brand = sp.brand || "";
  const cat = sp.cat || "";
  const onlyCost = sp.onlyCost === "1";
  const active = Boolean(q || brand || cat);
  const searching = Boolean(q);

  const items = await listCostItems();
  const stats = catalogStats(items);
  const brands = distinctBrands(items);
  const cats = distinctCats(items);
  const filtered = searchCatalog(items, { q, brand, cat, onlyCost });
  // Có gõ từ khoá → so giá rẻ-nhất-trước. Không gõ → DUYỆT bảng giá (NCC → ngành → model).
  const ordered = searching
    ? filtered
    : [...filtered].sort((a, b) => byNameVi(a.brand, b.brand) || byNameVi(a.cat ?? "", b.cat ?? "") || byNameVi(a.model, b.model));
  const LIMIT = searching ? 100 : brand ? 600 : 200;
  const results = ordered.slice(0, LIMIT);
  const cheapest = searching ? (results.find((r) => r.von != null)?.von ?? null) : null;

  const sell = (it: CostItem): number | null =>
    it.ban != null ? it.ban : it.von != null ? sellFromCost(it.von) : null;

  return (
    <div>
      <PageHero
        icon="search"
        title="Tìm nguồn & So giá"
        subtitle="Khách hỏi 1 sản phẩm → tra giá vốn mọi NCC, gợi ý nguồn rẻ nhất, tính sẵn giá bán."
        crumb={[["Trang chủ", "/dashboard"], ["Tìm nguồn (RMS)"], ["Tìm nguồn & So giá"]]}
        stats={[
          { label: "SP có giá vốn", value: `${stats.withCost}/${stats.total}` },
          { label: "Nhà cung cấp", value: stats.brands },
          { label: "Markup mặc định", value: `${MARKUP * 100}%`, tone: "up" },
        ]}
        actions={
          <>
            <Link href="/sourcing/update" className="btn"><Icon name="download" /> Cập nhật giá tuần</Link>
            <Link href="/sourcing/suppliers" className="btn"><Icon name="truck" /> Nhà cung cấp</Link>
          </>
        }
      />

      {/* Ô tìm nguồn */}
      <div className="card">
        <form method="get" className="flex gap" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ margin: 0, flex: "1 1 320px" }}>
            <label>Tìm sản phẩm (model / tên / mã hãng)</label>
            <input name="q" defaultValue={q} placeholder="VD: PID675, bếp từ bosch, HC-I2732A…" />
          </div>
          <div className="field" style={{ margin: 0, flex: "0 1 190px" }}>
            <label>Nhà cung cấp</label>
            <select name="brand" defaultValue={brand}>
              <option value="">Tất cả NCC</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0, flex: "0 1 190px" }}>
            <label>Ngành hàng</label>
            <select name="cat" defaultValue={cat}>
              <option value="">Tất cả ngành</option>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <label className="flex aic small" style={{ gap: 6, height: 44 }}>
            <input type="checkbox" name="onlyCost" value="1" defaultChecked={onlyCost} style={{ width: 16, height: 16 }} /> Chỉ SP có giá vốn
          </label>
          <button type="submit" className="btn primary"><Icon name="search" /> Tìm nguồn</button>
          {active && <Link href="/sourcing" className="btn ghost">Xoá lọc</Link>}
        </form>
      </div>

      {/* Kết quả tìm nguồn / Duyệt bảng giá */}
      <div className="card mt">
        <div className="card-h">
          <h3 className="sec-title">
            {searching ? "Kết quả tìm nguồn" : brand ? `Bảng giá ${brand}` : "Toàn bộ kho giá vốn"}
            {" "}({filtered.length}{filtered.length > results.length ? `, hiện ${results.length}` : ""})
          </h3>
          {cheapest != null
            ? <span className="badge b-green">Rẻ nhất: {fmtVnd(cheapest)}</span>
            : <span className="badge b-gray">{stats.brands} NCC · {stats.withCost}/{stats.total} có giá vốn</span>}
        </div>
        {!searching && (
          <p className="small muted" style={{ marginTop: -2, marginBottom: 10 }}>
            Đang xem toàn bộ bảng giá{brand ? ` của ${brand}` : ` (${stats.brands} NCC)`} · markup {MARKUP * 100}%.
            Gõ model/tên ở ô trên hoặc chọn NCC để xem cụ thể &amp; so nguồn rẻ nhất.
          </p>
        )}
          <table>
            <thead>
              <tr>
                <th style={{ width: 34 }}>#</th>
                <th>Sản phẩm</th>
                <th>NCC</th>
                <th>Ngành</th>
                <th style={{ textAlign: "right" }}>Giá vốn</th>
                <th style={{ textAlign: "right" }}>Giá bán (×{1 + MARKUP})</th>
                <th style={{ textAlign: "right" }}>Biên LN</th>
                <th style={{ textAlign: "right" }}>Niêm yết</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {results.map((it, i) => {
                const s = sell(it);
                const best = it.von != null && it.von === cheapest;
                return (
                  <tr key={`${it.code}-${i}`}>
                    <td className="small muted">{i + 1}</td>
                    <td>
                      <div className="small" style={{ fontWeight: 600 }}>
                        {it.model}{" "}
                        {best && <span className="badge b-green" style={{ fontSize: 11 }}>Rẻ nhất</span>}
                      </div>
                      <div className="urole">{it.code}{it.km ? ` · KM: ${it.km}` : ""}</div>
                    </td>
                    <td className="small" style={{ fontWeight: 600 }}>{it.brand}</td>
                    <td className="small muted">{it.cat || "—"}</td>
                    <td className="small" style={{ textAlign: "right", fontWeight: 700 }}>{it.von != null ? fmtVnd(it.von) : "—"}</td>
                    <td className="small" style={{ textAlign: "right", fontWeight: 700, color: "var(--brand-1)" }}>{s != null ? fmtVnd(s) : "—"}</td>
                    <td className="small muted" style={{ textAlign: "right" }}>{it.von != null && s != null ? `${marginPct(it.von, s)}%` : "—"}</td>
                    <td className="small muted" style={{ textAlign: "right" }}>{it.ny != null ? fmtVnd(it.ny) : "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      {it.code && s != null && (
                        <form action={quoteFromItemAction}>
                          <input type="hidden" name="code" value={it.code} />
                          <button type="submit" className="btn ghost" style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                            <Icon name="quote" /> Báo giá
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {results.length === 0 && (
                <tr><td colSpan={9} className="muted small" style={{ padding: "18px 0", textAlign: "center" }}>Không tìm thấy sản phẩm phù hợp.</td></tr>
              )}
            </tbody>
          </table>
      </div>
    </div>
  );
}
