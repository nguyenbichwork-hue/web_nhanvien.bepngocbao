// Dọn dữ liệu live: chỉ giữ pháp nhân Peaki (pn04) + nhân viên của nó.
// Sao lưu toàn bộ bảng liên quan ra JSON TRƯỚC khi xoá. Idempotent (chạy lại an toàn).
// Chạy: node scripts/cleanup-entities.mjs            (DRY-RUN: chỉ in kế hoạch)
//       node scripts/cleanup-entities.mjs --apply    (THỰC THI xoá/cập nhật)
import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const KEEP_ENTITY = "pn04"; // Công ty TNHH Peaki

// ---- nạp .env.local ----
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trong .env.local");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function pull(table) {
  const r = await fetch(`${URL}/rest/v1/${table}?select=id,data`, { headers: H });
  if (!r.ok) throw new Error(`pull ${table}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function delIds(table, ids) {
  if (!ids.length || !APPLY) return;
  const inlist = `(${ids.map((x) => `"${x}"`).join(",")})`;
  const r = await fetch(`${URL}/rest/v1/${table}?id=in.${inlist}`, { method: "DELETE", headers: H });
  if (!r.ok) throw new Error(`delete ${table}: ${r.status} ${await r.text()}`);
}
async function upsert(table, rows) {
  if (!rows.length || !APPLY) return;
  const body = rows.map((it) => ({ id: it.id, data: it.data, updated_at: new Date().toISOString() }));
  const r = await fetch(`${URL}/rest/v1/${table}`, {
    method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`upsert ${table}: ${r.status} ${await r.text()}`);
}

const TABLES = ["legal_entities", "employees", "app_users", "role_assignments", "departments"];
const snap = {};
for (const t of TABLES) snap[t] = await pull(t);

// ---- sao lưu ----
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = `scripts/backup-before-entity-cleanup-${stamp}.json`;
fs.writeFileSync(backupFile, JSON.stringify(snap, null, 2), "utf8");
console.log(`Đã sao lưu ${TABLES.map((t) => `${t}=${snap[t].length}`).join(", ")} → ${backupFile}`);

// ---- tính tập giữ/xoá ----
const entities = snap.legal_entities;
const employees = snap.employees;
const users = snap.app_users;
const assigns = snap.role_assignments;
const depts = snap.departments;

const delEntityIds = entities.filter((r) => r.data.id !== KEEP_ENTITY).map((r) => r.id);
const keepEmpIds = new Set(employees.filter((r) => r.data.legalEntityId === KEEP_ENTITY).map((r) => r.data.id));
const delEmpRows = employees.filter((r) => !keepEmpIds.has(r.data.id));
const delEmpIds = delEmpRows.map((r) => r.id);

// Giữ user: admin (không gắn employeeId) HOẶC employeeId thuộc nhân viên giữ lại.
const delUserRows = users.filter((r) => r.data.employeeId && !keepEmpIds.has(r.data.employeeId));
const delUserIds = delUserRows.map((r) => r.id);
const delUserIdSet = new Set(delUserRows.map((r) => r.data.id));

// Phân quyền: xoá của user bị xoá; user giữ lại mà scope=ENTITY → đổi thành GROUP.
const delAssignIds = assigns.filter((r) => delUserIdSet.has(r.data.userId)).map((r) => r.id);
const convertAssigns = assigns
  .filter((r) => !delUserIdSet.has(r.data.userId) && r.data.scopeType === "ENTITY")
  .map((r) => ({ id: r.id, data: { ...r.data, scopeType: "GROUP", scopeEntityId: null } }));

// Phòng ban: dồn hết về Peaki (giữ cấu trúc phòng ban dưới 1 công ty).
const rehomeDepts = depts
  .filter((r) => r.data.legalEntityId !== KEEP_ENTITY)
  .map((r) => ({ id: r.id, data: { ...r.data, legalEntityId: KEEP_ENTITY } }));

console.log("\n== KẾ HOẠCH ==");
console.log(`Pháp nhân xoá: ${delEntityIds.length} [${delEntityIds.join(", ")}]`);
console.log(`Nhân viên giữ: ${keepEmpIds.size}, xoá: ${delEmpIds.length}`);
console.log(`Tài khoản xoá: ${delUserIds.length}`);
console.log(`Phân quyền xoá: ${delAssignIds.length}, đổi ENTITY→GROUP: ${convertAssigns.length}`);
console.log(`Phòng ban dồn về Peaki: ${rehomeDepts.length}`);

if (!APPLY) { console.log("\n(DRY-RUN — thêm --apply để thực thi)"); process.exit(0); }

// ---- thực thi: xoá trước, rồi cập nhật ----
await delIds("employees", delEmpIds);
await delIds("app_users", delUserIds);
await delIds("role_assignments", delAssignIds);
await delIds("legal_entities", delEntityIds);
await upsert("role_assignments", convertAssigns);
await upsert("departments", rehomeDepts);
console.log("\n✅ ĐÃ THỰC THI xong.");
