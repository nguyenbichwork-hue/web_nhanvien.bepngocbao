// BNB · RMS Sourcing — kho giá vốn đa nhà cung cấp + cỗ máy "tìm nguồn tốt nhất".
// Dữ liệu seed từ file chuẩn hoá ChuanHoaSanPham (1.5k SP, 25 NCC). Server-safe (không React).
// Lõi RMS: khách hỏi 1 SP → tra giá vốn mọi NCC → gợi ý nguồn rẻ nhất → tính giá bán.
import rawCatalog from "./sourcing-catalog.json";

export type CostItem = {
  code: string | null;   // Mã SP nội bộ (BT-001…)
  brand: string;         // Thương hiệu / NCC
  model: string;         // Model / mã hãng
  cat: string | null;    // Ngành hàng
  von: number | null;    // Giá vốn (đã có)
  ban: number | null;    // Giá bán đề xuất (markup 20%)
  ny: number | null;     // Giá niêm yết
  km?: string;           // Khuyến mãi / quà tặng kèm
};

/** Markup mặc định Sếp chốt (Q26 = 0.2 → giá bán = vốn × 1.2). Vẫn cho sửa từng đơn. */
export const MARKUP = 0.2;

export const CATALOG = rawCatalog as unknown as CostItem[];

/** Giá bán đề xuất từ giá vốn (làm tròn 1.000đ). */
export const sellFromCost = (von: number): number => Math.round((von * (1 + MARKUP)) / 1000) * 1000;
/** Biên lợi nhuận trên giá bán (%). */
export const marginPct = (von: number, ban: number): number =>
  ban > 0 ? Math.round(((ban - von) / ban) * 1000) / 10 : 0;

/** Bỏ dấu tiếng Việt + thường hoá để so khớp mềm. */
export const strip = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();
const tight = (s: string): string => strip(s).replace(/[^a-z0-9]/g, "");

export const BRANDS: string[] = [...new Set(CATALOG.map((c) => c.brand))].sort((a, b) => a.localeCompare(b, "vi"));
export const CATS: string[] = [...new Set(CATALOG.map((c) => c.cat).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "vi"));

export type SourcingQuery = { q?: string; brand?: string; cat?: string; onlyCost?: boolean };

/** Tìm nguồn: lọc theo từ khoá (model/tên/mã, khớp mềm) + hãng + ngành; xếp RẺ NHẤT trước. */
export function searchCatalog(query: SourcingQuery): CostItem[] {
  const qTight = query.q ? tight(query.q) : "";
  const qStrip = query.q ? strip(query.q) : "";
  let rows = CATALOG.filter((c) => {
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
  rows = rows.sort((a, b) => {
    const av = a.von ?? Number.POSITIVE_INFINITY;
    const bv = b.von ?? Number.POSITIVE_INFINITY;
    if (av !== bv) return av - bv;
    return (a.ny ?? 0) - (b.ny ?? 0);
  });
  return rows;
}

export type CatalogStats = { total: number; withCost: number; brands: number; cats: number };
export function catalogStats(): CatalogStats {
  return { total: CATALOG.length, withCost: CATALOG.filter((c) => c.von != null).length, brands: BRANDS.length, cats: CATS.length };
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
export function suppliersRoster(): SupplierRow[] {
  const map = new Map<string, { total: number; withCost: number; cats: Map<string, number> }>();
  for (const c of CATALOG) {
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
