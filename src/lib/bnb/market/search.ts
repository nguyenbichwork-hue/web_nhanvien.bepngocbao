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

/** Giá thấp nhất ĐÁNG TIN từ nhiều listing cùng model: bỏ giá < 45% trung vị (phụ kiện/
 * khớp nhầm) rồi lấy nhỏ nhất. <3 mẫu → tin luôn (không đủ để lọc). */
function lowestReliable(prices: number[]): number | null {
  if (!prices.length) return null;
  const s = [...prices].sort((a, b) => a - b);
  if (s.length < 3) return s[0];
  const med = s[Math.floor(s.length / 2)];
  const kept = s.filter((p) => p >= med * 0.45);
  return kept.length ? kept[0] : s[0];
}

/** Tiki API nội bộ (JSON, không cần render, không chặn IP serverless) — carry hầu hết
 * hãng mainstream + nhiều hãng niche. Nguồn free MẠNH NHẤT cho per-product search. */
async function searchTiki(query: string, modelCode: string): Promise<MarketPrice[]> {
  const url = `https://tiki.vn/api/v2/products?limit=12&q=${encodeURIComponent(query)}`;
  const txt = await fetchJsonText(url, { timeoutMs: 12000, retries: 1 });
  if (!txt) return [];
  try {
    const j = JSON.parse(txt) as { data?: { name?: string; price?: number; url_path?: string }[] };
    const mc = norm(modelCode);
    const prices: number[] = []; let bestUrl = "https://tiki.vn";
    for (const p of j.data || []) {
      const price = Number(p.price);
      if (!price || price < 10000) continue;
      if (mc.length >= 4 && !norm(p.name || "").includes(mc)) continue; // xác minh đúng model
      prices.push(price);
      if (p.url_path && bestUrl === "https://tiki.vn") bestUrl = "https://tiki.vn/" + p.url_path;
    }
    const best = lowestReliable(prices);
    return best == null ? [] : [{ siteName: "tiki.vn", price: best, url: bestUrl }];
  } catch {
    return [];
  }
}

/** websosanh.vn — web SO GIÁ lớn nhất VN (gom ~25k web). SSR: giá nằm thẳng trong HTML
 * (không cần render). Mỗi trang ~37 listing đa merchant → giá thấp nhất rất phủ. */
async function searchWebsosanh(query: string, modelCode: string): Promise<MarketPrice[]> {
  const q = query.trim().toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, "+");
  if (!q) return [];
  const html = await fetchHtml(`https://websosanh.vn/s/${q}.htm`, { timeoutMs: 15000, retries: 1 });
  if (!html) return [];
  const mc = norm(modelCode);
  // Mỗi card: <a ...>TÊN</a></h2>...<span class="product-single-price">GIÁ đ
  const re = /<a[^>]*>([^<]{6,160})<\/a>\s*<\/h2>[\s\S]{0,200}?product-single-price">\s*([\d.,]+)\s*đ/gi;
  const prices: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const name = m[1];
    const price = parseInt(m[2].replace(/[.,]/g, ""), 10);
    if (!price || price < 10000) continue;
    if (mc.length >= 4 && !norm(name).includes(mc)) continue; // xác minh đúng model
    prices.push(price);
  }
  const best = lowestReliable(prices);
  return best == null ? [] : [{ siteName: "websosanh.vn", price: best, url: `https://websosanh.vn/s/${q}.htm` }];
}

/* ===== ENRICHMENT: bóc THÔNG SỐ/XUẤT XỨ/BẢO HÀNH từ trang SP (chạy LOCAL — search
 * engine + trang sàn không bị chặn). Dùng cho việc làm giàu file gốc catalog. ===== */
function decodeEnt(s: string): string {
  return (s || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}
function stripTags(s: string): string {
  return decodeEnt((s || "").replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
/** Bóc cặp khoá:giá-trị từ JSON-LD additionalProperty + bảng + dl. */
export function extractSpecs(html: string): { specs: Record<string, string>; description: string } {
  const specs: Record<string, string> = {};
  let description = "";
  const put = (k: string, v: string) => {
    k = stripTags(k); v = stripTags(v);
    if (k && v && k.length < 44 && v.length < 160 && !(k in specs)) specs[k] = v;
  };
  // JSON-LD
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    for (const obj of (Array.isArray(data) ? data : [data]) as Record<string, unknown>[]) {
      if (!obj || typeof obj !== "object") continue;
      if (String((obj as { "@type"?: unknown })["@type"] || "").includes("Product")) {
        const d = obj["description"];
        if (typeof d === "string" && !description) description = stripTags(d);
        for (const ap of (obj["additionalProperty"] as { name?: string; value?: unknown }[]) || []) {
          if (ap?.name) put(ap.name, String(ap.value ?? ""));
        }
      }
    }
  }
  // bảng <tr><td/th>K</td><td>V</td></tr>
  for (const m of html.matchAll(/<tr[^>]*>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<td[^>]*>([\s\S]*?)<\/td>/gi)) put(m[1], m[2]);
  // dl
  for (const m of html.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)) put(m[1], m[2]);
  return { specs, description };
}

const COUNTRY_RE = /(đức|pháp|ý|tây ban nha|ba lan|thổ nhĩ kỳ|trung quốc|hàn quốc|nhật|malaysia|thái lan|việt nam|indonesia|đài loan|anh|mỹ|czech|germany|china|korea|spain|italy|prc)/i;
const pickSpec = (specs: Record<string, string>, keys: string[]): string => {
  for (const [k, v] of Object.entries(specs)) {
    const nk = norm(k);
    if (keys.some((t) => nk.includes(t))) return v;
  }
  return "";
};

export interface EnrichResult {
  url: string; madeIn: string; originBrand: string; warranty: string;
  description: string; specs: Record<string, string>;
}
/** Tìm trang SP đúng model (qua search engine, chạy local) → bóc specs/xuất xứ/bảo hành. */
export async function enrichProduct(query: string, modelCode: string): Promise<EnrichResult | null> {
  const mc = norm(modelCode);
  if (mc.length < 4) return null;
  const links = await searchLinks(`${query} thông số`, 8);
  const byDom = new Map<string, string>();
  for (const l of links) { if (SKIP_DOMAINS.test(l)) continue; const d = domainOf(l); if (!byDom.has(d)) byDom.set(d, l); if (byDom.size >= 5) break; }
  const deadline = Date.now() + 25000;
  for (const url of byDom.values()) {
    if (Date.now() > deadline) break;
    let html = "";
    try { const r = await smartFetch(url, { accept: "html", timeoutMs: 9000, retries: 0 }); html = r.ok ? r.text : ""; } catch { /* */ }
    if (!html) continue;
    const title = stripTags((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || ["", ""])[1]);
    if (!norm(title).includes(mc) && !norm(html.slice(0, 9000)).includes(mc)) continue; // đúng model
    const { specs, description } = extractSpecs(html);
    if (!Object.keys(specs).length && !description) continue;
    const xx = pickSpec(specs, ["xuatxuthuonghieu"]);
    return {
      url,
      madeIn: pickSpec(specs, ["xuatxumadein", "madein", "noisanxuat", "xuatxulapr", "xuatxu"]),
      originBrand: COUNTRY_RE.test(xx) ? xx : "",
      warranty: pickSpec(specs, ["thoigianbaohanh", "baohanh"]),
      description: description.slice(0, 1500),
      specs,
    };
  }
  return null;
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
  // "Mạnh" = có ScraperAPI HOẶC chạy LOCAL (IP dân cư không bị Google/Bing/sàn chặn như
  // IP datacenter Vercel). Đặt LOCAL_SCRAPE=1 trong .env.local khi chạy `npm run dev` →
  // bật search engine (Google/Bing/DDG) + sàn live → vượt mọi tường chặn (giống video).
  const hasProxy = !!process.env.SCRAPER_API_KEY || process.env.LOCAL_SCRAPE === "1";

  const perDomain = new Map<string, MarketPrice>();
  const consider = (m: MarketPrice | null) => {
    if (!m) return;
    const ex = perDomain.get(m.siteName);
    if (!ex || m.price < ex.price) perDomain.set(m.siteName, m);
  };

  // ===== TẦNG 1: nguồn NHANH (song song, ~1-2s) — đủ cho phần lớn SP =====
  //  catalog đã cào (in-memory) + Tiki API + websosanh.
  const [storedPrices, tikiPrices, wssPrices] = await Promise.all([
    matchStoredCatalogs(modelCode),
    searchTiki(query, modelCode),
    searchWebsosanh(query, modelCode),
  ]);
  for (const m of storedPrices) consider(m);
  for (const m of tikiPrices) consider(m);
  for (const m of wssPrices) consider(m);

  // ===== TẦNG 2: search engine → mở sàn (CHẬM) — CHỈ khi "mạnh" (local/ScraperAPI) VÀ
  //  tầng 1 chưa đủ (<2 nguồn). Có DEADLINE cứng để không bao giờ treo (local không có
  //  maxDuration như Vercel). Đây là phần làm coverage cao khi chạy local. =====
  let linksOpened = 0;
  if (hasProxy && perDomain.size < 2) {
    const deadline = Date.now() + 28000;
    try {
      const rawLinks: string[] = [];
      if (opts.officialDomain) {
        try { rawLinks.push(...(await searchLinks(`site:${opts.officialDomain} ${modelCode || query}`, 5))); } catch { /* */ }
      }
      if (Date.now() < deadline) rawLinks.push(...(await searchLinks(query, Math.max(maxLinks + 4, 12))));
      const byDomain = new Map<string, string>();
      for (const l of rawLinks) {
        if (SKIP_DOMAINS.test(l)) continue;
        const d = domainOf(l);
        if (!byDomain.has(d)) byDomain.set(d, l);
        if (byDomain.size >= maxLinks) break;
      }
      const links = [...byDomain.values()];
      linksOpened = links.length;
      const results = await mapLimit(links, opts.concurrency ?? 6, async (link) => {
        if (Date.now() > deadline) return null; // quá hạn → bỏ link còn lại (chống treo)
        try {
          const r = await smartFetch(link, { timeoutMs: 9000, retries: 0 });
          if (!r.ok || !r.text) return null;
          let best: number | null = null;
          for (const p of extractProductsFromHtml(r.text, r.url, true)) {
            const price = p.salePrice ?? p.originalPrice;
            if (price == null || price < 10000) continue;
            if (mc.length >= 4 && !norm(p.name).includes(mc)) continue;
            if (best == null || price < best) best = price;
          }
          if (best == null) return null;
          const sn = domainOf(r.url);
          return { siteName: sn, price: best, url: r.url, official: opts.officialDomain ? sn.endsWith(opts.officialDomain) : undefined } as MarketPrice;
        } catch {
          return null;
        }
      });
      for (const m of results) consider(m);
    } catch { /* trả phần đã có */ }
  }

  const out = [...perDomain.values()].sort((a, b) => a.price - b.price);
  cache.set(cacheKey, { t: Date.now(), v: out });
  return { prices: out, linksOpened, storesFound: out.length };
}
