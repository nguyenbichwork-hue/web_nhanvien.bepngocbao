#!/usr/bin/env node
// ============================================================================
// BNB · CẬP NHẬT GIÁ THỊ TRƯỜNG — Agent chạy LOCAL trên máy nhân viên.
//
// Vì sao chạy local: máy nhân viên là IP dân cư + (tầng 3) lái Chrome THẬT nên
// vượt được tường JS/anti-bot mà máy chủ (Vercel) bị chặn. Mỗi sáng tự cào giá
// đối thủ cho toàn bộ catalog rồi đẩy về web → mục "Giá thị trường" tự cập nhật.
//
// Cách dùng:
//   BNB-CapNhatGia.exe --setup      Cài đặt: nhập URL web + mã, đăng ký lịch 8h sáng
//   BNB-CapNhatGia.exe              Chạy cào ngay (lịch tự gọi lệnh này mỗi sáng)
//   BNB-CapNhatGia.exe --once 30    Chạy thử 30 SP đầu
//   BNB-CapNhatGia.exe --no-browser Chỉ cào nhanh (Tiki/websosanh), bỏ tầng Chrome
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import { spawnSync } from "node:child_process";

// ----- Thư mục chứa exe/script (config.json nằm cạnh) -----
const IS_EXE = !!process.env.__SEA || path.basename(process.execPath).toLowerCase().includes("capnhatgia");
const BASE_DIR = IS_EXE ? path.dirname(process.execPath) : path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const CONFIG_PATH = path.join(BASE_DIR, "config.json");
const LOG_PATH = path.join(BASE_DIR, "agent.log");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// --------------------------- tiện ích ---------------------------
function log(msg) {
  const line = `[${new Date().toLocaleString("vi-VN")}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_PATH, line + "\n"); } catch { /* */ }
}
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); } catch { return null; }
}
function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a.trim()); }));
}

/** Giá thấp nhất đáng tin: bỏ giá < 45% trung vị (phụ kiện/khớp nhầm) rồi lấy nhỏ nhất. */
function lowestReliable(prices) {
  const s = [...prices].filter((p) => p >= 10000).sort((a, b) => a - b);
  if (!s.length) return null;
  if (s.length < 3) return s[0];
  const med = s[Math.floor(s.length / 2)];
  const kept = s.filter((p) => p >= med * 0.45);
  return kept.length ? kept[0] : s[0];
}

async function httpGet(url, { json = false, timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        Accept: json ? "application/json, text/plain, */*" : "text/html,*/*",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
      },
    });
    return res.ok ? await res.text() : "";
  } catch { return ""; } finally { clearTimeout(t); }
}

// ===================== TẦNG 1: Tiki API (fetch) =====================
async function searchTiki(query, modelCode) {
  const txt = await httpGet(`https://tiki.vn/api/v2/products?limit=12&q=${encodeURIComponent(query)}`, { json: true, timeoutMs: 12000 });
  if (!txt) return [];
  try {
    const j = JSON.parse(txt);
    const mc = norm(modelCode);
    const prices = []; let bestUrl = "https://tiki.vn";
    for (const p of j.data || []) {
      const price = Number(p.price);
      if (!price || price < 10000) continue;
      if (mc.length >= 4 && !norm(p.name || "").includes(mc)) continue;
      prices.push(price);
      if (p.url_path && bestUrl === "https://tiki.vn") bestUrl = "https://tiki.vn/" + p.url_path;
    }
    const best = lowestReliable(prices);
    return best == null ? [] : [{ site: "tiki.vn", price: best, url: bestUrl, official: false }];
  } catch { return []; }
}

// ===================== TẦNG 2: websosanh.vn (fetch, gom ~25k shop) =====================
async function searchWebsosanh(query, modelCode) {
  const q = query.trim().toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, "+");
  if (!q) return [];
  const html = await httpGet(`https://websosanh.vn/s/${q}.htm`, { timeoutMs: 15000 });
  if (!html) return [];
  const mc = norm(modelCode);
  const re = /<a[^>]*>([^<]{6,160})<\/a>\s*<\/h2>[\s\S]{0,200}?product-single-price">\s*([\d.,]+)\s*đ/gi;
  const prices = []; let m;
  while ((m = re.exec(html)) !== null) {
    const name = m[1];
    const price = parseInt(m[2].replace(/[.,]/g, ""), 10);
    if (!price || price < 10000) continue;
    if (mc.length >= 4 && !norm(name).includes(mc)) continue;
    prices.push(price);
  }
  const best = lowestReliable(prices);
  return best == null ? [] : [{ site: "websosanh.vn", price: best, url: `https://websosanh.vn/s/${q}.htm`, official: false }];
}

// ===================== TẦNG 3: Chrome THẬT (Google Shopping) =====================
// Chỉ chạy cho SP mà tầng 1-2 không ra giá. Lái Chrome đã cài để vượt tường JS.
let _browser = null;
async function getBrowser() {
  if (_browser) return _browser;
  let puppeteer;
  try { puppeteer = (await import("puppeteer-core")).default; }
  catch { log("⚠ Không nạp được puppeteer-core → bỏ tầng Chrome."); return null; }
  const chromePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
  ];
  const exe = chromePaths.find((p) => { try { return fs.existsSync(p); } catch { return false; } });
  if (!exe) { log("⚠ Không tìm thấy Chrome → bỏ tầng Chrome. Hãy cài Google Chrome."); return null; }
  try {
    _browser = await puppeteer.launch({
      executablePath: exe,
      headless: "new",
      args: ["--no-sandbox", "--disable-blink-features=AutomationControlled", "--lang=vi-VN"],
    });
    return _browser;
  } catch (e) { log("⚠ Mở Chrome lỗi: " + String(e).slice(0, 100)); return null; }
}
async function closeBrowser() { try { await _browser?.close(); } catch { /* */ } _browser = null; }

async function searchGoogleShopping(query, modelCode) {
  const b = await getBrowser();
  if (!b) return [];
  const mc = norm(modelCode);
  let page;
  try {
    page = await b.newPage();
    await page.setUserAgent(UA);
    await page.goto(`https://www.google.com/search?tbm=shop&hl=vi&gl=vn&q=${encodeURIComponent(query)}`, {
      waitUntil: "domcontentloaded", timeout: 20000,
    });
    await sleep(1200);
    // Bóc các cặp (tên SP, giá) hiển thị trên trang Google Shopping (đã render JS).
    const items = await page.evaluate(() => {
      const out = [];
      const text = document.body.innerText || "";
      // mỗi block sản phẩm: tên ... "x.xxx.xxx₫"
      const blocks = text.split("\n");
      for (let i = 0; i < blocks.length; i++) {
        const m = blocks[i].match(/([\d.]{4,})\s*₫/);
        if (m) {
          const name = (blocks[i - 1] || "") + " " + blocks[i];
          out.push({ name, raw: m[1] });
        }
      }
      return out;
    });
    const prices = [];
    for (const it of items) {
      const price = parseInt(it.raw.replace(/[.,]/g, ""), 10);
      if (!price || price < 10000) continue;
      if (mc.length >= 4 && !norm(it.name).includes(mc)) continue;
      prices.push(price);
    }
    const best = lowestReliable(prices);
    return best == null ? [] : [{ site: "google-shopping", price: best, url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`, official: false }];
  } catch { return []; }
  finally { try { await page?.close(); } catch { /* */ } }
}

// ===================== cào 1 SP =====================
async function priceOne(item, useBrowser) {
  const { query, model } = item;
  const [tiki, wss] = await Promise.all([searchTiki(query, model), searchWebsosanh(query, model)]);
  let points = [...tiki, ...wss];
  if (useBrowser && points.length === 0) {
    const g = await searchGoogleShopping(query, model);
    points = [...points, ...g];
  }
  // gom 1 giá thấp nhất / mỗi site
  const perSite = new Map();
  for (const p of points) {
    const ex = perSite.get(p.site);
    if (!ex || p.price < ex.price) perSite.set(p.site, p);
  }
  const prices = [...perSite.values()];
  if (!prices.length) return null;
  const vals = prices.map((p) => p.price);
  return {
    code: item.code,
    model: item.model,
    name: item.query,
    min: Math.min(...vals),
    officialMin: null,
    siteCount: prices.length,
    prices,
    at: new Date().toISOString(),
  };
}

// ===================== chạy chính =====================
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const worker = async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function runScrape({ limit = 0, useBrowser = true } = {}) {
  const cfg = loadConfig();
  if (!cfg?.webUrl || !cfg?.token) {
    log("✗ Chưa cài đặt. Chạy lại với:  --setup");
    process.exit(1);
  }
  const base = cfg.webUrl.replace(/\/+$/, "");
  const machine = os.hostname();
  log(`▶ Bắt đầu cào giá · web=${base} · máy=${machine}`);

  // 1) lấy worklist
  const wlTxt = await httpGet(`${base}/api/agent/worklist?token=${encodeURIComponent(cfg.token)}`, { json: true, timeoutMs: 30000 });
  let work;
  try { work = JSON.parse(wlTxt); } catch { log("✗ Không lấy được danh sách SP (kiểm tra URL/token)."); process.exit(1); }
  if (!work?.ok) { log("✗ Lỗi danh sách: " + (work?.error || "?")); process.exit(1); }
  let items = work.items || [];
  if (limit > 0) items = items.slice(0, limit);
  const total = items.length;
  log(`• Nhận ${total} SP cần cào giá.`);

  // báo bắt đầu
  await postReport(base, cfg.token, { start: true, total, machine });

  // 2) cào song song + đẩy theo lô
  let found = 0, done = 0;
  let buffer = [];
  const flush = async () => {
    if (!buffer.length) return;
    const batch = buffer; buffer = [];
    await postReport(base, cfg.token, { results: batch });
  };
  const CONC = useBrowser ? 4 : 6;
  await mapLimit(items, CONC, async (it) => {
    let r = null;
    try { r = await priceOne(it, useBrowser); } catch { /* */ }
    done++;
    if (r) { found++; buffer.push(r); }
    if (buffer.length >= 20) await flush();
    if (done % 50 === 0) log(`  …${done}/${total} · có giá ${found}`);
  });
  await flush();

  // 3) kết thúc
  await postReport(base, cfg.token, { done: true, lastCount: found, total, machine });
  await closeBrowser();
  log(`✔ Xong: ${found}/${total} SP có giá. Đã đẩy về web.`);
}

async function postReport(base, token, body) {
  try {
    const res = await fetch(`${base}/api/agent/report?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch { return false; }
}

// ===================== cài đặt + lịch 8h sáng =====================
async function doSetup() {
  console.log("\n=== CÀI ĐẶT BNB · CẬP NHẬT GIÁ ===\n");
  const cur = loadConfig() || {};
  const webUrl = (await ask(`URL web RMS [${cur.webUrl || "https://..."}]: `)) || cur.webUrl || "";
  const token = (await ask(`Mã liên kết (token)${cur.token ? " [giữ nguyên]" : ""}: `)) || cur.token || "";
  if (!webUrl || !token) { console.log("✗ Thiếu URL hoặc mã. Hủy."); return; }
  saveConfig({ webUrl: webUrl.replace(/\/+$/, ""), token });
  console.log("✓ Đã lưu cấu hình:", CONFIG_PATH);

  // kiểm tra kết nối
  const test = await httpGet(`${webUrl.replace(/\/+$/, "")}/api/agent/worklist?token=${encodeURIComponent(token)}`, { json: true, timeoutMs: 20000 });
  let ok = false; try { ok = JSON.parse(test)?.ok; } catch { /* */ }
  console.log(ok ? "✓ Kết nối web OK." : "⚠ Chưa kết nối được web (kiểm tra lại URL/token, vẫn tiếp tục đăng ký lịch).");

  // đăng ký Windows Task Scheduler 08:00 mỗi ngày
  const exePath = IS_EXE ? process.execPath : `"${process.execPath}" "${path.join(BASE_DIR, "agent.mjs")}"`;
  const taskCmd = IS_EXE ? `"${process.execPath}"` : exePath;
  const r = spawnSync("schtasks", [
    "/Create", "/F", "/SC", "DAILY", "/ST", "08:00",
    "/TN", "BNB Cap Nhat Gia",
    "/TR", taskCmd,
  ], { encoding: "utf8" });
  if (r.status === 0) console.log("✓ Đã đăng ký lịch chạy 08:00 mỗi sáng (Task: 'BNB Cap Nhat Gia').");
  else console.log("⚠ Không đăng ký được lịch tự động:", (r.stderr || r.stdout || "").trim(), "\n  (Có thể chạy tay file này mỗi sáng, hoặc chạy lại với quyền Admin.)");

  const now = (await ask("\nChạy cào giá thử ngay bây giờ? (g/k): ")).toLowerCase();
  if (now === "g" || now === "y") await runScrape({ limit: 30, useBrowser: true });
  else console.log("\nXong. Mỗi sáng 8h máy sẽ tự cào giá. Đóng cửa sổ này được rồi.");
}

// ===================== entry =====================
(async () => {
  const args = process.argv.slice(2);
  try {
    if (args.includes("--setup")) { await doSetup(); return; }
    const onceIdx = args.indexOf("--once");
    const limit = onceIdx >= 0 ? parseInt(args[onceIdx + 1] || "30", 10) : 0;
    const useBrowser = !args.includes("--no-browser");
    await runScrape({ limit, useBrowser });
  } catch (e) {
    log("✗ Lỗi: " + (e?.stack || String(e)));
    process.exitCode = 1;
  }
})();
