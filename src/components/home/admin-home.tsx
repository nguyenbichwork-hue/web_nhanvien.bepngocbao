import Link from "next/link";
import { Icon } from "@/components/icon";
import { CountUp, Donut, HBars } from "@/components/charts";
import { getHrAnalytics, getLeaveAnalytics, PALETTE } from "@/lib/org/analytics";
import { listEmployees, listLeaveRequests, listLeaveTypes } from "@/lib/org/store";
import {
  EMPLOYEE_STATUS_LABEL,
  LEAVE_STATUS_BADGE,
  type EmployeeStatus,
} from "@/lib/org/types";
import { can, type Session } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/scope";

const STATUS_BADGE: Record<EmployeeStatus, string> = {
  active: "b-green",
  probation: "b-amber",
  inactive: "b-gray",
  left: "b-rose",
};
const initials = (n: string) =>
  n.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** Trang chủ cấp Quản trị / Nhân sự — bức tranh tổ chức (giới hạn theo phạm vi). */
export async function AdminHome({
  session,
  entityId,
}: {
  session: Session;
  entityId?: string;
}) {
  const [hr, leave, pendingAll, allEmployees, leaveTypes] = await Promise.all([
    getHrAnalytics(entityId),
    getLeaveAnalytics(entityId),
    listLeaveRequests({ status: "pending" }),
    listEmployees(),
    listLeaveTypes(),
  ]);

  const visIds = await visibleEmployeeIds(session);
  const inScope = (id: string) => visIds === "all" || visIds.has(id);
  const pending = pendingAll.filter((r) => inScope(r.employeeId));
  const empName = (id: string) => allEmployees.find((e) => e.id === id)?.fullName ?? "—";
  const typeName = (id: string) => leaveTypes.find((t) => t.id === id)?.name ?? "Nghỉ phép";

  const now = new Date();
  const hour = now.getHours();
  const greet = hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  const todayLabel = now.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  const donutEntity = hr.byEntity.map((s) => [s.label, s.count, s.color] as [string, number, string]);

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Bảng điều khiển
      </div>
      <div className="page-head">
        <div>
          <h1>{greet}, {session.user.fullName.split(" ").slice(-1)[0]} 👋</h1>
          <p>Bức tranh nhân sự — {entityId ? "phạm vi pháp nhân của bạn" : "toàn tập đoàn"} · {todayLabel}.</p>
        </div>
        <div className="flex gap">
          {can(session, "report.read") && (
            <Link href="/reports" className="btn"><Icon name="chart" /> Xem báo cáo</Link>
          )}
          {can(session, "leave.request") && (
            <Link href="/leave" className="btn primary"><Icon name="plus" /> Tạo đơn nghỉ</Link>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ marginBottom: 20 }}>
        <div className="card kpi hover tone-i">
          <div className="ic"><Icon name="users" /></div>
          <div className="val"><CountUp to={hr.total} /></div>
          <div className="lbl">Tổng nhân sự</div>
          <span className="trend up">{hr.byEntity.length} pháp nhân</span>
        </div>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="check" /></div>
          <div className="val"><CountUp to={hr.active} /></div>
          <div className="lbl">Chính thức</div>
          <span className="trend up">{hr.probation} đang thử việc</span>
        </div>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="calendar" /></div>
          <div className="val"><CountUp to={leave.pending} /></div>
          <div className="lbl">Đơn chờ duyệt</div>
          <span className="trend">{leave.onLeaveToday} người nghỉ hôm nay</span>
        </div>
        <div className="card kpi hover tone-r">
          <div className="ic"><Icon name="userplus" /></div>
          <div className="val"><CountUp to={hr.hiresThisYear} /></div>
          <div className="lbl">Tuyển trong năm</div>
          <span className="trend up">+{hr.hiresThisMonth} trong tháng</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-k g-2 stagger" style={{ marginBottom: 20 }}>
        <div className="card hover">
          <div className="card-h"><h3>Cơ cấu theo pháp nhân</h3></div>
          {hr.total === 0 ? (
            <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>Chưa có nhân sự.</p>
          ) : (
            <div className="donut-wrap">
              <Donut data={donutEntity} total={hr.total} unit="NV" />
              <div style={{ flex: 1 }}>
                {hr.byEntity.map((d) => (
                  <div key={d.label} className="flex between aic" style={{ padding: "6px 0" }}>
                    <span className="small">
                      <i style={{ background: d.color, width: 11, height: 11, borderRadius: 4, display: "inline-block", marginRight: 8 }} />
                      {d.label}
                    </span>
                    <b className="small">{d.count}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="card hover">
          <div className="card-h">
            <div>
              <h3>Phân bổ theo phòng ban</h3>
              <div className="sub">Số nhân sự đang làm</div>
            </div>
          </div>
          <HBars data={hr.byDepartment} unit=" NV" />
        </div>
      </div>

      {/* Tables */}
      <div className="grid-k g-2 stagger">
        <div className="card hover">
          <div className="card-h">
            <h3>Nhân viên mới onboarding</h3>
            {can(session, "employee.read") && <Link href="/employees" className="badge b-indigo">Xem tất cả</Link>}
          </div>
          {hr.recentHires.length === 0 ? (
            <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>Chưa có nhân viên mới.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Nhân viên</th><th>Phòng ban</th><th>Ngày vào</th><th>Trạng thái</th></tr>
              </thead>
              <tbody>
                {hr.recentHires.map((e, i) => (
                  <tr key={e.id}>
                    <td>
                      <div className="urow">
                        <div className="av" style={{ background: PALETTE[i % PALETTE.length] }}>{initials(e.name)}</div>
                        <div><div className="uname">{e.name}</div></div>
                      </div>
                    </td>
                    <td>{e.dept}</td>
                    <td>{fmtDate(e.date)}</td>
                    <td><span className={`badge ${STATUS_BADGE[e.status]}`}>{EMPLOYEE_STATUS_LABEL[e.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card hover">
          <div className="card-h">
            <h3>Đơn chờ duyệt</h3>
            {pending.length > 0 && <span className="badge b-amber">{pending.length} đơn</span>}
          </div>
          {pending.length === 0 ? (
            <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>Không có đơn nào chờ duyệt. 🎉</p>
          ) : (
            <div>
              {pending.slice(0, 6).map((r, i) => (
                <Link key={r.id} href="/leave" className="flex aic" style={{ gap: 13, padding: 13, borderRadius: "var(--r-md)", color: "inherit" }}>
                  <div className="av" style={{ background: PALETTE[i % PALETTE.length] }}>{initials(empName(r.employeeId))}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "13.5px" }}>{typeName(r.leaveTypeId)} · {empName(r.employeeId)}</div>
                    <div style={{ fontSize: 12, color: "var(--tx-soft)" }}>
                      {r.days} ngày · {fmtDate(r.startDate)}{r.endDate !== r.startDate ? `–${fmtDate(r.endDate)}` : ""}
                    </div>
                  </div>
                  <span className={`badge ${LEAVE_STATUS_BADGE.pending}`}>Chờ duyệt</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
