import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { fmtVnd } from "@/lib/bnb/util";
import {
  searchCatalog, catalogStats, BRANDS, CATS, MARKUP, marginPct, sellFromCost,
  type CostItem,
} from "@/lib/bnb/sourcing";

export const dynamic = "force-dynamic";

const LIMIT = 100;

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

  const stats = catalogStats();
  const all = active ? searchCatalog({ q, brand, cat, onlyCost }) : [];
  const results = all.slice(0, LIMIT);
  const cheapest = results.find((r) => r.von != null)?.von ?? null;

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
        actions={<Link href="/sourcing/suppliers" className="btn"><Icon name="truck" /> Nhà cung cấp</Link>}
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
              {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0, flex: "0 1 190px" }}>
            <label>Ngành hàng</label>
            <select name="cat" defaultValue={cat}>
              <option value="">Tất cả ngành</option>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <label className="flex aic small" style={{ gap: 6, height: 44 }}>
            <input type="checkbox" name="onlyCost" value="1" defaultChecked={onlyCost} style={{ width: 16, height: 16 }} /> Chỉ SP có giá vốn
          </label>
          <button type="submit" className="btn primary"><Icon name="search" /> Tìm nguồn</button>
          {active && <Link href="/sourcing" className="btn ghost">Xoá lọc</Link>}
        </form>
      </div>

      {/* Kết quả */}
      {!active ? (
        <div className="card mt" style={{ textAlign: "center", padding: "48px 16px" }}>
          <div className="ic" style={{ width: 52, height: 52, margin: "0 auto 12px" }}><Icon name="search" /></div>
          <h3 className="sec-title" style={{ justifyContent: "center" }}>Nhập sản phẩm khách hỏi để tìm nguồn</h3>
          <p className="muted small" style={{ maxWidth: 460, margin: "6px auto 0" }}>
            Hệ thống sẽ so giá vốn của {stats.brands} nhà cung cấp, đề xuất nơi <b>rẻ nhất</b> và tính sẵn giá bán
            (markup {MARKUP * 100}%) để báo khách.
          </p>
        </div>
      ) : (
        <div className="card mt">
          <div className="card-h">
            <h3 className="sec-title">Kết quả tìm nguồn ({all.length}{all.length > LIMIT ? `, hiện ${LIMIT}` : ""})</h3>
            {cheapest != null && <span className="badge b-green">Rẻ nhất: {fmtVnd(cheapest)}</span>}
          </div>
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
                  </tr>
                );
              })}
              {results.length === 0 && (
                <tr><td colSpan={8} className="muted small" style={{ padding: "18px 0", textAlign: "center" }}>Không tìm thấy sản phẩm phù hợp.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
