// TKB · Danh sách sản phẩm (nháp) — tìm kiếm + lọc ngành + phân trang.
// M0: xem + đối chiếu. Sửa/thêm/xóa chi tiết = M1.
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { listTkbProducts } from "@/lib/tkb/store";
import { fmtVnd } from "@/lib/bnb/util";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function fold(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

export default async function TkbProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; page?: string }>;
}) {
  await requirePermission("tkb.read");
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const cat = (sp.cat || "").trim();
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const all = await listTkbProducts();
  const cats = Array.from(new Map(all.map((p) => [p.category, p.categoryName || p.category])).entries())
    .sort((a, b) => a[1].localeCompare(b[1], "vi"));

  const fq = fold(q);
  let rows = all;
  if (cat) rows = rows.filter((p) => p.category === cat);
  if (fq) rows = rows.filter((p) => fold(`${p.sku} ${p.name} ${p.brand} ${p.model || ""}`).includes(fq));
  rows.sort((a, b) => (a.sku || "").localeCompare(b.sku || "", "vi"));

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const slice = rows.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const qs = (over: Record<string, string | number>) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (cat) u.set("cat", cat);
    u.set("page", "1");
    for (const [k, v] of Object.entries(over)) u.set(k, String(v));
    return `/tkb/products?${u.toString()}`;
  };

  return (
    <div>
      <PageHero
        icon="box"
        title="Sản phẩm (nháp)"
        subtitle="Toàn bộ catalog của web tư vấn. Sửa xong nhớ về trang Thiết kế bếp bấm Xuất bản."
        crumb={[["Trang chủ", "/dashboard"], ["Thiết kế bếp", "/tkb"], ["Sản phẩm"]]}
      />

      {/* Tìm kiếm + lọc */}
      <form className="card flex aic" style={{ gap: 10, marginBottom: 12, flexWrap: "wrap" }} action="/tkb/products" method="get">
        <input name="q" defaultValue={q} placeholder="Tìm theo mã / tên / hãng / model…" style={{ minWidth: 280 }} />
        <select name="cat" defaultValue={cat}>
          <option value="">— Tất cả ngành ({all.length.toLocaleString("vi-VN")}) —</option>
          {cats.map(([slug, name]) => (
            <option key={slug} value={slug}>{name}</option>
          ))}
        </select>
        <button className="btn" type="submit">Lọc</button>
        <span className="small muted">{total.toLocaleString("vi-VN")} SP khớp</span>
      </form>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Sản phẩm</th>
              <th>Hãng</th>
              <th>Ngành</th>
              <th style={{ textAlign: "right" }}>Giá web</th>
              <th>Kho</th>
              <th>Hiện web</th>
              <th>Ảnh</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((p) => (
              <tr key={p.sku}>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{p.sku}</td>
                <td style={{ maxWidth: 380 }}>{p.name}<div className="small muted">{p.model || ""}</div></td>
                <td className="small">{p.brand}</td>
                <td className="small">{p.categoryName || p.category}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{p.price ? fmtVnd(p.price) : <span className="muted">—</span>}</td>
                <td className="small">{p.inventoryStatus || "—"}{p.isStoreDisplay ? " · trưng bày" : ""}</td>
                <td>{p.onWeb === false ? <span className="small muted">Ẩn</span> : <span className="small" style={{ color: "var(--ok, #16a34a)" }}>Hiện</span>}</td>
                <td>{p.thumbnail ? <span className="small" style={{ color: "var(--ok, #16a34a)" }}>Có</span> : <span className="small muted">Thiếu</span>}</td>
              </tr>
            ))}
            {slice.length === 0 ? (
              <tr><td colSpan={8} className="small muted">Không có sản phẩm nào khớp. {all.length === 0 ? "Nháp đang trống — cần chạy seed dữ liệu từ thietkebep." : ""}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Phân trang */}
      {pages > 1 ? (
        <div className="flex aic" style={{ gap: 8, marginTop: 12 }}>
          {cur > 1 ? <Link className="btn" href={qs({ page: cur - 1 })}>← Trước</Link> : null}
          <span className="small muted">Trang {cur}/{pages}</span>
          {cur < pages ? <Link className="btn" href={qs({ page: cur + 1 })}>Sau →</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
