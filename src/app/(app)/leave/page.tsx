import { Icon } from "@/components/icon";
import { LeaveRequestForm } from "@/components/leave-request-form";
import { TableFilter } from "@/components/table-filter";
import {
  approveLeaveRequestAction,
  cancelLeaveRequestAction,
  rejectLeaveRequestAction,
} from "@/lib/org/actions";
import {
  getApprovalConfig,
  getLeaveBalance,
  getScheduleConfig,
  listEmployees,
  listLeaveRequests,
  listLeaveTypes,
} from "@/lib/org/store";
import {
  LEAVE_STATUS_BADGE,
  LEAVE_STATUS_LABEL,
  type LeaveBalance,
} from "@/lib/org/types";
import { can, requirePermission } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/scope";

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const fmtRange = (a: string, b: string) => (a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`);

export default async function LeavePage() {
  const session = await requirePermission("leave.read");
  const [allEmployees, leaveTypes, allRequests, config] = await Promise.all([
    listEmployees(),
    listLeaveTypes(),
    listLeaveRequests(),
    getScheduleConfig(),
  ]);

  // Giới hạn theo phạm vi: chỉ thấy nhân viên & đơn trong tầm của mình.
  const visIds = await visibleEmployeeIds(session);
  const employees = visIds === "all" ? allEmployees : allEmployees.filter((e) => visIds.has(e.id));
  const requests = visIds === "all" ? allRequests : allRequests.filter((r) => visIds.has(r.employeeId));
  const canApprove = can(session, "leave.approve");
  const canRequest = can(session, "leave.request");
  const selfId = session.employee?.id;
  const approvalLevels = (await getApprovalConfig()).leaveLevels;

  const now = new Date();
  const year = now.getUTCFullYear();
  const monthPrefix = `${year}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const today = `${monthPrefix}-${String(now.getUTCDate()).padStart(2, "0")}`;

  const roster = employees.filter((e) => e.status !== "left");
  const empById = new Map(employees.map((e) => [e.id, e]));
  const typeById = new Map(leaveTypes.map((t) => [t.id, t]));
  const empName = (id: string) => empById.get(id)?.fullName ?? id;

  // Số dư quỹ phép năm cho từng nhân viên đang làm.
  const balances: Record<string, LeaveBalance> = {};
  await Promise.all(
    roster.map(async (e) => {
      balances[e.id] = await getLeaveBalance(e.id, year);
    }),
  );

  // Sắp xếp: chờ duyệt trước, rồi theo ngày tạo mới nhất.
  const sorted = [...requests].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (b.status === "pending" && a.status !== "pending") return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
  const pending = sorted.filter((r) => r.status === "pending");

  // KPI
  const onLeaveToday = requests.filter(
    (r) => r.status === "approved" && r.startDate <= today && today <= r.endDate,
  ).length;
  const monthCount = requests.filter((r) => r.startDate.startsWith(monthPrefix)).length;
  const approvedDaysMonth = requests
    .filter((r) => r.status === "approved" && r.startDate.startsWith(monthPrefix))
    .reduce((s, r) => s + r.days, 0);

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Nghỉ phép
      </div>
      <div className="page-head">
        <div>
          <h1>Quản lý nghỉ phép</h1>
          <p>Gửi đơn, theo dõi quỹ phép năm và duyệt đơn một cấp. Đơn đã duyệt tự hiển thị trên Lịch làm việc.</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ marginBottom: 20 }}>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="calendar" /></div>
          <div className="val">{pending.length}</div>
          <div className="lbl">Đơn chờ duyệt</div>
        </div>
        <div className="card kpi hover tone-i">
          <div className="ic"><Icon name="users" /></div>
          <div className="val">{onLeaveToday}</div>
          <div className="lbl">Đang nghỉ hôm nay</div>
        </div>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="check" /></div>
          <div className="val">{approvedDaysMonth}</div>
          <div className="lbl">Ngày phép duyệt tháng này</div>
        </div>
        <div className="card kpi hover tone-r">
          <div className="ic"><Icon name="clock" /></div>
          <div className="val">{monthCount}</div>
          <div className="lbl">Đơn trong tháng</div>
        </div>
      </div>

      {/* Tạo đơn (chỉ khi có quyền gửi đơn) */}
      {canRequest && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-h">
            <div>
              <h3>Tạo đơn nghỉ</h3>
              <div className="sub">Chọn nhân viên, loại nghỉ và khoảng ngày — hệ thống tự tính số ngày công.</div>
            </div>
          </div>
          <LeaveRequestForm
            employees={roster.map((e) => ({ id: e.id, fullName: e.fullName, code: e.code }))}
            leaveTypes={leaveTypes.filter((t) => t.isActive)}
            balances={balances}
            workingWeekdays={config.workingWeekdays}
          />
        </div>
      )}

      {/* Chờ duyệt */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <div>
            <h3>Chờ duyệt</h3>
            <div className="sub">{pending.length} đơn cần xử lý</div>
          </div>
        </div>
        {pending.length === 0 ? (
          <p className="muted" style={{ padding: "16px 0" }}>Không có đơn nào đang chờ.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Nhân viên</th><th>Loại</th><th>Thời gian</th><th>Số ngày</th><th>Lý do</th><th style={{ textAlign: "right" }}>Xử lý</th></tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id}>
                  <td className="uname">{empName(r.employeeId)}</td>
                  <td><span className={`badge ${typeById.get(r.leaveTypeId)?.badge ?? "b-gray"}`}>{typeById.get(r.leaveTypeId)?.name ?? "—"}</span></td>
                  <td>{fmtRange(r.startDate, r.endDate)}{r.halfDay ? " · nửa ngày" : ""}</td>
                  <td><b>{r.days}</b></td>
                  <td className="small muted">{r.reason ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    {approvalLevels > 1 && (
                      <div className="small muted" style={{ marginBottom: 6 }}>
                        Đã duyệt {r.approvals?.length ?? 0}/{approvalLevels} cấp
                        {(r.approvals?.length ?? 0) > 0 ? ` · ${r.approvals!.map((a) => a.byName).join(", ")}` : ""}
                      </div>
                    )}
                    {canApprove ? (
                      <div className="flex gap" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <form action={approveLeaveRequestAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="btn" style={{ height: 34, padding: "0 12px", color: "var(--c-teal)" }}>
                            <Icon name="check" /> {(r.approvals?.length ?? 0) + 1 >= approvalLevels ? "Duyệt" : `Duyệt cấp ${(r.approvals?.length ?? 0) + 1}`}
                          </button>
                        </form>
                        <details>
                          <summary className="btn ghost" style={{ height: 34, padding: "0 12px", listStyle: "none", color: "var(--c-rose)" }}>
                            <Icon name="x" /> Từ chối
                          </summary>
                          <form action={rejectLeaveRequestAction} className="flex gap" style={{ marginTop: 8 }}>
                            <input type="hidden" name="id" value={r.id} />
                            <input name="decisionNote" placeholder="Lý do từ chối" style={{ height: 34 }} />
                            <button type="submit" className="btn" style={{ height: 34, padding: "0 12px", color: "var(--c-rose)" }}>Xác nhận</button>
                          </form>
                        </details>
                      </div>
                    ) : (
                      <span className="muted small">Chờ quản lý duyệt</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lịch sử đơn */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <div>
            <h3>Tất cả đơn nghỉ</h3>
            <div className="sub">{requests.length} đơn</div>
          </div>
          {sorted.length > 8 && <TableFilter targetId="leave-all-table" />}
        </div>
        <table id="leave-all-table">
          <thead>
            <tr><th>Nhân viên</th><th>Loại</th><th>Thời gian</th><th>Số ngày</th><th>Trạng thái</th><th>Ghi chú duyệt</th><th></th></tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td className="uname">{empName(r.employeeId)}</td>
                <td><span className={`badge ${typeById.get(r.leaveTypeId)?.badge ?? "b-gray"}`}>{typeById.get(r.leaveTypeId)?.name ?? "—"}</span></td>
                <td>{fmtRange(r.startDate, r.endDate)}{r.halfDay ? " · nửa ngày" : ""}</td>
                <td><b>{r.days}</b></td>
                <td><span className={`badge ${LEAVE_STATUS_BADGE[r.status]}`}>{LEAVE_STATUS_LABEL[r.status]}</span></td>
                <td className="small muted">{r.status === "rejected" ? r.decisionNote ?? "—" : r.decidedByName ?? "—"}</td>
                <td style={{ textAlign: "right" }}>
                  {(r.status === "pending" || r.status === "approved") &&
                    (canApprove || r.employeeId === selfId) && (
                      <form action={cancelLeaveRequestAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="iconbtn" title="Huỷ đơn"><Icon name="trash" /></button>
                      </form>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quỹ phép năm */}
      <div className="card">
        <div className="card-h">
          <div>
            <h3>Quỹ phép năm {year}</h3>
            <div className="sub">12 ngày cơ bản + 1 ngày mỗi 5 năm thâm niên · năm đầu tính theo tỷ lệ</div>
          </div>
          {roster.length > 8 && <TableFilter targetId="leave-balance-table" />}
        </div>
        <table id="leave-balance-table">
          <thead>
            <tr><th>Nhân viên</th><th>Quỹ</th><th>Đã dùng</th><th>Chờ duyệt</th><th>Còn lại</th></tr>
          </thead>
          <tbody>
            {roster.map((e) => {
              const b = balances[e.id];
              return (
                <tr key={e.id}>
                  <td className="uname">{e.fullName} <span className="small muted">· {e.code}</span></td>
                  <td>{b.quota}</td>
                  <td>{b.used}</td>
                  <td>{b.pending > 0 ? <span className="badge b-amber">{b.pending}</span> : "—"}</td>
                  <td><span className={`badge ${b.remaining <= 0 ? "b-rose" : "b-green"}`}>{b.remaining} ngày</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
