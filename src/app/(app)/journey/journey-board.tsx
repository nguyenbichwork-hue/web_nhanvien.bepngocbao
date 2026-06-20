"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { SearchSelect } from "@/components/search-select";
import {
  CX_JOURNEY_STAGES, CX_PHASE_LABEL,
  type CxJourney, type JourneyStageKey, type JourneyPhase,
} from "@/lib/bnb/types";
import { cxAlerts } from "@/lib/bnb/cx-sla";
import { saveJourneyAction, advanceJourneyAction, deleteJourneyAction, syncJourneysAction } from "./actions";

const ALERT_BADGE: Record<string, string> = { rose: "b-rose", amber: "b-amber", indigo: "b-indigo" };

const STAGE = Object.fromEntries(CX_JOURNEY_STAGES.map((s) => [s.key, s]));
const PHASE_TONE: Record<JourneyPhase, string> = { acquisition: "b-indigo", success: "b-green", expansion: "b-amber" };
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (s?: string) => (s ? new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "");

type Owner = { id: string; name: string };
type Ops = { leads: number; conv: number; revenue: string; pipeline: string; aov: string };
type Filter = "all" | "followup" | "referral" | "blocked" | JourneyPhase;

const fmtFull = (s?: string) =>
  s ? new Date(s).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";

export function JourneyBoard({ journeys, owners, ops }: { journeys: CxJourney[]; owners: Owner[]; ops: Ops }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [edit, setEdit] = useState<Partial<CxJourney> | null>(null);
  const [msg, setMsg] = useState("");

  const nameOf = (id?: string) => (id ? owners.find((o) => o.id === id)?.name || "—" : "—");
  const isFollowUp = (j: CxJourney) => !!j.nextFollowUpAt && j.nextFollowUpAt <= today() && j.stage !== "community";
  const isReferral = (j: CxJourney) => !!j.readyReferral || ["handover", "first7days", "review", "referral"].includes(j.stage);
  const isBlocked = (j: CxJourney) => !!(j.blocker && j.blocker.trim());

  // ---- North Star stats (7 câu hỏi) ----
  const stats = useMemo(() => {
    const byPhase: Record<JourneyPhase, number> = { acquisition: 0, success: 0, expansion: 0 };
    let fu = 0, rf = 0, bl = 0;
    for (const j of journeys) {
      byPhase[STAGE[j.stage]?.phase as JourneyPhase] = (byPhase[STAGE[j.stage]?.phase as JourneyPhase] || 0) + 1;
      if (isFollowUp(j)) fu++; if (isReferral(j)) rf++; if (isBlocked(j)) bl++;
    }
    return { total: journeys.length, byPhase, fu, rf, bl };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys]);

  const ql = q.trim().toLowerCase();
  const filtered = journeys.filter((j) => {
    if (ql && ![j.name, j.phone, nameOf(j.ownerId), j.blocker].join(" ").toLowerCase().includes(ql)) return false;
    if (filter === "followup") return isFollowUp(j);
    if (filter === "referral") return isReferral(j);
    if (filter === "blocked") return isBlocked(j);
    if (filter === "acquisition" || filter === "success" || filter === "expansion") return STAGE[j.stage]?.phase === filter;
    return true;
  });

  async function run(fn: () => Promise<unknown>) { setBusy(true); try { await fn(); router.refresh(); } finally { setBusy(false); } }

  async function save() {
    if (!edit) return;
    await run(() => saveJourneyAction({ id: edit.id, ...edit }));
    setEdit(null);
  }
  async function doSync() {
    setBusy(true); setMsg("Đang đồng bộ từ CRM…");
    try { const r = await syncJourneysAction(); setMsg(`✓ Đã thêm ${r.added} khách từ CRM vào hành trình.`); router.refresh(); }
    finally { setBusy(false); }
  }

  const chips: { k: Filter; label: string; n?: number }[] = [
    { k: "all", label: "Tất cả", n: journeys.length },
    { k: "acquisition", label: "Thu hút", n: stats.byPhase.acquisition },
    { k: "success", label: "Thành công", n: stats.byPhase.success },
    { k: "expansion", label: "Mở rộng", n: stats.byPhase.expansion },
    { k: "followup", label: "⏰ Cần follow-up", n: stats.fu },
    { k: "referral", label: "❤ Sẵn sàng referral", n: stats.rf },
    { k: "blocked", label: "⚠ Có blocker", n: stats.bl },
  ];

  // group filtered by stage (theo thứ tự 13 bước)
  const byStage = CX_JOURNEY_STAGES.map((s) => ({ s, items: filtered.filter((j) => j.stage === s.key) })).filter((g) => g.items.length);

  // Bottleneck = bước (chưa phải Community) đang đọng nhiều khách nhất.
  const bottleneck = useMemo(() => {
    const counts = CX_JOURNEY_STAGES.filter((s) => s.key !== "community")
      .map((s) => ({ s, n: journeys.filter((j) => j.stage === s.key).length }))
      .sort((a, b) => b.n - a.n)[0];
    return counts && counts.n > 0 ? counts : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeys]);

  // Cảnh báo SLA (48H / check-in D1-3-7 / mời review) đang đến hạn.
  const slaList = useMemo(
    () => journeys.map((j) => ({ j, alerts: cxAlerts(j) })).filter((x) => x.alerts.length).slice(0, 30),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [journeys],
  );

  return (
    <div>
      {/* North Star stats */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div className="card kpi"><div className="ic" style={{ background: "var(--c-indigo-soft)", color: "var(--c-indigo)" }}><Icon name="users" /></div><div className="val">{stats.total}</div><div className="lbl">Tổng khách trong hành trình</div></div>
        <div className="card kpi"><div className="ic" style={{ background: "var(--c-teal-soft)", color: "var(--c-teal)" }}><Icon name="target" /></div><div className="val">{stats.byPhase.success}</div><div className="lbl">Đang ở phase Thành công</div></div>
        <div className="card kpi"><div className="ic" style={{ background: "var(--c-amber-soft)", color: "var(--c-amber)" }}><Icon name="phone" /></div><div className="val">{stats.fu}</div><div className="lbl">Cần follow-up hôm nay</div></div>
        <div className="card kpi"><div className="ic" style={{ background: "var(--c-rose-soft)", color: "var(--c-rose)" }}><Icon name="award" /></div><div className="val">{stats.rf}</div><div className="lbl">Sẵn sàng giới thiệu</div></div>
        <div className="card kpi"><div className="ic" style={{ background: "var(--c-rose-soft)", color: "var(--c-rose)" }}><Icon name="alert" /></div><div className="val">{stats.bl}</div><div className="lbl">Đang vướng (blocker)</div></div>
      </div>

      {/* Chỉ số vận hành (trả lời "tháng này ra sao") + bottleneck */}
      <div className="card mt">
        <div className="flex between aic" style={{ flexWrap: "wrap", gap: 12 }}>
          <div className="flex gap" style={{ flexWrap: "wrap" }}>
            <span className="badge b-gray">Lead: <b>{ops.leads}</b></span>
            <span className="badge b-indigo">Tỷ lệ chốt: <b>{ops.conv}%</b></span>
            <span className="badge b-green">Đã thu: <b>{ops.revenue}</b></span>
            <span className="badge b-amber">Pipeline: <b>{ops.pipeline}</b></span>
            <span className="badge b-sky">AOV: <b>{ops.aov}</b></span>
          </div>
          {bottleneck && (
            <span className="badge b-rose">⚠ Bottleneck: {bottleneck.s.label} ({bottleneck.n} khách)</span>
          )}
        </div>
      </div>

      {/* toolbar */}
      <div className="flex between aic mt" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="chips">
          {chips.map((c) => (
            <button key={c.k} className={`chip${filter === c.k ? " on" : ""}`} onClick={() => setFilter(c.k)}>{c.label}{c.n != null ? ` (${c.n})` : ""}</button>
          ))}
        </div>
        <div className="flex gap aic">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm tên/SĐT/owner…" style={{ width: 200 }} />
          <button className="btn sm" onClick={doSync} disabled={busy} title="Tạo hành trình từ Lead trong CRM"><Icon name="download" /> Đồng bộ CRM</button>
          <button className="btn primary sm" onClick={() => setEdit({ stage: "trigger" })}><Icon name="plus" /> Thêm khách</button>
        </div>
      </div>
      {msg && <div className="badge b-indigo mt">{msg}</div>}

      {/* SLA cần xử lý */}
      {slaList.length > 0 && (
        <div className="card mt" style={{ borderColor: "var(--c-rose)" }}>
          <div className="card-h"><h3 className="sec-title">⏱ SLA cần xử lý ({slaList.length})</h3><span className="badge b-rose">48H · check-in · review</span></div>
          <div style={{ display: "grid", gap: 8 }}>
            {slaList.map(({ j, alerts }) => (
              <div key={j.id} className="flex between aic" style={{ flexWrap: "wrap", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <div className="flex aic gap" style={{ flexWrap: "wrap" }}>
                  <b className="small">{j.name}</b>
                  <span className="urole">{STAGE[j.stage]?.label} · {nameOf(j.ownerId)}</span>
                  {alerts.map((a) => <span key={a.key} className={`badge ${ALERT_BADGE[a.tone]}`}>{a.label}</span>)}
                </div>
                <button className="btn ghost sm" onClick={() => setEdit({ ...j })}>Xử lý</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* sections theo bước */}
      <div className="mt">
        {byStage.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "var(--tx-muted)", padding: "40px 20px" }}>
            {journeys.length ? "Không có khách phù hợp bộ lọc." : 'Chưa có khách trong hành trình. Bấm "Đồng bộ CRM" để nạp từ Lead, hoặc "Thêm khách".'}
          </div>
        ) : byStage.map(({ s, items }) => (
          <div className="card mt" key={s.key}>
            <div className="card-h">
              <h3 className="sec-title">{s.no}. {s.label} <span className={`badge ${PHASE_TONE[s.phase]}`} style={{ marginLeft: 8 }}>{CX_PHASE_LABEL[s.phase]}</span></h3>
              <span className="badge b-gray">{items.length} · Owner: {s.owner}</span>
            </div>
            <p className="small muted" style={{ marginTop: -6, marginBottom: 10 }}>{s.desc}</p>
            <div style={{ display: "grid", gap: 8 }}>
              {items.map((j) => {
                const idx = CX_JOURNEY_STAGES.findIndex((x) => x.key === j.stage);
                const next = CX_JOURNEY_STAGES[idx + 1];
                return (
                  <div key={j.id} className="card" style={{ background: "var(--surface-2)", padding: 12 }}>
                    <div className="flex between aic" style={{ flexWrap: "wrap", gap: 8 }}>
                      <div className="flex aic gap" style={{ flexWrap: "wrap" }}>
                        <b className="small">{j.name}</b>
                        {j.phone && <span className="urole">📞 {j.phone}</span>}
                        <span className="urole">· phụ trách: {nameOf(j.ownerId)}</span>
                        {isFollowUp(j) && <span className="badge b-amber">⏰ follow-up {fmt(j.nextFollowUpAt)}</span>}
                        {isBlocked(j) && <span className="badge b-rose">⚠ {j.blocker}</span>}
                        {j.readyReferral && <span className="badge b-green">❤ referral</span>}
                      </div>
                      <div className="flex gap">
                        {j.customerId && <Link className="btn ghost sm" href={`/customers/${j.customerId}`} title="Hồ sơ khách 360"><Icon name="users" /></Link>}
                        {!j.customerId && j.leadId && <Link className="btn ghost sm" href={`/crm/${j.leadId}`} title="Lead nguồn"><Icon name="customer" /></Link>}
                        {j.orderId && <Link className="btn ghost sm" href={`/orders/${j.orderId}`} title="Đơn hàng"><Icon name="cart" /></Link>}
                        {next && <button className="btn ghost sm" disabled={busy} onClick={() => run(() => advanceJourneyAction(j.id, next.key))} title={`Chuyển sang ${next.label}`}>→ {next.label}</button>}
                        <button className="btn ghost sm" onClick={() => setEdit({ ...j })}>✎</button>
                        <button className="btn ghost sm" disabled={busy} onClick={() => { if (confirm("Xoá khách khỏi hành trình?")) run(() => deleteJourneyAction(j.id)); }}>🗑</button>
                      </div>
                    </div>
                    {j.note && <p className="small muted" style={{ marginTop: 6 }}>{j.note}</p>}
                    {j.history && j.history.length > 0 && (
                      <details style={{ marginTop: 6 }}>
                        <summary className="small" style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>
                          🕑 Lịch sử ({j.history.length} mốc) · cập nhật {fmtFull(j.updatedAt)}
                        </summary>
                        <div style={{ display: "grid", gap: 3, marginTop: 6 }}>
                          {[...j.history].reverse().map((h, i) => (
                            <div key={i} className="small muted">
                              <b style={{ color: "var(--tx)" }}>{STAGE[h.stage]?.label || h.stage}</b> — {fmtFull(h.at)}{h.byId ? ` · ${nameOf(h.byId)}` : ""}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* modal thêm/sửa */}
      {edit && (
        <div className="sch-overlay" onClick={() => setEdit(null)}>
          <div className="sch-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <h3 style={{ marginBottom: 14 }}>{edit.id ? "Sửa hành trình khách" : "Thêm khách vào hành trình"}</h3>
            <div className="flex gap">
              <div className="field" style={{ flex: 1 }}><label>Tên khách *</label><input value={edit.name || ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div className="field" style={{ flex: 1 }}><label>SĐT</label><input value={edit.phone || ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            </div>
            <div className="field"><label>Bước hiện tại</label>
              <select className="fsel" style={{ width: "100%" }} value={edit.stage || "trigger"} onChange={(e) => setEdit({ ...edit, stage: e.target.value as JourneyStageKey })}>
                {CX_JOURNEY_STAGES.map((s) => <option key={s.key} value={s.key}>{s.no}. {s.label} — {CX_PHASE_LABEL[s.phase]}</option>)}
              </select>
            </div>
            <div className="field"><label>Người phụ trách</label>
              <SearchSelect options={owners.map((o) => ({ value: o.id, label: o.name }))} value={edit.ownerId || ""} onChange={(v) => setEdit({ ...edit, ownerId: v })} placeholder="Gõ tên nhân viên…" />
            </div>
            <div className="flex gap">
              <div className="field" style={{ flex: 1 }}><label>Mốc follow-up</label><input type="date" value={edit.nextFollowUpAt || ""} onChange={(e) => setEdit({ ...edit, nextFollowUpAt: e.target.value })} /></div>
              <div className="field" style={{ flex: 1 }}><label>Vướng mắc (blocker)</label><input value={edit.blocker || ""} onChange={(e) => setEdit({ ...edit, blocker: e.target.value })} placeholder="vd: chờ duyệt ngân sách" /></div>
            </div>
            <div className="field"><label>Ghi chú</label><textarea value={edit.note || ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></div>
            <label className="flex aic gap small" style={{ marginBottom: 14 }}>
              <input type="checkbox" checked={!!edit.readyReferral} onChange={(e) => setEdit({ ...edit, readyReferral: e.target.checked })} style={{ width: "auto" }} /> Sẵn sàng giới thiệu (referral)
            </label>
            <div className="flex gap">
              <button className="btn primary" style={{ flex: 1, justifyContent: "center" }} onClick={save} disabled={busy || !edit.name}>Lưu</button>
              <button className="btn ghost" onClick={() => setEdit(null)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
