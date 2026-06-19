import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { AreaTrend, DonutChart } from "@/components/charts/rich";
import { listShiftReports } from "@/lib/bnb/store";
import { fmtVnd, fmtDate, dayKey, compactVnd } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import { SHIFT_LABEL, type ShiftKind } from "@/lib/bnb/types";
import { createShiftReportAction } from "./actions";
import { ChipSelect } from "./chip-select";

export const dynamic = "force-dynamic";

const SHIFTS = Object.keys(SHIFT_LABEL) as ShiftKind[];
const MIX_COLORS = ["#2b78c5", "#7c3aed", "#d98309", "#0e9d6e", "#e23b54", "#0d9488", "#9aa1ab"];

const SHIFT_BADGE: Record<ShiftKind, string> = {
  morning: "b-amber",
  afternoon: "b-sky",
  full: "b-indigo",
};

export default async function ShiftReportPage() {
  const session = await requirePermission("shiftreport.read");
  const canManage = session.permissions.has("shiftreport.manage");
  const [reports, names] = await Promise.all([listShiftReports(), employeeNameMap()]);
  const sorted = [...reports].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1,
  );

  const today = new Date().toISOString().slice(0, 10);

  // KPI tuần gần đây (7 ngày tính tới hôm nay).
  const weekAgo = new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10);
  const week = reports.filter((r) => r.date >= weekAgo && r.date <= today);
  const sum = (pick: (r: (typeof reports)[number]) => number | undefined) =>
    week.reduce((acc, r) => acc + (pick(r) || 0), 0);
  const wkRevenue = sum((r) => r.revenue);
  const wkOrders = sum((r) => r.orders);
  const wkLeads = sum((r) => r.leads);
  const wkVisitors = sum((r) => r.visitors);

  // Doanh thu theo ngày — 14 ngày gần nhất (gộp các ca cùng ngày).
  const now = new Date();
  const days: { key: string; label: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({ key: dayKey(d), label: `${d.getDate()}/${d.getMonth() + 1}` });
  }
  const revByDay = days.map((d) => ({
    label: d.label,
    value: reports.filter((r) => r.date === d.key).reduce((s, r) => s + (r.revenue || 0), 0),
  }));

  // Cơ cấu doanh thu theo ca (donut).
  const shiftMix = SHIFTS
    .map((k, i) => ({ name: SHIFT_LABEL[k], value: reports.filter((r) => r.shift === k).reduce((s, r) => s + (r.revenue || 0), 0), color: MIX_COLORS[i % MIX_COLORS.length] }))
    .filter((x) => x.value > 0);

  return (
    <div>
      <PageHero
        icon="handover"
        title="Báo cáo ca & bàn giao"
        subtitle="Chuẩn hoá báo cáo cuối ca — không phụ thuộc Zalo. Tổng hợp 7 ngày gần đây."
        crumb={[["Trang chủ", "/dashboard"], ["Hiện trường & Hậu mãi"], ["Báo cáo ca"]]}
        stats={[
          { label: "Doanh thu 7 ngày", value: compactVnd(wkRevenue), tone: "up" },
          { label: "Đơn 7 ngày", value: wkOrders },
          { label: "Lead 7 ngày", value: wkLeads },
        ]}
      />

      {/* KPI tuần */}
      <div className="grid-k g-4 stagger">
        <div className="card kpi grad hover gr-mint">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 24 }}>{fmtVnd(wkRevenue)}</div>
          <div className="lbl">doanh thu 7 ngày</div>
        </div>
        <div className="card kpi grad hover gr-azure">
          <div className="ic"><Icon name="cart" /></div>
          <div className="val"><CountUp to={wkOrders} /></div>
          <div className="lbl">đơn 7 ngày</div>
        </div>
        <div className="card kpi grad hover gr-malinka">
          <div className="ic"><Icon name="leads" /></div>
          <div className="val"><CountUp to={wkLeads} /></div>
          <div className="lbl">lead 7 ngày</div>
        </div>
        <div className="card kpi grad hover gr-sunny">
          <div className="ic"><Icon name="users" /></div>
          <div className="val"><CountUp to={wkVisitors} /></div>
          <div className="lbl">khách ghé 7 ngày</div>
        </div>
      </div>

      {/* Biểu đồ: doanh thu 14 ngày + cơ cấu theo ca */}
      {reports.length > 0 && (
        <div className="grid-k g-2 mt">
          <div className="card hover">
            <div className="card-h">
              <h3 className="sec-title">Doanh thu theo ngày · 14 ngày</h3>
              <span className="badge b-green">{fmtVnd(revByDay.reduce((s, d) => s + d.value, 0))}</span>
            </div>
            <AreaTrend data={revByDay} money height={250} name="Doanh thu" />
          </div>
          <div className="card hover">
            <div className="card-h"><h3 className="sec-title">Cơ cấu doanh thu theo ca</h3></div>
            {shiftMix.length === 0 ? (
              <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Chưa có doanh thu theo ca.</p>
            ) : (
              <DonutChart data={shiftMix} height={250} centerValue={compactVnd(shiftMix.reduce((s, d) => s + d.value, 0))} centerLabel="doanh thu" unit="đ" />
            )}
          </div>
        </div>
      )}

      {/* Tạo báo cáo */}
      {canManage && (
        <details className="card mt">
          <summary style={{ fontWeight: 700, fontSize: 15.5, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="plus" /> Lập báo cáo cuối ca
          </summary>
          <form action={createShiftReportAction} className="mt" style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 14, alignItems: "end" }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Ngày *</label>
                <input name="date" type="date" defaultValue={today} required />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Ca làm</label>
                <ChipSelect
                  name="shift"
                  defaultValue="full"
                  options={SHIFTS.map((k) => ({ value: k, label: SHIFT_LABEL[k] }))}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Showroom</label>
                <input name="showroom" placeholder="CN Quận 7" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
              <div className="field" style={{ margin: 0 }}><label>Doanh thu (đ)</label><input name="revenue" inputMode="numeric" placeholder="25000000" /></div>
              <div className="field" style={{ margin: 0 }}><label>Số đơn</label><input name="orders" inputMode="numeric" placeholder="3" /></div>
              <div className="field" style={{ margin: 0 }}><label>Số lead</label><input name="leads" inputMode="numeric" placeholder="8" /></div>
              <div className="field" style={{ margin: 0 }}><label>Khách ghé</label><input name="visitors" inputMode="numeric" placeholder="15" /></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field" style={{ margin: 0 }}><label>Sự cố trong ca</label><textarea name="issues" placeholder="Mất điện 30 phút, 1 khách khiếu nại giao trễ..." /></div>
              <div className="field" style={{ margin: 0 }}><label>Nội dung bàn giao</label><textarea name="handover" placeholder="Đơn DH-12 chờ khách chuyển cọc, nhắc ca sau gọi lại..." /></div>
            </div>

            <div>
              <button type="submit" className="btn primary"><Icon name="check" /> Chốt & gửi báo cáo</button>
            </div>
          </form>
        </details>
      )}

      {/* Danh sách */}
      <div className="card mt">
        <div className="card-h"><h3 className="sec-title">Lịch sử báo cáo ca ({reports.length})</h3></div>
        {sorted.length === 0 ? (
          <p className="muted small" style={{ padding: "14px 0" }}>Chưa có báo cáo ca nào.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Ngày</th><th>Ca</th><th>Showroom</th>
                <th style={{ textAlign: "right" }}>Doanh thu</th>
                <th style={{ textAlign: "right" }}>Đơn</th>
                <th style={{ textAlign: "right" }}>Lead</th>
                <th style={{ textAlign: "right" }}>Khách</th>
                <th>Người báo cáo</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id}>
                  <td className="small">{fmtDate(r.date)}</td>
                  <td><span className={`badge ${SHIFT_BADGE[r.shift]}`}>{SHIFT_LABEL[r.shift]}</span></td>
                  <td className="small muted">{r.showroom || "—"}</td>
                  <td style={{ textAlign: "right" }}><b>{fmtVnd(r.revenue || 0)}</b></td>
                  <td className="small" style={{ textAlign: "right" }}>{r.orders ?? 0}</td>
                  <td className="small" style={{ textAlign: "right" }}>{r.leads ?? 0}</td>
                  <td className="small" style={{ textAlign: "right" }}>{r.visitors ?? 0}</td>
                  <td className="small muted">{r.byId ? names[r.byId] || "—" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
