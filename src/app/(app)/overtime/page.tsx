import { Icon } from "@/components/icon";
import { EmployeeSelect } from "@/components/employee-select";
import { TableFilter } from "@/components/table-filter";
import { cancelOvertimeAction, createOvertimeAction, decideOvertimeAction } from "@/lib/org/actions";
import { listEmployees, listOvertime } from "@/lib/org/store";
import { LEAVE_STATUS_BADGE, LEAVE_STATUS_LABEL, OT_MULTIPLIERS, otMultiplierLabel } from "@/lib/org/types";
import { can, requirePermission } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/scope";

const fmt = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default async function OvertimePage() {
  const session = await requirePermission("overtime.read");
  const [allOt, allEmployees] = await Promise.all([listOvertime(), listEmployees()]);

  const visIds = await visibleEmployeeIds(session);
  const inScope = (id: string) => visIds === "all" || visIds.has(id);
  const items = allOt.filter((o) => inScope(o.employeeId));
  const roster = allEmployees.filter((e) => inScope(e.id) && e.status !== "left");
  const empName = (id: string) => allEmployees.find((e) => e.id === id)?.fullName ?? "—";
  const canApprove = can(session, "overtime.approve");
  const canRequest = can(session, "overtime.request");
  const selfId = session.employee?.id;

  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const pending = items.filter((o) => o.status === "pending");
  const approvedHoursMonth = items
    .filter((o) => o.status === "approved" && o.date.startsWith(ym))
    .reduce((s, o) => s + o.hours, 0);

  const sorted = [...items].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Làm thêm giờ
      </div>
      <div className="page-head">
        <div>
          <h1>Làm thêm giờ (OT)</h1>
          <p>Đăng ký & duyệt OT; giờ đã duyệt tự tính tiền vào phiếu lương.</p>
        </div>
      </div>

      <div className="grid-k g-4 stagger" style={{ marginBottom: 20 }}>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="clock" /></div>
          <div className="val">{pending.length}</div>
          <div className="lbl">Đơn chờ duyệt</div>
        </div>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="check" /></div>
          <div className="val">{approvedHoursMonth}</div>
          <div className="lbl">Giờ OT duyệt (tháng)</div>
        </div>
      </div>

      {canRequest && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-h"><h3>Đăng ký làm thêm giờ</h3></div>
          <form action={createOvertimeAction}>
            <div className="grid-k g-4" style={{ gap: 14, alignItems: "end" }}>
              {session.scope !== "SELF" && (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Nhân viên *</label>
                  <EmployeeSelect name="employeeId" required employees={roster} defaultValue={selfId ?? ""} />
                </div>
              )}
              <div className="field" style={{ marginBottom: 0 }}><label>Ngày *</label><input type="date" name="date" required /></div>
              <div className="field" style={{ marginBottom: 0 }}><label>Số giờ *</label><input type="number" name="hours" min="0.5" step="0.5" required /></div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Hệ số</label>
                <select name="multiplier" defaultValue="1.5">
                  {OT_MULTIPLIERS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}><label>Lý do</label><input name="reason" placeholder="Lý do làm thêm…" /></div>
            <button type="submit" className="btn primary"><Icon name="plus" /> Gửi đăng ký</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-h">
          <div><h3>Danh sách OT</h3><div className="sub">{items.length} đơn</div></div>
          {sorted.length > 8 && <TableFilter targetId="ot-table" />}
        </div>
        {sorted.length === 0 ? (
          <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>Chưa có đăng ký OT nào.</p>
        ) : (
          <table id="ot-table">
            <thead><tr><th>Nhân viên</th><th>Ngày</th><th style={{ textAlign: "center" }}>Giờ</th><th>Hệ số</th><th>Lý do</th><th>Trạng thái</th><th style={{ textAlign: "right" }}>Xử lý</th></tr></thead>
            <tbody>
              {sorted.map((o) => (
                <tr key={o.id}>
                  <td className="uname">{empName(o.employeeId)}</td>
                  <td>{fmt(o.date)}</td>
                  <td style={{ textAlign: "center" }}><b>{o.hours}</b></td>
                  <td><span className="badge b-gray">{otMultiplierLabel(o.multiplier)}</span></td>
                  <td className="small muted">{o.reason ?? "—"}</td>
                  <td><span className={`badge ${LEAVE_STATUS_BADGE[o.status]}`}>{LEAVE_STATUS_LABEL[o.status]}</span></td>
                  <td style={{ textAlign: "right" }}>
                    {o.status === "pending" && canApprove ? (
                      <div className="flex gap" style={{ justifyContent: "flex-end" }}>
                        <form action={decideOvertimeAction}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="decision" value="approved" />
                          <button type="submit" className="btn" style={{ height: 32, padding: "0 11px", color: "var(--c-teal)" }}><Icon name="check" /> Duyệt</button>
                        </form>
                        <form action={decideOvertimeAction}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="decision" value="rejected" />
                          <button type="submit" className="btn ghost" style={{ height: 32, padding: "0 11px", color: "var(--c-rose)" }}><Icon name="x" /> Từ chối</button>
                        </form>
                      </div>
                    ) : (o.status === "pending" || o.status === "approved") && (canApprove || o.employeeId === selfId) ? (
                      <form action={cancelOvertimeAction}>
                        <input type="hidden" name="id" value={o.id} />
                        <button type="submit" className="iconbtn" title="Huỷ"><Icon name="trash" /></button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
