import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { getMarketConfig } from "@/lib/bnb/market/store";
import { sheetCfgFromEnv } from "@/lib/bnb/market/sheets";
import MarketRunner from "./market-runner";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  await requirePermission("quote.read");
  const cfg = await getMarketConfig();
  const env = sheetCfgFromEnv();
  const appsScriptUrl = cfg.appsScriptUrl || env.url || "";
  const hasSecret = !!(cfg.sheetSecret || env.secret);

  return (
    <div>
      <PageHero
        icon="search"
        title="Auto Pricing — Quét giá & đồng bộ Google Sheet"
        subtitle="Đọc sản phẩm từ Google Sheet → tự tìm giá thị trường theo từng mã → ghi giá đề xuất + công thức lợi nhuận lên Sheet."
        crumb={[["Trang chủ", "/dashboard"], ["Tìm nguồn (RMS)"], ["Auto Pricing"]]}
      />
      <MarketRunner
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
