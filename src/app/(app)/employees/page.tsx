import Link from "next/link";
import { Icon } from "@/components/icon";
import { listDepartments, listEmployees, listEntities, listJobTitles } from "@/lib/org/store";
import { EMPLOYEE_STATUS_LABEL, type EmployeeStatus } from "@/lib/org/types";
import { can, requirePermission } from "@/lib/auth/session";
import { filterEmployees, visibleEntityIds } from "@/lib/auth/scope";

const STATUS_BADGE: Record<EmployeeStatus, string> = {
  active: "b-green",
  probation: "b-amber",
  inactive: "b-gray",
  left: "b-rose",
};

type SP = { q?: string; entity?: string; dept?: string; status?: string };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await requirePermission("employee.read");
  const sp = await searchParams;
  const [allEntities, departments, jobTitles, allEmployees] = await Promise.all([
    listEntities(),
    listDepartments(),
    listJobTitles(),
    listEmployees(),
  ]);

  // Giới hạn theo phạm vi của người dùng (pháp nhân / phòng ban / cá nhân).
  const employees = await filterEmployees(session, allEmployees);
  const vEntities = await visibleEntityIds(session);
  const entities = vEntities === "all" ? allEntities : allEntities.filter((e) => vEntities.includes(e.id));
  const canCreate = can(session, "employee.create");

  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? "—";
  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? "—";
  const titleName = (id?: string | null) => jobTitles.find((j) => j.id === id)?.name ?? "—";

  const q = (sp.q ?? "").trim().toLowerCase();
  const filtered = employees.filter((e) => {
    if (sp.entity && e.legalEntityId !== sp.entity) return false;
    if (sp.dept && e.departmentId !== sp.dept) return false;
    if (sp.status && e.status !== sp.status) return false;
    if (q && !`${e.fullName} ${e.code} ${e.email ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  // Phòng ban cho dropdown lọc — giới hạn theo pháp nhân đã chọn (nếu có).
  const filterDepts = sp.entity
    ? departments.filter((d) => d.legalEntityId === sp.entity)
    : departments;

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Nhân viên
      </div>
      <div className="page-head">
        <div>
          <h1>Danh bạ nhân viên</h1>
          <p>Hồ sơ nhân sự trong phạm vi của bạn — {employees.length} người ở {entities.length} pháp nhân.</p>
        </div>
        <div className="flex gap">
          {can(session, "report.export") && (
            <a className="btn" href={`/export/employees${sp.entity ? `?entity=${sp.entity}` : ""}`}>
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
      </div>

      {/* Bộ lọc */}
      <form className="card" method="get" style={{ marginBottom: 18 }}>
        <div className="grid-k g-4" style={{ gap: 14, alignItems: "end" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Tìm kiếm</label>
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Tên, mã NV, email…" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Pháp nhân</label>
            <select name="entity" defaultValue={sp.entity ?? ""}>
              <option value="">Tất cả</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} · {e.name}
                </option>
              ))}
            </select>
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
      <div className="card">
        <div className="card-h">
          <div>
            <h3>Kết quả</h3>
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
                <th>Pháp nhân</th>
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
                  <td>{entityName(e.legalEntityId)}</td>
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
