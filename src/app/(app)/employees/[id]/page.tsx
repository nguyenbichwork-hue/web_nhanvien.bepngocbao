import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { EmployeeForm, type ExistingAccount } from "@/components/employee-form";
import { AssignRoleRow } from "@/components/assign-role-row";
import { createDependentAction, deleteDependentAction, deleteEmployeeAction, resetEmployeePasswordAction, updateEmployeeAction } from "@/lib/org/actions";
import {
  getEmployee,
  getUserByEmployee,
  listAssignments,
  listDependents,
  listDepartments,
  listEntities,
  listJobTitles,
  listRoles,
  listSalaryRecords,
} from "@/lib/org/store";
import { formatVND } from "@/lib/payroll/calc";
import {
  DEPENDENT_RELATION_LABEL,
  EMPLOYEE_STATUS_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  GENDER_LABEL,
  SCOPE_LABEL,
  type DependentRelation,
} from "@/lib/org/types";
import { can, requirePermission } from "@/lib/auth/session";
import { canSeeEmployee } from "@/lib/auth/scope";

export default async function EmployeeEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pwreset?: string; err?: string }>;
}) {
  const session = await requirePermission("employee.read");
  const { id } = await params;
  const sp = await searchParams;
  const employee = await getEmployee(id);
  if (!employee) notFound();
  if (!(await canSeeEmployee(session, id))) redirect("/forbidden");

  const canEdit = can(session, "employee.update");
  const canDelete = can(session, "employee.delete");
  const canSeeSalary = can(session, "payroll.read");

  const [entities, departments, jobTitles, roles, account, assignments, dependents, salaryRecords] = await Promise.all([
    listEntities(),
    listDepartments(),
    listJobTitles(),
    listRoles(),
    getUserByEmployee(id),
    listAssignments(),
    listDependents(id),
    canSeeSalary ? listSalaryRecords(id) : Promise.resolve([]),
  ]);

  const accountAsg = account ? assignments.find((a) => a.userId === account.id) : undefined;
  let existingAccount: ExistingAccount | null = null;
  if (account) {
    const roleName = roles.find((r) => r.id === accountAsg?.roleId)?.name ?? "(chưa gán vai trò)";
    existingAccount = {
      email: account.email,
      roleName,
      scopeLabel: accountAsg ? SCOPE_LABEL[accountAsg.scopeType] : "—",
    };
  }
  const canManageRbac = can(session, "system.rbac");

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> <Link href="/employees">Nhân viên</Link> <Icon name="chev" /> {employee.code}
      </div>
      <div className="page-head">
        <div className="flex aic" style={{ gap: 12 }}>
          <Link href="/employees" className="iconbtn" title="Quay lại">
            <Icon name="chevleft" />
          </Link>
          {employee.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={employee.photoUrl}
              alt={employee.fullName}
              style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div className="av" style={{ width: 52, height: 52, fontSize: 18, background: "var(--brand-grad)" }}>
              {employee.fullName.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase()}
            </div>
          )}
          <div>
            <h1>
              {employee.fullName}{" "}
              <span className="badge b-indigo" style={{ verticalAlign: "middle" }}>
                {employee.code}
              </span>
            </h1>
            <p>
              {canEdit ? "Cập nhật hồ sơ" : "Xem hồ sơ"} · trạng thái hiện tại: {EMPLOYEE_STATUS_LABEL[employee.status]}
            </p>
          </div>
        </div>
      </div>

      {sp.pwreset && (
        <div className="badge b-green" style={{ marginBottom: 16 }}>
          Đã đặt lại mật khẩu tạm (123456). Hãy gửi cho nhân viên — họ sẽ phải đổi khi đăng nhập.
        </div>
      )}
      {sp.err === "noaccount" && (
        <div className="badge b-rose" style={{ marginBottom: 16 }}>
          Nhân viên này chưa có tài khoản đăng nhập để đặt lại mật khẩu.
        </div>
      )}

      {canEdit ? (
        <EmployeeForm
          action={updateEmployeeAction}
          companyId={entities[0]?.id ?? ""}
          departments={departments}
          jobTitles={jobTitles}
          roles={roles}
          employee={employee}
          existingAccount={existingAccount}
          resetPasswordAction={resetEmployeePasswordAction}
        />
      ) : (
        // Người chỉ có quyền XEM (vd Trưởng phòng) — hồ sơ chỉ-đọc, ẩn lương/thuế/ngân hàng.
        <div className="card">
          <div className="card-h"><h3>Thông tin hồ sơ</h3></div>
          <div className="grid-k g-3" style={{ gap: 14 }}>
            <Field label="Họ tên" value={employee.fullName} />
            <Field label="Mã nhân viên" value={employee.code} />
            <Field label="Trạng thái" value={EMPLOYEE_STATUS_LABEL[employee.status]} />
            <Field label="Email công việc" value={employee.email} />
            <Field label="Điện thoại" value={employee.phone} />
            <Field label="Giới tính" value={employee.gender ? GENDER_LABEL[employee.gender] : undefined} />
            <Field label="Phòng ban" value={departments.find((d) => d.id === employee.departmentId)?.name} />
            <Field label="Chức danh" value={jobTitles.find((j) => j.id === employee.jobTitleId)?.name} />
            <Field label="Loại hình" value={employee.employmentType ? EMPLOYMENT_TYPE_LABEL[employee.employmentType] : undefined} />
            <Field label="Ngày vào làm" value={employee.joinDate} />
          </div>
          <p className="muted small" style={{ marginTop: 14, marginBottom: 0 }}>
            Bạn chỉ có quyền xem hồ sơ này. Thông tin lương/thuế/bảo hiểm chỉ hiển thị với bộ phận Nhân sự.
          </p>
        </div>
      )}

      {/* Vai trò & phân quyền — gán/đổi trực tiếp (chỉ Quản trị hệ thống) */}
      {account && canManageRbac && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h">
            <div>
              <h3><Icon name="shield" /> Vai trò &amp; phân quyền</h3>
              <div className="sub">Gán vai trò &amp; phạm vi dữ liệu cho tài khoản của nhân viên này. Áp dụng ngay.</div>
            </div>
            <Link href="/settings/roles" className="badge b-indigo">Ma trận quyền</Link>
          </div>
          <table>
            <tbody>
              <AssignRoleRow
                user={{ id: account.id, fullName: employee.fullName, email: account.email }}
                roles={roles.map((r) => ({ id: r.id, code: r.code, name: r.name }))}
                departments={departments.map((d) => ({ id: d.id, name: d.name }))}
                current={accountAsg ? { roleId: accountAsg.roleId, scopeType: accountAsg.scopeType, scopeDepartmentId: accountAsg.scopeDepartmentId } : undefined}
              />
            </tbody>
          </table>
        </div>
      )}

      {/* Người phụ thuộc (giảm trừ gia cảnh thuế TNCN) */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h">
          <div>
            <h3>Người phụ thuộc</h3>
            <div className="sub">{dependents.filter((d) => d.taxRegistered).length} đã đăng ký giảm trừ · dùng cho thuế TNCN</div>
          </div>
        </div>
        {dependents.length === 0 ? (
          <p className="muted" style={{ padding: "12px 0" }}>Chưa khai báo người phụ thuộc.</p>
        ) : (
          <table>
            <thead><tr><th>Họ tên</th><th>Quan hệ</th><th>Ngày sinh</th><th>MST</th><th style={{ textAlign: "center" }}>Giảm trừ</th><th></th></tr></thead>
            <tbody>
              {dependents.map((d) => (
                <tr key={d.id}>
                  <td className="uname">{d.fullName}</td>
                  <td>{DEPENDENT_RELATION_LABEL[d.relation]}</td>
                  <td>{d.dateOfBirth ?? "—"}</td>
                  <td>{d.taxCode ?? "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`badge ${d.taxRegistered ? "b-green" : "b-gray"}`}>{d.taxRegistered ? "Có" : "Không"}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {canEdit && (
                      <form action={deleteDependentAction}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="employeeId" value={employee.id} />
                        <button type="submit" className="iconbtn" title="Xoá"><Icon name="trash" /></button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canEdit && (
          <form action={createDependentAction} style={{ marginTop: 14 }}>
            <input type="hidden" name="employeeId" value={employee.id} />
            <div className="grid-k g-4" style={{ gap: 12, alignItems: "end" }}>
              <div className="field" style={{ marginBottom: 0 }}><label>Họ tên *</label><input name="fullName" required /></div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Quan hệ</label>
                <select name="relation" defaultValue="child">
                  {(Object.keys(DEPENDENT_RELATION_LABEL) as DependentRelation[]).map((r) => (
                    <option key={r} value={r}>{DEPENDENT_RELATION_LABEL[r]}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}><label>Ngày sinh</label><input type="date" name="dateOfBirth" /></div>
              <div className="field" style={{ marginBottom: 0 }}><label>MST người phụ thuộc</label><input name="taxCode" /></div>
            </div>
            <label className="flex aic" style={{ gap: 8, margin: "12px 0", fontWeight: 600, fontSize: 13.5 }}>
              <input type="checkbox" name="taxRegistered" value="1" defaultChecked style={{ width: 17, height: 17 }} />
              Đã đăng ký giảm trừ gia cảnh (tính vào thuế TNCN)
            </label>
            <button type="submit" className="btn primary"><Icon name="plus" /> Thêm người phụ thuộc</button>
          </form>
        )}
      </div>

      {/* Lịch sử lương (chỉ người xem được lương) */}
      {canSeeSalary && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h">
            <div>
              <h3>Lịch sử lương</h3>
              <div className="sub">Các lần điều chỉnh lương theo tháng hiệu lực · chỉnh tại trang Tính lương</div>
            </div>
          </div>
          {salaryRecords.length === 0 ? (
            <p className="muted" style={{ padding: "12px 0", marginBottom: 0 }}>
              Chưa có điều chỉnh lương. Lương hiện tại: <b>{formatVND(employee.baseSalary ?? 0)}</b>
              {employee.allowance ? <> + phụ cấp {formatVND(employee.allowance)}</> : null}.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Hiệu lực từ</th>
                  <th style={{ textAlign: "right" }}>Lương cơ bản</th>
                  <th style={{ textAlign: "right" }}>Phụ cấp</th>
                  <th style={{ textAlign: "right" }}>Lương BHXH</th>
                  <th>Lý do</th>
                </tr>
              </thead>
              <tbody>
                {salaryRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="uname">{r.effectiveFrom}</td>
                    <td style={{ textAlign: "right" }}>{formatVND(r.baseSalary)}</td>
                    <td style={{ textAlign: "right" }}>{formatVND(r.allowance)}</td>
                    <td style={{ textAlign: "right" }}>{r.insuranceSalary != null ? formatVND(r.insuranceSalary) : "—"}</td>
                    <td className="small muted">{r.reason || "—"}{r.createdByName ? ` · ${r.createdByName}` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Vùng nguy hiểm — xoá nhân viên (chỉ khi có quyền xoá) */}
      {canDelete && (
        <div className="card" style={{ marginTop: 18, borderColor: "var(--c-rose)" }}>
          <div className="card-h">
            <div>
              <h3>Xoá nhân viên</h3>
              <div className="sub">Gỡ vĩnh viễn hồ sơ này khỏi hệ thống. Không thể hoàn tác.</div>
            </div>
          </div>
          <details>
            <summary className="btn" style={{ width: "fit-content", listStyle: "none", color: "var(--c-rose)" }}>
              <Icon name="trash" /> Xoá hồ sơ này
            </summary>
            <form action={deleteEmployeeAction} style={{ marginTop: 14 }}>
              <input type="hidden" name="id" value={employee.id} />
              <p className="muted small" style={{ marginBottom: 12 }}>
                Xác nhận xoá <b>{employee.fullName}</b> ({employee.code})?
              </p>
              <button type="submit" className="btn" style={{ background: "var(--c-rose)", color: "#fff", borderColor: "transparent" }}>
                <Icon name="trash" /> Tôi chắc chắn, xoá
              </button>
            </form>
          </details>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <div style={{ fontWeight: 600 }}>{value || "—"}</div>
    </div>
  );
}
