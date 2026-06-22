// Lưu trữ kết quả so giá thị trường vào Supabase (collection bnb_market_sites)
// + cấu hình (app_config key rms_market). Theo đúng pattern persist của RMS.

import { pullCollection, upsertRow, deleteRow, getConfig, setConfig } from "@/lib/org/persist";
import type { Product, MyProduct } from "./types";

const SITES = "bnb_market_sites";
const CFG_KEY = "rms_market";
const MINE_KEY = "rms_market_mine"; // cache SP của mình (đồng bộ từ Haravan theo nút bấm)

export interface MarketSite {
  domain: string;            // = id bản ghi
  siteName: string;
  official: boolean;         // trang chính hãng?
  brand?: string;            // hãng (nếu official)
  platform: string;          // shopify | woocommerce | sitemap | auto | unknown
  count: number;
  products: Product[];
  crawledAt: string;         // ISO
  note?: string;
}

export async function saveSite(site: MarketSite): Promise<void> {
  await upsertRow(SITES, site.domain, site);
}
export async function listSites(): Promise<MarketSite[]> {
  return await pullCollection<MarketSite>(SITES);
}
export async function clearSite(domain: string): Promise<void> {
  await deleteRow(SITES, domain);
}

export interface MarketConfig {
  floorPct: number;        // sàn giá đề xuất = floorPct × giá hiện tại
  minMarginPct: number;    // % lãi tối thiểu so với giá vốn (chống định giá lỗ)
  appsScriptUrl?: string;  // có thể cấu hình runtime thay cho env
  lastRunAt?: string;
}
const DEFAULT_CFG: MarketConfig = { floorPct: 0.9, minMarginPct: 0 };

export async function getMarketConfig(): Promise<MarketConfig> {
  return { ...DEFAULT_CFG, ...((await getConfig<MarketConfig>(CFG_KEY)) || {}) };
}
export async function setMarketConfig(patch: Partial<MarketConfig>): Promise<void> {
  await setConfig(CFG_KEY, { ...(await getMarketConfig()), ...patch });
}

/** Cache SP của mình (đồng bộ từ Haravan) — tránh gọi Haravan mỗi lần mở trang. */
export async function saveMine(items: MyProduct[]): Promise<void> {
  await setConfig(MINE_KEY, { items, at: new Date().toISOString() });
}
export async function getMine(): Promise<{ items: MyProduct[]; at: string | null }> {
  const c = await getConfig<{ items: MyProduct[]; at: string }>(MINE_KEY);
  return { items: c?.items || [], at: c?.at || null };
}
