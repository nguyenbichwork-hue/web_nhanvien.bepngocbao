// Tự KHÁM PHÁ site so giá — không cần dán URL tay.
// Dựng danh sách từ chính danh mục Haravan của mình: trang CHÍNH HÃNG (theo các hãng
// mình đang bán) xếp TRƯỚC, rồi tới các site BÁN LẺ đa hãng. Khớp đúng ý sếp:
// "web chính hãng phải xuất hiện trước, rồi mới tới web bán nhiều hãng giống mình".

/** Hãng (đã chuẩn hoá) -> domain trang chính hãng / phân phối chính thức tại VN. */
export const OFFICIAL_SITES: Record<string, string> = {
  bosch: 'bosch-home.com.vn',
  tefal: 'tefal.vn',
  teka: 'teka.com',
  philips: 'philips.com.vn',
  kocher: 'kocher.com.vn',
  toshiba: 'toshiba-lifestyle.com',
  eurosun: 'eurosun.vn',
  wmf: 'wmf.com.vn',
  canzy: 'canzy.com.vn',
  hafele: 'hafele.com.vn',
  smeg: 'smeg.vn',
  chefs: 'chefs.vn',
  konox: 'konox.vn',
  spelier: 'spelier.com.vn',
  garis: 'garis.vn',
  junger: 'junger.com.vn',
  supor: 'supor.com.vn',
  samsung: 'samsung.com',
  kaff: 'kaff.vn',
  delonghi: 'delonghi.com',
  beko: 'beko.com.vn',
  ecovacs: 'ecovacs.com',
  tineco: 'tineco.com',
  grandx: 'grandx.vn',
  brandt: 'brandt.com.vn',
  richborn: 'richborn.vn',
  malloca: 'malloca.com.vn',
  texgio: 'texgio.com',
  hawonkoo: 'hawonkoo.vn',
  kluger: 'kluger.vn',
};

/** Site bán lẻ ĐA HÃNG (đồ bếp / gia dụng VN) — DANH SÁCH ĐẦY ĐỦ (chỉ quét hết khi có ScraperAPI). */
export const RETAIL_SEED: string[] = [
  'beptot.vn', 'bephoanggia.com.vn', 'eurocook.vn', 'bepnhapkhau.com.vn',
  'ankhang.com', 'dienmaytot.vn', 'bep24h.com', 'thegioibeptu.com',
  'sieuthibeptu.com', 'bepcaocap.vn', 'vuanhabep.com', 'noithatdiemnhan.vn',
  // Sàn CÔNG KHAI giá (woo/shopify) — đáng giá cho index free:
  'kitchenstore.vn', 'munchen.vn',
];

// ===== ĐÃ TỈA DANH SÁCH (2026-06-23) =====
// Kiểm chứng bằng lần quét THẬT trên prod: chỉ 6/37 web cào được MIỄN PHÍ (có
// /products.json, Woo Store API, hoặc sitemap+JSON-LD). 31 web còn lại là SPA/chặn
// bot (bosch, tefal, teka, philips, beptot, sieuthibeptu…) → luôn trả 0 SP, chỉ
// ScraperAPI (render JS + xoay IP) mới quét sâu được. Ở chế độ MIỄN PHÍ chỉ hiện 6
// web này cho gọn & nhanh; khi set SCRAPER_API_KEY thì tự mở lại TOÀN BỘ danh sách.
//
// Hãng chính hãng cào được free (theo nền tảng web của hãng):
const FREE_OFFICIAL = new Set(['canzy', 'smeg', 'kluger', 'supor']);
// Web bán lẻ cào được free:
const FREE_RETAIL = ['eurocook.vn', 'thegioibeptu.com'];
const hasProxy = (): boolean => !!process.env.SCRAPER_API_KEY;

/** Chuẩn hoá tên hãng để tra map (bỏ dấu, ký tự đặc biệt: "Chef's" -> "chefs"). */
export const brandKey = (b: string): string =>
  (b || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

export interface DiscoveredSite {
  url: string;
  label: string;
  official: boolean;
  brand?: string;   // hãng (nếu là site chính hãng)
  count?: number;   // số SP của hãng đó trong danh mục mình (để xếp ưu tiên)
}

/**
 * Tự dựng danh sách site để cào so giá từ danh mục của mình:
 *  1) CHÍNH HÃNG trước — chỉ các hãng MÌNH ĐANG BÁN, hãng nhiều SP xếp trước.
 *  2) BÁN LẺ đa hãng — danh sách seed.
 * Không cần người dùng dán URL.
 */
export function discoverSites(myProducts: { vendor: string }[]): DiscoveredSite[] {
  const proxy = hasProxy(); // có ScraperAPI → cào được cả web SPA/chặn bot → mở full
  const count = new Map<string, number>();
  for (const p of myProducts) {
    const k = brandKey(p.vendor);
    if (k) count.set(k, (count.get(k) || 0) + 1);
  }
  const out: DiscoveredSite[] = [];
  const seen = new Set<string>();
  // 1) Chính hãng — hãng có nhiều SP trước (free: chỉ hãng cào được; có proxy: tất cả)
  [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, c]) => {
      const dom = OFFICIAL_SITES[k];
      if (!dom || seen.has(dom)) return;
      if (!proxy && !FREE_OFFICIAL.has(k)) return; // tỉa: bỏ web không cào được free
      seen.add(dom);
      out.push({ url: 'https://' + dom, label: dom, official: true, brand: k, count: c });
    });
  // 2) Bán lẻ đa hãng (free: chỉ web cào được; có proxy: full seed)
  for (const dom of proxy ? RETAIL_SEED : FREE_RETAIL) {
    if (!seen.has(dom)) {
      seen.add(dom);
      out.push({ url: 'https://' + dom, label: dom, official: false });
    }
  }
  return out;
}

/** Domain chính hãng của 1 hãng (để search `site:` ưu tiên trước khi search chung). */
export function officialDomainFor(vendor: string): string | null {
  return OFFICIAL_SITES[brandKey(vendor)] || null;
}

/** Toàn bộ domain để CÀO CATALOG dựng index giá đối thủ (chính hãng + bán lẻ). */
export function allCrawlDomains(): { url: string; domain: string; official: boolean; brand: string | null }[] {
  const out: { url: string; domain: string; official: boolean; brand: string | null }[] = [];
  const seen = new Set<string>();
  for (const [brand, dom] of Object.entries(OFFICIAL_SITES)) {
    if (seen.has(dom)) continue;
    seen.add(dom);
    out.push({ url: "https://" + dom, domain: dom, official: true, brand });
  }
  for (const dom of RETAIL_SEED) {
    if (seen.has(dom)) continue;
    seen.add(dom);
    out.push({ url: "https://" + dom, domain: dom, official: false, brand: null });
  }
  return out;
}
