"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  mineAt,
  sites,
  initialRows,
  cfg,
}: {
  mineCount: number;
  mineAt: string | null;
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
    try {
      const r = await fetch("/api/sourcing/market/crawl", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: s.url, official: s.official, brand: s.brand }),
      }).then((x) => x.json());
      setSt((p) => ({
        ...p,
        [s.domain]: r.ok
          ? { status: "done", crawled: r.count, note: r.note }
          : { status: "err", note: r.error },
      }));
      return r.ok ? r.count : 0;
    } catch (e) {
      setSt((p) => ({ ...p, [s.domain]: { status: "err", note: String(e) } }));
      return 0;
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
    let total = 0;
    for (let i = 0; i < sites.length; i++) {
      setMsg(`Đang quét ${i + 1}/${sites.length}: ${sites[i].domain}${sites[i].official ? " (chính hãng)" : ""}…`);
      total += await crawlOne(sites[i]);
    }
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
    a.download = `so-gia-thi-truong-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const officialCount = sites.filter((s) => s.official).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Giá thị trường — Cào & so giá tự động</h1>
        <p className="text-sm text-gray-500">
          Tự dò giá thấp nhất trên các web liên quan theo mã SP của mình. Ưu tiên <b>trang chính hãng</b> trước
          ({officialCount} web), rồi web bán lẻ đa hãng — không cần dán URL tay.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
        <button
          onClick={syncMine}
          disabled={busy}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Đồng bộ SP của tôi
        </button>
        <span className="text-sm text-gray-600">
          {mineCount} SP {mineAt ? `· đồng bộ ${new Date(mineAt).toLocaleString("vi-VN")}` : "· chưa đồng bộ"}
        </span>
        <button
          onClick={crawlAll}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Đang chạy…" : "Quét tất cả & so giá"}
        </button>
        <button
          onClick={compare}
          disabled={busy}
          className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          So giá lại
        </button>
        <button
          onClick={exportCsv}
          disabled={!rows.length}
          className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Tải CSV (mở bằng Google Sheet/Excel)
        </button>
        {msg && <span className="text-sm text-blue-700">{msg}</span>}
      </div>

      {/* Danh sách web (chính hãng trước) */}
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">
          Web so giá ({sites.length}) — chính hãng trước
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((s) => {
            const stt = st[s.domain] || { status: "idle" as Status };
            return (
              <div
                key={s.domain}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${s.official ? "border-emerald-300 bg-emerald-50" : "bg-gray-50"}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1 truncate font-medium">
                    {s.official && <span className="rounded bg-emerald-600 px-1 text-[10px] text-white">CHÍNH HÃNG</span>}
                    <span className="truncate">{s.domain}</span>
                  </div>
                  <div className="text-xs text-gray-500">
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
                <button
                  onClick={() => crawlOne(s).then(() => compare())}
                  disabled={busy}
                  className="ml-2 shrink-0 rounded border px-2 py-1 text-xs disabled:opacity-50"
                >
                  Quét
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bảng so giá */}
      <section className="rounded-xl border bg-white">
        <div className="border-b p-3 text-sm font-semibold text-gray-700">
          Bảng so giá ({rows.length} SP khớp) — SP mình đang bán đắt hơn thị trường xếp đầu
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="p-2">Mã / Tên</th>
                <th className="p-2 text-right">Giá bán của tôi</th>
                <th className="p-2 text-right">Số web</th>
                <th className="p-2 text-right">Rẻ nhất TT</th>
                <th className="p-2 text-right">Chính hãng</th>
                <th className="p-2 text-right">Đề xuất</th>
                <th className="p-2 text-right">% so TT</th>
                <th className="p-2">Cảnh báo</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-400">
                    Chưa có dữ liệu. Bấm <b>Đồng bộ SP của tôi</b> → <b>Quét tất cả &amp; so giá</b>.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.code} className="border-t align-top">
                  <td className="p-2">
                    <div className="font-medium">{r.code}</div>
                    <div className="max-w-md truncate text-xs text-gray-500">{r.name}</div>
                  </td>
                  <td className="p-2 text-right">{vnd(r.myPrice)}</td>
                  <td className="p-2 text-right">{r.siteCount}</td>
                  <td className="p-2 text-right">
                    {r.cheapestUrl ? (
                      <a href={r.cheapestUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        {vnd(r.marketMin)}
                      </a>
                    ) : (
                      vnd(r.marketMin)
                    )}
                    {r.cheapestSite && <div className="text-[10px] text-gray-400">{r.cheapestSite}</div>}
                  </td>
                  <td className="p-2 text-right">
                    {vnd(r.officialMin)}
                    {r.officialSite && <div className="text-[10px] text-emerald-600">{r.officialSite}</div>}
                  </td>
                  <td className="p-2 text-right font-semibold text-blue-700">{vnd(r.suggested)}</td>
                  <td className={`p-2 text-right ${r.pctVsMin != null && r.pctVsMin > 5 ? "text-red-600" : r.pctVsMin != null && r.pctVsMin < -5 ? "text-amber-600" : ""}`}>
                    {r.pctVsMin == null ? "—" : (r.pctVsMin > 0 ? "+" : "") + r.pctVsMin.toFixed(1) + "%"}
                  </td>
                  <td className="p-2">
                    {r.lossRisk ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Rủi ro lỗ</span>
                    ) : r.warning === "cao" ? (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">Cao hơn TT</span>
                    ) : r.warning === "thap" ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Thấp hơn TT</span>
                    ) : (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
