import Link from "next/link";
import { Icon } from "@/components/icon";
import { approveLeaveRequestAction, rejectLeaveRequestAction } from "@/lib/org/actions";
import {
  listDepartments,
  listEmployees,
  listLeaveRequests,
  listLeaveTypes,
  listReviewCycles,
  listReviews,
} from "@/lib/org/store";
import { EMPLOYEE_STATUS_LABEL, perfRating, type EmployeeStatus } from "@/lib/org/types";
import { type Session } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/scope";

const STATUS_BADGE: Record<EmployeeStatus, string> = {
  active: "b-green",
  probation: "b-amber",
  inactive: "b-gray",
  left: "b-rose",
};
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** Trang chủ cấp Quản lý trực tiếp — bảng điều khiển đội của mình. */
export async function ManagerHome({ session }: { session: Session }) {
  const visIds = await visibleEmployeeIds(session);
  const teamIds = visIds === "all" ? null : visIds;
  const inTeam = (id: string) => !teamIds || teamIds.has(id);

  const [allEmployees, departments, allRequests, leaveTypes, cycles] = await Promise.all([
    listEmployees(),
    listDepartments(),
    listLeaveRequests(),
    listLeaveTypes(),
    listReviewCycles(),
  ]);

  const team = allEmployees.filter((e) => inTeam(e.id) && e.status !== "left");
  const deptName = departments.find((d) => d.id === session.scopeDepartmentId)?.name ?? "Đội của tôi";
  const typeName = (id: string) => leaveTypes.find((t) => t.id === id)?.name ?? "Nghỉ phép";

  const today = new Date().toISOString().slice(0, 10);
  const teamRequests = allRequests.filter((r) => inTeam(r.employeeId));
  const pending = teamRequests.filter((r) => r.status === "pending");
  const onLeaveToday = teamRequests.filter(
    (r) => r.status === "approved" && r.startDate <= today && today <= r.endDate,
  ).length;

  const openCycle = cycles.find((c) => c.status === "open") ?? cycles[0];
  const reviews = openCycle ? await listReviews(openCycle.id) : [];
  const teamReviews = reviews.filter((r) => inTeam(r.employeeId));
  const scored = teamReviews.filter((r) => r.finalScore != null);
  const avgScore = scored.length
    ? scored.reduce((s, r) => s + (r.finalScore as number), 0) / scored.length
    : null;

  const empName = (id: string) => allEmployees.find((e) => e.id === id)?.fullName ?? "—";
  const hour = new Date().getHours();
  const greet = hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Quản lý đội
      </div>
      <div className="page-head">
        <div>
          <h1>{greet}, {session.user.fullName.split(" ").slice(-1)[0]} 👋</h1>
          <p>Bảng điều khiển <b>{deptName}</b> — {team.length} thành viên.</p>
        </div>
        <Link href="/schedule" className="btn primary"><Icon name="clock" /> Xếp lịch đội</Link>
      </div>

      {/* KPI đội */}
      <div className="grid-k g-4 stagger" style={{ marginBottom: 20 }}>
        <div className="card kpi hover tone-i">
          <div className="ic"><Icon name="users" /></div>
          <div className="val">{team.length}</div>
          <div className="lbl">Thành viên đội</div>
        </div>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="calendar" /></div>
          <div className="val">{pending.length}</div>
          <div className="lbl">Đơn chờ tôi duyệt</div>
        </div>
        <div className="card kpi hover tone-r">
          <div className="ic"><Icon name="clock" /></div>
          <div className="val">{onLeaveToday}</div>
          <div className="lbl">Đang nghỉ hôm nay</div>
        </div>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="target" /></div>
          <div className="val">{avgScore == null ? "—" : avgScore.toFixed(2).replace(".", ",")}</div>
          <div className="lbl">Điểm KPI đội (TB)</div>
        </div>
      </div>

      {/* Đơn chờ duyệt — duyệt nhanh */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-h">
          <div>
            <h3>Đơn nghỉ chờ tôi duyệt</h3>
            <div className="sub">{pending.length} đơn của đội</div>
          </div>
          <Link href="/leave" className="badge b-indigo">Tới Nghỉ phép</Link>
        </div>
        {pending.length === 0 ? (
          <p className="muted" style={{ padding: "20px 0", textAlign: "center" }}>Không có đơn nào chờ duyệt. 🎉</p>
        ) : (
          <table>
            <thead>
              <tr><th>Nhân viên</th><th>Loại</th><th>Thời gian</th><th style={{ textAlign: "center" }}>Ngày</th><th style={{ textAlign: "right" }}>Xử lý</th></tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id}>
                  <td className="uname">{empName(r.employeeId)}</td>
                  <td>{typeName(r.leaveTypeId)}</td>
                  <td>{fmtDate(r.startDate)}{r.endDate !== r.startDate ? `–${fmtDate(r.endDate)}` : ""}</td>
                  <td style={{ textAlign: "center" }}><b>{r.days}</b></td>
                  <td style={{ textAlign: "right" }}>
                    <div className="flex gap" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <form action={approveLeaveRequestAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="btn" style={{ height: 32, padding: "0 11px", color: "var(--c-teal)" }}>
                          <Icon name="check" /> Duyệt
                        </button>
                      </form>
                      <form action={rejectLeaveRequestAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="btn ghost" style={{ height: 32, padding: "0 11px", color: "var(--c-rose)" }}>
                          <Icon name="x" /> Từ chối
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Danh sách đội */}
      <div className="card">
        <div className="card-h">
          <h3>Thành viên đội</h3>
          <Link href="/schedule" className="badge b-indigo">Lịch làm việc</Link>
        </div>
        {team.length === 0 ? (
          <p className="muted" style={{ padding: "20px 0", textAlign: "center" }}>Đội chưa có thành viên.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Nhân viên</th><th>Trạng thái</th><th style={{ textAlign: "center" }}>KPI kỳ này</th></tr>
            </thead>
            <tbody>
              {team.map((e) => {
                const rv = teamReviews.find((r) => r.employeeId === e.id);
                const rating = perfRating(rv?.finalScore);
                return (
                  <tr key={e.id}>
                    <td className="uname">{e.fullName} <span className="small muted">· {e.code}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[e.status]}`}>{EMPLOYEE_STATUS_LABEL[e.status]}</span></td>
                    <td style={{ textAlign: "center" }}>
                      {rating ? <span className={`badge ${rating.badge}`}>{rating.code}</span> : <span className="muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
