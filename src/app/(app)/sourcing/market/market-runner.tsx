"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import type { CompactRow } from "@/lib/bnb/market/compare";

type SiteView = {
  url: string;
  domain: string;
  official: boolean;
  brand: string | null;
  catCount: number | null;
  crawled: number | null;
  platform: string | null;
  note: string | null;
  crawledAt: string | null;
};
type Status = "idle" | "running" | "done" | "err";

const vnd = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("vi-VN") + "₫";

export default function MarketRunner({
  mineCount,
  mineAtLabel,
  sites,
  initialRows,
  cfg,
}: {
  mineCount: number;
  mineAtLabel: string | null;
  sites: SiteView[];
  initialRows: CompactRow[];
  cfg: { floorPct: number; minMarginPct: number };
}) {
  const router = useRouter();
  const [rows, setRows] = useState<CompactRow[]>(initialRows);
  const [st, setSt] = useState<Record<string, { status: Status; crawled?: number; note?: string }>>(
    Object.fromEntries(
      sites.map((s) => [s.domain, { status: s.crawled != null ? ("done" as Status) : ("idle" as Status), crawled: s.crawled ?? undefined, note: s.note ?? undefined }]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function syncMine() {
    setBusy(true);
    setMsg("Đang đồng bộ sản phẩm của mình từ Haravan…");
    try {
      const r = await fetch("/api/sourcing/market/sync", { method: "POST" }).then((x) => x.json());
      setMsg(r.ok ? `Đã đồng bộ ${r.count} SP của mình.` : "Lỗi đồng bộ: " + (r.error || ""));
      if (r.ok) router.refresh();
    } catch (e) {
      setMsg("Lỗi đồng bộ: " + String(e));
    } finally {
      setBusy(false);
    }
  }

  async function crawlOne(s: SiteView) {
    setSt((p) => ({ ...p, [s.domain]: { ...p[s.domain], status: "running" } }));
    // Timeout cứng phía client: nếu hàm serverless treo/quá 60s → không để kẹt UI mãi.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 75000);
    try {
      const r = await fetch("/api/sourcing/market/crawl", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: s.url, official: s.official, brand: s.brand }),
        signal: ctrl.signal,
      }).then((x) => x.json());
      setSt((p) => ({
        ...p,
        [s.domain]: r.ok
          ? { status: "done", crawled: r.count, note: r.note }
          : { status: "err", note: r.error },
      }));
      return r.ok ? r.count : 0;
    } catch (e) {
      const note = ctrl.signal.aborted ? "quá thời gian (web chậm/chặn bot)" : String(e);
      setSt((p) => ({ ...p, [s.domain]: { status: "err", note } }));
      return 0;
    } finally {
      clearTimeout(timer);
    }
  }

  async function compare() {
    setMsg("Đang dựng bảng so giá…");
    const r = await fetch("/api/sourcing/market/compare", { method: "POST" }).then((x) => x.json());
    if (r.ok) {
      setRows(r.rows);
      setMsg(`So giá xong: ${r.rows.length} SP khớp giá thị trường (từ ${r.sitesCrawled} web).`);
    } else setMsg("Lỗi so giá: " + (r.error || ""));
  }

  async function crawlAll() {
    if (!mineCount) {
      setMsg("Hãy bấm 'Đồng bộ SP của tôi' trước.");
      return;
    }
    setBusy(true);
    // Quét SONG SONG (nhiều luồng) thay vì tuần tự: 1 web treo không còn chặn cả lượt,
    // tổng thời gian giảm ~số-luồng lần. Mỗi web vẫn có timeout cứng trong crawlOne.
    const CONCURRENCY = 5;
    const queue = [...sites];
    let total = 0;
    let done = 0;
    async function worker() {
      while (queue.length) {
        const s = queue.shift();
        if (!s) break;
        total += await crawlOne(s);
        done++;
        setMsg(`Đang quét ${done}/${sites.length} web… (${total} SP)`);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, sites.length) }, worker));
    setMsg(`Quét xong ${sites.length} web, ${total} SP. Đang so giá…`);
    await compare();
    setBusy(false);
  }

  function exportCsv() {
    const head = [
      "Mã", "Hãng", "Tên", "Giá bán của tôi", "Giá vốn", "Số web",
      "Giá rẻ nhất TT", "Web rẻ nhất", "Giá chính hãng", "Giá đề xuất", "% so TT", "Cảnh báo",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [
        r.code, r.vendor, r.name, r.myPrice, r.cost ?? "", r.siteCount,
        r.marketMin ?? "", r.cheapestSite ?? "", r.officialMin ?? "", r.suggested ?? "",
        r.pctVsMin == null ? "" : r.pctVsMin.toFixed(1) + "%",
        r.lossRisk ? "RỦI RO LỖ" : r.warning === "cao" ? "Giá mình CAO hơn TT" : r.warning === "thap" ? "Giá mình THẤP hơn TT" : "OK",
      ]
        .map(esc)
        .join(","),
    );
    const csv = "﻿" + [head.map(esc).join(","), ...lines].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `so-gia-thi-truong.csv`;
    a.click();
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Thanh công cụ */}
      <div className="card">
        <div className="flex aic" style={{ flexWrap: "wrap", gap: 12 }}>
          <button onClick={syncMine} disabled={busy} className="btn">
            <Icon name="download" /> Đồng bộ SP của tôi
          </button>
          <span className="small muted">
            {mineCount} SP {mineAtLabel ? `· đồng bộ ${mineAtLabel}` : "· chưa đồng bộ"}
          </span>
          <button onClick={crawlAll} disabled={busy} className="btn primary">
            <Icon name="search" /> {busy ? "Đang chạy…" : "Quét tất cả & so giá"}
          </button>
          <button onClick={compare} disabled={busy} className="btn ghost">
            <Icon name="check" /> So giá lại
          </button>
          <button onClick={exportCsv} disabled={!rows.length} className="btn ghost">
            <Icon name="download" /> Tải CSV
          </button>
          {msg && <span className="small" style={{ color: "var(--accent)", fontWeight: 600 }}>{msg}</span>}
        </div>
      </div>

      {/* Danh sách web (chính hãng trước) */}
      <div className="card">
        <div className="card-h">
          <h3 className="sec-title">Web so giá — chính hãng trước</h3>
          <span className="badge b-gray">{sites.length}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {sites.map((s) => {
            const stt = st[s.domain] || { status: "idle" as Status };
            return (
              <div
                key={s.domain}
                className="flex between aic"
                style={{
                  gap: 8,
                  border: `1px solid ${s.official ? "var(--c-teal)" : "var(--line)"}`,
                  background: s.official ? "var(--c-teal-soft)" : "var(--surface-2)",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="flex aic" style={{ gap: 6 }}>
                    {s.official && <span className="badge b-green" style={{ fontSize: 10 }}>CHÍNH HÃNG</span>}
                    <span className="small" style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.domain}</span>
                  </div>
                  <div className="urole" style={{ marginTop: 2 }}>
                    {s.brand ? `Hãng ${s.brand} · ` : ""}
                    {stt.status === "running"
                      ? "đang quét…"
                      : stt.status === "err"
                        ? "lỗi: " + (stt.note || "")
                        : stt.crawled != null
                          ? `${stt.crawled} SP${stt.note ? " · " + stt.note : ""}`
                          : "chưa quét"}
                  </div>
                </div>
                <button onClick={() => crawlOne(s).then(() => compare())} disabled={busy} className="btn sm ghost">
                  Quét
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bảng so giá */}
      <div className="card">
        <div className="card-h">
          <h3 className="sec-title">Bảng so giá — SP mình đang bán đắt hơn thị trường xếp đầu</h3>
          <span className="badge b-gray">{rows.length} SP khớp</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Mã / Tên</th>
                <th style={{ textAlign: "right" }}>Giá bán của tôi</th>
                <th style={{ textAlign: "right" }}>Số web</th>
                <th style={{ textAlign: "right" }}>Rẻ nhất TT</th>
                <th style={{ textAlign: "right" }}>Chính hãng</th>
                <th style={{ textAlign: "right" }}>Đề xuất</th>
                <th style={{ textAlign: "right" }}>% so TT</th>
                <th>Cảnh báo</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted small" style={{ textAlign: "center", padding: 24 }}>
                    Chưa có dữ liệu. Bấm <b>Đồng bộ SP của tôi</b> → <b>Quét tất cả &amp; so giá</b>.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.code}>
                  <td>
                    <div className="small" style={{ fontWeight: 700 }}>{r.code}</div>
                    <div className="urole" style={{ maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                  </td>
                  <td className="small" style={{ textAlign: "right" }}>{vnd(r.myPrice)}</td>
                  <td className="small" style={{ textAlign: "right" }}>{r.siteCount}</td>
                  <td className="small" style={{ textAlign: "right" }}>
                    {r.cheapestUrl ? (
                      <a href={r.cheapestUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{vnd(r.marketMin)}</a>
                    ) : (
                      vnd(r.marketMin)
                    )}
                    {r.cheapestSite && <div className="urole">{r.cheapestSite}</div>}
                  </td>
                  <td className="small" style={{ textAlign: "right" }}>
                    {vnd(r.officialMin)}
                    {r.officialSite && <div className="urole" style={{ color: "var(--c-teal)" }}>{r.officialSite}</div>}
                  </td>
                  <td className="small" style={{ textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{vnd(r.suggested)}</td>
                  <td
                    className="small"
                    style={{ textAlign: "right", fontWeight: 600, color: r.pctVsMin != null && r.pctVsMin > 5 ? "var(--c-rose)" : r.pctVsMin != null && r.pctVsMin < -5 ? "var(--c-amber)" : "var(--tx)" }}
                  >
                    {r.pctVsMin == null ? "—" : (r.pctVsMin > 0 ? "+" : "") + r.pctVsMin.toFixed(1) + "%"}
                  </td>
                  <td>
                    {r.lossRisk ? (
                      <span className="badge b-rose">Rủi ro lỗ</span>
                    ) : r.warning === "cao" ? (
                      <span className="badge b-amber">Cao hơn TT</span>
                    ) : r.warning === "thap" ? (
                      <span className="badge b-sky">Thấp hơn TT</span>
                    ) : (
                      <span className="badge b-green">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
