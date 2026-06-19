"use client";

// Nhật ký tiếp khách — port từ app nhân viên (baocaokhachhang.html), giữ nguyên
// luồng & bố cục để nhân viên quen tay; dữ liệu lưu Supabase qua server action.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  RECEPTION_CANVAS, RECEPTION_STAFF_DEFAULT, RECEPTION_SOURCE_DEFAULT,
  type ReceptionLog,
} from "@/lib/bnb/types";
import { saveReceptionAction, deleteReceptionAction, importReceptionFromSheetAction } from "./actions";

const pad = (n: number) => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1); };
const nowTime = () => { const d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const money = (v?: string) => { const n = String(v || "").replace(/[^\d]/g, ""); return n ? Number(n).toLocaleString("vi-VN") + "đ" : (v || ""); };
const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean)));

type Form = Partial<ReceptionLog>;
const emptyForm = (): Form => ({ ngay: today(), gio: nowTime() });

const lsGet = (k: string, d: string[]) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const lsSet = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ } };

export function ReceptionApp({ logs }: { logs: ReceptionLog[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "stats">("list");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [staffAdds, setStaffAdds] = useState<string[]>([]);
  const [sourceAdds, setSourceAdds] = useState<string[]>([]);
  const [canvasOpts, setCanvasOpts] = useState<Record<string, string[]>>({});
  const [newStaff, setNewStaff] = useState("");
  const [newSource, setNewSource] = useState("");
  const [importMsg, setImportMsg] = useState("");

  useEffect(() => {
    setStaffAdds(lsGet("rl_staff_add", []));
    setSourceAdds(lsGet("rl_source_add", []));
    try { const v = localStorage.getItem("rl_canvas_opts"); if (v) setCanvasOpts(JSON.parse(v)); } catch { /* noop */ }
  }, []);

  const staff = useMemo(() => uniq([...RECEPTION_STAFF_DEFAULT, ...logs.map((l) => l.nhanvien || ""), ...staffAdds]), [logs, staffAdds]);
  const sources = useMemo(() => uniq([...RECEPTION_SOURCE_DEFAULT, ...logs.map((l) => l.nguon || ""), ...sourceAdds]), [logs, sourceAdds]);

  const set = (k: keyof ReceptionLog, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const optsFor = (k: string, base: readonly string[]) => uniq([...base, ...(canvasOpts[k] || [])]);

  function toggleChip(k: keyof ReceptionLog, t: string) {
    const cur = String(form[k] || "");
    const items = cur.split(",").map((s) => s.trim()).filter(Boolean);
    const i = items.indexOf(t);
    if (i >= 0) items.splice(i, 1); else items.push(t);
    set(k, items.join(", "));
  }
  function isChipOn(k: keyof ReceptionLog, t: string) {
    return String(form[k] || "").split(",").map((s) => s.trim()).includes(t);
  }
  function addCanvasOpt(k: string, val: string) {
    const v = val.trim(); if (!v) return;
    const next = { ...canvasOpts, [k]: uniq([...(canvasOpts[k] || []), v]) };
    setCanvasOpts(next); lsSet("rl_canvas_opts", next);
  }

  function reset() { setForm(emptyForm()); setEditingId(null); }

  async function save() {
    const hasContent = RECEPTION_CANVAS.some((f) => form[f.k]) || form.sdt || form.donhang || form.tensp;
    if (!hasContent) { alert("Hãy điền ít nhất một mục ở phần Hành trình khách hàng (vd: Khách là ai, Khách xem…)."); return; }
    setBusy(true);
    try {
      await saveReceptionAction({ id: editingId || undefined, ...form });
      reset(); router.refresh();
    } finally { setBusy(false); }
  }
  function edit(e: ReceptionLog) {
    setEditingId(e.id); setForm({ ...e }); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function del(id: string) {
    if (!confirm("Xoá lượt này?")) return;
    setBusy(true);
    try { await deleteReceptionAction(id); if (editingId === id) reset(); router.refresh(); } finally { setBusy(false); }
  }
  async function doImport() {
    setBusy(true); setImportMsg("Đang lấy dữ liệu từ Google Sheet…");
    try {
      const r = await importReceptionFromSheetAction();
      setImportMsg(r.ok ? `✓ Import xong: thêm ${r.added}, bỏ qua ${r.skipped} (đã có) / tổng ${r.total}.` : `Lỗi import: ${r.error}`);
      if (r.ok) router.refresh();
    } finally { setBusy(false); }
  }

  const hasOrder = (e: ReceptionLog) => !!(e.donhang && e.donhang.trim());
  const q = search.trim().toLowerCase();
  const filtered = logs.filter((e) => !q || [e.nhanvien, e.customer, e.nguon, e.donhang, e.sdt, e.tensp].join(" ").toLowerCase().includes(q));

  // ---- thống kê ----
  const orders = logs.filter(hasOrder).length;
  const conv = logs.length ? Math.round((orders / logs.length) * 100) : 0;
  const byStaff = (() => {
    const m: Record<string, { c: number; o: number }> = {};
    logs.forEach((e) => { const k = e.nhanvien || "(chưa rõ)"; m[k] = m[k] || { c: 0, o: 0 }; m[k].c++; if (hasOrder(e)) m[k].o++; });
    return Object.entries(m).map(([n, v]) => ({ n, ...v, r: v.c ? Math.round(v.o / v.c * 100) : 0 })).sort((a, b) => b.c - a.c);
  })();
  const maxC = Math.max(1, ...byStaff.map((s) => s.c));
  const bySrc = (() => {
    const m: Record<string, number> = {};
    logs.forEach((e) => { const k = e.nguon || "(chưa rõ)"; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([n, c]) => ({ n, c })).sort((a, b) => b.c - a.c);
  })();
  const maxS = Math.max(1, ...bySrc.map((s) => s.c));

  const previewLine = (e: ReceptionLog) =>
    (["customer", "khachxem", "khachhoi", "nvtuvan", "decision"] as const)
      .map((k) => e[k]).filter((v) => v && String(v).trim()).slice(0, 3).join(" · ");

  return (
    <div className="grid-k g-2" style={{ alignItems: "start" }}>
      {/* FORM */}
      <div className="card">
        <div className="card-h"><h3>{editingId ? "Sửa lượt tiếp khách" : "Ghi lượt tiếp khách mới"}</h3></div>
        <div className="flex gap" style={{ marginBottom: 12 }}>
          <div className="field" style={{ margin: 0, flex: 1 }}><label>Ngày</label><input value={form.ngay || ""} onChange={(e) => set("ngay", e.target.value)} placeholder="dd/mm" /></div>
          <div className="field" style={{ margin: 0, flex: 1 }}><label>Thời gian</label><input value={form.gio || ""} onChange={(e) => set("gio", e.target.value)} placeholder="hh:mm" /></div>
        </div>
        <div className="field"><label>Tên nhân viên</label>
          <select className="fsel" style={{ width: "100%" }} value={form.nhanvien || staff[0] || ""} onChange={(e) => set("nhanvien", e.target.value)}>
            {staff.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="flex gap" style={{ marginTop: 6 }}>
            <input value={newStaff} onChange={(e) => setNewStaff(e.target.value)} placeholder="Thêm nhân viên mới…" style={{ fontSize: 13 }} />
            <button type="button" className="btn sm" onClick={() => { const n = newStaff.trim(); if (n && !staff.includes(n)) { const a = uniq([...staffAdds, n]); setStaffAdds(a); lsSet("rl_staff_add", a); set("nhanvien", n); } setNewStaff(""); }}>＋</button>
          </div>
        </div>
        <div className="flex gap">
          <div className="field" style={{ flex: 1 }}><label>SĐT khách</label><input value={form.sdt || ""} onChange={(e) => set("sdt", e.target.value)} placeholder="(nếu có)" /></div>
          <div className="field" style={{ flex: 1 }}><label>Khách tới từ đâu</label>
            <select className="fsel" style={{ width: "100%" }} value={form.nguon || sources[0] || ""} onChange={(e) => set("nguon", e.target.value)}>
              {sources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex gap" style={{ marginTop: 6 }}>
              <input value={newSource} onChange={(e) => setNewSource(e.target.value)} placeholder="Thêm nguồn mới…" style={{ fontSize: 13 }} />
              <button type="button" className="btn sm" onClick={() => { const n = newSource.trim(); if (n && !sources.includes(n)) { const a = uniq([...sourceAdds, n]); setSourceAdds(a); lsSet("rl_source_add", a); set("nguon", n); } setNewSource(""); }}>＋</button>
            </div>
          </div>
        </div>

        <div className="card-h" style={{ margin: "8px 0 4px", border: "none", padding: 0 }}><h3 style={{ fontSize: 14, color: "var(--c-amber)" }}>🧭 Hành trình khách hàng</h3></div>
        <p className="small muted" style={{ marginBottom: 10 }}>Tuỳ chọn — bấm chip gợi ý để điền nhanh (bấm lần nữa để bỏ), hoặc tự gõ.</p>
        {RECEPTION_CANVAS.map((f) => (
          <div className="field" key={f.k}>
            <label style={{ textTransform: "none", fontSize: 12.5 }}>{f.icon} {f.title}</label>
            <input value={String(form[f.k] || "")} onChange={(e) => set(f.k, e.target.value)} placeholder="vd: …" />
            <div className="chips" style={{ marginTop: 6 }}>
              {optsFor(f.k, f.opts).map((o) => (
                <button type="button" key={o} className={`chip${isChipOn(f.k, o) ? " on" : ""}`} style={{ fontSize: 11.5, padding: "5px 11px" }} onClick={() => toggleChip(f.k, o)}>{o}</button>
              ))}
              <AddOpt onAdd={(v) => addCanvasOpt(f.k, v)} />
            </div>
          </div>
        ))}

        <div className="card" style={{ background: "var(--c-teal-soft)", borderColor: "var(--c-teal)", marginTop: 14, padding: 14 }}>
          <b className="small" style={{ color: "var(--c-teal)" }}>📦 Chi tiết đơn hàng — chỉ điền khi khách chốt đơn</b>
          <div className="flex gap" style={{ marginTop: 10 }}>
            <div className="field" style={{ flex: 1, margin: 0 }}><label>Mã đơn hàng</label><input value={form.donhang || ""} onChange={(e) => set("donhang", e.target.value)} placeholder="#RT…" /></div>
            <div className="field" style={{ flex: 1, margin: 0 }}><label>Mã sản phẩm</label><input value={form.masp || ""} onChange={(e) => set("masp", e.target.value)} placeholder="vd: PXE675DC1E" /></div>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>Tên sản phẩm</label><input value={form.tensp || ""} onChange={(e) => set("tensp", e.target.value)} placeholder="vd: Bếp từ Bosch Series 8" /></div>
          <div className="flex gap">
            <div className="field" style={{ flex: 1, margin: 0 }}><label>Loại (CAT)</label><input value={form.cat || ""} onChange={(e) => set("cat", e.target.value)} /></div>
            <div className="field" style={{ flex: 1, margin: 0 }}><label>Số lượng</label><input value={form.soluong || ""} onChange={(e) => set("soluong", e.target.value)} placeholder="1" /></div>
          </div>
          <div className="flex gap" style={{ marginTop: 10 }}>
            <div className="field" style={{ flex: 1, margin: 0 }}><label>Số tiền TT</label><input value={form.sotien || ""} onChange={(e) => set("sotien", e.target.value)} placeholder="21470000" /></div>
            <div className="field" style={{ flex: 1, margin: 0 }}><label>Đặt cọc</label><input value={form.datcoc || ""} onChange={(e) => set("datcoc", e.target.value)} /></div>
          </div>
          <div className="flex gap" style={{ marginTop: 10 }}>
            <div className="field" style={{ flex: 1, margin: 0 }}><label>Ngày chốt</label><input value={form.ngaychot || ""} onChange={(e) => set("ngaychot", e.target.value)} placeholder="dd/mm/yyyy" /></div>
            <div className="field" style={{ flex: 1, margin: 0 }}><label>Tổng t.gian</label><input value={form.tongtg || ""} onChange={(e) => set("tongtg", e.target.value)} placeholder="1 tiếng" /></div>
          </div>
        </div>

        <button className="btn primary" style={{ width: "100%", marginTop: 14, justifyContent: "center" }} onClick={save} disabled={busy}><Icon name="check" /> {editingId ? "Cập nhật" : "Lưu lượt tiếp khách"}</button>
        {editingId && <button className="btn ghost" style={{ width: "100%", marginTop: 8, justifyContent: "center" }} onClick={reset} disabled={busy}>Huỷ sửa</button>}
      </div>

      {/* RIGHT: list / stats */}
      <div>
        <div className="flex between aic" style={{ marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div className="chips">
            <button className={`chip${view === "list" ? " on" : ""}`} onClick={() => setView("list")}>Danh sách ({logs.length})</button>
            <button className={`chip${view === "stats" ? " on" : ""}`} onClick={() => setView("stats")}>Thống kê</button>
          </div>
          <div className="flex gap aic">
            {view === "list" && <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm…" style={{ width: 200 }} />}
            <button className="btn sm" onClick={doImport} disabled={busy} title="Lấy dữ liệu nhật ký từ Google Sheet"><Icon name="download" /> Import sheet</button>
          </div>
        </div>
        {importMsg && <div className="badge b-indigo" style={{ marginBottom: 10 }}>{importMsg}</div>}

        {view === "list" ? (
          filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", color: "var(--tx-muted)", padding: "40px 20px" }}>{logs.length ? "Không có kết quả phù hợp." : "Chưa có lượt nào. Ghi lượt đầu tiên bên trái."}</div>
          ) : filtered.map((e) => (
            <div className="card" key={e.id} style={{ marginBottom: 10 }}>
              <div className="flex between" style={{ alignItems: "flex-start", gap: 12 }}>
                <div className="flex aic gap" style={{ flexWrap: "wrap", fontSize: 12.5, color: "var(--tx-muted)" }}>
                  <b style={{ color: "var(--tx)" }}>{e.gio}</b><span>· {e.ngay}</span>
                  <span className="badge b-gray">{e.nhanvien}</span>
                  <span className="badge b-amber">{e.nguon}</span>
                  {hasOrder(e) && <span className="badge b-green">Đơn: {e.donhang}</span>}
                </div>
                <div className="flex gap">
                  <button className="btn ghost sm" onClick={() => edit(e)}>✎</button>
                  <button className="btn ghost sm" onClick={() => del(e.id)} disabled={busy}>🗑</button>
                </div>
              </div>
              {previewLine(e) && <p className="small" style={{ marginTop: 8 }}>{previewLine(e)}</p>}
              {(e.masp || e.tensp || e.sotien) && (
                <p className="small muted" style={{ marginTop: 6 }}>📦 {[e.tensp, e.masp && "Mã: " + e.masp, e.soluong && "SL: " + e.soluong, e.sotien && "TT: " + money(e.sotien), e.datcoc && "Cọc: " + money(e.datcoc)].filter(Boolean).join(" · ")}</p>
              )}
              {(e.sdt || e.ngaychot || e.tongtg) && (
                <div className="small muted" style={{ marginTop: 6, display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {e.sdt && <span>📞 {e.sdt}</span>}{e.ngaychot && <span>Chốt: {e.ngaychot}</span>}{e.tongtg && <span>Tổng: {e.tongtg}</span>}
                </div>
              )}
              {RECEPTION_CANVAS.some((f) => e[f.k]) && (
                <details style={{ marginTop: 8 }}>
                  <summary className="small" style={{ color: "var(--c-amber)", fontWeight: 600, cursor: "pointer" }}>🧭 Hành trình khách hàng</summary>
                  {RECEPTION_CANVAS.filter((f) => e[f.k]).map((f) => (
                    <div className="small" key={f.k} style={{ marginTop: 6 }}><span className="muted">{f.icon} {f.title}:</span> {String(e[f.k])}</div>
                  ))}
                </details>
              )}
            </div>
          ))
        ) : (
          <>
            <div className="grid-k g-3" style={{ marginBottom: 16 }}>
              <div className="card"><div className="small muted">Tổng lượt</div><div style={{ fontSize: 26, fontWeight: 800 }}>{logs.length}</div></div>
              <div className="card"><div className="small muted">Tổng đơn</div><div style={{ fontSize: 26, fontWeight: 800, color: "var(--c-teal)" }}>{orders}</div></div>
              <div className="card"><div className="small muted">Tỷ lệ chốt</div><div style={{ fontSize: 26, fontWeight: 800, color: "var(--c-amber)" }}>{conv}%</div></div>
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-h"><h3>Theo nhân viên</h3></div>
              {byStaff.map((s) => (
                <div key={s.n} style={{ marginBottom: 12 }}>
                  <div className="flex between small"><span>{s.n}</span><span className="muted"><b style={{ color: "var(--tx)" }}>{s.c}</b> lượt · <b style={{ color: "var(--c-teal)" }}>{s.o}</b> đơn · <b style={{ color: "var(--c-amber)" }}>{s.r}%</b></span></div>
                  <div className="bar" style={{ marginTop: 4 }}><i style={{ width: `${s.c / maxC * 100}%`, background: "var(--c-amber)" }} /></div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-h"><h3>Theo nguồn khách</h3></div>
              {bySrc.map((s) => (
                <div key={s.n} style={{ marginBottom: 12 }}>
                  <div className="flex between small"><span>{s.n}</span><span className="muted"><b style={{ color: "var(--tx)" }}>{s.c}</b> lượt</span></div>
                  <div className="bar" style={{ marginTop: 4 }}><i style={{ width: `${s.c / maxS * 100}%`, background: "var(--brand-1)" }} /></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AddOpt({ onAdd }: { onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <span className="flex gap" style={{ alignItems: "center" }}>
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(v); setV(""); } }} placeholder="Thêm gợi ý…" style={{ fontSize: 12, padding: "4px 9px", width: 130, height: "auto" }} />
      <button type="button" className="btn sm" onClick={() => { onAdd(v); setV(""); }}>＋</button>
    </span>
  );
}
