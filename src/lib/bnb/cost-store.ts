// BNB · RMS — kho giá vốn (Supabase collection `bnb_cost_items`) + fallback seed JSON.
// SERVER-ONLY (import persist). Mỗi bản ghi: id = Mã SP (code), data = CostItem.
import { isSupabaseStoreConfigured, pullCollection, upsertRow } from "@/lib/org/persist";
import seedJson from "./sourcing-catalog.json";
import { type CostItem, sellFromCost, strip } from "./sourcing";

const SEED = seedJson as unknown as CostItem[];
const TABLE = "bnb_cost_items";
const tight = (s: string): string => strip(s).replace(/[^a-z0-9]/g, "");

/** Toàn bộ kho giá vốn. Supabase khi đã cấu hình & có dữ liệu; nếu trống → seed JSON (không bao giờ rỗng). */
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

/** Cập nhật giá vốn 1 SP (theo code) + tính lại giá bán. */
export async function setCostItemVon(code: string, von: number | null): Promise<CostItem | undefined> {
  const items = await listCostItems();
  const cur = items.find((c) => c.code === code);
  if (!cur) return undefined;
  const next: CostItem = { ...cur, von, ban: von != null ? sellFromCost(von) : null };
  await upsertRow(TABLE, code, next);
  return next;
}

export type WeeklyResult = {
  brand: string;
  matched: { code: string; model: string; oldVon: number | null; von: number }[];
  unmatched: string[];
};

/** Nhập báo giá tuần cho 1 NCC: cặp (model, giá vốn) → khớp model (bỏ dấu/khoảng trắng) → cập nhật vốn + giá bán. */
export async function applyWeeklyQuote(
  brand: string,
  pairs: { model: string; von: number }[],
): Promise<WeeklyResult> {
  const items = await listCostItems();
  const idx = new Map<string, CostItem>();
  for (const c of items) if (c.brand === brand && c.code) idx.set(tight(c.model), c);
  const matched: WeeklyResult["matched"] = [];
  const unmatched: string[] = [];
  for (const p of pairs) {
    const hit = idx.get(tight(p.model));
    if (hit && hit.code) {
      await upsertRow(TABLE, hit.code, { ...hit, von: p.von, ban: sellFromCost(p.von) });
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
