// Bản đồ route → quyền cần có. Dùng chung cho lọc sidebar và (tham chiếu) guard trang.
// Mỗi entry: cần MỘT trong các quyền `perms`; perms rỗng = chỉ cần đăng nhập.

export type RouteAccess = { prefix: string; perms: string[] };

export const ROUTE_ACCESS: RouteAccess[] = [
  { prefix: "/dashboard", perms: [] },
  { prefix: "/employees", perms: ["employee.read"] },
  { prefix: "/schedule", perms: ["schedule.read"] },
  { prefix: "/leave", perms: ["leave.read"] },
  { prefix: "/payroll", perms: ["payroll.read"] },
  { prefix: "/recruit", perms: ["recruit.read"] },
  { prefix: "/performance", perms: ["performance.read"] },
  { prefix: "/contracts", perms: ["contract.read"] },
  { prefix: "/assets", perms: ["asset.read"] },
  { prefix: "/training", perms: ["training.read"] },
  { prefix: "/rewards", perms: ["reward.read"] },
  { prefix: "/benefits", perms: ["benefit.read"] },
  { prefix: "/overtime", perms: ["overtime.read"] },
  { prefix: "/reports", perms: ["report.read"] },
  { prefix: "/settings", perms: ["system.rbac", "org.manage"] },
  { prefix: "/guide", perms: [] },
  { prefix: "/forbidden", perms: [] },
];

/** Quyền cần cho một route (null nếu chỉ cần đăng nhập / không khai báo). */
export function accessFor(href: string): RouteAccess | undefined {
  return ROUTE_ACCESS.find((r) => href === r.prefix || href.startsWith(r.prefix + "/"));
}

/** Một bộ quyền (Set) có đủ điều kiện vào route không. */
export function allowsRoute(perms: Set<string>, href: string): boolean {
  const a = accessFor(href);
  if (!a || a.perms.length === 0) return true;
  return a.perms.some((p) => perms.has(p));
}
