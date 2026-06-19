import { Icon } from "@/components/icon";
import { createDepartmentAction, deleteDepartmentAction } from "@/lib/org/actions";
import { listDepartments, listEmployees, listEntities } from "@/lib/org/store";
import type { Department, Employee } from "@/lib/org/types";
import { requirePermission } from "@/lib/auth/session";

export default async function DepartmentsPage() {
  await requirePermission("org.manage");
  const entities = await listEntities();
  const entity = entities[0];

  const [departments, employees] = await Promise.all([
    listDepartments(),
    listEmployees(),
  ]);

  // dựng cây
  const childrenOf = (parentId: string | null) =>
    departments.filter((d) => d.parentId === parentId);

  return (
    <>
      <div className="card hover">
        <div className="card-h">
          <div>
            <h3>Phòng ban</h3>
            <div className="sub">
              {departments.length} đơn vị · cấu trúc cây phân cấp
            </div>
          </div>
        </div>

        {departments.length === 0 ? (
          <p className="muted">Chưa có phòng ban. Thêm phòng ban đầu tiên bên dưới.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Tree
              nodes={childrenOf(null)}
              childrenOf={childrenOf}
              employees={employees}
              depth={0}
            />
          </div>
        )}

        <details style={{ marginTop: 18 }}>
          <summary className="btn primary" style={{ width: "fit-content", listStyle: "none" }}>
            <Icon name="plus" /> Thêm phòng ban
          </summary>
          <form action={createDepartmentAction} style={{ marginTop: 18 }}>
            <input type="hidden" name="legalEntityId" value={entity.id} />
            <div className="grid-k g-3">
              <div className="field">
                <label>Mã phòng ban *</label>
                <input name="code" required placeholder="KT2" />
              </div>
              <div className="field">
                <label>Tên phòng ban *</label>
                <input name="name" required placeholder="Phòng Kế toán 2" />
              </div>
              <div className="field">
                <label>Trực thuộc</label>
                <select name="parentId" defaultValue="">
                  <option value="">— Cấp cao nhất —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn primary">
              <Icon name="check" /> Lưu phòng ban
            </button>
          </form>
        </details>
      </div>
    </>
  );
}

function Tree({
  nodes,
  childrenOf,
  employees,
  depth,
}: {
  nodes: Department[];
  childrenOf: (id: string | null) => Department[];
  employees: Employee[];
  depth: number;
}) {
  return (
    <>
      {nodes.map((d) => {
        const kids = childrenOf(d.id);
        const mgr = employees.find((e) => e.id === d.managerEmployeeId);
        return (
          <div key={d.id}>
            <div
              className="flex aic between"
              style={{
                padding: "12px 14px",
                marginLeft: depth * 26,
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line)",
                background: depth === 0 ? "var(--surface-2)" : "var(--surface)",
              }}
            >
              <div className="flex aic" style={{ gap: 11 }}>
                <span style={{ color: "var(--c-teal)" }}>
                  <Icon name={kids.length ? "tree" : "chev"} />
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {d.name} <span className="small muted">· {d.code}</span>
                  </div>
                  <div className="small muted">
                    {mgr ? `Trưởng đơn vị: ${mgr.fullName}` : "Chưa có trưởng đơn vị"}
                  </div>
                </div>
              </div>
              <form action={deleteDepartmentAction}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="iconbtn" title="Xoá">
                  <Icon name="trash" />
                </button>
              </form>
            </div>
            {kids.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                <Tree nodes={kids} childrenOf={childrenOf} employees={employees} depth={depth + 1} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
