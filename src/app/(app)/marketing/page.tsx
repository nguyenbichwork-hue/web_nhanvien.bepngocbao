import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { CountUp, HBars } from "@/components/charts";
import { listPillars, listCalendarItems, listAdCampaigns } from "@/lib/bnb/store";
import { employeeNameMap, fmtVnd, fmtDateTime } from "@/lib/bnb/util";
import {
  MKT_CHANNELS, MKT_CHANNEL_LABEL,
  CONTENT_STATUS_LABEL, CONTENT_STATUS_BADGE,
  AD_STATUS_LABEL, AD_STATUS_BADGE,
  type MktChannel, type ContentStatus, type AdStatus,
} from "@/lib/bnb/types";
import {
  createPillarAction, createCalendarItemAction, setContentStatusAction, createAdCampaignAction,
} from "./actions";

export const dynamic = "force-dynamic";

// Bước chuyển trạng thái nhanh cho lịch nội dung.
const NEXT_STATUS: Partial<Record<ContentStatus, ContentStatus>> = {
  planned: "in_progress",
  in_progress: "published",
};

const PILLAR_COLORS = ["#c8203f", "#0fa371", "#2b86c5", "#8b5cf6", "#e2a23b", "#0ea5b7"];

export default async function MarketingPage() {
  const session = await requirePermission("marketing.read");
  const canManage = session.permissions.has("marketing.manage");
  const [pillars, items, campaigns, names] = await Promise.all([
    listPillars(), listCalendarItems(), listAdCampaigns(), employeeNameMap(),
  ]);

  const pillarById = new Map(pillars.map((p) => [p.id, p]));
  const calendar = [...items].sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : 1));

  // KPI
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
  const cpl = totalLeads ? Math.round(totalSpend / totalLeads) : 0;
  const scheduledCount = items.filter((i) => i.status === "planned" || i.status === "in_progress").length;

  // CPL theo kênh (cho HBars) — gộp spend/leads từng kênh rồi tính chi phí/lead.
  const byChannel = new Map<MktChannel, { spend: number; leads: number }>();
  for (const c of campaigns) {
    const cur = byChannel.get(c.channel) || { spend: 0, leads: 0 };
    cur.spend += c.spend || 0;
    cur.leads += c.leads || 0;
    byChannel.set(c.channel, cur);
  }
  const cplBars = [...byChannel.entries()]
    .filter(([, v]) => v.leads > 0)
    .map(([ch, v], i) => ({
      label: MKT_CHANNEL_LABEL[ch],
      count: Math.round(v.spend / v.leads),
      color: PILLAR_COLORS[i % PILLAR_COLORS.length],
    }))
    .sort((a, b) => a.count - b.count);

  const cplOf = (c: { spend: number; leads: number }) => (c.leads ? Math.round(c.spend / c.leads) : 0);

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Marketing</div>
      <div className="page-head">
        <div>
          <h1>Marketing</h1>
          <p>Trụ nội dung, lịch đăng và chiến dịch quảng cáo — đo chi phí mỗi lead (CPL) thay cho Google Sheets.</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid-k g-4 stagger">
        <div className="card kpi tone-r">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val">{fmtVnd(totalSpend)}</div>
          <div className="lbl">Tổng chi quảng cáo</div>
        </div>
        <div className="card kpi tone-i">
          <div className="ic"><Icon name="leads" /></div>
          <div className="val"><CountUp to={totalLeads} /></div>
          <div className="lbl">Leads từ quảng cáo</div>
        </div>
        <div className="card kpi tone-a">
          <div className="ic"><Icon name="target" /></div>
          <div className="val">{fmtVnd(cpl)}</div>
          <div className="lbl">CPL (chi phí / lead)</div>
        </div>
        <div className="card kpi tone-t">
          <div className="ic"><Icon name="calendar" /></div>
          <div className="val"><CountUp to={scheduledCount} /></div>
          <div className="lbl">Nội dung đã/đang lên lịch</div>
        </div>
      </div>

      {/* Trụ nội dung */}
      <div className="card mt">
        <div className="card-h">
          <h3>Trụ nội dung (Content Pillar)</h3>
          <span className="badge b-gray">{pillars.length}</span>
        </div>
        {pillars.length === 0 ? (
          <p className="muted small" style={{ padding: "10px 0" }}>Chưa có trụ nội dung nào.</p>
        ) : (
          <div className="grid-k g-3" style={{ gap: 12 }}>
            {pillars.map((p) => (
              <div key={p.id} className="card" style={{ margin: 0, padding: 14 }}>
                <div className="flex aic" style={{ gap: 10 }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", background: p.color || "var(--c-indigo)", flexShrink: 0 }} />
                  <b>{p.name}</b>
                </div>
                {p.desc && <div className="urole" style={{ marginTop: 6 }}>{p.desc}</div>}
              </div>
            ))}
          </div>
        )}
        {canManage && (
          <details className="mt">
            <summary style={{ fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Icon name="plus" /> Thêm trụ nội dung
            </summary>
            <form action={createPillarAction} className="mt" style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 12, alignItems: "end" }}>
              <div className="field" style={{ margin: 0 }}><label>Tên trụ *</label><input name="name" required placeholder="VD: Mẹo bếp" /></div>
              <div className="field" style={{ margin: 0 }}><label>Mô tả</label><input name="desc" placeholder="Nội dung trụ này hướng tới điều gì" /></div>
              <div className="field" style={{ margin: 0 }}><label>Màu</label><input name="color" type="color" defaultValue="#c8203f" style={{ padding: 4, height: 42 }} /></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="btn primary"><Icon name="check" /> Lưu trụ</button>
              </div>
            </form>
          </details>
        )}
      </div>

      {/* Lịch nội dung */}
      <div className="card mt">
        <div className="card-h">
          <h3>Lịch nội dung</h3>
          <span className="badge b-gray">{items.length}</span>
        </div>
        {calendar.length === 0 ? (
          <p className="muted small" style={{ padding: "10px 0" }}>Chưa có nội dung trong lịch.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Tiêu đề</th><th>Kênh</th><th>Trụ</th><th>Lịch đăng</th><th>Phụ trách</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody>
              {calendar.map((it) => {
                const next = NEXT_STATUS[it.status];
                return (
                  <tr key={it.id}>
                    <td>
                      <div className="uname">{it.title}</div>
                      {it.note && <div className="urole">{it.note}</div>}
                    </td>
                    <td className="small">{MKT_CHANNEL_LABEL[it.channel]}</td>
                    <td className="small muted">{it.pillarId ? pillarById.get(it.pillarId)?.name || "—" : "—"}</td>
                    <td className="small muted">{fmtDateTime(it.scheduledAt)}</td>
                    <td className="small muted">{it.byId ? names[it.byId] || "—" : "—"}</td>
                    <td><span className={`badge ${CONTENT_STATUS_BADGE[it.status]}`}>{CONTENT_STATUS_LABEL[it.status]}</span></td>
                    <td style={{ textAlign: "right" }}>
                      {canManage && next && (
                        <form action={setContentStatusAction} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={it.id} />
                          <input type="hidden" name="status" value={next} />
                          <button type="submit" className="btn ghost" style={{ padding: "6px 11px" }}>
                            → {CONTENT_STATUS_LABEL[next]}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {canManage && (
          <details className="mt">
            <summary style={{ fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <Icon name="plus" /> Thêm nội dung vào lịch
            </summary>
            <form action={createCalendarItemAction} className="mt" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
              <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}><label>Tiêu đề *</label><input name="title" required placeholder="VD: Reel hướng dẫn vệ sinh bếp từ" /></div>
              <div className="field" style={{ margin: 0 }}><label>Kênh</label>
                <select name="channel" defaultValue="facebook">
                  {MKT_CHANNELS.map((c) => <option key={c} value={c}>{MKT_CHANNEL_LABEL[c]}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}><label>Trụ nội dung</label>
                <select name="pillarId" defaultValue="">
                  <option value="">— Không gán —</option>
                  {pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}><label>Trạng thái</label>
                <select name="status" defaultValue="planned">
                  {(Object.keys(CONTENT_STATUS_LABEL) as ContentStatus[]).map((s) => <option key={s} value={s}>{CONTENT_STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}><label>Lịch đăng</label><input name="scheduledAt" type="datetime-local" /></div>
              <div className="field" style={{ margin: 0, gridColumn: "span 2" }}><label>Ghi chú</label><input name="note" placeholder="Mô tả ngắn / caption gợi ý" /></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="btn primary"><Icon name="check" /> Lưu nội dung</button>
              </div>
            </form>
          </details>
        )}
      </div>

      {/* Chiến dịch Ads */}
      <div className="grid-k g-2 mt">
        <div className="card">
          <div className="card-h">
            <h3>Chiến dịch quảng cáo</h3>
            <span className="badge b-gray">{campaigns.length}</span>
          </div>
          {campaigns.length === 0 ? (
            <p className="muted small" style={{ padding: "10px 0" }}>Chưa có chiến dịch nào.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Chiến dịch</th><th>Kênh</th><th>Chi phí</th><th>Leads</th><th>CPL</th><th>Clicks</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="uname">{c.name}</td>
                    <td className="small">{MKT_CHANNEL_LABEL[c.channel]}</td>
                    <td className="small">{fmtVnd(c.spend)}</td>
                    <td className="small">{c.leads.toLocaleString("vi-VN")}</td>
                    <td className="small"><b>{c.leads ? fmtVnd(cplOf(c)) : "—"}</b></td>
                    <td className="small muted">{c.clicks != null ? c.clicks.toLocaleString("vi-VN") : "—"}</td>
                    <td><span className={`badge ${AD_STATUS_BADGE[c.status]}`}>{AD_STATUS_LABEL[c.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-h"><h3>So sánh CPL theo kênh</h3><span className="badge b-indigo">đ / lead</span></div>
          <HBars data={cplBars} />
        </div>
      </div>

      {canManage && (
        <div className="card mt">
          <div className="card-h"><h3>Thêm chiến dịch quảng cáo</h3></div>
          <form action={createAdCampaignAction} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12 }}>
            <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}><label>Tên chiến dịch *</label><input name="name" required placeholder="VD: Bếp từ tháng 6 — Facebook" /></div>
            <div className="field" style={{ margin: 0 }}><label>Kênh</label>
              <select name="channel" defaultValue="facebook">
                {MKT_CHANNELS.map((c) => <option key={c} value={c}>{MKT_CHANNEL_LABEL[c]}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}><label>Chi phí (đ)</label><input name="spend" inputMode="numeric" placeholder="5000000" /></div>
            <div className="field" style={{ margin: 0 }}><label>Leads</label><input name="leads" inputMode="numeric" placeholder="40" /></div>
            <div className="field" style={{ margin: 0 }}><label>Clicks</label><input name="clicks" inputMode="numeric" placeholder="1200" /></div>
            <div className="field" style={{ margin: 0 }}><label>Trạng thái</label>
              <select name="status" defaultValue="active">
                {(Object.keys(AD_STATUS_LABEL) as AdStatus[]).map((s) => <option key={s} value={s}>{AD_STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}><label>Bắt đầu</label><input name="startAt" type="date" /></div>
            <div className="field" style={{ margin: 0 }}><label>Kết thúc</label><input name="endAt" type="date" /></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn primary"><Icon name="check" /> Lưu chiến dịch</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
