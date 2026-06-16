import Link from "next/link";
import { Icon } from "@/components/icon";
import { createCourseAction } from "@/lib/org/actions";
import { listCourses, listEnrolls } from "@/lib/org/store";
import { COURSE_STATUS_BADGE, COURSE_STATUS_LABEL, type CourseStatus } from "@/lib/org/types";
import { formatVND } from "@/lib/payroll/calc";
import { can, requirePermission } from "@/lib/auth/session";

export default async function TrainingPage() {
  const session = await requirePermission("training.read");
  const [courses, enrolls] = await Promise.all([listCourses(), listEnrolls()]);
  const canManage = can(session, "training.manage");
  const countOf = (courseId: string) => enrolls.filter((e) => e.courseId === courseId && e.status !== "cancelled").length;

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Đào tạo
      </div>
      <div className="page-head">
        <div>
          <h1>Đào tạo & Phát triển</h1>
          <p>{courses.length} khoá học · {enrolls.filter((e) => e.status !== "cancelled").length} lượt ghi danh.</p>
        </div>
      </div>

      <div className="grid-k g-2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-h"><div><h3>Khoá học</h3><div className="sub">Bấm để quản lý ghi danh</div></div></div>
          {courses.length === 0 ? (
            <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>Chưa có khoá học nào.</p>
          ) : (
            <table>
              <thead><tr><th>Khoá học</th><th style={{ textAlign: "center" }}>Giờ</th><th style={{ textAlign: "center" }}>Học viên</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="uname">{c.name}</div>
                      <div className="small muted">{c.code}{c.provider ? ` · ${c.provider}` : ""}{c.cost ? ` · ${formatVND(c.cost)}` : ""}</div>
                    </td>
                    <td style={{ textAlign: "center" }}>{c.hours ?? "—"}</td>
                    <td style={{ textAlign: "center" }}>{countOf(c.id)}</td>
                    <td><span className={`badge ${COURSE_STATUS_BADGE[c.status]}`}>{COURSE_STATUS_LABEL[c.status]}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/training/${c.id}`} className="iconbtn" title="Chi tiết & ghi danh"><Icon name="chev" /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {canManage && (
          <div className="card">
            <div className="card-h"><h3>Tạo khoá học</h3></div>
            <form action={createCourseAction}>
              <div className="grid-k g-2" style={{ gap: 12 }}>
                <div className="field"><label>Mã *</label><input name="code" required placeholder="KH-004" /></div>
                <div className="field"><label>Trạng thái</label>
                  <select name="status" defaultValue="planned">
                    {(Object.keys(COURSE_STATUS_LABEL) as CourseStatus[]).map((s) => (<option key={s} value={s}>{COURSE_STATUS_LABEL[s]}</option>))}
                  </select>
                </div>
              </div>
              <div className="field"><label>Tên khoá học *</label><input name="name" required placeholder="VD: Kỹ năng thuyết trình" /></div>
              <div className="grid-k g-2" style={{ gap: 12 }}>
                <div className="field"><label>Lĩnh vực</label><input name="category" placeholder="Kỹ năng / Tuân thủ…" /></div>
                <div className="field"><label>Đơn vị đào tạo</label><input name="provider" placeholder="Nội bộ / đối tác" /></div>
                <div className="field"><label>Số giờ</label><input type="number" name="hours" min="0" step="1" /></div>
                <div className="field"><label>Chi phí/khoá</label><input type="number" name="cost" min="0" step="100000" /></div>
                <div className="field"><label>Bắt đầu</label><input type="date" name="startDate" /></div>
                <div className="field"><label>Kết thúc</label><input type="date" name="endDate" /></div>
              </div>
              <button type="submit" className="btn primary"><Icon name="plus" /> Tạo khoá học</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
