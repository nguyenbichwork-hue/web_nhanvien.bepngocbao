// Nối Google Apps Script Web App (đọc/ghi Google Sheet). URL + secret truyền từ
// config (đặt ở tab Cài đặt) hoặc env. Chạy server-side, KHÔNG lộ secret ra client.

export interface SheetConfig { url: string; secret: string; }

export interface SheetProduct {
  row: number;
  sheet: string;
  ma: string;
  brand: string;
  model: string;
  ten: string;
  giaVon: number | null;
  giaHienTai: number | null;
}

export interface SheetResultItem {
  row: number;
  sheet?: string;
  soLink: number | null;
  min: number | null;
  deXuat: number | null;
  canhBao: string;
  trangThai: string;
  links: string;
}

export function sheetCfgFromEnv(): SheetConfig {
  return { url: process.env.APPS_SCRIPT_URL || "", secret: process.env.SHEET_SECRET || "" };
}
export const sheetConfigured = (c: SheetConfig) => !!c.url && !!c.secret;

async function call(cfg: SheetConfig, action: string, payload: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  if (!sheetConfigured(cfg)) throw new Error("Chưa cấu hình Apps Script URL / Secret");
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: cfg.secret, action, ...payload }),
    redirect: "follow",
    signal: AbortSignal.timeout(50000),
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Apps Script không trả JSON (kiểm tra URL/deploy): " + text.slice(0, 160));
  }
  if (data?.error) throw new Error(String(data.error));
  return data;
}

export async function sheetPing(cfg: SheetConfig): Promise<{ ok: boolean; sheet?: string }> {
  return (await call(cfg, "ping")) as { ok: boolean; sheet?: string };
}
export async function sheetSetup(cfg: SheetConfig): Promise<{ ok: boolean; created: string[] }> {
  return (await call(cfg, "setup")) as { ok: boolean; created: string[] };
}
/** Danh sách các sheet con chứa sản phẩm (để chọn quét). */
export async function sheetList(cfg: SheetConfig): Promise<{ name: string; rows: number }[]> {
  const d = await call(cfg, "listSheets");
  return (d.sheets || []) as { name: string; rows: number }[];
}
/** Đọc sản phẩm từ 1 hoặc nhiều sheet. */
export async function sheetGetProducts(cfg: SheetConfig, sheets?: string[]): Promise<SheetProduct[]> {
  const d = await call(cfg, "getProducts", sheets && sheets.length ? { sheets } : {});
  return (d.products || []) as SheetProduct[];
}
export interface SheetImportItem { ma: string; brand: string; model: string; ten: string; giaVon: number | null; giaHienTai: number | null }
/** Đưa danh sách SP vào cột A..F của 1 sheet (thay toàn bộ dữ liệu cũ). 1 lần ghi. */
export async function sheetImportProducts(cfg: SheetConfig, sheet: string, items: SheetImportItem[]): Promise<{ written: number }> {
  const d = await call(cfg, "importProducts", { sheet, items, clearOld: true });
  return { written: (d.written as number) || 0 };
}

/** Ghi kết quả (G..O, Lợi nhuận/%LN là công thức). Chia lô tránh timeout. */
export async function sheetWriteResults(cfg: SheetConfig, items: SheetResultItem[]): Promise<{ written: number }> {
  let written = 0;
  for (let i = 0; i < items.length; i += 200) {
    const d = await call(cfg, "writeResults", { items: items.slice(i, i + 200) });
    written += (d.written as number) || 0;
  }
  return { written };
}
