"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { SearchSelect } from "@/components/search-select";
import { compactVnd } from "@/lib/bnb/util";
import {
  REFERRAL_STATUS, REFERRAL_STATUS_LABEL, REFERRAL_REWARD_KIND,
  type CxReferral, type ReferralStatus, type ReferralRewardKind,
} from "@/lib/bnb/types";
import {
  saveReferralAction, setReferralStatusAction, setRewardSentAction, deleteReferralAction,
} from "./actions";

type Owner = { id: string; name: string };
type Candidate = { id: string; name: string; phone?: string; ownerId?: string };
type Filter = "all" | "open" | "won" | "reward" | ReferralStatus;

const STATUS_BADGE = Object.fromEntries(REFERRAL_STATUS.map((s) => [s.key, s.badge])) as Record<ReferralStatus, string>;
const fmt = (s?: string) => (s ? new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "");
const num = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(/[^\d]/g, "")) || 0);

export function ReferralBoard({
  referrals, owners, candidates, journeyReadyCount,
}: {
  referrals: CxReferral[]; owners: Owner[]; candidates: Candidate[]; journeyReadyCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [edit, setEdit] = useState<Partial<CxReferral> | null>(null);

  const nameOf = (id?: string) => (id ? owners.find((o) => o.id === id)?.name || "—" : "—");
  const isReward = (r: CxReferral) => r.status === "won" && r.rewardStatus !== "sent";

  // ---- North Star của chương trình giới thiệu ----
  const stats = useMemo(() => {
    const total = referrals.length;
    const won = referrals.filter((r) => r.status === "won").length;
    const revenue = referrals.reduce((s, r) => s + (r.revenue || 0), 0);
    const rewardPending = referrals.filter(isReward).length;
    const rewardOwed = referrals.filter(isReward).reduce((s, r) => s + (r.rewardValue || 0), 0);
    // người giới thiệu phân biệt (theo mã)
    const referrers = new Set(referrals.map((r) => r.code)).size;
    const conv = total ? Math.round((won / total) * 100) : 0;
    return { total, won, revenue, rewardPending, rewardOwed, referrers, conv };
  }, [referrals]);

  const byStatus = useMemo(
    () => Object.fromEntries(REFERRAL_STATUS.map((s) => [s.key, referrals.filter((r) => r.status === s.key).length])) as Record<ReferralStatus, number>,
    [referrals],
  );

  const ql = q.trim().toLowerCase();
  const filtered = referrals.filter((r) => {
    if (ql && ![r.code, r.referrerName, r.referrerPhone, r.refereeName, r.refereePhone, nameOf(r.ownerId)].join(" ").toLowerCase().includes(ql)) return false;
    if (filter === "open") return r.status !== "won" && r.status !== "lost";
    if (filter === "won") return r.status === "won";
    if (filter === "reward") return isReward(r);
    if (filter !== "all") return r.status === filter;
    return true;
  });

  async function run(fn: () => Promise<unknown>) { setBusy(true); try { await fn(); router.refresh(); } finally { setBusy(false); } }
  async function save() {
    if (!edit) return;
    await run(() => saveReferralAction({ id: edit.id, ...edit }));
    setEdit(null);
  }

  const chips: { k: Filter; label: string; n?: number }[] = [
    { k: "all", label: "Tất cả", n: referrals.length },
    { k: "open", label: "Đang theo dõi", n: referrals.filter((r) => r.status !== "won" && r.status !== "lost").length },
    { k: "won", label: "✅ Đã ra đơn", n: byStatus.won },
    { k: "reward", label: "🎁 Cần tri ân", n: stats.rewardPending },
    ...REFERRAL_STATUS.map((s) => ({ k: s.key as Filter, label: s.label, n: byStatus[s.key] })),
  ];

  return (
    <div>
      {/* North Star */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div className="card kpi"><div className="ic" style={{ background: "var(--c-indigo-soft)", color: "var(--c-indigo)" }}><Icon name="users" /></div><div className="val">{stats.referrers}</div><div className="lbl">Khách đang giới thiệu</div></div>
        <div className="card kpi"><div className="ic" style={{ background: "var(--c-sky-soft)", color: "var(--c-sky)" }}><Icon name="award" /></div><div className="val">{stats.total}</div><div className="lbl">Lượt giới thiệu</div></div>
        <div className="card kpi"><div className="ic" style={{ background: "var(--c-teal-soft)", color: "var(--c-teal)" }}><Icon name="target" /></div><div className="val">{stats.conv}%</div><div className="lbl">Tỉ lệ ra đơn ({stats.won})</div></div>
        <div className="card kpi"><div className="ic" style={{ background: "var(--c-teal-soft)", color: "var(--c-teal)" }}><Icon name="wallet" /></div><div className="val">{compactVnd(stats.revenue)}</div><div className="lbl">Doanh thu từ giới thiệu</div></div>
        <div className="card kpi"><div className="ic" style={{ background: "var(--c-amber-soft)", color: "var(--c-amber)" }}><Icon name="award" /></div><div className="val">{stats.rewardPending}</div><div className="lbl">Cần tri ân ({compactVnd(stats.rewardOwed)})</div></div>
      </div>

      {/* Khách sẵn sàng giới thiệu (từ Hành trình CX) chưa tham gia chương trình */}
      {candidates.length > 0 && (
        <div className="card mt" style={{ borderColor: "var(--c-rose)" }}>
          <div className="card-h">
            <h3 className="sec-title">❤ Mời tham gia giới thiệu ({candidates.length})</h3>
            <Link href="/journey" className="badge b-rose">{journeyReadyCount} khách sẵn sàng trong Hành trình CX</Link>
          </div>
          <p className="small muted" style={{ marginTop: -6, marginBottom: 10 }}>Khách đã hài lòng (bàn giao/đánh giá/sẵn sàng) nhưng chưa có lượt giới thiệu — bấm để cấp mã &amp; mời.</p>
          <div className="flex gap" style={{ flexWrap: "wrap" }}>
            {candidates.map((c) => (
              <button key={c.id} className="btn ghost sm" disabled={busy}
                onClick={() => setEdit({ referrerName: c.name, referrerPhone: c.phone, referrerJourneyId: c.id, ownerId: c.ownerId, status: "invited" })}>
                <Icon name="plus" /> {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* toolbar */}
      <div className="flex between aic mt" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="chips">
          {chips.map((c) => (
            <button key={c.k} className={`chip${filter === c.k ? " on" : ""}`} onClick={() => setFilter(c.k)}>{c.label}{c.n != null ? ` (${c.n})` : ""}</button>
          ))}
        </div>
        <div className="flex gap aic">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã/tên/SĐT…" style={{ width: 200 }} />
          <button className="btn primary sm" onClick={() => setEdit({ status: "invited" })}><Icon name="plus" /> Lượt giới thiệu</button>
        </div>
      </div>

      {/* danh sách */}
      <div className="mt">
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "var(--tx-muted)", padding: "40px 20px" }}>
            {referrals.length ? "Không có lượt giới thiệu phù hợp bộ lọc." : 'Chưa có lượt giới thiệu nào. Bấm "Lượt giới thiệu" để tạo, hoặc mời khách từ danh sách phía trên.'}
          </div>
        ) : (
          <div className="card">
            <div style={{ display: "grid", gap: 8 }}>
              {filtered.map((r) => {
                const idx = REFERRAL_STATUS.findIndex((s) => s.key === r.status);
                const next = r.status === "won" || r.status === "lost" ? null : REFERRAL_STATUS[idx + 1];
                return (
                  <div key={r.id} className="card" style={{ background: "var(--surface-2)", padding: 12 }}>
                    <div className="flex between aic" style={{ flexWrap: "wrap", gap: 8 }}>
                      <div className="flex aic gap" style={{ flexWrap: "wrap" }}>
                        <span className="badge b-gray" title="Mã giới thiệu">{r.code}</span>
                        <b className="small">{r.referrerName}</b>
                        {r.referrerPhone && <span className="urole">📞 {r.referrerPhone}</span>}
                        <span className="urole">→ giới thiệu: <b style={{ color: "var(--tx)" }}>{r.refereeName || "(chưa rõ)"}</b>{r.refereePhone ? ` · ${r.refereePhone}` : ""}</span>
                        <span className={`badge ${STATUS_BADGE[r.status]}`}>{REFERRAL_STATUS_LABEL[r.status]}</span>
                        {r.status === "won" && r.revenue ? <span className="badge b-green">{compactVnd(r.revenue)}</span> : null}
                        {isReward(r) && <span className="badge b-amber">🎁 chưa tri ân{r.rewardValue ? ` (${compactVnd(r.rewardValue)})` : ""}</span>}
                        {r.rewardStatus === "sent" && <span className="badge b-green">✓ đã tri ân</span>}
                      </div>
                      <div className="flex gap">
                        {next && <button className="btn ghost sm" disabled={busy} onClick={() => run(() => setReferralStatusAction(r.id, next.key))} title={`Chuyển sang ${next.label}`}>→ {next.label}</button>}
                        {isReward(r) && <button className="btn ghost sm" disabled={busy} onClick={() => run(() => setRewardSentAction(r.id, true))} title="Đánh dấu đã gửi tri ân">🎁 Đã tri ân</button>}
                        <button className="btn ghost sm" onClick={() => setEdit({ ...r })}>✎</button>
                        <button className="btn ghost sm" disabled={busy} onClick={() => { if (confirm("Xoá lượt giới thiệu?")) run(() => deleteReferralAction(r.id)); }}>🗑</button>
                      </div>
                    </div>
                    <div className="flex aic gap small muted" style={{ marginTop: 6, flexWrap: "wrap" }}>
                      <span>Phụ trách: {nameOf(r.ownerId)}</span>
                      <span>· Tạo {fmt(r.createdAt)}</span>
                      {r.orderId && <span>· Đơn: {r.orderId}</span>}
                    </div>
                    {r.note && <p className="small muted" style={{ marginTop: 4 }}>{r.note}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* modal thêm/sửa */}
      {edit && (
        <div className="sch-overlay" onClick={() => setEdit(null)}>
          <div className="sch-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h3 style={{ marginBottom: 14 }}>{edit.id ? `Sửa lượt giới thiệu ${edit.code || ""}` : "Thêm lượt giới thiệu"}</h3>

            <div className="small" style={{ fontWeight: 700, color: "var(--tx-soft)", marginBottom: 6 }}>NGƯỜI GIỚI THIỆU (khách cũ)</div>
            <div className="flex gap">
              <div className="field" style={{ flex: 1 }}><label>Tên *</label><input value={edit.referrerName || ""} onChange={(e) => setEdit({ ...edit, referrerName: e.target.value })} /></div>
              <div className="field" style={{ flex: 1 }}><label>SĐT</label><input value={edit.referrerPhone || ""} onChange={(e) => setEdit({ ...edit, referrerPhone: e.target.value })} /></div>
            </div>

            <div className="small" style={{ fontWeight: 700, color: "var(--tx-soft)", margin: "6px 0" }}>NGƯỜI ĐƯỢC GIỚI THIỆU (khách mới)</div>
            <div className="flex gap">
              <div className="field" style={{ flex: 1 }}><label>Tên</label><input value={edit.refereeName || ""} onChange={(e) => setEdit({ ...edit, refereeName: e.target.value })} /></div>
              <div className="field" style={{ flex: 1 }}><label>SĐT</label><input value={edit.refereePhone || ""} onChange={(e) => setEdit({ ...edit, refereePhone: e.target.value })} /></div>
            </div>

            <div className="flex gap">
              <div className="field" style={{ flex: 1 }}><label>Trạng thái</label>
                <select className="fsel" style={{ width: "100%" }} value={edit.status || "invited"} onChange={(e) => setEdit({ ...edit, status: e.target.value as ReferralStatus })}>
                  {REFERRAL_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1 }}><label>Người phụ trách</label>
                <SearchSelect options={owners.map((o) => ({ value: o.id, label: o.name }))} value={edit.ownerId || ""} onChange={(v) => setEdit({ ...edit, ownerId: v })} placeholder="Gõ tên nhân viên…" />
              </div>
            </div>

            <div className="flex gap">
              <div className="field" style={{ flex: 1 }}><label>Mã đơn phát sinh</label><input value={edit.orderId || ""} onChange={(e) => setEdit({ ...edit, orderId: e.target.value })} placeholder="vd ĐH-1042" /></div>
              <div className="field" style={{ flex: 1 }}><label>Doanh thu (đ)</label><input inputMode="numeric" value={edit.revenue != null ? String(edit.revenue) : ""} onChange={(e) => setEdit({ ...edit, revenue: num(e.target.value) })} /></div>
            </div>

            <div className="small" style={{ fontWeight: 700, color: "var(--tx-soft)", margin: "6px 0" }}>TRI ÂN NGƯỜI GIỚI THIỆU</div>
            <div className="flex gap">
              <div className="field" style={{ flex: 1 }}><label>Hình thức</label>
                <select className="fsel" style={{ width: "100%" }} value={edit.rewardKind || "none"} onChange={(e) => setEdit({ ...edit, rewardKind: e.target.value as ReferralRewardKind })}>
                  {REFERRAL_REWARD_KIND.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                </select>
              </div>
              <div className="field" style={{ flex: 1 }}><label>Giá trị (đ)</label><input inputMode="numeric" value={edit.rewardValue != null ? String(edit.rewardValue) : ""} onChange={(e) => setEdit({ ...edit, rewardValue: num(e.target.value) })} /></div>
            </div>
            <label className="flex aic gap small" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={edit.rewardStatus === "sent"} onChange={(e) => setEdit({ ...edit, rewardStatus: e.target.checked ? "sent" : "pending" })} style={{ width: "auto" }} /> Đã gửi tri ân cho người giới thiệu
            </label>

            <div className="field"><label>Ghi chú</label><textarea value={edit.note || ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></div>

            <div className="flex gap">
              <button className="btn primary" style={{ flex: 1, justifyContent: "center" }} onClick={save} disabled={busy || !edit.referrerName}>Lưu</button>
              <button className="btn ghost" onClick={() => setEdit(null)}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
