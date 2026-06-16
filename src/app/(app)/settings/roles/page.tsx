import { Icon } from "@/components/icon";
import { RoleMatrix } from "@/components/role-matrix";
import { createRoleAction } from "@/lib/org/actions";
import {
  MODULE_LABEL,
  PERMISSIONS,
  listAssignments,
  listDepartments,
  listEntities,
  listRoles,
  listUsers,
} from "@/lib/org/store";
import { SCOPE_LABEL } from "@/lib/org/types";
import { requirePermission } from "@/lib/auth/session";

export default async function RolesPage() {
  await requirePermission("system.rbac");
  const [roles, users, assignments, entities, departments] = await Promise.all([
    listRoles(),
    listUsers(),
    listAssignments(),
    listEntities(),
    listDepartments(),
  ]);

  // nhóm quyền theo module (giữ thứ tự xuất hiện)
  const order: string[] = [];
  for (const p of PERMISSIONS) if (!order.includes(p.module)) order.push(p.module);
  const groups = order.map((m) => ({
    module: m,
    label: MODULE_LABEL[m] ?? m,
    perms: PERMISSIONS.filter((p) => p.module === m),
  }));

  const roleById = (id: string) => roles.find((r) => r.id === id);
  const scopeText = (a: (typeof assignments)[number]) => {
    if (a.scopeType === "ENTITY")
      return `${SCOPE_LABEL.ENTITY}: ${entities.find((e) => e.id === a.scopeEntityId)?.name ?? "—"}`;
    if (a.scopeType === "DEPARTMENT")
      return `${SCOPE_LABEL.DEPARTMENT}: ${departments.find((d) => d.id === a.scopeDepartmentId)?.name ?? "—"}`;
    return SCOPE_LABEL[a.scopeType];
  };

  return (
    <>
      <div className="card hover" style={{ marginBottom: 20 }}>
        <div className="card-h">
          <div>
            <h3>Ma trận phân quyền</h3>
            <div className="sub">Tích để cấp/thu quyền cho từng vai trò. Lưu tự động.</div>
          </div>
          <span className="badge b-amber">{PERMISSIONS.length} quyền · {roles.length} vai trò</span>
        </div>
        <RoleMatrix roles={roles} groups={groups} />
      </div>

      <div className="grid-k g-2 stagger">
        {/* Người dùng & phạm vi */}
        <div className="card hover">
          <div className="card-h">
            <h3>Người dùng & phạm vi</h3>
            <span className="badge b-gray">{assignments.length} gán quyền</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Phạm vi</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const u = users.find((x) => x.id === a.userId);
                const r = roleById(a.roleId);
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="uname">{u?.fullName ?? "—"}</div>
                      <div className="small muted">{u?.email}</div>
                    </td>
                    <td>
                      <span className="badge b-indigo">{r?.code}</span>
                    </td>
                    <td className="small">{scopeText(a)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Thêm vai trò */}
        <div className="card hover">
          <div className="card-h">
            <div>
              <h3>Thêm vai trò</h3>
              <div className="sub">Tạo vai trò tuỳ chỉnh rồi cấp quyền ở ma trận trên.</div>
            </div>
          </div>
          <form action={createRoleAction}>
            <div className="field">
              <label>Mã vai trò *</label>
              <input name="code" required placeholder="AUDIT" />
            </div>
            <div className="field">
              <label>Tên vai trò *</label>
              <input name="name" required placeholder="Kiểm toán nội bộ" />
            </div>
            <div className="field">
              <label>Mô tả</label>
              <textarea name="description" placeholder="Phạm vi & mục đích của vai trò" />
            </div>
            <button type="submit" className="btn primary">
              <Icon name="plus" /> Tạo vai trò
            </button>
          </form>

          <div className="mt">
            {roles.map((r) => (
              <div key={r.id} className="flex aic between" style={{ padding: "8px 0" }}>
                <div className="flex aic" style={{ gap: 10 }}>
                  <span style={{ color: "var(--c-indigo)" }}>
                    <Icon name="shield" />
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {r.name} <span className="small muted">· {r.code}</span>
                    </div>
                    <div className="small muted">{r.permissions.length} quyền</div>
                  </div>
                </div>
                {r.isSystem && <span className="badge b-gray">Hệ thống</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
