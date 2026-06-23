import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { fmtDateTime } from "@/lib/bnb/util";
import { getMine, listSites, getMarketConfig } from "@/lib/bnb/market/store";
import { discoverSites } from "@/lib/bnb/market/discovery";
import { compareMarket } from "@/lib/bnb/market/compare";
import MarketRunner from "./market-runner";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  await requirePermission("quote.read");
  const [mine, sites, cfg] = await Promise.all([getMine(), listSites(), getMarketConfig()]);
  const discovered = discoverSites(mine.items); // chính hãng trước, rồi bán lẻ
  const byDom = new Map(sites.map((s) => [s.domain, s]));
  const siteList = discovered.map((d) => {
    const c = byDom.get(d.label);
    return {
      url: d.url,
      domain: d.label,
      official: d.official,
      brand: d.brand ?? null,
      catCount: d.count ?? null,
      crawled: c?.count ?? null,
      platform: c?.platform ?? null,
      note: c?.note ?? null,
      crawledAt: c?.crawledAt ?? null,
    };
  });
  const extra = sites
    .filter((s) => !discovered.some((d) => d.label === s.domain))
    .map((s) => ({
      url: "https://" + s.domain,
      domain: s.domain,
      official: s.official,
      brand: s.brand ?? null,
      catCount: null,
      crawled: s.count,
      platform: s.platform,
      note: s.note ?? null,
      crawledAt: s.crawledAt,
    }));
  const allSites = [...siteList, ...extra];
  const rows = sites.length && mine.items.length ? compareMarket(mine.items, sites, cfg) : [];
  const officialCount = allSites.filter((s) => s.official).length;

  return (
    <div>
      <PageHero
        icon="search"
        title="Giá thị trường — Cào & so giá tự động"
        subtitle={`Tự dò giá thấp nhất trên các web liên quan theo mã SP của mình. Ưu tiên trang chính hãng trước (${officialCount} web), rồi web bán lẻ — không cần dán URL tay.`}
        crumb={[["Trang chủ", "/dashboard"], ["Tìm nguồn (RMS)"], ["Giá thị trường"]]}
      />
      <MarketRunner
        mineCount={mine.items.length}
        mineAtLabel={mine.at ? fmtDateTime(mine.at) : null}
        sites={allSites}
        initialRows={rows}
        cfg={cfg}
      />
    </div>
  );
}
