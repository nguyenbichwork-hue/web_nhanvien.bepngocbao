"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { applyWeeklyQuoteAction } from "./actions";

const ERR: Record<string, string> = {
  no_key: "Chưa cấu hình API key AI (ANTHROPIC_API_KEY hoặc GEMINI_API_KEY). Tạm thời dán tay ở ô bên phải.",
  too_large: "File quá lớn.",
  error: "Lỗi bóc dữ liệu.",
};

export function QuoteImporter({ brands, defaultBrand }: { brands: string[]; defaultBrand?: string }) {
  const [brand, setBrand] = useState(defaultBrand || "");
  const [rows, setRows] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "err" | "info">("info");
  const fileRef = useRef<HTMLInputElement>(null);

  async function runAI() {
    const files = fileRef.current?.files;
    if (!brand) { setTone("err"); setMsg("Chọn nhà cung cấp trước."); return; }
    if (!files || !files.length) { setTone("err"); setMsg("Chọn file PDF/ảnh báo giá."); return; }
    setBusy(true); setTone("info"); setMsg("Đang bóc bằng AI… (15–40s)");
    try {
      const fd = new FormData();
      fd.append("brand", brand);
      for (const f of Array.from(files)) fd.append("files", f);
      const res = await fetch("/api/sourcing/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.ok) { setTone("err"); setMsg((ERR[data.reason] || "Lỗi") + (data.message ? ` (${data.message})` : "")); return; }
      setRows((prev) => (prev ? prev + "\n" : "") + data.text);
      setTone("ok");
      setMsg(`Đã bóc ${data.count} dòng bằng ${data.provider} (${data.model}). Kiểm tra/sửa rồi bấm “Khớp & cập nhật”.`);
    } catch (e) {
      setTone("err"); setMsg("Lỗi gọi AI: " + (e instanceof Error ? e.message : String(e)));
    } finally { setBusy(false); }
  }

  const msgColor = tone === "ok" ? "var(--b-green,#0e9d6e)" : tone === "err" ? "var(--b-rose,#e23b54)" : "var(--tx-soft)";

  return (
    <div className="grid-k g-2" style={{ alignItems: "start" }}>
      {/* AI bóc tự động */}
      <div className="card">
        <div className="card-h"><h3 className="sec-title">Bóc tự động từ PDF/ảnh (AI)</h3></div>
        <div className="field">
          <label>Nhà cung cấp *</label>
          <select value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">— Chọn NCC —</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="field">
          <label>File báo giá (PDF / ảnh, ≤ 20MB, chọn nhiều được)</label>
          <input ref={fileRef} type="file" accept=".pdf,image/*" multiple />
        </div>
        <button type="button" className="btn primary" onClick={runAI} disabled={busy}>
          <Icon name="sparkle" /> {busy ? "Đang bóc…" : "Bóc bằng AI"}
        </button>
        {msg && <p className="small" style={{ marginTop: 10, color: msgColor }}>{msg}</p>}
        <p className="small muted" style={{ marginTop: 12 }}>
          AI đọc bảng giá → tự điền cột Model + Giá vốn sang ô bên phải để bạn duyệt. PDF/ảnh nào quá lớn (catalogue) thì chụp/cắt phần bảng giá rồi tải lên.
        </p>
      </div>

      {/* Duyệt & áp dụng */}
      <div className="card">
        <div className="card-h"><h3 className="sec-title">Duyệt &amp; cập nhật</h3></div>
        <form action={applyWeeklyQuoteAction}>
          <input type="hidden" name="brand" value={brand} />
          <div className="field" style={{ margin: 0 }}>
            <label>Kết quả: mỗi dòng <code>model [TAB] giá vốn</code> — sửa nếu cần</label>
            <textarea
              name="rows"
              value={rows}
              onChange={(e) => setRows(e.target.value)}
              rows={14}
              placeholder={"AI sẽ điền vào đây, hoặc dán tay từ Excel:\nPID675DC1E\t12500000\nPID775DC1E\t13800000"}
              style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }}
            />
          </div>
          <button type="submit" className="btn primary" style={{ marginTop: 12 }} disabled={!brand}>
            <Icon name="check" /> Khớp &amp; cập nhật giá
          </button>
        </form>
      </div>
    </div>
  );
}
