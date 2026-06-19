import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { canAny, requireSession } from "@/lib/auth/session";
import {
  getGroup,
  listDepartments,
  listEntities,
  listJobTitles,
  listRoles,
} from "@/lib/org/store";

export default async function SettingsHomePage() {
  // Tổng quan tổ chức chỉ cho quản trị; vai trò khác → thẳng tới tab Tài khoản.
  const session = await requireSession();
  if (!canAny(session, ["org.manage", "system.rbac"])) redirect("/settings/account");

  const [group, entities, departments, jobTitles, roles] = await Promise.all([
    getGroup(),
    listEntities(),
    listDepartments(),
    listJobTitles(),
    listRoles(),
  ]);
  const company = entities[0];

  const cards: { href: string; icon: string; tone: string; n: number; label: string; sub: string }[] = [
    { href: "/settings/departments", icon: "tree", tone: "tone-t", n: departments.length, label: "Phòng ban", sub: "trên toàn hệ thống" },
    { href: "/settings/positions", icon: "briefcase", tone: "tone-a", n: jobTitles.length, label: "Chức danh", sub: "danh mục dùng chung" },
    { href: "/settings/roles", icon: "shield", tone: "tone-r", n: roles.length, label: "Vai trò", sub: "nhóm quyền RBAC" },
  ];

  return (
    <>
      <div className="grid-k g-3 stagger" style={{ marginBottom: 20 }}>
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className={`card kpi hover ${c.tone}`} style={{ textDecoration: "none" }}>
            <div className="ic">
              <Icon name={c.icon} />
            </div>
            <div className="val">{c.n}</div>
            <div className="lbl">{c.label}</div>
            <span className="trend">{c.sub}</span>
          </Link>
        ))}
      </div>

      <div className="card hover">
        <div className="card-h">
          <div>
            <h3>{group.name}</h3>
            <div className="sub">Hồ sơ công ty · {departments.length} phòng ban</div>
          </div>
          <span className="badge b-indigo">{group.code}</span>
        </div>

        {company && (
          <Link
            href="/settings/entities"
            className="flex aic between"
            style={{
              padding: "14px 16px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              textDecoration: "none",
              color: "inherit",
              marginTop: 6,
            }}
          >
            <div className="flex aic" style={{ gap: 13 }}>
              <div
                className="ic"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--c-indigo-soft)",
                  color: "var(--c-indigo)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name="building" />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{company.name}</div>
                <div className="small muted">
                  MST {company.taxCode ?? "—"} · Vùng {romize(company.region)}
                </div>
              </div>
            </div>
            <div className="flex aic" style={{ gap: 10 }}>
              <span className="badge b-gray">{departments.length} phòng ban</span>
              <Icon name="chev" />
            </div>
          </Link>
        )}
      </div>
    </>
  );
}

function romize(r?: number) {
  return r ? ["", "I", "II", "III", "IV"][r] : "—";
}
