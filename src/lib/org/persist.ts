// Tầng đọc/ghi Supabase cho store (mô hình JSONB: bảng = id text + data jsonb).
// Khi Supabase CHƯA cấu hình → mọi hàm ghi là no-op, hàm đọc trả rỗng/null
// (app chạy "chế độ dev" thuần in-memory như trước).
//
// App tự kiểm soát phân quyền (RBAC + scope ở tầng code) nên dùng khoá
// service_role (bỏ qua RLS). Bản đồ tên bảng ↔ collection ở store.ts.

import { isSupabaseStoreConfigured, supabaseAdmin } from "@/lib/supabase/admin";

export { isSupabaseStoreConfigured };

type Row = { id: string; data: unknown; updated_at: string };

const now = () => new Date().toISOString();

/** Đọc toàn bộ một bảng collection → mảng object (đúng kiểu T trong `data`). */
export async function pullCollection<T>(table: string): Promise<T[]> {
  if (!isSupabaseStoreConfigured) return [];
  const { data, error } = await supabaseAdmin().from(table).select("data");
  if (error) throw new Error(`Supabase pull ${table}: ${error.message}`);
  return (data ?? []).map((r) => (r as { data: T }).data);
}

/** Ghi/đè một bản ghi theo id. */
export async function upsertRow(table: string, id: string, data: unknown): Promise<void> {
  if (!isSupabaseStoreConfigured) return;
  const { error } = await supabaseAdmin()
    .from(table)
    .upsert({ id, data, updated_at: now() } satisfies Row);
  if (error) throw new Error(`Supabase upsert ${table}/${id}: ${error.message}`);
}

/** Ghi/đè nhiều bản ghi một lần (dùng khi seed). */
export async function upsertMany(table: string, items: { id: string }[]): Promise<void> {
  if (!isSupabaseStoreConfigured || items.length === 0) return;
  const rows: Row[] = items.map((it) => ({ id: it.id, data: it, updated_at: now() }));
  const { error } = await supabaseAdmin().from(table).upsert(rows);
  if (error) throw new Error(`Supabase upsertMany ${table} (${items.length}): ${error.message}`);
}

/** Xoá một bản ghi theo id. */
export async function deleteRow(table: string, id: string): Promise<void> {
  if (!isSupabaseStoreConfigured) return;
  const { error } = await supabaseAdmin().from(table).delete().eq("id", id);
  if (error) throw new Error(`Supabase delete ${table}/${id}: ${error.message}`);
}

/** Đọc một giá trị cấu hình đơn lẻ (group / approval_config…). */
export async function getConfig<T>(key: string): Promise<T | null> {
  if (!isSupabaseStoreConfigured) return null;
  const { data, error } = await supabaseAdmin()
    .from("app_config")
    .select("data")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`Supabase getConfig ${key}: ${error.message}`);
  return (data?.data as T) ?? null;
}

/** Ghi/đè một giá trị cấu hình đơn lẻ. */
export async function setConfig(key: string, data: unknown): Promise<void> {
  if (!isSupabaseStoreConfigured) return;
  const { error } = await supabaseAdmin()
    .from("app_config")
    .upsert({ key, data, updated_at: now() });
  if (error) throw new Error(`Supabase setConfig ${key}: ${error.message}`);
}
