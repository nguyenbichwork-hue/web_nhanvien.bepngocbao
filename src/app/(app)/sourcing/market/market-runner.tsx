"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { saveMarketSettingsAction } from "./actions";

type CrawlSite = { url: string; domain: string; official: boolean; brand: string | null };

type Cfg = {
  appsScriptUrl: string;
  hasSecret: boolean;
  sheetUrl: string;
  luongDong: number;
  luongLink: number;
  batch: number;
  maxLinks: number;
  floorPct: number;
  minMarginPct: number;
};

type SheetInfo = { name: string; rows: number };
type Prod = { row: number; sheet: string; ma: string; brand: string; model: string; ten: string; giaVon: number | null; giaHienTai: number | null };
type RStatus = "idle" | "running" | "done" | "err" | "written";
type Res = { status: RStatus; soLink?: number; min?: number | null; deXuat?: number | null; canhBao?: string; links?: string };

const vnd = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("vi-VN") + "₫");
const keyOf = (p: Prod) => `${p.sheet}:${p.row}`;

export default function MarketRunner({ cfg, crawlSites, indexInfo }: { cfg: Cfg; crawlSites: CrawlSite[]; indexInfo: { sites: number; priced: number } }) {
  const router = useRouter();
  const [tab, setTab] = useState<"scan" | "settings">("scan");
  const [crawling, setCrawling] = useState(false);
  const [crawlMsg, setCrawlMsg] = useState("");
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [prods, setProds] = useState<Prod[]>([]);
  const [res, setRes] = useState<Record<string, Res>>({});
  const [logs, setLogs] = useState<string[]>(["Hệ thống sẵn sàng. Cấu hình ở tab Cài đặt rồi bấm “Bắt đầu quét”."]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [kpi, setKpi] = useState({ tong: 0, daQuet: 0, ok: 0, loi: 0, ghi: 0 });
  const [busy, setBusy] = useState(false);
  const stopRef = useRef(false);

  const sheetReady = !!cfg.appsScriptUrl && cfg.hasSecret;
  const log = (m: string) => setLogs((p) => [...p.slice(-400), `${new Date().toLocaleTimeString("vi-VN")}  ${m}`]);

  async function api<T>(path: string, body: unknown): Promise<T> {
    const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return r.json();
  }

  async function loadSheets() {
    setBusy(true);
    try {
      const r = await api<{ ok: boolean; sheets?: SheetInfo[]; error?: string }>("/api/sourcing/pricing/sheets", { action: "listSheets" });
      if (r.ok && r.sheets) {
        setSheets(r.sheets);
        setPicked(new Set(r.sheets.map((s) => s.name)));
        log(`Tải ${r.sheets.length} sheet con từ Google Sheet.`);
      } else log("Lỗi tải sheet: " + (r.error || ""));
    } catch (e) { log("Lỗi tải sheet: " + String(e)); } finally { setBusy(false); }
  }

  async function importMine() {
    setBusy(true);
    log("Đang đưa toàn bộ SP của mình vào Google Sheet (sheet SanPham)…");
    try {
      const r = await api<{ ok: boolean; written?: number; error?: string }>("/api/sourcing/pricing/import", {});
      if (r.ok) { log(`Đã ghi ${r.written} SP vào sheet SanPham.`); await loadSheets(); }
      else log("Lỗi đưa SP: " + (r.error || ""));
    } catch (e) { log("Lỗi đưa SP: " + String(e)); } finally { setBusy(false); }
  }

  async function pingSheet() {
    setBusy(true);
    try {
      const r = await api<{ ok: boolean; sheet?: string; error?: string }>("/api/sourcing/pricing/sheets", { action: "ping" });
      log(r.ok ? `Kết nối OK: “${r.sheet}”` : "Lỗi kết nối: " + (r.error || ""));
    } catch (e) { log("Lỗi: " + String(e)); } finally { setBusy(false); }
  }
  async function setupSheet() {
    setBusy(true);
    try {
      const r = await api<{ ok: boolean; created?: string[]; error?: string }>("/api/sourcing/pricing/sheets", { action: "setup" });
      log(r.ok ? `Đã tạo cột mẫu: ${(r.created || []).join(", ")}` : "Lỗi: " + (r.error || ""));
    } catch (e) { log("Lỗi: " + String(e)); } finally { setBusy(false); }
  }

  function suggest(p: Prod, min: number): number {
    const floors = [p.giaHienTai ? Math.round(p.giaHienTai * cfg.floorPct) : 0];
    if (p.giaVon && p.giaVon > 0) floors.push(Math.round(p.giaVon * (1 + cfg.minMarginPct)));
    return Math.max(min, ...floors);
  }
  function warnOf(p: Prod, min: number): string {
    if (!p.giaHienTai) return "";
    if (p.giaVon && p.giaVon > 0 && min < p.giaVon * (1 + cfg.minMarginPct)) return "Rủi ro lỗ";
    if (p.giaHienTai > min * 1.1) return "Giá CAO hơn TT";
    if (p.giaHienTai < min * 0.95) return "Giá THẤP hơn TT";
    return "OK";
  }

  async function flush(pending: { sheet: string; row: number; soLink: number | null; min: number | null; deXuat: number | null; canhBao: string; trangThai: string; links: string }[]) {
    if (!pending.length || !sheetReady) return 0;
    try {
      const r = await api<{ ok: boolean; written?: number; error?: string }>("/api/sourcing/pricing/write", { items: pending });
      if (r.ok) {
        for (const it of pending) setRes((p) => ({ ...p, [`${it.sheet}:${it.row}`]: { ...p[`${it.sheet}:${it.row}`], status: "written" } }));
        log(`Đã ghi ${r.written} dòng lên Google Sheet.`);
        return 1;
      }
      log("Lỗi ghi Sheet: " + (r.error || ""));
    } catch (e) { log("Lỗi ghi Sheet: " + String(e)); }
    return 0;
  }

  async function start() {
    if (!sheetReady) { log("Chưa cấu hình Apps Script (tab Cài đặt)."); setTab("settings"); return; }
    setRunning(true); stopRef.current = false; setProgress(0); setRes({});
    setKpi({ tong: 0, daQuet: 0, ok: 0, loi: 0, ghi: 0 });
    // 1) Đọc sản phẩm từ sheet đã chọn
    log("Đang tải sản phẩm từ Google Sheet…");
    let items: Prod[] = [];
    try {
      const r = await api<{ ok: boolean; products?: Prod[]; error?: string }>("/api/sourcing/pricing/sheets", { action: "getProducts", sheets: [...picked] });
      if (!r.ok || !r.products) { log("Lỗi tải sản phẩm: " + (r.error || "")); setRunning(false); return; }
      items = r.products;
    } catch (e) { log("Lỗi tải sản phẩm: " + String(e)); setRunning(false); return; }
    setProds(items);
    setKpi((k) => ({ ...k, tong: items.length }));
    log(`Nạp ${items.length} sản phẩm. Bắt đầu quét (luồng dòng ${cfg.luongDong}, luồng link ${cfg.luongLink})…`);

    const queue = items.map((p, i) => ({ p, i }));
    let done = 0, ok = 0, loi = 0, ghi = 0;
    let pending: Parameters<typeof flush>[0] = [];

    const worker = async () => {
      while (queue.length && !stopRef.current) {
        const job = queue.shift();
        if (!job) break;
        const { p } = job;
        const k = keyOf(p);
        setRes((s) => ({ ...s, [k]: { status: "running" } }));
        log(`Đang xử lý dòng ${p.row} [${p.sheet}]: ${p.brand} ${p.model}…`);
        try {
          const query = `${p.brand} ${p.model} ${p.ten}`.trim() || p.model;
          const r = await api<{ ok: boolean; min?: number | null; siteCount?: number; storesFound?: number; prices?: { siteName: string; url: string }[]; error?: string }>(
            "/api/sourcing/pricing/search",
            { query, model: p.model, brand: p.brand, maxLinks: cfg.maxLinks, concurrency: cfg.luongLink },
          );
          if (r.ok && r.min != null) {
            const dx = suggest(p, r.min);
            const cb = warnOf(p, r.min);
            const links = (r.prices || []).slice(0, 5).map((m) => m.url).join(" | ");
            setRes((s) => ({ ...s, [k]: { status: "done", soLink: r.siteCount ?? 0, min: r.min, deXuat: dx, canhBao: cb, links } }));
            ok++;
            pending.push({ sheet: p.sheet, row: p.row, soLink: r.siteCount ?? 0, min: r.min, deXuat: dx, canhBao: cb, trangThai: "Thành công", links });
            log(`Dòng ${p.row} thành công: tìm thấy ${r.storesFound ?? 0} cửa hàng, ${r.siteCount ?? 0} giá. Min=${vnd(r.min)}, Đề xuất=${vnd(dx)}`);
          } else {
            setRes((s) => ({ ...s, [k]: { status: "err" } }));
            loi++;
            pending.push({ sheet: p.sheet, row: p.row, soLink: 0, min: null, deXuat: null, canhBao: "Không có giá", trangThai: "Không tìm thấy", links: "" });
            log(`Dòng ${p.row}: không tìm thấy giá thị trường.`);
          }
        } catch (e) {
          setRes((s) => ({ ...s, [k]: { status: "err" } }));
          loi++;
          log(`Dòng ${p.row} lỗi: ${String(e)}`);
        }
        done++;
        setProgress(Math.round((done / items.length) * 100));
        setKpi({ tong: items.length, daQuet: done, ok, loi, ghi });
        // Ghi Sheet theo batch
        if (pending.length >= cfg.batch) {
          const batch = pending; pending = [];
          ghi += await flush(batch);
          setKpi({ tong: items.length, daQuet: done, ok, loi, ghi });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(cfg.luongDong, queue.length) }, worker));
    if (pending.length) { ghi += await flush(pending); setKpi((kk) => ({ ...kk, ghi })); }
    log(stopRef.current ? `Đã dừng. Hoàn tất ${done}/${items.length}.` : `Quét xong ${done}/${items.length} sản phẩm.`);
    setRunning(false);
  }

  function stop() { stopRef.current = true; log("Đang dừng sau khi xong các dòng đang chạy…"); }

  /** Cào trọn catalog các sàn đối thủ → dựng/mở rộng index giá (lưu Supabase). */
  async function crawlIndex() {
    setCrawling(true);
    const queue = [...crawlSites];
    let done = 0, total = 0;
    const worker = async () => {
      while (queue.length) {
        const s = queue.shift();
        if (!s) break;
        setCrawlMsg(`Đang cào ${done + 1}/${crawlSites.length}: ${s.domain}…`);
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 75000);
          const r = await fetch("/api/sourcing/market/crawl", {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: s.url, official: s.official, brand: s.brand }), signal: ctrl.signal,
          }).then((x) => x.json()).finally(() => clearTimeout(t));
          if (r.ok && r.count) total += r.count;
          log(`Cào ${s.domain}: ${r.ok ? (r.count || 0) + " SP" : "lỗi " + (r.error || "")}`);
        } catch (e) { log(`Cào ${s.domain} lỗi: ${String(e)}`); }
        done++;
        setCrawlMsg(`Đã cào ${done}/${crawlSites.length} sàn (${total} SP).`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(5, queue.length) }, worker));
    setCrawlMsg(`Xong: cào ${crawlSites.length} sàn, ${total} SP. Index đã cập nhật.`);
    setCrawling(false);
    router.refresh();
  }

  const KPIS = [
    { label: "Tổng dòng", value: kpi.tong, color: "var(--tx)" },
    { label: "Đã quét", value: kpi.daQuet, color: "var(--c-teal)" },
    { label: "Thành công", value: kpi.ok, color: "var(--c-teal)" },
    { label: "Lỗi / Bỏ qua", value: kpi.loi, color: "var(--c-rose)" },
    { label: "Lần ghi Sheet", value: kpi.ghi, color: "var(--brand-1)" },
  ];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* Trạng thái + KPI */}
      <div className="flex between aic" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="flex aic" style={{ gap: 8 }}>
          <span className="badge b-gray">PRICING ENGINE</span>
          <span className="small muted">Trạng thái: <b style={{ color: running ? "var(--c-teal)" : "var(--tx)" }}>{running ? "Đang chạy" : "Chờ chạy"}</b></span>
        </div>
        {cfg.sheetUrl && <a href={cfg.sheetUrl} target="_blank" rel="noreferrer" className="btn ghost btn sm"><Icon name="download" /> Mở Google Sheet</a>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        {KPIS.map((s) => (
          <div key={s.label} className="card" style={{ padding: 14 }}>
            <div className="urole">{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value.toLocaleString("vi-VN")}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="chips">
        <button className={`chip${tab === "scan" ? " on" : ""}`} onClick={() => setTab("scan")}>Quét giá</button>
        <button className={`chip${tab === "settings" ? " on" : ""}`} onClick={() => setTab("settings")}>Cài đặt</button>
      </div>

      <div className="grid-k g-2" style={{ alignItems: "start" }}>
        {/* Cột trái: chọn sheet HOẶC cài đặt */}
        <div style={{ display: "grid", gap: 16 }}>
          {tab === "scan" ? (
            <>
            <div className="card">
              <div className="card-h">
                <h3 className="sec-title">Index giá đối thủ (free)</h3>
                <span className="badge b-green">{indexInfo.priced.toLocaleString("vi-VN")} SP có giá · {indexInfo.sites} sàn</span>
              </div>
              <p className="small muted" style={{ marginTop: -2 }}>
                Bản miễn phí so giá theo <b>catalog đối thủ đã cào</b> (chạy thật từ máy chủ, không cần ScraperAPI). Cào lại để làm mới giá &amp; phủ thêm sàn.
              </p>
              <button className="btn" onClick={crawlIndex} disabled={crawling} style={{ width: "100%" }}>
                <Icon name="download" /> {crawling ? "Đang cào catalog…" : `Cào catalog đối thủ (${crawlSites.length} sàn)`}
              </button>
              {crawlMsg && <p className="small" style={{ color: "var(--accent)", marginTop: 8 }}>{crawlMsg}</p>}
            </div>
            <div className="card">
              <div className="card-h">
                <h3 className="sec-title">1. Chọn sheet quét giá</h3>
                <button className="btn sm ghost" onClick={loadSheets} disabled={busy}>Tải lại danh sách</button>
              </div>
              <button className="btn" onClick={importMine} disabled={busy} style={{ width: "100%", marginBottom: 10 }}>
                <Icon name="download" /> Đưa SP của tôi vào Sheet
              </button>
              {!sheetReady && <p className="small" style={{ color: "var(--c-rose)" }}>Chưa cấu hình Apps Script — sang tab <b>Cài đặt</b>.</p>}
              {sheets.length === 0 ? (
                <p className="muted small">Bấm <b>Tải lại danh sách</b> để lấy các sheet con từ Google Sheet.</p>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  <label className="flex aic" style={{ gap: 8, fontWeight: 700 }}>
                    <input type="checkbox" checked={picked.size === sheets.length}
                      onChange={(e) => setPicked(e.target.checked ? new Set(sheets.map((s) => s.name)) : new Set())} />
                    Tất cả các sheet
                  </label>
                  {sheets.map((s) => (
                    <label key={s.name} className="flex between aic" style={{ gap: 8, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 8 }}>
                      <span className="flex aic" style={{ gap: 8 }}>
                        <input type="checkbox" checked={picked.has(s.name)}
                          onChange={(e) => setPicked((p) => { const n = new Set(p); e.target.checked ? n.add(s.name) : n.delete(s.name); return n; })} />
                        <span className="small" style={{ fontWeight: 600 }}>{s.name}</span>
                      </span>
                      <span className="urole">{s.rows} SP</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            </>
          ) : (
            <div className="card">
              <div className="card-h"><h3 className="sec-title">Cài đặt Auto Pricing</h3></div>
              <form action={saveMarketSettingsAction} style={{ display: "grid", gap: 12 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Apps Script URL</label>
                  <input name="appsScriptUrl" defaultValue={cfg.appsScriptUrl} placeholder="https://script.google.com/macros/s/…/exec" />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Sheet Secret {cfg.hasSecret && <span className="badge b-green" style={{ fontSize: 10 }}>đã đặt</span>}</label>
                  <input name="sheetSecret" type="password" placeholder={cfg.hasSecret ? "•••••• (giữ nguyên nếu để trống)" : "mật khẩu đặt trong Code.gs"} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Google Sheet URL (để mở nhanh)</label>
                  <input name="sheetUrl" defaultValue={cfg.sheetUrl} placeholder="https://docs.google.com/spreadsheets/d/…" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field" style={{ margin: 0 }}><label>Luồng dòng (SP cùng lúc)</label><input name="luongDong" inputMode="numeric" defaultValue={cfg.luongDong} /></div>
                  <div className="field" style={{ margin: 0 }}><label>Luồng link (link/SP)</label><input name="luongLink" inputMode="numeric" defaultValue={cfg.luongLink} /></div>
                  <div className="field" style={{ margin: 0 }}><label>Batch ghi Sheet</label><input name="batch" inputMode="numeric" defaultValue={cfg.batch} /></div>
                  <div className="field" style={{ margin: 0 }}><label>Số link tối đa/SP</label><input name="maxLinks" inputMode="numeric" defaultValue={cfg.maxLinks} /></div>
                </div>
                <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button type="submit" className="btn primary"><Icon name="check" /> Lưu cài đặt</button>
                  <button type="button" className="btn ghost" onClick={pingSheet} disabled={busy}>Kiểm tra kết nối</button>
                  <button type="button" className="btn ghost" onClick={setupSheet} disabled={busy}>Tạo cột mẫu</button>
                </div>
                <p className="small muted">Cần deploy Apps Script (file <code>apps-script/Code.gs</code>) lên Google Sheet để lấy URL + Secret.</p>
              </form>
            </div>
          )}
        </div>

        {/* Cột phải: điều phối + log */}
        <div className="card">
          <div className="card-h"><h3 className="sec-title">Điều phối quét giá & Log trực tiếp</h3></div>
          <div className="flex" style={{ gap: 10, flexWrap: "wrap" }}>
            <button className="btn primary" onClick={start} disabled={running || busy}><Icon name="search" /> {running ? "Đang quét…" : "Bắt đầu quét dữ liệu"}</button>
            <button className="btn ghost" onClick={stop} disabled={!running}><Icon name="x" /> Dừng</button>
          </div>
          <div className="flex between small" style={{ marginTop: 12 }}>
            <span className="muted">Tiến trình</span><span style={{ fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 6, background: "var(--surface-2)", overflow: "hidden", marginTop: 4 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--brand-grad)", transition: "width .3s" }} />
          </div>
          <div style={{ marginTop: 12, background: "#0f1720", color: "#cfe8dd", borderRadius: 12, padding: 12, height: 280, overflowY: "auto", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, lineHeight: 1.6 }}>
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      </div>

      {/* Bảng kết quả */}
      <div className="card">
        <div className="card-h">
          <h3 className="sec-title">Danh sách sản phẩm & Kết quả quét</h3>
          <span className="badge b-gray">{kpi.daQuet}/{kpi.tong}</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Dòng</th><th>Mã SP</th><th>Brand</th><th>Model</th>
                <th style={{ textAlign: "right" }}>Giá vốn</th>
                <th style={{ textAlign: "right" }}>Số link</th>
                <th style={{ textAlign: "right" }}>Giá đề xuất</th>
                <th>Trạng thái</th><th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {prods.length === 0 && (
                <tr><td colSpan={9} className="muted small" style={{ textAlign: "center", padding: 24 }}>
                  Chưa có dữ liệu. Cấu hình Sheet → chọn sheet → <b>Bắt đầu quét</b>.
                </td></tr>
              )}
              {prods.map((p) => {
                const r = res[keyOf(p)] || { status: "idle" as RStatus };
                return (
                  <tr key={keyOf(p)}>
                    <td className="small muted">{p.row}</td>
                    <td className="small"><span className="badge b-gray" style={{ fontSize: 10 }}>{p.ma || "—"}</span></td>
                    <td className="small" style={{ fontWeight: 600 }}>{p.brand}</td>
                    <td className="small">{p.model}</td>
                    <td className="small" style={{ textAlign: "right" }}>{vnd(p.giaVon)}</td>
                    <td className="small" style={{ textAlign: "right" }}>{r.soLink ?? (r.status === "running" ? "…" : "0")}</td>
                    <td className="small" style={{ textAlign: "right", fontWeight: 700, color: "var(--brand-1)" }}>{vnd(r.deXuat)}</td>
                    <td>
                      {r.status === "running" ? <span className="badge b-sky">Đang xử lý</span>
                        : r.status === "done" || r.status === "written" ? <span className="badge b-green">Thành công</span>
                        : r.status === "err" ? <span className="badge b-rose">Không có giá</span>
                        : <span className="badge b-gray">Chờ</span>}
                    </td>
                    <td>
                      {r.status === "written" ? <span style={{ color: "var(--c-teal)" }}><Icon name="check" /></span>
                        : r.status === "done" ? <span className="urole">chưa ghi</span> : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
