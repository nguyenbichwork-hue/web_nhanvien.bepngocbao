"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleRolePermission } from "@/lib/org/actions";
import type { Permission, Role } from "@/lib/org/types";

type Group = { module: string; label: string; perms: Permission[] };

export function RoleMatrix({ roles, groups }: { roles: Role[]; groups: Group[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Bản sao cục bộ để cập nhật lạc quan (optimistic)
  const [grants, setGrants] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(roles.map((r) => [r.id, new Set(r.permissions)])),
  );

  const toggle = (roleId: string, code: string) => {
    const has = grants[roleId]?.has(code);
    const next = !has;
    setGrants((g) => {
      const set = new Set(g[roleId]);
      if (next) set.add(code);
      else set.delete(code);
      return { ...g, [roleId]: set };
    });
    startTransition(async () => {
      await toggleRolePermission(roleId, code, next);
      router.refresh();
    });
  };

  return (
    <div style={{ overflowX: "auto" }} aria-busy={pending}>
      <table className="matrix">
        <thead>
          <tr>
            <th style={{ minWidth: 230 }}>Quyền</th>
            {roles.map((r) => (
              <th key={r.id} style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 700, color: "var(--tx)" }}>{r.code}</div>
                <div className="small muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                  {r.name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((grp) => (
            <ModuleRows key={grp.module} grp={grp} roles={roles} grants={grants} toggle={toggle} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModuleRows({
  grp,
  roles,
  grants,
  toggle,
}: {
  grp: Group;
  roles: Role[];
  grants: Record<string, Set<string>>;
  toggle: (roleId: string, code: string) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={roles.length + 1} style={{ paddingTop: 16 }}>
          <span className="badge b-indigo">{grp.label}</span>
        </td>
      </tr>
      {grp.perms.map((p) => (
        <tr key={p.code}>
          <td>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.description}</div>
            <code className="small muted">{p.code}</code>
          </td>
          {roles.map((r) => {
            const on = grants[r.id]?.has(p.code) ?? false;
            return (
              <td key={r.id} style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(r.id, p.code)}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--brand-1)" }}
                  aria-label={`${r.code} – ${p.code}`}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
