import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { getMarketConfig, listSites } from "@/lib/bnb/market/store";
import { sheetCfgFromEnv } from "@/lib/bnb/market/sheets";
import { allCrawlDomains } from "@/lib/bnb/market/discovery";
import MarketRunner from "./market-runner";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  await requirePermission("quote.read");
  const [cfg, sites] = await Promise.all([getMarketConfig(), listSites()]);
  const env = sheetCfgFromEnv();
  const appsScriptUrl = cfg.appsScriptUrl || env.url || "";
  const hasSecret = !!(cfg.sheetSecret || env.secret);
  const crawlSites = allCrawlDomains();
  // Số SP đối thủ ĐÃ CÀO có giá thật (index hiện tại).
  const indexPriced = sites.reduce(
    (n, s) => n + (s.products || []).filter((p) => (p.salePrice ?? p.originalPrice ?? 0) >= 10000).length,
    0,
  );

  return (
    <div>
      <PageHero
        icon="search"
        title="Auto Pricing — Quét giá & đồng bộ Google Sheet"
        subtitle="Đọc sản phẩm từ Google Sheet → tự tìm giá thị trường theo từng mã → ghi giá đề xuất + công thức lợi nhuận lên Sheet."
        crumb={[["Trang chủ", "/dashboard"], ["Tìm nguồn (RMS)"], ["Auto Pricing"]]}
      />
      <MarketRunner
        crawlSites={crawlSites}
        indexInfo={{ sites: sites.length, priced: indexPriced }}
        cfg={{
          appsScriptUrl,
          hasSecret,
          sheetUrl: cfg.sheetUrl || "",
          luongDong: cfg.luongDong ?? 5,
          luongLink: cfg.luongLink ?? 5,
          batch: cfg.batch ?? 20,
          maxLinks: cfg.maxLinks ?? 12,
          floorPct: cfg.floorPct ?? 0.9,
          minMarginPct: cfg.minMarginPct ?? 0,
        }}
      />
    </div>
  );
}
