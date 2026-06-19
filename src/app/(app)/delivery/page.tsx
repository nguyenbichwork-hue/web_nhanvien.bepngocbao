import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { CountUp } from "@/components/charts";
import { listDeliveries, listOrders, listCustomers } from "@/lib/bnb/store";
import { fmtDate, fmtDateTime, dayKey, isSameDay } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import {
  DELIVERY_STATUS_LABEL, DELIVERY_STATUS_BADGE,
} from "@/lib/bnb/types";
import type { DeliveryJob, DeliveryStatus } from "@/lib/bnb/types";
import { createDeliveryAction, setDeliveryStatusAction } from "./actions";

export const dynamic = "force-dynamic";

// Bước trạng thái kế tiếp gợi ý cho nút chuyển nhanh.
const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus[]>> = {
  scheduled: ["enroute", "rescheduled", "failed"],
  enroute: ["installing", "failed"],
  installing: ["done", "failed"],
  rescheduled: ["enroute", "failed"],
};

function Kpi({ icon, tone, value, label, sub }: { icon: string; tone: string; value: number; label: string; sub?: string }) {
  return (
    <div className={`card kpi hover ${tone}`}>
      <div className="ic"><Icon name={icon} /></div>
      <div className="val"><CountUp to={value} /></div>
      <div className="lbl">{label}</div>
      {sub && <div className="trend up" style={{ background: "var(--surface-2)", color: "var(--tx-muted)" }}>{sub}</div>}
    </div>
  );
}

const DOW = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
const dayHeading = (iso?: string) => {
  if (!iso) return "Chưa xếp lịch";
  const d = new Date(iso);
  return `${DOW[d.getDay()]}, ${fmtDate(iso)}`;
};

export default async function DeliveryPage() {
  const session = await requirePermission("delivery.read");
  const canManage = session.permissions.has("delivery.manage");
  const [deliveries, orders, customers, names] = await Promise.all([
    listDeliveries(), listOrders(), listCustomers(), employeeNameMap(),
  ]);

  const cusName = (id?: string) => (id ? customers.find((c) => c.id === id)?.name : undefined);

  const todayCount = deliveries.filter((d) => isSameDay(d.scheduledAt) && d.status !== "done" && d.status !== "failed").length;
  const inProgress = deliveries.filter((d) => d.status === "enroute" || d.status === "installing").length;
  const doneCount = deliveries.filter((d) => d.status === "done").length;

  // Nhóm theo ngày, sort theo scheduledAt tăng dần; lịch còn mở lên đầu.
  const sorted = [...deliveries].sort((a, b) => (a.scheduledAt < b.scheduledAt ? -1 : a.scheduledAt > b.scheduledAt ? 1 : 0));
  const groups = new Map<string, DeliveryJob[]>();
  for (const d of sorted) {
    const k = dayKey(d.scheduledAt);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(d);
  }
  const todayKey = dayKey(new Date());
  // Ưu tiên hiển thị ngày hôm nay và tương lai trước, quá khứ sau.
  const dayKeys = [...groups.keys()].sort((a, b) => {
    const fa = a >= todayKey, fb = b >= todayKey;
    if (fa !== fb) return fa ? -1 : 1;
    return fa ? (a < b ? -1 : 1) : (a > b ? -1 : 1);
  });

  // Đơn còn mở để gợi ý tạo lịch.
  const openOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Giao – Lắp đặt</div>
      <div className="page-head">
        <div>
          <h1>Lịch giao – Lắp đặt</h1>
          <p>Điều phối đội kỹ thuật, tránh trễ lịch — bám sát từng buổi giao và nghiệm thu tại nhà khách.</p>
        </div>
      </div>

      <div className="grid-k g-4 stagger">
        <Kpi icon="today" tone="tone-i" value={todayCount} label="Lịch hôm nay" sub={`${deliveries.length} lịch tổng`} />
        <Kpi icon="truck" tone="tone-a" value={inProgress} label="Đang giao / lắp" />
        <Kpi icon="check" tone="tone-t" value={doneCount} label="Đã nghiệm thu" />
        <Kpi icon="calendar" tone="tone-r" value={groups.size} label="Ngày có lịch" />
      </div>

      {/* Tạo lịch giao – lắp */}
      {canManage && (
        <details className="card mt">
          <summary style={{ fontWeight: 700, fontSize: 15.5, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="plus" /> Tạo lịch giao – lắp
          </summary>
          <form action={createDeliveryAction} className="mt" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div className="field" style={{ margin: 0 }}><label>Đơn hàng</label>
              <select name="orderId" defaultValue="">
                <option value="">— Không gắn đơn —</option>
                {openOrders.map((o) => (
                  <option key={o.id} value={o.id}>{o.code}{cusName(o.customerId) ? ` · ${cusName(o.customerId)}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}><label>Khách hàng</label>
              <select name="customerId" defaultValue="">
                <option value="">— Theo đơn / nhập tay —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}><label>Đội kỹ thuật</label>
              <select name="teamId" defaultValue="">
                <option value="">— Chưa phân —</option>
                {Object.entries(names).map(([id, nm]) => (
                  <option key={id} value={id}>{nm}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}><label>Ngày hẹn *</label><input name="date" type="date" required defaultValue={todayKey} /></div>
            <div className="field" style={{ margin: 0 }}><label>Giờ hẹn</label><input name="time" type="time" defaultValue="08:00" /></div>
            <div className="field" style={{ margin: 0 }}><label>Địa chỉ</label><input name="address" placeholder="Để trống = lấy theo đơn / khách" /></div>
            <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}><label>Ghi chú</label><input name="note" placeholder="VD: Tầng 12, gọi trước 30 phút" /></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn primary"><Icon name="check" /> Lưu lịch</button>
            </div>
          </form>
        </details>
      )}

      {/* Danh sách theo ngày */}
      {deliveries.length === 0 ? (
        <div className="card mt"><p className="muted small" style={{ padding: "14px 0" }}>Chưa có lịch giao – lắp nào.</p></div>
      ) : (
        dayKeys.map((k) => {
          const jobs = groups.get(k)!;
          const isToday = k === todayKey;
          return (
            <div key={k} className="card mt" style={isToday ? { borderColor: "var(--brand)", boxShadow: "0 0 0 1px var(--brand) inset" } : undefined}>
              <div className="card-h">
                <h3 className="flex aic" style={{ gap: 10 }}>
                  <Icon name="calendar" /> {dayHeading(jobs[0].scheduledAt)}
                  {isToday && <span className="badge b-amber">Hôm nay</span>}
                </h3>
                <span className="badge b-gray">{jobs.length} lịch</span>
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                {jobs.map((d) => (
                  <div key={d.id} className="flex between" style={{ gap: 14, padding: "12px 0", borderTop: "1px solid var(--line)", flexWrap: "wrap" }}>
                    <div style={{ display: "grid", gap: 4, minWidth: 240 }}>
                      <div className="flex aic" style={{ gap: 8 }}>
                        <b className="small">{d.code}</b>
                        <span className={`badge ${DELIVERY_STATUS_BADGE[d.status]}`}>{DELIVERY_STATUS_LABEL[d.status]}</span>
                      </div>
                      <div className="uname">{cusName(d.customerId) || "Khách lẻ"}</div>
                      <div className="urole flex aic" style={{ gap: 6 }}><Icon name="clock" /> {fmtDateTime(d.scheduledAt)}</div>
                      <div className="urole flex aic" style={{ gap: 6 }}><Icon name="pin" /> {d.address || "—"}</div>
                      <div className="urole flex aic" style={{ gap: 6 }}><Icon name="wrench" /> {d.teamId ? names[d.teamId] || d.teamId : "Chưa phân đội"}</div>
                      {d.note && <div className="urole">{d.note}</div>}
                    </div>
                    {canManage && (NEXT_STATUS[d.status]?.length ?? 0) > 0 && (
                      <div className="flex gap aic" style={{ flexWrap: "wrap", alignSelf: "center" }}>
                        {NEXT_STATUS[d.status]!.map((st) => (
                          <form key={st} action={setDeliveryStatusAction}>
                            <input type="hidden" name="id" value={d.id} />
                            <input type="hidden" name="status" value={st} />
                            <button type="submit" className="btn ghost" style={{ padding: "6px 12px" }}>
                              {st === "done" ? <><Icon name="check" /> Nghiệm thu</> : `→ ${DELIVERY_STATUS_LABEL[st]}`}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                    {d.status === "done" && d.doneAt && (
                      <div className="badge b-green" style={{ alignSelf: "center" }}>Xong {fmtDate(d.doneAt)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
