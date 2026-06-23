// Cào TOÀN BỘ catalog của MỘT web (miễn phí, không proxy) theo thứ tự nền tảng:
//   1) Shopify/Haravan/Sapo  /products.json   (nhanh, lấy hết)
//   2) WooCommerce Store API
//   3) Sitemap -> trang chi tiết (JSON-LD)     (web tự code)
//   4) SPA state nhúng / trang đơn             (fallback)
// Giới hạn thời gian để hợp với serverless (mỗi lần gọi cào 1 web).

import {
  shopifyPage,
  wooPage,
  collectSitemapUrls,
  prioritizeProductUrls,
  processDetailUrls,
  getMenuLinks,
  normUrlLocal,
} from "./platforms";
import { smartFetch } from "./fetcher";
import { extractProductsFromHtml, extractSpaProducts, looksLikeSpa } from "./extractor";
import type { Product } from "./types";

export interface SiteCrawl {
  siteName: string;
  platform: string;
  products: Product[];
  note?: string;
}

export async function crawlSite(
  rawUrl: string,
  opts: { maxProducts?: number; budgetMs?: number } = {},
): Promise<SiteCrawl> {
  const maxProducts = opts.maxProducts ?? 2000;
  const deadline = Date.now() + (opts.budgetMs ?? 45000);
  let origin = "";
  try {
    origin = new URL(rawUrl).origin;
  } catch {
    return { siteName: rawUrl, platform: "unknown", products: [], note: "URL không hợp lệ" };
  }
  const siteName = new URL(origin).hostname.replace(/^www\./, "");
  const products: Product[] = [];
  const idxByKey = new Map<string, number>();
  const add = (ps: Product[]) => {
    for (const p of ps) {
      const k = (p.code || "") + "|" + p.name;
      const price = p.salePrice ?? p.originalPrice ?? 0;
      const ex = idxByKey.get(k);
      if (ex == null) {
        idxByKey.set(k, products.length);
        products.push(p);
      } else {
        // Cùng mã: nếu bản mới CÓ giá mà bản cũ giá 0 (API ẩn giá) → thay bằng bản có giá.
        const old = products[ex];
        const oldPrice = old.salePrice ?? old.originalPrice ?? 0;
        if (price >= 10000 && oldPrice < 10000) products[ex] = p;
      }
    }
  };
  // Tỉ lệ SP có giá thật (>=10k). Sàn ẩn giá trong API (price=0) → tỉ lệ thấp → KHÔNG
  // dừng ở API mà chạy tiếp sitemap+JSON-LD để lấy giá thật từ trang sản phẩm.
  const pricedRatio = () => (products.length ? products.filter((p) => (p.salePrice ?? p.originalPrice ?? 0) >= 10000).length / products.length : 0);
  const apiPricesUsable = () => products.length > 0 && pricedRatio() >= 0.2;

  // 1) Shopify / Haravan / Sapo
  try {
    let page = 1;
    let got = false;
    while (Date.now() < deadline && products.length < maxProducts) {
      const r = await shopifyPage(origin, page, maxProducts);
      if (r.products.length) {
        add(r.products);
        got = true;
      }
      if (!r.hasMore) break;
      page++;
    }
    if (got && apiPricesUsable()) return { siteName, platform: "shopify", products: products.slice(0, maxProducts) };
  } catch {
    /* thử nền tảng kế */
  }

  // 2) WooCommerce — bỏ qua nếu đã gần hết thời gian (tránh vượt maxDuration 60s)
  try {
    let page = 1;
    let got = false;
    while (Date.now() < deadline - 12000 && products.length < maxProducts) {
      const r = await wooPage(origin, page);
      if (!r) break;
      if (r.products.length) {
        add(r.products);
        got = true;
      }
      if (!r.hasMore) break;
      page++;
    }
    if (got && apiPricesUsable()) return { siteName, platform: "woocommerce", products: products.slice(0, maxProducts) };
  } catch {
    /* thử nền tảng kế */
  }

  // 3) Sitemap -> trang chi tiết + 4) SPA / trang đơn — chỉ chạy nếu còn đủ thời gian
  try {
    if (Date.now() >= deadline - 10000) {
      return {
        siteName,
        platform: products.length ? "auto" : "unknown",
        products,
        note: products.length ? undefined : "Hết thời gian dò (web chậm/chặn bot — cần ScraperAPI để quét sâu).",
      };
    }
    const homeRes = await smartFetch(origin, { accept: "html", timeoutMs: 15000, retries: 1 });
    const navSet = new Set<string>(
      (homeRes.ok ? getMenuLinks(homeRes.text, origin) : []).map((u) => normUrlLocal(u)),
    );
    const urls = await collectSitemapUrls(origin, deadline);
    if (urls.length) {
      const picked = prioritizeProductUrls(urls, origin, navSet, Math.min(maxProducts, 400));
      add(await processDetailUrls(picked, deadline, 6));
      if (products.length) return { siteName, platform: "sitemap", products };
    }
    if (homeRes.ok && looksLikeSpa(homeRes.text)) add(extractSpaProducts(homeRes.text, origin));
    if (!products.length && homeRes.ok) add(extractProductsFromHtml(homeRes.text, origin, true));
  } catch {
    /* trả về phần đã có */
  }

  return {
    siteName,
    platform: products.length ? "auto" : "unknown",
    products,
    note: products.length ? undefined : "Chưa lấy được SP (web dựng bằng JS / chặn bot — cần ScraperAPI để quét sâu).",
  };
}
