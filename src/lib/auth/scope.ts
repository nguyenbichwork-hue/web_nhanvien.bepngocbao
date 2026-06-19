import { listDepartments, listEmployees } from "@/lib/org/store";
import type { Employee } from "@/lib/org/types";
import type { Session } from "./session";

/** Tất cả id phòng ban con cháu của một phòng (gồm chính nó). */
async function departmentSubtreeIds(rootId: string): Promise<Set<string>> {
  const all = await listDepartments();
  const childrenOf = new Map<string, string[]>();
  for (const d of all) {
    if (!d.parentId) continue;
    const arr = childrenOf.get(d.parentId) ?? [];
    arr.push(d.id);
    childrenOf.set(d.parentId, arr);
  }
  const out = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const c of childrenOf.get(id) ?? []) {
      if (!out.has(c)) {
        out.add(c);
        stack.push(c);
      }
    }
  }
  return out;
}

/** Tập id nhân viên người dùng được nhìn thấy ("all" = mọi nhân viên). */
export async function visibleEmployeeIds(s: Session): Promise<Set<string> | "all"> {
  switch (s.scope) {
    case "GROUP":
      return "all";
    case "DEPARTMENT": {
      if (!s.scopeDepartmentId) return new Set();
      const deptIds = await departmentSubtreeIds(s.scopeDepartmentId);
      const emps = await listEmployees();
      return new Set(emps.filter((e) => e.departmentId && deptIds.has(e.departmentId)).map((e) => e.id));
    }
    case "SELF":
      return new Set(s.employee ? [s.employee.id] : []);
  }
}

/** Lọc danh sách nhân viên theo phạm vi của phiên. */
export async function filterEmployees(s: Session, list: Employee[]): Promise<Employee[]> {
  const ids = await visibleEmployeeIds(s);
  if (ids === "all") return list;
  return list.filter((e) => ids.has(e.id));
}

/** Người dùng có được xem hồ sơ/dữ liệu của nhân viên này không. */
export async function canSeeEmployee(s: Session, employeeId: string): Promise<boolean> {
  const ids = await visibleEmployeeIds(s);
  return ids === "all" || ids.has(employeeId);
}
