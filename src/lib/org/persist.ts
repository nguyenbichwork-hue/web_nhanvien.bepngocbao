// Tầng đọc/ghi Supabase cho store (mô hình JSONB: bảng = id text + data jsonb).
// Khi Supabase CHƯA cấu hình → mọi hàm ghi là no-op, hàm đọc trả rỗng/null
// (app chạy "chế độ dev" thuần in-memory như trước).
//
// App tự kiểm soát phân quyền (RBAC + scope ở tầng code) nên dùng khoá
// service_role (bỏ qua RLS). Bản đồ tên bảng ↔ collection ở store.ts.
//
// ============================ HIỆU NĂNG (quan trọng) ============================
// Trước đây MỖI request đọc lại NGUYÊN collection từ Supabase (supabase-js KHÔNG
// đi qua fetch-cache của Next → không được cache gì cả). Trên Vercel serverless,
// cache `globalThis` ở store.ts là vô dụng (mỗi lambda riêng, sống ngắn) → mỗi lần
// chuyển trang là một loạt SELECT cả bảng → CHẬM.
//
// Khắc phục: bọc hàm đọc bằng `unstable_cache` + TAG theo từng bảng. Kết quả được
// LƯU CHUNG giữa các request & các lambda (Vercel Data Cache). Mọi lệnh GHI gọi
// `revalidateTag` đúng bảng đó → lần đọc kế tiếp tự lấy bản mới. Có TTL an toàn
// (REVALIDATE_TTL) phòng khi lỡ một nhịp invalidate. Đồng thời mỗi lần GHI cũng
// phát một CỜ realtime theo tên bảng để màn người khác đang mở tự cập nhật.

import { unstable_cache, revalidateTag } from "next/cache";
import { cache } from "react";
import { isSupabaseStoreConfigured, supabaseAdmin } from "@/lib/supabase/admin";
import { bumpSignal } from "@/lib/realtime/signal";

export { isSupabaseStoreConfigured };

type Row = { id: string; data: unknown; updated_at: string };

const now = () => new Date().toISOString();

// TTL an toàn (giây): cache giữ tới khi có revalidateTag, nhưng vẫn tự làm tươi
// sau ngần này để không bao giờ kẹt dữ liệu cũ quá lâu nếu lỡ một nhịp invalidate.
const REVALIDATE_TTL = 300;

const collTag = (table: string) => `coll:${table}`;
const cfgTag = (key: string) => `cfg:${key}`;

// --- Hàm đọc THÔ (không cache) — chỉ gọi từ trong lớp cache bên dưới ---
// Phân trang theo lô 1000 vì PostgREST mặc định trả tối đa 1000 dòng → bảng lớn
// (vd kho giá vốn ~1.5k SP) sẽ bị cắt cụt nếu không lặp .range().
async function rawPull<T>(table: string): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin()
      .from(table)
      .select("data")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase pull ${table}: ${error.message}`);
    const rows = (data ?? []).map((r) => (r as { data: T }).data);
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

async function rawGetConfig<T>(key: string): Promise<T | null> {
  const { data, error } = await supabaseAdmin()
    .from("app_config")
    .select("data")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`Supabase getConfig ${key}: ${error.message}`);
  return (data?.data as T) ?? null;
}

// Mỗi bảng/khoá cần một instance unstable_cache RIÊNG để gắn TAG riêng (tags cố
// định lúc tạo). Ghi nhớ instance trong tiến trình để khỏi dựng lại mỗi lần gọi
// (bản thân cache vẫn nằm ở Vercel Data Cache, dùng chung mọi lambda/request).
const pullers = new Map<string, () => Promise<unknown[]>>();
function cachedPuller(table: string): () => Promise<unknown[]> {
  let p = pullers.get(table);
  if (!p) {
    p = unstable_cache(() => rawPull(table), ["coll", table], {
      tags: [collTag(table)],
      revalidate: REVALIDATE_TTL,
    });
    pullers.set(table, p);
  }
  return p;
}

const configGetters = new Map<string, () => Promise<unknown>>();
function cachedConfigGetter(key: string): () => Promise<unknown> {
  let g = configGetters.get(key);
  if (!g) {
    g = unstable_cache(() => rawGetConfig(key), ["cfg", key], {
      tags: [cfgTag(key)],
      revalidate: REVALIDATE_TTL,
    });
    configGetters.set(key, g);
  }
  return g;
}

// Vô hiệu tag SAU mỗi lần ghi. Bọc try/catch vì revalidateTag chỉ hợp lệ trong
// Server Action / Route Handler — nếu lỡ chạy trong lúc render (vd seed lần đầu)
// thì bỏ qua (cache khi đó còn nguội nên không cần invalidate).
// `{ expire: 0 }` = hết hạn NGAY → request kế tiếp (vd người khác vừa nhận tín hiệu
// realtime rồi refresh) là cache-miss và đọc dữ liệu TƯƠI, thay vì stale-while-
// revalidate (sẽ thấy bản cũ một nhịp — không hợp với đồng bộ realtime).
function invalidateColl(table: string): void {
  try {
    revalidateTag(collTag(table), { expire: 0 });
  } catch {
    /* ngoài request-scope: bỏ qua */
  }
}
function invalidateCfg(key: string): void {
  try {
    revalidateTag(cfgTag(key), { expire: 0 });
  } catch {
    /* bỏ qua */
  }
}

// Khử trùng lặp tín hiệu trong CÙNG một request: một bảng chỉ phát cờ tối đa 1 lần
// dù action ghi nhiều dòng (vd cập nhật hàng loạt) → tránh upsert cờ thừa.
const signalledThisReq = cache(() => new Set<string>());
async function signalTable(table: string): Promise<void> {
  const seen = signalledThisReq();
  if (seen.has(table)) return;
  seen.add(table);
  await bumpSignal(table);
}

/** Đọc toàn bộ một bảng collection → mảng object (đúng kiểu T trong `data`). CÓ CACHE. */
export async function pullCollection<T>(table: string): Promise<T[]> {
  if (!isSupabaseStoreConfigured) return [];
  return (await cachedPuller(table)()) as T[];
}

/** Ghi/đè một bản ghi theo id. Invalidate cache + phát cờ realtime cho bảng. */
export async function upsertRow(table: string, id: string, data: unknown): Promise<void> {
  if (!isSupabaseStoreConfigured) return;
  const { error } = await supabaseAdmin()
    .from(table)
    .upsert({ id, data, updated_at: now() } satisfies Row);
  if (error) throw new Error(`Supabase upsert ${table}/${id}: ${error.message}`);
  invalidateColl(table);
  await signalTable(table);
}

/** Ghi/đè nhiều bản ghi một lần (dùng khi seed/cập nhật hàng loạt). */
export async function upsertMany(table: string, items: { id: string }[]): Promise<void> {
  if (!isSupabaseStoreConfigured || items.length === 0) return;
  const rows: Row[] = items.map((it) => ({ id: it.id, data: it, updated_at: now() }));
  const { error } = await supabaseAdmin().from(table).upsert(rows);
  if (error) throw new Error(`Supabase upsertMany ${table} (${items.length}): ${error.message}`);
  invalidateColl(table);
  await signalTable(table);
}

/** Xoá một bản ghi theo id. */
export async function deleteRow(table: string, id: string): Promise<void> {
  if (!isSupabaseStoreConfigured) return;
  const { error } = await supabaseAdmin().from(table).delete().eq("id", id);
  if (error) throw new Error(`Supabase delete ${table}/${id}: ${error.message}`);
  invalidateColl(table);
  await signalTable(table);
}

/** Đọc một giá trị cấu hình đơn lẻ (group / approval_config…). CÓ CACHE. */
export async function getConfig<T>(key: string): Promise<T | null> {
  if (!isSupabaseStoreConfigured) return null;
  return (await cachedConfigGetter(key)()) as T | null;
}

/** Ghi/đè một giá trị cấu hình đơn lẻ. */
export async function setConfig(key: string, data: unknown): Promise<void> {
  if (!isSupabaseStoreConfigured) return;
  const { error } = await supabaseAdmin()
    .from("app_config")
    .upsert({ key, data, updated_at: now() });
  if (error) throw new Error(`Supabase setConfig ${key}: ${error.message}`);
  invalidateCfg(key);
}
