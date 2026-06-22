// BNB · RMS — kho giá vốn (Supabase collection `bnb_cost_items`) + cấu hình markup.
// SERVER-ONLY (import persist). Mỗi bản ghi: id = Mã SP (code), data = CostItem.
import { isSupabaseStoreConfigured, pullCollection, upsertRow, deleteRow, getConfig, setConfig } from "@/lib/org/persist";
import seedJson from "./sourcing-catalog.json";
import { type CostItem, sellWith, MARKUP, strip } from "./sourcing";

const SEED = seedJson as unknown as CostItem[];
const TABLE = "bnb_cost_items";
const CFG_KEY = "rms_config";
const tight = (s: string): string => strip(s).replace(/[^a-z0-9]/g, "");

/* ===== Cấu hình markup (giá bán = vốn × (1 + markup)) ===== */
export async function getMarkup(): Promise<number> {
  try {
    const cfg = await getConfig<{ markup?: number }>(CFG_KEY);
    const m = cfg?.markup;
    if (typeof m === "number" && m >= 0 && m <= 5) return m;
  } catch {
    /* chưa cấu hình → mặc định */
  }
  return MARKUP;
}
export async function setMarkup(markup: number): Promise<void> {
  const m = Math.max(0, Math.min(5, markup));
  await setConfig(CFG_KEY, { markup: m });
}

/* ===== Đọc kho ===== */
/** Toàn bộ kho giá vốn. Supabase khi đã cấu hình & có dữ liệu; nếu trống → seed JSON. */
export async function listCostItems(): Promise<CostItem[]> {
  if (isSupabaseStoreConfigured) {
    try {
      const rows = await pullCollection<CostItem>(TABLE);
      if (rows.length) return rows;
    } catch {
      /* bảng chưa tồn tại → fallback seed */
    }
  }
  return SEED;
}

/* ===== Sửa / thêm / xoá 1 SP ===== */
/** Lưu giá 1 SP. Nếu `ban` để trống → tự tính theo markup hiện hành. */
export async function saveCostItem(
  code: string,
  patch: { von: number | null; ban: number | null; ny: number | null; brand?: string; model?: string; cat?: string | null },
): Promise<CostItem | undefined> {
  const items = await listCostItems();
  const cur = items.find((c) => c.code === code);
  if (!cur) return undefined;
  const markup = await getMarkup();
  const von = patch.von;
  const ban = patch.ban != null ? patch.ban : von != null ? sellWith(von, markup) : null;
  const next: CostItem = {
    ...cur,
    von,
    ban,
    ny: patch.ny,
    brand: patch.brand?.trim() || cur.brand,
    model: patch.model?.trim() || cur.model,
    cat: patch.cat !== undefined ? (patch.cat?.trim() || null) : cur.cat,
  };
  await upsertRow(TABLE, code, next);
  return next;
}

/** Thêm SP mới vào kho. Nếu không nhập code → tự sinh. */
export async function createCostItem(input: {
  code?: string; brand: string; model: string; cat?: string | null; von: number | null; ny: number | null;
}): Promise<CostItem> {
  const markup = await getMarkup();
  const code = (input.code || "").trim() || `SP-${Date.now().toString(36).toUpperCase()}`;
  const item: CostItem = {
    code,
    brand: input.brand.trim(),
    model: input.model.trim(),
    cat: input.cat?.trim() || null,
    von: input.von,
    ban: input.von != null ? sellWith(input.von, markup) : null,
    ny: input.ny,
  };
  await upsertRow(TABLE, code, item);
  return item;
}

export async function deleteCostItem(code: string): Promise<void> {
  await deleteRow(TABLE, code);
}

/** Cập nhật giá vốn 1 SP (theo code) + tính lại giá bán theo markup. */
export async function setCostItemVon(code: string, von: number | null): Promise<CostItem | undefined> {
  const markup = await getMarkup();
  const items = await listCostItems();
  const cur = items.find((c) => c.code === code);
  if (!cur) return undefined;
  const next: CostItem = { ...cur, von, ban: von != null ? sellWith(von, markup) : null };
  await upsertRow(TABLE, code, next);
  return next;
}

/* ===== Nhập báo giá tuần ===== */
export type WeeklyResult = {
  brand: string;
  matched: { code: string; model: string; oldVon: number | null; von: number }[];
  unmatched: string[];
};

/** Nhập báo giá tuần cho 1 NCC: cặp (model, giá vốn) → khớp model → cập nhật vốn + giá bán. */
export async function applyWeeklyQuote(
  brand: string,
  pairs: { model: string; von: number }[],
): Promise<WeeklyResult> {
  const markup = await getMarkup();
  const items = await listCostItems();
  const idx = new Map<string, CostItem>();
  for (const c of items) if (c.brand === brand && c.code) idx.set(tight(c.model), c);
  const matched: WeeklyResult["matched"] = [];
  const unmatched: string[] = [];
  for (const p of pairs) {
    const hit = idx.get(tight(p.model));
    if (hit && hit.code) {
      await upsertRow(TABLE, hit.code, { ...hit, von: p.von, ban: sellWith(p.von, markup) });
      matched.push({ code: hit.code, model: hit.model, oldVon: hit.von, von: p.von });
    } else {
      unmatched.push(p.model);
    }
  }
  return { brand, matched, unmatched };
}

/** Tách text dán từ Excel/Zalo thành cặp (model, giá vốn). Ưu tiên TAB; nếu không có thì token cuối = giá. */
export function parseQuotePaste(raw: string): { model: string; von: number }[] {
  const out: { model: string; von: number }[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    let model = "";
    let vonStr = "";
    if (t.includes("\t")) {
      const p = t.split("\t").map((x) => x.trim()).filter(Boolean);
      if (p.length < 2) continue;
      model = p[0];
      vonStr = p[p.length - 1];
    } else {
      const p = t.split(/\s+/);
      if (p.length < 2) continue;
      vonStr = p[p.length - 1];
      model = p.slice(0, -1).join(" ");
    }
    const von = Number(vonStr.replace(/[^\d]/g, ""));
    if (model && von > 0) out.push({ model, von });
  }
  return out;
}
