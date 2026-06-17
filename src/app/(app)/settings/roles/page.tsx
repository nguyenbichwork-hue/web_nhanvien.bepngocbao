import { Icon } from "@/components/icon";
import { RoleMatrix } from "@/components/role-matrix";
import { AssignRoleRow } from "@/components/assign-role-row";
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
import { requirePermission } from "@/lib/auth/session";

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  await requirePermission("system.rbac");
  const { err } = await searchParams;
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

  return (
    <>
      {err && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--c-rose)" }}>
          <p className="small" style={{ margin: 0 }}><Icon name="alert" /> {err}</p>
        </div>
      )}
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
        {/* Người dùng & phạm vi — gán/đổi vai trò trực tiếp */}
        <div className="card hover">
          <div className="card-h">
            <div>
              <h3>Phân quyền người dùng</h3>
              <div className="sub">Gán vai trò &amp; phạm vi dữ liệu cho từng tài khoản. Lưu là áp dụng ngay.</div>
            </div>
            <span className="badge b-gray">{assignments.length}/{users.length} đã gán</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Người dùng</th>
                <th colSpan={2}>Vai trò &amp; phạm vi</th>
                <th style={{ textAlign: "right" }}>Gỡ</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) => u.isActive)
                .map((u) => {
                  const a = assignments.find((x) => x.userId === u.id);
                  return (
                    <AssignRoleRow
                      key={u.id}
                      user={{ id: u.id, fullName: u.fullName, email: u.email }}
                      roles={roles.map((r) => ({ id: r.id, code: r.code, name: r.name }))}
                      entities={entities.map((e) => ({ id: e.id, name: e.name }))}
                      departments={departments.map((d) => ({ id: d.id, name: d.name }))}
                      current={a ? { roleId: a.roleId, scopeType: a.scopeType, scopeEntityId: a.scopeEntityId, scopeDepartmentId: a.scopeDepartmentId } : undefined}
                    />
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
