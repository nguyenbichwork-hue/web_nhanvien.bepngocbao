"use client";

// Báo cáo ca — port luồng 5 bước từ app nhân viên (chamcongbnb): chọn chi nhánh →
// người → mở/đóng ca (+GPS) → chụp ảnh checklist (đóng dấu giờ+GPS lên ảnh) → gửi.
// Ảnh base64 + Telegram gửi thẳng qua Apps Script cũ → Drive (bot nguyên); metadata
// lưu Supabase qua server action.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { saveShiftCheckinAction } from "./actions";

// Apps Script web app của báo cáo ca (giữ nguyên — xử lý Drive + Telegram).
const ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbyScUHFfQrUO4IrXY6cqXPhIBPiXiPrC9NJRSMW5DvM-F0skWHv1DDrY6qVHYZy7VRZ/exec";

const SHOWROOMS = [{ id: "sr1", name: "Bếp Ngọc Bảo", addr: "62 Bạch Đằng, BT" }];
const EMPLOYEES = [
  { id: "nv1", name: "Đào Kế Thịnh", role: "Store Manager" },
  { id: "nv2", name: "Lê Huỳnh Hiếu", role: "Sale" },
  { id: "nv3", name: "Bùi Khương Duy", role: "Sale" },
  { id: "nv4", name: "Cát An", role: "Sale" },
];
type Item = { id: string; label: string; hint: string; icon: string; required: boolean };
const CHECKLIST: Record<"open" | "close", Item[]> = {
  open: [
    { id: "front", label: "Mặt tiền showroom", hint: "Toàn cảnh từ ngoài vào", icon: "🏬", required: true },
    { id: "display", label: "Khu trưng bày sản phẩm", hint: "Kệ/bàn trưng bày chính", icon: "🛍️", required: true },
    { id: "demo", label: "Sản phẩm demo", hint: "Sản phẩm dùng thử", icon: "📱", required: true },
    { id: "clean", label: "Vệ sinh tổng quát", hint: "Sàn, kính, quầy", icon: "🧹", required: true },
    { id: "extra1", label: "Ảnh bổ sung 1", hint: "Tuỳ chọn", icon: "➕", required: false },
    { id: "extra2", label: "Ảnh bổ sung 2", hint: "Tuỳ chọn", icon: "➕", required: false },
  ],
  close: [
    { id: "front", label: "Khoá cửa / mặt tiền", hint: "Trạng thái cuối ngày", icon: "🔒", required: true },
    { id: "display", label: "Khu trưng bày", hint: "Sau khi sắp xếp lại", icon: "🛍️", required: true },
    { id: "demo", label: "Sản phẩm demo đã cất", hint: "Kiểm kê demo", icon: "📦", required: true },
    { id: "clean", label: "Vệ sinh tổng quát", hint: "Dọn dẹp cuối ca", icon: "🧹", required: true },
    { id: "extra1", label: "Ảnh bổ sung 1", hint: "Tuỳ chọn", icon: "➕", required: false },
    { id: "extra2", label: "Ảnh bổ sung 2", hint: "Tuỳ chọn", icon: "➕", required: false },
  ],
};

type Showroom = (typeof SHOWROOMS)[number];
type Employee = (typeof EMPLOYEES)[number];
type Photo = { label: string; data: string };

const pad = (n: number) => String(n).padStart(2, "0");

export function CheckinWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [showroom, setShowroom] = useState<Showroom | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [shift, setShift] = useState<"open" | "close" | null>(null);
  const [photos, setPhotos] = useState<Record<string, Photo>>({});
  const [gps, setGps] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [gpsTxt, setGpsTxt] = useState("Đang lấy vị trí…");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; msg: string }>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingItem = useRef<Item | null>(null);

  const shiftLabel = shift === "open" ? "Mở ca" : shift === "close" ? "Đóng ca" : "";
  const list = shift ? CHECKLIST[shift] : [];
  const need = list.filter((i) => i.required);
  const have = need.filter((i) => photos[i.id]);
  const ckOk = need.length > 0 && have.length === need.length;

  // GPS khi tới bước 3
  useEffect(() => {
    if (step !== 2 || gps || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const g = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) };
        setGps(g); setGpsTxt(`Đã định vị · ±${g.acc}m · đang tra địa chỉ…`);
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${g.lat}&lon=${g.lng}&accept-language=vi&zoom=18`, { headers: { Accept: "application/json" } })
          .then((r) => r.json())
          .then((j) => {
            const a = j.address || {};
            const parts = [[a.house_number, a.road].filter(Boolean).join(" "), a.quarter || a.suburb || a.neighbourhood, a.city_district || a.district || a.county, a.city || a.town || a.state].filter(Boolean);
            const addr = parts.length ? parts.join(", ") : j.display_name || "";
            if (addr) { setAddress(addr); setGpsTxt(addr); } else setGpsTxt(`Đã định vị · ±${g.acc}m`);
          })
          .catch(() => setGpsTxt(`Đã định vị · ±${g.acc}m`));
      },
      () => setGpsTxt("Chưa lấy được vị trí — vẫn có thể tiếp tục"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }, [step, gps]);

  function openCamera(it: Item) { pendingItem.current = it; if (fileRef.current) { fileRef.current.value = ""; fileRef.current.click(); } }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; const it = pendingItem.current;
    if (!file || !it) return;
    const data = await stampImage(file, it);
    setPhotos((p) => ({ ...p, [it.id]: { label: it.label, data } }));
  }

  // Đóng dấu giờ + GPS lên ảnh (chống dùng ảnh cũ).
  function stampImage(file: File, item: Item): Promise<string> {
    return new Promise((res) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        const cv = canvasRef.current!; const MAX = 1280;
        let w = img.width, h = img.height;
        const scale = Math.min(1, MAX / Math.max(w, h)); w = Math.round(w * scale); h = Math.round(h * scale);
        cv.width = w; cv.height = h; const ctx = cv.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        const now = new Date();
        const stamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const gpsLine = address ? `📍 ${address}` : gps ? `📍 ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} (±${gps.acc}m)` : "📍 Vị trí: chưa xác định";
        const lines = [`${showroom?.name} · ${shiftLabel}`, `${item.label} · ${employee?.name}`, stamp, gpsLine];
        const fs = Math.max(13, Math.round(w * 0.026));
        const lh = fs * 1.42, padX = fs * 0.7, boxH = lh * lines.length + fs * 0.8;
        const grad = ctx.createLinearGradient(0, h - boxH - fs, 0, h);
        grad.addColorStop(0, "rgba(0,0,0,0)"); grad.addColorStop(1, "rgba(0,0,0,.72)");
        ctx.fillStyle = grad; ctx.fillRect(0, h - boxH - fs, w, boxH + fs);
        ctx.fillStyle = "#fff"; ctx.textBaseline = "top";
        lines.forEach((t, i) => {
          ctx.globalAlpha = i < 2 ? 1 : 0.92;
          ctx.font = i === 0 ? `700 ${fs}px "Be Vietnam Pro",sans-serif` : `500 ${fs * 0.92}px "Be Vietnam Pro",sans-serif`;
          ctx.fillText(t, padX, h - boxH + i * lh);
        });
        ctx.globalAlpha = 1; URL.revokeObjectURL(url);
        res(cv.toDataURL("image/jpeg", 0.82));
      };
      img.src = url;
    });
  }

  function reset() {
    setStep(0); setShowroom(null); setEmployee(null); setShift(null);
    setPhotos({}); setGps(null); setAddress(""); setNote(""); setResult(null);
  }

  async function submit() {
    setSending(true);
    const payload = {
      showroom, employee, shift: { key: shift, label: shiftLabel },
      gps, address, note, timestamp: new Date().toISOString(),
      photos: Object.entries(photos).map(([id, p]) => ({ id, label: p.label, data: p.data })),
    };
    let sent = false;
    try {
      const r = await fetch(ENDPOINT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      const out = await r.json().catch(() => ({ ok: r.ok }));
      sent = out.ok !== false;
    } catch { sent = false; }
    // luôn lưu metadata vào Supabase (kể cả khi gửi Drive lỗi để không mất báo cáo)
    try {
      await saveShiftCheckinAction({
        showroom: showroom?.name, employee: employee?.name, shift: shift || undefined, shiftLabel,
        address, lat: gps?.lat, lng: gps?.lng, note,
        photoCount: Object.keys(photos).length, photoLabels: Object.values(photos).map((p) => p.label),
        sentToServer: sent,
      });
    } catch { /* noop */ }
    setSending(false);
    setResult(sent
      ? { ok: true, msg: `Đã gửi báo cáo ${shiftLabel} tại ${showroom?.name} (ảnh về Drive + Telegram).` }
      : { ok: false, msg: "Gửi ảnh lên Drive chưa được, nhưng báo cáo đã lưu vào hệ thống. Kiểm tra mạng rồi thử lại nếu cần." });
    router.refresh();
  }

  const optStyle = (sel: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 13, width: "100%", textAlign: "left", padding: 16,
    border: `1.5px solid ${sel ? "var(--brand-1)" : "var(--line)"}`, borderRadius: "var(--r-md)",
    background: sel ? "var(--c-indigo-soft)" : "var(--surface)", cursor: "pointer", marginBottom: 10,
  });

  return (
    <div className="card">
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />

      {/* progress */}
      <div className="bar" style={{ marginBottom: 18 }}><i style={{ width: `${(step + 1) / 5 * 100}%`, background: "var(--brand-grad)" }} /></div>

      {result ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 46 }}>{result.ok ? "✅" : "⚠️"}</div>
          <h3 style={{ margin: "8px 0" }}>{result.ok ? "Gửi thành công!" : "Đã lưu báo cáo"}</h3>
          <p className="muted small" style={{ maxWidth: 360, margin: "0 auto 16px" }}>{result.msg}</p>
          <button className="btn primary" onClick={reset}><Icon name="plus" /> Tạo báo cáo mới</button>
        </div>
      ) : (
        <>
          {step === 0 && (
            <>
              <p className="small muted">Bước 1 / 5</p><h3 style={{ margin: "2px 0 4px" }}>Chọn chi nhánh</h3>
              <p className="muted small" style={{ marginBottom: 14 }}>Bạn đang làm việc tại showroom nào?</p>
              {SHOWROOMS.map((s) => (
                <button key={s.id} style={optStyle(showroom?.id === s.id)} onClick={() => setShowroom(s)}>
                  <span style={{ fontSize: 20 }}>🏬</span><span><b>{s.name}</b><br /><span className="small muted">{s.addr}</span></span>
                </button>
              ))}
            </>
          )}
          {step === 1 && (
            <>
              <p className="small muted">Bước 2 / 5</p><h3 style={{ margin: "2px 0 4px" }}>Bạn là ai?</h3>
              <p className="muted small" style={{ marginBottom: 14 }}>Chọn tên nhân viên thực hiện báo cáo.</p>
              {EMPLOYEES.map((e) => (
                <button key={e.id} style={optStyle(employee?.id === e.id)} onClick={() => setEmployee(e)}>
                  <span style={{ fontSize: 20 }}>👤</span><span><b>{e.name}</b><br /><span className="small muted">{e.role}</span></span>
                </button>
              ))}
            </>
          )}
          {step === 2 && (
            <>
              <p className="small muted">Bước 3 / 5</p><h3 style={{ margin: "2px 0 4px" }}>Loại báo cáo</h3>
              <p className="muted small" style={{ marginBottom: 14 }}>Bạn đang mở ca hay đóng ca?</p>
              <div className="flex gap">
                <button style={{ ...optStyle(shift === "open"), flexDirection: "column", textAlign: "center", padding: 22 }} onClick={() => setShift("open")}>
                  <span style={{ fontSize: 30 }}>🌅</span><b>Mở ca</b><span className="small muted">Đầu ngày</span>
                </button>
                <button style={{ ...optStyle(shift === "close"), flexDirection: "column", textAlign: "center", padding: 22 }} onClick={() => setShift("close")}>
                  <span style={{ fontSize: 30 }}>🌙</span><b>Đóng ca</b><span className="small muted">Cuối ngày</span>
                </button>
              </div>
              <div className="badge b-gray" style={{ marginTop: 12 }}><span style={{ marginRight: 6 }}>{gps ? "🟢" : "⏳"}</span>{gpsTxt}</div>
            </>
          )}
          {step === 3 && (
            <>
              <p className="small muted">Bước 4 / 5</p><h3 style={{ margin: "2px 0 4px" }}>Checklist {shiftLabel}</h3>
              <p className="muted small" style={{ marginBottom: 14 }}>Chụp đủ các mục bắt buộc — ảnh tự đóng dấu giờ + vị trí.</p>
              <div style={{ display: "grid", gap: 11 }}>
                {list.map((it) => {
                  const done = !!photos[it.id];
                  return (
                    <div key={it.id} className="card" style={{ padding: 13, display: "flex", alignItems: "center", gap: 13, borderColor: done ? "var(--c-teal)" : "var(--line)", background: done ? "var(--c-teal-soft)" : "var(--surface)" }}>
                      <div style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", display: "grid", placeItems: "center", fontSize: 22, background: "var(--surface-2)", flexShrink: 0 }}>
                        {done ? <img src={photos[it.id].data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : it.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <b className="small">{it.label}</b>
                        <div className="urole">{it.hint} · {it.required ? <span style={{ color: "var(--c-rose)" }}>Bắt buộc</span> : "Tuỳ chọn"}</div>
                      </div>
                      <button className={`btn sm ${done ? "" : "primary"}`} onClick={() => openCamera(it)}>{done ? "Chụp lại" : "Chụp"}</button>
                    </div>
                  );
                })}
              </div>
              <div className="field" style={{ marginTop: 14 }}><label>Ghi chú (tuỳ chọn)</label><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Thiếu sản phẩm demo X, máy lạnh khu A cần kiểm tra…" /></div>
            </>
          )}
          {step === 4 && (
            <>
              <p className="small muted">Bước 5 / 5</p><h3 style={{ margin: "2px 0 4px" }}>Xem lại & gửi</h3>
              <div className="card" style={{ background: "var(--surface-2)", padding: 14, marginBottom: 12 }}>
                {[["Chi nhánh", showroom?.name], ["Nhân viên", employee?.name], ["Loại", shiftLabel], ["Thời gian", new Date().toLocaleString("vi-VN")], ["Vị trí", address || (gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : "Chưa xác định")], ["Số ảnh", `${Object.keys(photos).length} ảnh`], ...(note ? [["Ghi chú", note]] : [])].map(([k, v]) => (
                  <div key={k} className="flex between small" style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}><span className="muted">{k}</span><b style={{ textAlign: "right" }}>{v}</b></div>
                ))}
              </div>
              <div className="grid-k g-3" style={{ gap: 8 }}>
                {Object.values(photos).map((p, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line)", aspectRatio: "3/4" }}>
                    <img src={p.data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "linear-gradient(transparent,rgba(0,0,0,.7))", color: "#fff", fontSize: 9.5, padding: "12px 5px 4px", fontWeight: 600 }}>{p.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* nav buttons */}
          <div className="flex gap" style={{ marginTop: 18 }}>
            {step > 0 && <button className="btn ghost" onClick={() => setStep((s) => s - 1)}>← Quay lại</button>}
            {step < 4 ? (
              <button className="btn primary" style={{ flex: 1, justifyContent: "center" }} disabled={(step === 0 && !showroom) || (step === 1 && !employee) || (step === 2 && !shift) || (step === 3 && !ckOk)} onClick={() => setStep((s) => s + 1)}>
                {step === 3 ? (ckOk ? "Xem lại báo cáo" : `Còn thiếu ${need.length - have.length} ảnh bắt buộc`) : "Tiếp tục"}
              </button>
            ) : (
              <button className="btn primary" style={{ flex: 1, justifyContent: "center", background: "var(--c-teal)" }} disabled={sending} onClick={submit}>
                {sending ? "Đang gửi…" : "Gửi báo cáo"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
