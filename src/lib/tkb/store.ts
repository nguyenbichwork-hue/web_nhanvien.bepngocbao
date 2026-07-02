// TKB · tầng dữ liệu cho hệ quản trị thiết kế bếp.
// Bảng nháp tkb_* (JSONB id+data) đi qua persist (cache + realtime).
// Snapshot XUẤT BẢN là bất biến: id = `${version}/${section}` trong tkb_snapshots
// → đọc theo version nên cache vĩnh viễn theo khoá, không cần invalidate.
import { unstable_cache } from "next/cache";
import {
  pullCollection,
  upsertRow,
  upsertMany,
  deleteRow,
  getConfig,
  setConfig,
} from "@/lib/org/persist";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  TKB_SECTIONS,
  TKB_TABLES,
  type TkbProduct,
  type TkbPublishedPointer,
  type TkbSection,
} from "./types";

const SNAPSHOT_TABLE = "tkb_snapshots";
const PUBLISHED_CFG = "tkb_published";

// ---------- NHÁP: sản phẩm ----------
export async function listTkbProducts(): Promise<TkbProduct[]> {
  try {
    return await pullCollection<TkbProduct>(TKB_TABLES.products);
  } catch {
    return [];
  }
}

export async function upsertTkbProduct(p: TkbProduct): Promise<void> {
  await upsertRow(TKB_TABLES.products, p.sku, p);
}

export async function upsertTkbProducts(items: TkbProduct[]): Promise<void> {
  await upsertMany(
    TKB_TABLES.products,
    items.map((p) => ({ ...p, id: p.sku })),
  );
}

export async function deleteTkbProduct(sku: string): Promise<void> {
  await deleteRow(TKB_TABLES.products, sku);
}

// ---------- NHÁP: collection bất kỳ theo section ----------
export async function listTkbSection(section: TkbSection): Promise<unknown[]> {
  try {
    return await pullCollection(TKB_TABLES[section]);
  } catch {
    return [];
  }
}

/** Đếm số dòng từng section (cho dashboard). */
export async function tkbCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    TKB_SECTIONS.map(async (s) => {
      out[s] = (await listTkbSection(s)).length;
    }),
  );
  return out;
}

// ---------- XUẤT BẢN ----------
export async function getPublishedPointer(): Promise<TkbPublishedPointer | null> {
  try {
    return await getConfig<TkbPublishedPointer>(PUBLISHED_CFG);
  } catch {
    return null;
  }
}

/** Gom toàn bộ nháp → snapshot bất biến + cập nhật con trỏ published. */
export async function publishTkbSnapshot(by?: string): Promise<TkbPublishedPointer> {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const version = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  const counts: Record<string, number> = {};
  for (const section of TKB_SECTIONS) {
    const rows = await listTkbSection(section);
    counts[section] = rows.length;
    await upsertRow(SNAPSHOT_TABLE, `${version}/${section}`, rows);
  }
  const pointer: TkbPublishedPointer = { version, at: d.toISOString(), by, counts };
  await setConfig(PUBLISHED_CFG, pointer);
  return pointer;
}

// ---------- ĐỌC BẢN ĐÃ XUẤT BẢN (cho /api/tkb/published) ----------
// Snapshot bất biến theo (version, section) → cache theo khoá, TTL dài.
const snapshotGetters = new Map<string, () => Promise<unknown>>();
function cachedSnapshot(version: string, section: string): () => Promise<unknown> {
  const key = `${version}/${section}`;
  let g = snapshotGetters.get(key);
  if (!g) {
    g = unstable_cache(
      async () => {
        const { data, error } = await supabaseAdmin()
          .from(SNAPSHOT_TABLE)
          .select("data")
          .eq("id", key)
          .maybeSingle();
        if (error) throw new Error(`Supabase snapshot ${key}: ${error.message}`);
        return data?.data ?? null;
      },
      ["tkb-snap", key],
      { revalidate: 3600 },
    );
    snapshotGetters.set(key, g);
  }
  return g;
}

export async function getPublishedSection(section: TkbSection): Promise<unknown | null> {
  const ptr = await getPublishedPointer();
  if (!ptr) return null;
  return cachedSnapshot(ptr.version, section)();
}
