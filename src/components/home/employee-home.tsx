import Link from "next/link";
import { Icon } from "@/components/icon";
import {
  getLeaveBalance,
  listLeaveRequests,
  listLeaveTypes,
  listReviewCycles,
  listReviews,
  resolveMonth,
} from "@/lib/org/store";
import {
  LEAVE_STATUS_BADGE,
  LEAVE_STATUS_LABEL,
  SCHEDULE_KIND_BADGE,
  SCHEDULE_KIND_LABEL,
  perfRating,
} from "@/lib/org/types";
import { type Session } from "@/lib/auth/session";

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const dow = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

/** Trang chủ cấp Nhân viên — cổng tự phục vụ cá nhân. */
export async function EmployeeHome({ session }: { session: Session }) {
  const emp = session.employee;
  const hour = new Date().getHours();
  const greet = hour < 11 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";

  if (!emp) {
    return (
      <div className="view-in">
        <div className="page-head"><div><h1>{greet} 👋</h1><p>Tài khoản chưa gắn hồ sơ nhân viên.</p></div></div>
        <div className="card"><p className="muted" style={{ padding: 20 }}>Liên hệ Nhân sự để liên kết hồ sơ.</p></div>
      </div>
    );
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const today = now.toISOString().slice(0, 10);
  const ym = `${year}-${String(month).padStart(2, "0")}`;

  const [balance, myRequests, leaveTypes, monthDays, cycles] = await Promise.all([
    getLeaveBalance(emp.id, year),
    listLeaveRequests({ employeeId: emp.id }),
    listLeaveTypes(),
    resolveMonth(emp.id, year, month),
    listReviewCycles(),
  ]);

  const typeName = (id: string) => leaveTypes.find((t) => t.id === id)?.name ?? "Nghỉ phép";
  const upcoming = monthDays.filter((d) => d.date >= today && d.kind !== "off").slice(0, 5);
  const myPending = myRequests.filter((r) => r.status === "pending");
  const recent = [...myRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const openCycle = cycles.find((c) => c.status === "open") ?? cycles[0];
  const reviews = openCycle ? await listReviews(openCycle.id) : [];
  const myReview = reviews.find((r) => r.employeeId === emp.id);
  const myRating = perfRating(myReview?.finalScore);

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Trang của tôi
      </div>
      <div className="page-head">
        <div>
          <h1>{greet}, {emp.fullName.split(" ").slice(-1)[0]} 👋</h1>
          <p>Cổng nhân viên — lịch, nghỉ phép, lương và KPI của bạn.</p>
        </div>
        <Link href="/leave" className="btn primary"><Icon name="plus" /> Tạo đơn nghỉ</Link>
      </div>

      {/* KPI cá nhân */}
      <div className="grid-k g-4 stagger" style={{ marginBottom: 20 }}>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="calendar" /></div>
          <div className="val">{balance.remaining}</div>
          <div className="lbl">Ngày phép còn lại</div>
          <span className="trend">/{balance.quota} ngày quỹ {year}</span>
        </div>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="clock" /></div>
          <div className="val">{myPending.length}</div>
          <div className="lbl">Đơn đang chờ duyệt</div>
        </div>
        <div className="card kpi hover tone-i">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 18 }}>Phiếu lương</div>
          <div className="lbl"><Link href={`/payroll/${emp.id}?month=${ym}`} style={{ color: "var(--brand-1)" }}>Xem tháng này →</Link></div>
        </div>
        <div className="card kpi hover tone-r">
          <div className="ic"><Icon name="target" /></div>
          <div className="val" style={{ fontSize: 20 }}>
            {myRating ? `${myRating.code} · ${myRating.label}` : (myReview?.finalScore?.toFixed(2).replace(".", ",") ?? "—")}
          </div>
          <div className="lbl">KPI {openCycle?.periodLabel ?? ""}</div>
        </div>
      </div>

      <div className="grid-k g-2 stagger" style={{ alignItems: "start" }}>
        {/* Lịch sắp tới */}
        <div className="card hover">
          <div className="card-h">
            <h3>Lịch làm việc sắp tới</h3>
            <Link href="/schedule" className="badge b-indigo">Lịch của tôi</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted" style={{ padding: "20px 0", textAlign: "center" }}>Không còn ngày làm nào trong tháng.</p>
          ) : (
            <table>
              <thead><tr><th>Ngày</th><th>Loại</th><th>Giờ</th></tr></thead>
              <tbody>
                {upcoming.map((d) => (
                  <tr key={d.date}>
                    <td><b>{dow(d.date)}</b> {fmtDate(d.date)}</td>
                    <td><span className={`badge ${SCHEDULE_KIND_BADGE[d.kind]}`}>{SCHEDULE_KIND_LABEL[d.kind]}</span></td>
                    <td className="small muted">
                      {d.customStart && d.customEnd
                        ? `${d.customStart}–${d.customEnd}`
                        : d.shift
                          ? `${d.shift.startTime}–${d.shift.endTime}`
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Đơn nghỉ của tôi */}
        <div className="card hover">
          <div className="card-h">
            <h3>Đơn nghỉ của tôi</h3>
            <Link href="/leave" className="badge b-indigo">Tất cả</Link>
          </div>
          {recent.length === 0 ? (
            <p className="muted" style={{ padding: "20px 0", textAlign: "center" }}>Bạn chưa có đơn nghỉ nào.</p>
          ) : (
            <table>
              <thead><tr><th>Loại</th><th>Thời gian</th><th style={{ textAlign: "center" }}>Ngày</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td>{typeName(r.leaveTypeId)}</td>
                    <td>{fmtDate(r.startDate)}{r.endDate !== r.startDate ? `–${fmtDate(r.endDate)}` : ""}</td>
                    <td style={{ textAlign: "center" }}><b>{r.days}</b></td>
                    <td><span className={`badge ${LEAVE_STATUS_BADGE[r.status]}`}>{LEAVE_STATUS_LABEL[r.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
