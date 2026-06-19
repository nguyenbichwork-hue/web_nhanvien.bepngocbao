import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { DonutChart } from "@/components/charts/rich";
import { createCourseAction } from "@/lib/org/actions";
import { listCourses, listEnrolls } from "@/lib/org/store";
import { COURSE_STATUS_BADGE, COURSE_STATUS_LABEL, type CourseStatus } from "@/lib/org/types";
import { formatVND } from "@/lib/payroll/calc";
import { compactVnd } from "@/lib/bnb/util";
import { can, requirePermission } from "@/lib/auth/session";

export default async function TrainingPage() {
  const session = await requirePermission("training.read");
  const [courses, enrolls] = await Promise.all([listCourses(), listEnrolls()]);
  const canManage = can(session, "training.manage");
  const countOf = (courseId: string) => enrolls.filter((e) => e.courseId === courseId && e.status !== "cancelled").length;

  const activeEnrolls = enrolls.filter((e) => e.status !== "cancelled").length;
  const totalCost = courses.reduce((s, c) => s + (c.cost || 0), 0);

  // Cơ cấu khoá học theo trạng thái (donut).
  const STATUS_COLORS: Record<CourseStatus, string> = {
    planned: "#9aa1ab",
    ongoing: "#2563eb",
    done: "#0e9d6e",
    cancelled: "#e23b54",
  };
  const mix = (Object.keys(COURSE_STATUS_LABEL) as CourseStatus[])
    .map((st) => ({
      name: COURSE_STATUS_LABEL[st],
      value: courses.filter((c) => c.status === st).length,
      color: STATUS_COLORS[st],
    }))
    .filter((x) => x.value > 0);

  return (
    <div>
      <PageHero
        icon="cap"
        title="Đào tạo & Phát triển"
        subtitle="Quản lý khoá học và ghi danh học viên trong nội bộ."
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Đào tạo"]]}
        stats={[
          { label: "Khoá học", value: courses.length },
          { label: "Lượt ghi danh", value: activeEnrolls },
          { label: "Chi phí", value: compactVnd(totalCost) },
        ]}
      />

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
        <div className="card kpi grad hover gr-deepblue">
          <div className="ic"><Icon name="cap" /></div>
          <div className="val"><CountUp to={courses.length} /></div>
          <div className="lbl">khoá học</div>
        </div>
        <div className="card kpi grad hover gr-azure">
          <div className="ic"><Icon name="users" /></div>
          <div className="val"><CountUp to={activeEnrolls} /></div>
          <div className="lbl">lượt ghi danh</div>
        </div>
        <div className="card kpi grad hover gr-teal">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 24 }}>{formatVND(totalCost)}</div>
          <div className="lbl">tổng chi phí đào tạo</div>
        </div>
      </div>

      {mix.length > 0 && (
        <div className="grid-k g-2 mt" style={{ marginBottom: 20 }}>
          <div className="card hover">
            <div className="card-h"><h3 className="sec-title">Cơ cấu khoá học theo trạng thái</h3></div>
            <DonutChart data={mix} height={250} centerValue={courses.length} centerLabel="khoá" unit=" khoá" />
          </div>
        </div>
      )}

      <div className="grid-k g-2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-h"><div><h3 className="sec-title">Khoá học</h3><div className="sub">Bấm để quản lý ghi danh</div></div></div>
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
            <div className="card-h"><h3 className="sec-title">Tạo khoá học</h3></div>
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
