import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { fmtVnd } from "@/lib/bnb/util";
import { listCostItems, getMarkup } from "@/lib/bnb/cost-store";
import { searchCatalog, distinctBrands, distinctCats, byNameVi, marginPct, sellFromCost, catalogStats } from "@/lib/bnb/sourcing";
import { saveCostItemAction, deleteCostItemAction, createCostItemAction, setMarkupAction } from "../actions";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 80;

export default async function CatalogManagePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; brand?: string; cat?: string; page?: string; added?: string; err?: string }>;
}) {
  await requirePermission("quote.manage");
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const brand = sp.brand || "";
  const cat = sp.cat || "";
  const page = Math.max(1, Number(sp.page) || 1);

  const [items, markup] = await Promise.all([listCostItems(), getMarkup()]);
  const stats = catalogStats(items);
  const brands = distinctBrands(items);
  const cats = distinctCats(items);
  const markupPct = Math.round(markup * 1000) / 10;

  const filtered = searchCatalog(items, { q, brand, cat }).sort(
    (a, b) => byNameVi(a.brand, b.brand) || byNameVi(a.cat ?? "", b.cat ?? "") || byNameVi(a.model, b.model),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const start = (cur - 1) * PAGE_SIZE;
  const rows = filtered.slice(start, start + PAGE_SIZE);
  const qs = (p: number) =>
    `?${new URLSearchParams({ ...(q ? { q } : {}), ...(brand ? { brand } : {}), ...(cat ? { cat } : {}), page: String(p) })}`;

  return (
    <div>
      <PageHero
        icon="edit"
        title="Quản lý sản phẩm & giá"
        subtitle="Sửa trực tiếp giá vốn / giá bán / niêm yết của mọi SP — không cần nhập lại qua file. Cấu hình markup mặc định."
        crumb={[["Trang chủ", "/dashboard"], ["Tìm nguồn (RMS)"], ["Quản lý SP & giá"]]}
        stats={[
          { label: "Tổng SP", value: stats.total },
          { label: "Có giá vốn", value: `${stats.withCost}/${stats.total}` },
          { label: "Markup mặc định", value: `${markupPct}%`, tone: "up" },
        ]}
        actions={<Link href="/sourcing" className="btn"><Icon name="search" /> Về Tìm nguồn</Link>}
      />

      {sp.added && <div className="card" style={{ borderLeft: "4px solid var(--b-green,#0e9d6e)" }}><div className="flex aic" style={{ gap: 10 }}><Icon name="check" /> Đã thêm sản phẩm mới.</div></div>}
      {sp.err && <div className="card" style={{ borderLeft: "4px solid var(--b-rose,#e23b54)" }}><div className="flex aic" style={{ gap: 10 }}><Icon name="alert" /> Cần ít nhất Nhà cung cấp + Model.</div></div>}

      {/* Markup + Thêm SP */}
      <div className="grid-k g-2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-h"><h3 className="sec-title">Markup mặc định</h3></div>
          <p className="small muted" style={{ marginTop: 0 }}>Giá bán đề xuất = giá vốn × (1 + markup). Đổi ở đây để áp cho lần nhập giá & SP mới sau đó (giá bán đã sửa tay vẫn giữ nguyên).</p>
          <form action={setMarkupAction} className="flex aic gap" style={{ flexWrap: "wrap" }}>
            <div className="field" style={{ margin: 0, width: 140 }}>
              <label>Markup (%)</label>
              <input name="markup" defaultValue={markupPct} inputMode="decimal" />
            </div>
            <button type="submit" className="btn primary" style={{ alignSelf: "flex-end" }}><Icon name="check" /> Lưu markup</button>
          </form>
        </div>

        <div className="card">
          <div className="card-h"><h3 className="sec-title">Thêm sản phẩm mới</h3></div>
          <form action={createCostItemAction} className="grid-k g-2" style={{ gap: 10 }}>
            <div className="field" style={{ margin: 0 }}><label>Nhà cung cấp *</label><input name="brand" placeholder="VD: Bosch" required /></div>
            <div className="field" style={{ margin: 0 }}><label>Model *</label><input name="model" placeholder="VD: PID675DC1E" required /></div>
            <div className="field" style={{ margin: 0 }}><label>Ngành hàng</label><input name="cat" placeholder="VD: Bếp từ" /></div>
            <div className="field" style={{ margin: 0 }}><label>Mã SP (bỏ trống = tự sinh)</label><input name="code" placeholder="VD: BT-999" /></div>
            <div className="field" style={{ margin: 0 }}><label>Giá vốn</label><input name="von" inputMode="numeric" placeholder="0" /></div>
            <div className="field" style={{ margin: 0 }}><label>Niêm yết</label><input name="ny" inputMode="numeric" placeholder="0" /></div>
            <div style={{ gridColumn: "1 / -1" }}><button type="submit" className="btn primary"><Icon name="plus" /> Thêm sản phẩm</button></div>
          </form>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="card mt">
        <form method="get" className="flex gap" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ margin: 0, flex: "1 1 280px" }}><label>Tìm (model / mã / NCC)</label><input name="q" defaultValue={q} placeholder="Gõ để lọc…" /></div>
          <div className="field" style={{ margin: 0, flex: "0 1 200px" }}><label>Nhà cung cấp</label>
            <select name="brand" defaultValue={brand}><option value="">Tất cả NCC</option>{brands.map((b) => <option key={b} value={b}>{b}</option>)}</select>
          </div>
          <div className="field" style={{ margin: 0, flex: "0 1 200px" }}><label>Ngành hàng</label>
            <select name="cat" defaultValue={cat}><option value="">Tất cả ngành</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <button type="submit" className="btn primary"><Icon name="filter" /> Lọc</button>
          {(q || brand || cat) && <Link href="/sourcing/catalog" className="btn ghost">Xoá lọc</Link>}
        </form>
      </div>

      {/* Forms ẩn cho từng dòng (dùng thuộc tính form= để input ở mọi ô cùng submit) */}
      {rows.map((it) => (
        <form key={`cf-${it.code}`} id={`cf-${it.code}`} action={saveCostItemAction}>
          <input type="hidden" name="code" value={it.code ?? ""} />
          <input type="hidden" name="brand" value={it.brand} />
          <input type="hidden" name="model" value={it.model} />
        </form>
      ))}
      {rows.map((it) => (
        <form key={`df-${it.code}`} id={`df-${it.code}`} action={deleteCostItemAction}>
          <input type="hidden" name="code" value={it.code ?? ""} />
        </form>
      ))}

      <div className="card mt">
        <div className="card-h">
          <h3 className="sec-title">Sản phẩm ({filtered.length}) — trang {cur}/{totalPages}</h3>
          <span className="badge b-gray">Sửa giá rồi bấm “Lưu” từng dòng</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th style={{ width: 130 }}>Giá vốn</th>
              <th style={{ width: 130 }}>Giá bán</th>
              <th style={{ width: 120 }}>Niêm yết</th>
              <th style={{ width: 70, textAlign: "right" }}>Biên LN</th>
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => {
              const id = `cf-${it.code}`;
              const bien = it.von != null && it.ban != null ? marginPct(it.von, it.ban) : null;
              return (
                <tr key={it.code}>
                  <td>
                    <div className="small" style={{ fontWeight: 600 }}>{it.model}</div>
                    <div className="urole">{it.brand} · {it.cat || "—"} · {it.code}</div>
                  </td>
                  <td><input className="cell" form={id} name="von" inputMode="numeric" defaultValue={it.von ?? ""} placeholder="—" /></td>
                  <td><input className="cell" form={id} name="ban" inputMode="numeric" defaultValue={it.ban ?? ""} placeholder="auto" /></td>
                  <td><input className="cell" form={id} name="ny" inputMode="numeric" defaultValue={it.ny ?? ""} placeholder="—" /></td>
                  <td className="small muted" style={{ textAlign: "right" }}>{bien != null ? `${bien}%` : "—"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button form={id} type="submit" className="btn ghost" style={{ padding: "6px 10px" }}><Icon name="check" /> Lưu</button>
                    <button form={`df-${it.code}`} type="submit" className="iconbtn" style={{ width: 32, height: 32, marginLeft: 6 }} aria-label="Xoá"><Icon name="trash" /></button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={6} className="muted small" style={{ padding: "18px 0", textAlign: "center" }}>Không có sản phẩm.</td></tr>}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex aic between mt" style={{ gap: 10 }}>
            <span className="small muted">Hiện {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} / {filtered.length}</span>
            <div className="flex gap">
              {cur > 1 && <Link href={qs(cur - 1)} className="btn ghost">← Trước</Link>}
              {cur < totalPages && <Link href={qs(cur + 1)} className="btn ghost">Sau →</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
