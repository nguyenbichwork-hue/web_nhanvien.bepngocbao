import Link from "next/link";
import { Icon } from "@/components/icon";
import { EmployeeSelect } from "@/components/employee-select";
import { enrollTrainingAction, setEnrollStatusAction, updateCourseStatusAction } from "@/lib/org/actions";
import { getCourse, listEmployees, listEnrolls } from "@/lib/org/store";
import {
  COURSE_STATUS_BADGE,
  COURSE_STATUS_LABEL,
  ENROLL_STATUS_BADGE,
  ENROLL_STATUS_LABEL,
  type CourseStatus,
} from "@/lib/org/types";
import { formatVND } from "@/lib/payroll/calc";
import { can, requirePermission } from "@/lib/auth/session";

const fmt = (iso?: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("training.read");
  const { id } = await params;
  const [course, enrolls, employees] = await Promise.all([
    getCourse(id),
    listEnrolls({ courseId: id }),
    listEmployees(),
  ]);
  const canManage = can(session, "training.manage");

  if (!course) {
    return (
      <div className="view-in">
        <div className="card"><p className="muted" style={{ padding: 28, textAlign: "center" }}>Không tìm thấy khoá học.</p>
          <div style={{ textAlign: "center" }}><Link href="/training" className="btn"><Icon name="chevleft" /> Về danh sách</Link></div>
        </div>
      </div>
    );
  }

  const empName = (eid: string) => employees.find((e) => e.id === eid)?.fullName ?? "—";
  const enrolledIds = new Set(enrolls.filter((e) => e.status !== "cancelled").map((e) => e.employeeId));
  const roster = employees.filter((e) => e.status !== "left" && !enrolledIds.has(e.id));

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> <Link href="/training">Đào tạo</Link> <Icon name="chev" /> {course.code}
      </div>
      <div className="page-head">
        <div className="flex aic" style={{ gap: 12 }}>
          <Link href="/training" className="iconbtn" title="Quay lại"><Icon name="chevleft" /></Link>
          <div>
            <h1>{course.name} <span className={`badge ${COURSE_STATUS_BADGE[course.status]}`} style={{ verticalAlign: "middle" }}>{COURSE_STATUS_LABEL[course.status]}</span></h1>
            <p>
              {course.code}{course.provider ? ` · ${course.provider}` : ""}{course.hours ? ` · ${course.hours}h` : ""}
              {course.cost ? ` · ${formatVND(course.cost)}` : ""} · {fmt(course.startDate)}{course.endDate && course.endDate !== course.startDate ? `–${fmt(course.endDate)}` : ""}
            </p>
          </div>
        </div>
        {canManage && (
          <form action={updateCourseStatusAction} className="flex gap aic">
            <input type="hidden" name="id" value={course.id} />
            <select name="status" defaultValue={course.status} style={{ height: 36 }}>
              {(Object.keys(COURSE_STATUS_LABEL) as CourseStatus[]).map((s) => (<option key={s} value={s}>{COURSE_STATUS_LABEL[s]}</option>))}
            </select>
            <button type="submit" className="btn"><Icon name="check" /> Đổi trạng thái</button>
          </form>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h"><div><h3>Học viên ghi danh</h3><div className="sub">{enrolls.filter((e) => e.status !== "cancelled").length} người</div></div></div>
        {enrolls.length === 0 ? (
          <p className="muted" style={{ padding: "20px 0", textAlign: "center" }}>Chưa có ai ghi danh.</p>
        ) : (
          <table>
            <thead><tr><th>Nhân viên</th><th>Trạng thái</th><th style={{ textAlign: "center" }}>Điểm</th><th>Hoàn thành</th><th></th></tr></thead>
            <tbody>
              {enrolls.map((en) => (
                <tr key={en.id}>
                  <td className="uname">{empName(en.employeeId)}</td>
                  <td><span className={`badge ${ENROLL_STATUS_BADGE[en.status]}`}>{ENROLL_STATUS_LABEL[en.status]}</span></td>
                  <td style={{ textAlign: "center" }}>{en.score ?? "—"}</td>
                  <td>{fmt(en.completedDate)}</td>
                  <td style={{ textAlign: "right" }}>
                    {canManage && en.status === "enrolled" && (
                      <form action={setEnrollStatusAction} className="flex gap" style={{ justifyContent: "flex-end" }}>
                        <input type="hidden" name="id" value={en.id} />
                        <input type="hidden" name="courseId" value={course.id} />
                        <input type="hidden" name="status" value="completed" />
                        <input name="score" type="number" min="0" max="10" step="0.5" placeholder="Điểm" style={{ height: 32, width: 80 }} />
                        <button type="submit" className="btn small" style={{ color: "var(--c-teal)" }}><Icon name="check" /> Hoàn thành</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canManage && (
        <div className="card">
          <div className="card-h"><h3>Ghi danh học viên</h3></div>
          <form action={enrollTrainingAction} className="flex gap aic" style={{ flexWrap: "wrap" }}>
            <input type="hidden" name="courseId" value={course.id} />
            <EmployeeSelect name="employeeId" required employees={roster} style={{ minWidth: 260 }} />
            <button type="submit" className="btn primary"><Icon name="userplus" /> Ghi danh</button>
          </form>
        </div>
      )}
    </div>
  );
}
