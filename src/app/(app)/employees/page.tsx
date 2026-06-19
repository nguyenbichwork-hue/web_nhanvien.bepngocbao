import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { DonutChart, BarsChart, type Slice } from "@/components/charts/rich";
import { listDepartments, listEmployees, listJobTitles } from "@/lib/org/store";
import { EMPLOYEE_STATUS_LABEL, type EmployeeStatus } from "@/lib/org/types";
import { can, requirePermission } from "@/lib/auth/session";
import { filterEmployees } from "@/lib/auth/scope";

const STATUS_BADGE: Record<EmployeeStatus, string> = {
  active: "b-green",
  probation: "b-amber",
  inactive: "b-gray",
  left: "b-rose",
};

const MIX_COLORS = ["#2563eb", "#7c3aed", "#0e9d6e", "#d98309", "#e23b54", "#0d9488", "#9aa1ab"];

type SP = { q?: string; dept?: string; status?: string };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await requirePermission("employee.read");
  const sp = await searchParams;
  const [departments, jobTitles, allEmployees] = await Promise.all([
    listDepartments(),
    listJobTitles(),
    listEmployees(),
  ]);

  // Giới hạn theo phạm vi của người dùng (phòng ban / cá nhân).
  const employees = await filterEmployees(session, allEmployees);
  const canCreate = can(session, "employee.create");

  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? "—";
  const titleName = (id?: string | null) => jobTitles.find((j) => j.id === id)?.name ?? "—";

  const q = (sp.q ?? "").trim().toLowerCase();
  const filtered = employees.filter((e) => {
    if (sp.dept && e.departmentId !== sp.dept) return false;
    if (sp.status && e.status !== sp.status) return false;
    if (q && !`${e.fullName} ${e.code} ${e.email ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const filterDepts = departments;

  // Tổng hợp KPI từ dữ liệu sẵn có.
  const activeCount = employees.filter((e) => e.status === "active").length;
  const probationCount = employees.filter((e) => e.status === "probation").length;
  const workingCount = employees.filter((e) => e.status !== "left").length;

  // Cơ cấu theo trạng thái (donut).
  const statusMix: Slice[] = (Object.keys(EMPLOYEE_STATUS_LABEL) as EmployeeStatus[])
    .map((s, i) => ({
      name: EMPLOYEE_STATUS_LABEL[s],
      value: employees.filter((e) => e.status === s).length,
      color: MIX_COLORS[i % MIX_COLORS.length],
    }))
    .filter((x) => x.value > 0);

  // Phân bố theo phòng ban (cột) — chỉ phòng có người.
  const byDept = departments
    .map((d) => ({ label: d.name, value: employees.filter((e) => e.departmentId === d.id).length }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHero
        icon="users"
        title="Danh bạ nhân viên"
        subtitle={`Hồ sơ nhân sự trong phạm vi của bạn — ${employees.length} người.`}
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Nhân viên"]]}
        stats={[
          { label: "Tổng nhân viên", value: employees.length },
          { label: "Đang làm", value: workingCount, tone: "up" },
          { label: "Thử việc", value: probationCount, tone: probationCount > 0 ? "flat" : undefined },
        ]}
        actions={
          <div className="flex gap">
            {can(session, "report.export") && (
              <a className="btn" href="/export/employees">
                <Icon name="download" /> Xuất Excel
              </a>
            )}
            {canCreate && (
              <Link href="/employees/import" className="btn">
                <Icon name="download" /> Nhập Excel
              </Link>
            )}
            {canCreate && (
              <Link href="/employees/new" className="btn primary">
                <Icon name="userplus" /> Thêm nhân viên
              </Link>
            )}
          </div>
        }
      />

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card kpi grad hover gr-deepblue">
          <div className="ic"><Icon name="users" /></div>
          <div className="val"><CountUp to={employees.length} /></div>
          <div className="lbl">tổng nhân viên</div>
        </div>
        <div className="card kpi grad hover gr-mint">
          <div className="ic"><Icon name="check" /></div>
          <div className="val"><CountUp to={activeCount} /></div>
          <div className="lbl">chính thức</div>
        </div>
        <div className="card kpi grad hover gr-sunny">
          <div className="ic"><Icon name="clock" /></div>
          <div className="val"><CountUp to={probationCount} /></div>
          <div className="lbl">đang thử việc</div>
        </div>
      </div>

      {/* Biểu đồ: cơ cấu trạng thái + phân bố phòng ban */}
      <div className="grid-k g-2 mt">
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Cơ cấu theo trạng thái</h3></div>
          {statusMix.length === 0 ? (
            <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Chưa có nhân viên nào.</p>
          ) : (
            <DonutChart data={statusMix} height={250} centerValue={employees.length} centerLabel="người" unit=" người" />
          )}
        </div>
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Phân bố theo phòng ban</h3></div>
          {byDept.length === 0 ? (
            <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Chưa có dữ liệu phòng ban.</p>
          ) : (
            <BarsChart data={byDept} height={250} name="Số nhân viên" />
          )}
        </div>
      </div>

      {/* Bộ lọc */}
      <form className="card mt" method="get">
        <div className="grid-k g-3" style={{ gap: 14, alignItems: "end" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Tìm kiếm</label>
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Tên, mã NV, email…" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Phòng ban</label>
            <select name="dept" defaultValue={sp.dept ?? ""}>
              <option value="">Tất cả</option>
              {filterDepts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Trạng thái</label>
            <select name="status" defaultValue={sp.status ?? ""}>
              <option value="">Tất cả</option>
              {(Object.keys(EMPLOYEE_STATUS_LABEL) as EmployeeStatus[]).map((s) => (
                <option key={s} value={s}>
                  {EMPLOYEE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap" style={{ marginTop: 16 }}>
          <button type="submit" className="btn primary">
            <Icon name="filter" /> Lọc
          </button>
          <Link href="/employees" className="btn ghost">
            Xoá lọc
          </Link>
        </div>
      </form>

      {/* Bảng */}
      <div className="card mt">
        <div className="card-h">
          <div>
            <h3 className="sec-title">Kết quả</h3>
            <div className="sub">{filtered.length} nhân viên</div>
          </div>
        </div>
        {filtered.length === 0 ? (
          <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>
            Không có nhân viên nào khớp bộ lọc.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Họ tên</th>
                <th>Phòng ban</th>
                <th>Chức danh</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span className="badge b-indigo">{e.code}</span>
                  </td>
                  <td>
                    <div className="flex aic" style={{ gap: 10 }}>
                      {e.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.photoUrl}
                          alt={e.fullName}
                          style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <div className="av" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>
                          {e.fullName.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase()}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div className="uname">{e.fullName}</div>
                        <div className="small muted">{e.email ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td>{deptName(e.departmentId)}</td>
                  <td>{titleName(e.jobTitleId)}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[e.status]}`}>
                      {EMPLOYEE_STATUS_LABEL[e.status]}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/employees/${e.id}`} className="iconbtn" title="Xem / sửa">
                      <Icon name="edit" />
                    </Link>
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
