// Dựng bảng so giá gọn cho UI/Sheet: khớp SP của mình với SP cào được,
// tính giá thấp nhất TT, giá CHÍNH HÃNG (ưu tiên), giá đề xuất, cảnh báo.

import { buildComparison, suggestPrice, priceWarning, lossRisk } from "./match";
import type { MyProduct, SiteResult } from "./types";
import type { MarketSite } from "./store";

export interface PricePoint {
  site: string;
  price: number;
  url: string;
  official: boolean;
}

export interface CompactRow {
  code: string;
  name: string;
  vendor: string;
  myPrice: number;
  cost: number | null;
  marketMin: number | null;
  marketAvg: number | null;
  siteCount: number;
  cheapestSite: string | null;
  cheapestUrl: string | null;
  officialMin: number | null;   // giá thấp nhất trên trang chính hãng
  officialSite: string | null;
  suggested: number | null;     // giá đề xuất (bằng rẻ nhất TT nhưng không dưới sàn)
  warning: "cao" | "thap" | "ok" | null;
  lossRisk: boolean;
  pctVsMin: number | null;
  matchedBy: "sku" | "model" | "name" | null;
  prices: PricePoint[];         // chính hãng trước, rồi rẻ → đắt
}

export function compareMarket(
  my: MyProduct[],
  sites: MarketSite[],
  cfg: { floorPct: number; minMarginPct: number },
): CompactRow[] {
  const officialDomains = new Set(sites.filter((s) => s.official).map((s) => s.siteName));
  const siteResults: SiteResult[] = sites.map((s) => ({
    url: "https://" + s.domain,
    siteName: s.siteName,
    platform: s.platform as SiteResult["platform"],
    products: s.products,
    count: s.count,
  }));

  const rows = buildComparison(my, siteResults);
  const out: CompactRow[] = [];
  for (const r of rows) {
    if (!r.market.length) continue; // chỉ xuất SP có khớp giá thị trường
    const prices: PricePoint[] = r.market
      .map((m) => ({ site: m.siteName, price: m.price, url: m.url, official: officialDomains.has(m.siteName) }))
      .sort((a, b) => Number(b.official) - Number(a.official) || a.price - b.price); // chính hãng trước, rồi rẻ trước
    const official = prices.filter((p) => p.official);
    const cheapest = [...prices].sort((a, b) => a.price - b.price)[0];
    out.push({
      code: r.product.code,
      name: r.product.name,
      vendor: r.product.vendor,
      myPrice: r.product.price,
      cost: r.product.cost ?? null,
      marketMin: r.marketMin,
      marketAvg: r.marketAvg,
      siteCount: r.siteCount,
      cheapestSite: cheapest?.site ?? null,
      cheapestUrl: cheapest?.url ?? null,
      officialMin: official.length ? Math.min(...official.map((p) => p.price)) : null,
      officialSite: official[0]?.site ?? null,
      suggested: suggestPrice(r, cfg.floorPct, cfg.minMarginPct),
      warning: priceWarning(r),
      lossRisk: lossRisk(r, cfg.minMarginPct),
      pctVsMin: r.pctVsMin,
      matchedBy: r.matchedBy,
      prices,
    });
  }
  // SP mình đang bán ĐẮT hơn thị trường (pctVsMin cao) lên đầu để xử lý trước
  out.sort((a, b) => (b.pctVsMin ?? -999) - (a.pctVsMin ?? -999));
  return out;
}
