// BNB · RMS Sourcing — helper thuần (client-safe) cho kho giá vốn đa nhà cung cấp.
// Dữ liệu lấy từ cost-store (Supabase collection bnb_cost_items, fallback seed JSON).
// Lõi RMS: khách hỏi 1 SP → tra giá vốn mọi NCC → gợi ý nguồn rẻ nhất → tính giá bán.

export type CostItem = {
  code: string | null;   // Mã SP nội bộ (BT-001…) — đồng thời là id bản ghi
  brand: string;         // Thương hiệu / NCC
  model: string;         // Model / mã hãng
  cat: string | null;    // Ngành hàng
  von: number | null;    // Giá vốn
  ban: number | null;    // Giá bán đề xuất (markup 20%)
  ny: number | null;     // Giá niêm yết
  km?: string;           // Khuyến mãi / quà tặng kèm
};

/** Markup mặc định Sếp chốt (Q26 = 0.2 → giá bán = vốn × 1.2). Vẫn cho sửa từng đơn. */
export const MARKUP = 0.2;

/** Giá bán đề xuất từ giá vốn (làm tròn 1.000đ). */
export const sellFromCost = (von: number): number => Math.round((von * (1 + MARKUP)) / 1000) * 1000;
/** Biên lợi nhuận trên giá bán (%). */
export const marginPct = (von: number, ban: number): number =>
  ban > 0 ? Math.round(((ban - von) / ban) * 1000) / 10 : 0;

/** Bỏ dấu tiếng Việt + thường hoá để so khớp mềm. */
export const strip = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
const tight = (s: string): string => strip(s).replace(/[^a-z0-9]/g, "");

export const byNameVi = (a: string, b: string): number => a.localeCompare(b, "vi");
export const distinctBrands = (items: CostItem[]): string[] =>
  [...new Set(items.map((c) => c.brand))].sort(byNameVi);
export const distinctCats = (items: CostItem[]): string[] =>
  [...new Set(items.map((c) => c.cat).filter(Boolean) as string[])].sort(byNameVi);

export type SourcingQuery = { q?: string; brand?: string; cat?: string; onlyCost?: boolean };

/** Tìm nguồn: lọc theo từ khoá (model/tên/mã, khớp mềm) + hãng + ngành; xếp RẺ NHẤT trước. */
export function searchCatalog(items: CostItem[], query: SourcingQuery): CostItem[] {
  const qTight = query.q ? tight(query.q) : "";
  const qStrip = query.q ? strip(query.q) : "";
  const rows = items.filter((c) => {
    if (query.brand && c.brand !== query.brand) return false;
    if (query.cat && c.cat !== query.cat) return false;
    if (query.onlyCost && c.von == null) return false;
    if (qTight) {
      const hay = tight(`${c.model} ${c.brand} ${c.code ?? ""}`);
      const hayLoose = strip(`${c.model} ${c.brand} ${c.cat ?? ""} ${c.code ?? ""}`);
      if (!hay.includes(qTight) && !hayLoose.includes(qStrip)) return false;
    }
    return true;
  });
  // Best-source: rẻ nhất trước (chưa có giá → cuối); cùng giá thì theo niêm yết.
  return rows.sort((a, b) => {
    const av = a.von ?? Number.POSITIVE_INFINITY;
    const bv = b.von ?? Number.POSITIVE_INFINITY;
    if (av !== bv) return av - bv;
    return (a.ny ?? 0) - (b.ny ?? 0);
  });
}

export type CatalogStats = { total: number; withCost: number; brands: number; cats: number };
export function catalogStats(items: CostItem[]): CatalogStats {
  return {
    total: items.length,
    withCost: items.filter((c) => c.von != null).length,
    brands: new Set(items.map((c) => c.brand)).size,
    cats: new Set(items.map((c) => c.cat).filter(Boolean)).size,
  };
}

/* ===== Hồ sơ Nhà cung cấp (NCC) — suy ra từ catalog + map file báo giá nguồn ===== */
const SUPPLIER_FILES: Record<string, { file: string; format: string }> = {
  Canzy: { file: "BANG GIA CANZY.xlsx + Canzy_bao_gia.pdf", format: "Excel + PDF" },
  Bosch: { file: "BOSCH.xlsx", format: "Excel" },
  Kocher: { file: "KOCHER.xlsx", format: "Excel" },
  Spelier: { file: "SPELIER.xlsx", format: "Excel" },
  Kaff: { file: "NB_KAFF.pdf", format: "PDF" },
  Malloca: { file: "Malloca_bao_gia.pdf", format: "PDF" },
  "Chef's": { file: "CHEF_S.pdf", format: "PDF" },
  Richborn: { file: "RICHBORN_bao_gia.pdf", format: "PDF" },
  Junger: { file: "Junger_bao_gia.jpg", format: "Ảnh" },
  Texgio: { file: "Texgio_bao_gia_ĐL.pdf", format: "PDF" },
  Brandt: { file: "DEBORAH … BRANDT.pdf", format: "PDF" },
  "Grand X": { file: "grandX/Thiết Bị + Phụ Kiện VIP A.pdf", format: "PDF" },
  Hafele: { file: "HAFELE.jpg (bảng giá ĐL)", format: "Ảnh" },
  Tefal: { file: "Google Sheet website T5", format: "Google Sheet" },
  Supor: { file: "Chung Google Sheet Tefal", format: "Google Sheet" },
  Konox: { file: "DANH MỤC CHẬU VÒI 2026 (cần xác nhận)", format: "PDF?" },
};

export type SupplierRow = {
  brand: string; total: number; withCost: number; cats: string[]; file: string; format: string;
};

/** Bảng NCC: mỗi hãng = 1 NCC, kèm số SP, độ phủ giá vốn, nhóm hàng mạnh, file nguồn. */
export function suppliersRoster(items: CostItem[]): SupplierRow[] {
  const map = new Map<string, { total: number; withCost: number; cats: Map<string, number> }>();
  for (const c of items) {
    const e = map.get(c.brand) ?? { total: 0, withCost: 0, cats: new Map() };
    e.total++;
    if (c.von != null) e.withCost++;
    if (c.cat) e.cats.set(c.cat, (e.cats.get(c.cat) ?? 0) + 1);
    map.set(c.brand, e);
  }
  return [...map.entries()]
    .map(([brand, e]) => ({
      brand,
      total: e.total,
      withCost: e.withCost,
      cats: [...e.cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k),
      file: SUPPLIER_FILES[brand]?.file ?? "—",
      format: SUPPLIER_FILES[brand]?.format ?? "—",
    }))
    .sort((a, b) => b.total - a.total);
}
