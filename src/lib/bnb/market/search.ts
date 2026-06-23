// Tự tìm giá theo TỪNG sản phẩm (giống hệ thống Auto Pricing trong video của sếp):
// tìm trên công cụ tìm kiếm → mở các trang sàn bán lẻ → bóc giá → xác minh đúng model
// → gom giá thấp nhất mỗi sàn. Miễn phí: xoay Bing/DuckDuckGo/Google (IP serverless hay
// bị Google chặn nên thử nhiều engine). Có SCRAPER_API_KEY → dùng Google structured (mạnh nhất).

import { smartFetch } from "./fetcher";
import { extractProductsFromHtml } from "./extractor";
import { listSites } from "./store";
import type { MarketPrice } from "./types";

/** Đối chiếu 1 model với CATALOG ĐỐI THỦ ĐÃ CÀO (lưu Supabase) — nguồn free chạy được
 * từ Vercel (không phụ thuộc search engine). Mạnh dần theo số sàn đã cào. */
async function matchStoredCatalogs(modelCode: string): Promise<MarketPrice[]> {
  const mc = (modelCode || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (mc.length < 4) return [];
  let sites;
  try { sites = await listSites(); } catch { return []; }
  const out: MarketPrice[] = [];
  for (const s of sites) {
    let best: number | null = null; let bestUrl = "https://" + s.domain;
    for (const p of s.products || []) {
      const price = p.salePrice ?? p.originalPrice;
      if (price == null || price < 10000) continue;
      const hay = ((p.code || "") + " " + p.name).toLowerCase().replace(/[^a-z0-9]+/g, "");
      if (!hay.includes(mc)) continue;
      if (best == null || price < best) { best = price; bestUrl = p.url || bestUrl; }
    }
    if (best != null) out.push({ siteName: s.domain, price: best, url: bestUrl, official: s.official });
  }
  return out;
}

/** Lấy HTML thô (chuỗi) qua smartFetch; "" nếu lỗi. */
async function fetchHtml(url: string, opts: { timeoutMs?: number; retries?: number }): Promise<string> {
  try {
    const r = await smartFetch(url, { accept: "html", ...opts });
    return r.ok ? r.text : "";
  } catch {
    return "";
  }
}
/** Lấy nội dung endpoint JSON (accept json — tránh trang HTML challenge của Cloudflare/Woo). */
async function fetchJsonText(url: string, opts: { timeoutMs?: number; retries?: number }): Promise<string> {
  try {
    const r = await smartFetch(url, { accept: "json", proxyFallback: false, ...opts });
    return r.ok ? r.text : "";
  } catch {
    return "";
  }
}

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

function domainOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

// Domain nhiễu (không phải trang bán hàng).
const SKIP_DOMAINS =
  /(google\.|gstatic\.|bing\.|duckduckgo\.|youtube\.|facebook\.|tiktok\.|instagram\.|wikipedia\.|webcache\.|translate\.|maps\.|blogspot\.|news\.|zalo\.|reddit\.)/i;

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

/* ---------- Bóc link kết quả từ HTML của từng engine ---------- */
function pushLinks(html: string, out: string[], seen: Set<string>, re: RegExp, decode = false) {
  for (const m of html.matchAll(re)) {
    let u = m[1];
    if (!u) continue;
    if (decode) { try { u = decodeURIComponent(u); } catch { /* keep */ } }
    if (!/^https?:\/\//.test(u) || SKIP_DOMAINS.test(u) || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
}

function parseBing(html: string): string[] {
  const out: string[] = []; const seen = new Set<string>();
  pushLinks(html, out, seen, /<h2><a[^>]+href="(https?:\/\/[^"]+)"/g);
  pushLinks(html, out, seen, /<a[^>]+class="[^"]*tilk[^"]*"[^>]+href="(https?:\/\/[^"]+)"/g);
  if (out.length < 3) pushLinks(html, out, seen, /href="(https?:\/\/[^"]+)"/g);
  return out;
}
function parseDuck(html: string): string[] {
  const out: string[] = []; const seen = new Set<string>();
  // DuckDuckGo HTML: link bọc trong uddg=<thật>
  pushLinks(html, out, seen, /uddg=([^&"']+)/g, true);
  pushLinks(html, out, seen, /<a[^>]+class="result__a"[^>]+href="(https?:\/\/[^"]+)"/g);
  return out;
}
function parseGoogle(html: string): string[] {
  const out: string[] = []; const seen = new Set<string>();
  pushLinks(html, out, seen, /\/url\?q=([^&"]+)/g, true);
  pushLinks(html, out, seen, /href="(https?:\/\/[^"]+)"/g);
  return out;
}

/** Lấy link kết quả tìm kiếm. ScraperAPI structured Google (nếu có key) → Bing → DuckDuckGo → Google. */
async function searchLinks(query: string, num: number): Promise<string[]> {
  const key = process.env.SCRAPER_API_KEY || "";
  if (key) {
    try {
      const u =
        "https://api.scraperapi.com/structured/google/search?" +
        new URLSearchParams({ api_key: key, query, country_code: process.env.SCRAPER_COUNTRY || "vn", num: String(num) });
      const res = await fetch(u, { signal: AbortSignal.timeout(45000) });
      if (res.ok) {
        const j = (await res.json()) as { organic_results?: { link?: string }[] };
        const links = (j.organic_results || []).map((r) => r.link).filter((x): x is string => !!x);
        if (links.length) return links;
      }
    } catch { /* fallback engine miễn phí */ }
  }
  const q = encodeURIComponent(query);
  // Bing: thường cho phép IP datacenter hơn Google.
  try {
    const r = await fetchHtml(`https://www.bing.com/search?setlang=vi&cc=vn&count=${num}&q=${q}`, { timeoutMs: 18000, retries: 1 });
    if (r) { const l = parseBing(r); if (l.length) return l; }
  } catch { /* next */ }
  // DuckDuckGo HTML (không JS).
  try {
    const r = await fetchHtml(`https://html.duckduckgo.com/html/?kl=vn-vi&q=${q}`, { timeoutMs: 18000, retries: 1 });
    if (r) { const l = parseDuck(r); if (l.length) return l; }
  } catch { /* next */ }
  // Google (hay bị chặn từ serverless — thử cuối).
  try {
    const r = await fetchHtml(`https://www.google.com/search?hl=vi&gl=vn&num=${num}&q=${q}`, { timeoutMs: 18000, retries: 1 });
    if (r) return parseGoogle(r);
  } catch { /* ignore */ }
  return [];
}

/* ===== Nguồn FREE đáng tin: hỏi thẳng search-endpoint các sàn bếp VN =====
 * Google/Bing chặn IP serverless → bản free dựa vào search API của chính các sàn
 * (Haravan/Shopify suggest.json + WooCommerce Store API search). Nhanh, không bị chặn. */
const RETAILERS: string[] = [
  "thegioibeptu.com", "eurocook.vn", "canzy.com.vn", "kluger.vn", "supor.com.vn",
  "beptot.vn", "bephoanggia.com.vn", "bepnhapkhau.com.vn", "bep24h.com",
  "sieuthibeptu.com", "vuanhabep.com", "noithatdiemnhan.vn", "bepcaocap.vn",
  "hafele.com.vn", "malloca.com.vn", "chefs.vn",
];

interface RawHit { name: string; price: number | null; url: string }

async function shopifySuggest(origin: string, q: string): Promise<RawHit[]> {
  const url = `${origin}/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=6`;
  const html = await fetchJsonText(url, { timeoutMs: 12000, retries: 1 });
  if (!html) return [];
  try {
    const j = JSON.parse(html) as { resources?: { results?: { products?: { title?: string; price?: string | number; url?: string }[] } } };
    const ps = j.resources?.results?.products || [];
    return ps.map((p) => ({ name: p.title || "", price: p.price != null ? Number(String(p.price).replace(/[^\d.]/g, "")) : null, url: p.url ? origin + p.url : origin }));
  } catch { return []; }
}
async function wooSearch(origin: string, q: string): Promise<RawHit[]> {
  const url = `${origin}/wp-json/wc/store/v1/products?search=${encodeURIComponent(q)}&per_page=6`;
  const html = await fetchJsonText(url, { timeoutMs: 12000, retries: 1 });
  if (!html) return [];
  try {
    const arr = JSON.parse(html) as { name?: string; prices?: { price?: string; currency_minor_unit?: number }; permalink?: string }[];
    if (!Array.isArray(arr)) return [];
    return arr.map((p) => {
      const minor = Number(p.prices?.currency_minor_unit ?? 0);
      const div = Math.pow(10, minor) || 1;
      return { name: p.name || "", price: p.prices?.price ? Number(p.prices.price) / div : null, url: p.permalink || origin };
    });
  } catch { return []; }
}

/** Tìm 1 SP trên các sàn bếp VN: search-endpoint tìm URL đúng model → mở trang lấy
 * giá thật (nhiều sàn ẩn giá trong API nhưng giá vẫn nằm trong HTML/JSON-LD trang SP). */
async function searchRetailers(modelCode: string, concurrency: number): Promise<MarketPrice[]> {
  const mc = norm(modelCode);
  if (mc.length < 3) return [];
  const hits = await mapLimit(RETAILERS, concurrency, async (dom) => {
    const origin = "https://" + dom;
    // 1) Tìm URL sản phẩm khớp model
    let cands = await shopifySuggest(origin, modelCode);
    if (!cands.length) cands = await wooSearch(origin, modelCode);
    const matched = cands.filter((c) => c.url && norm(c.name).includes(mc)).slice(0, 2);
    if (!matched.length) return null;
    // 2) Lấy giá: từ API nếu >0, không thì mở trang SP bóc JSON-LD/meta
    let best: number | null = null; let bestUrl = origin;
    for (const c of matched) {
      let price = c.price != null && c.price >= 10000 ? c.price : null;
      if (price == null) {
        const html = await fetchHtml(c.url, { timeoutMs: 15000, retries: 1 });
        if (html) {
          for (const p of extractProductsFromHtml(html, c.url, true)) {
            const pr = p.salePrice ?? p.originalPrice;
            if (pr != null && pr >= 10000 && norm(p.name).includes(mc)) { if (price == null || pr < price) price = pr; }
          }
        }
      }
      if (price != null && (best == null || price < best)) { best = price; bestUrl = c.url; }
    }
    return best == null ? null : ({ siteName: dom, price: best, url: bestUrl } as MarketPrice);
  });
  return hits.filter((h): h is MarketPrice => !!h);
}

export interface SearchOptions {
  maxLinks?: number;     // số trang mở tối đa mỗi sản phẩm
  concurrency?: number;  // luồng link
  officialDomain?: string;
}

const cache = new Map<string, { t: number; v: MarketPrice[] }>();
const TTL_MS = 1000 * 60 * 60 * 12;

export interface ProductSearchResult {
  prices: MarketPrice[];   // 1 giá thấp nhất / mỗi sàn (đã xác minh model)
  linksOpened: number;     // số trang đã mở
  storesFound: number;     // số cửa hàng tìm thấy
}

/** Tìm giá thị trường cho 1 sản phẩm theo tên + mã model. */
export async function searchProductPrices(
  query: string,
  modelCode: string,
  opts: SearchOptions = {},
): Promise<ProductSearchResult> {
  const maxLinks = opts.maxLinks ?? 12;
  const cacheKey = norm(query) + "#" + norm(modelCode) + "#" + maxLinks;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.t < TTL_MS) return { prices: hit.v, linksOpened: 0, storesFound: hit.v.length };

  const mc = norm(modelCode);
  const hasProxy = !!process.env.SCRAPER_API_KEY;

  // NGUỒN 0 (free, mạnh nhất hiện có): đối chiếu catalog đối thủ ĐÃ CÀO (lưu Supabase).
  // In-memory sau lần load đầu → quét hàng nghìn SP rất nhanh.
  const storedPrices = await matchStoredCatalogs(modelCode);

  // NGUỒN 1 (live): hỏi thẳng search-endpoint sàn VN — CHỈ khi có ScraperAPI (IP serverless
  // bị WAF chặn/trả rỗng + chậm; free dựa hẳn vào index đã cào ở NGUỒN 0).
  const retailerPrices = hasProxy ? await searchRetailers(modelCode, opts.concurrency ?? 5) : [];

  // NGUỒN 2 (search engine → mở trang): CHỈ chạy khi có ScraperAPI — không thì Google/Bing
  // chặn IP serverless, vừa fail vừa tốn thời gian (đẩy hàm vượt 60s). Free → bỏ qua.
  const rawLinks: string[] = [];
  if (hasProxy) {
    if (opts.officialDomain) {
      try { rawLinks.push(...(await searchLinks(`site:${opts.officialDomain} ${modelCode || query}`, 5))); } catch { /* */ }
    }
    rawLinks.push(...(await searchLinks(query, Math.max(maxLinks + 6, 15))));
  }

  // 1 link đầu / domain để đa dạng cửa hàng.
  const byDomain = new Map<string, string>();
  for (const l of rawLinks) {
    if (SKIP_DOMAINS.test(l)) continue;
    const d = domainOf(l);
    if (!byDomain.has(d)) byDomain.set(d, l);
    if (byDomain.size >= maxLinks) break;
  }
  const links = [...byDomain.values()];

  const results = await mapLimit(links, opts.concurrency ?? 5, async (link) => {
    try {
      const r = await smartFetch(link, { timeoutMs: 18000, retries: 1 });
      if (!r.ok || !r.text) return null;
      const prods = extractProductsFromHtml(r.text, r.url, true);
      let best: number | null = null;
      for (const p of prods) {
        const price = p.salePrice ?? p.originalPrice;
        if (price == null || price < 10000) continue;
        if (mc.length >= 4 && !norm(p.name).includes(mc)) continue; // xác minh đúng model
        if (best == null || price < best) best = price;
      }
      if (best == null) return null;
      const sn = domainOf(r.url);
      const official = opts.officialDomain ? sn.endsWith(opts.officialDomain) : undefined;
      return { siteName: sn, price: best, url: r.url, official } as MarketPrice;
    } catch {
      return null;
    }
  });

  const perDomain = new Map<string, MarketPrice>();
  const consider = (m: MarketPrice | null) => {
    if (!m) return;
    const ex = perDomain.get(m.siteName);
    if (!ex || m.price < ex.price) perDomain.set(m.siteName, m);
  };
  for (const m of storedPrices) consider(m);    // catalog đã cào (free, mạnh)
  for (const m of retailerPrices) consider(m);  // sàn VN live (free)
  for (const m of results) consider(m);         // search engine (cần ScraperAPI)
  const out = [...perDomain.values()].sort((a, b) => a.price - b.price);
  cache.set(cacheKey, { t: Date.now(), v: out });
  return { prices: out, linksOpened: links.length, storesFound: out.length };
}
