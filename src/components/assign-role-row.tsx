"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { assignRoleAction, unassignRoleAction } from "@/lib/org/actions";
import { SCOPE_LABEL, type ScopeType } from "@/lib/org/types";

type Opt = { id: string; name: string };
type RoleOpt = { id: string; code: string; name: string };

const SCOPES: ScopeType[] = ["GROUP", "ENTITY", "DEPARTMENT", "SELF"];

/** Một dòng gán/đổi vai trò + phạm vi cho 1 người dùng. Scope ENTITY/DEPARTMENT mới hiện ô chọn tương ứng. */
export function AssignRoleRow({
  user,
  roles,
  entities,
  departments,
  current,
}: {
  user: { id: string; fullName: string; email: string };
  roles: RoleOpt[];
  entities: Opt[];
  departments: Opt[];
  current?: { roleId: string; scopeType: ScopeType; scopeEntityId?: string | null; scopeDepartmentId?: string | null };
}) {
  const [scope, setScope] = useState<ScopeType>(current?.scopeType ?? "SELF");

  return (
    <tr>
      <td>
        <div className="uname">{user.fullName}</div>
        <div className="small muted">{user.email}</div>
      </td>
      <td colSpan={2}>
        <form action={assignRoleAction} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input type="hidden" name="userId" value={user.id} />
          <select name="roleId" defaultValue={current?.roleId ?? ""} required style={{ minWidth: 150 }}>
            <option value="" disabled>— Vai trò —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.code} · {r.name}</option>
            ))}
          </select>
          <select name="scopeType" value={scope} onChange={(e) => setScope(e.target.value as ScopeType)} style={{ minWidth: 120 }}>
            {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}
          </select>
          {scope === "ENTITY" && (
            <select name="scopeEntityId" defaultValue={current?.scopeEntityId ?? ""} required style={{ minWidth: 150 }}>
              <option value="" disabled>— Pháp nhân —</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
          {scope === "DEPARTMENT" && (
            <select name="scopeDepartmentId" defaultValue={current?.scopeDepartmentId ?? ""} required style={{ minWidth: 150 }}>
              <option value="" disabled>— Phòng ban —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <button type="submit" className="btn sm primary"><Icon name="check" /> Lưu</button>
        </form>
      </td>
      <td style={{ textAlign: "right" }}>
        {current ? (
          <form action={unassignRoleAction}>
            <input type="hidden" name="userId" value={user.id} />
            <button type="submit" className="btn sm" title="Gỡ vai trò"><Icon name="x" /></button>
          </form>
        ) : (
          <span className="badge b-gray">Chưa gán</span>
        )}
      </td>
    </tr>
  );
}
