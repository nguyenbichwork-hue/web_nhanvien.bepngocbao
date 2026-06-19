// BNB · Helper PHÍA SERVER (đọc store) — tách khỏi `util.ts` để `util.ts` luôn
// CLIENT-SAFE. `util.ts` bị nhiều Client Component import; nếu nó kéo theo
// `org/store` (→ `persist` → `next/cache`, vốn server-only) thì build sẽ vỡ.
import { listEmployees } from "@/lib/org/store";

/** Bản đồ id nhân viên → họ tên, để hiển thị người phụ trách. (Server-only) */
export async function employeeNameMap(): Promise<Record<string, string>> {
  const emps = await listEmployees();
  const m: Record<string, string> = {};
  for (const e of emps) m[e.id] = e.fullName;
  return m;
}
