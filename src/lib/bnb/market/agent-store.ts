// BNB · RMS — kho GIÁ THỊ TRƯỜNG do AGENT (máy nhân viên cào local) đẩy về.
// Collection `bnb_market_prices`: id = Mã SP (code), data = AgentPrice (giá mới nhất + thời điểm).
// Cấu hình `rms_agent` ghi trạng thái lần chạy gần nhất (để màn hình hiện "cập nhật lúc").
import { pullCollection, upsertMany, getConfig, setConfig } from "@/lib/org/persist";

export interface AgentPricePoint {
  site: string;
  price: number;
  url: string;
  official?: boolean;
}
export interface AgentPrice {
  code: string;          // = id bản ghi (Mã SP trong kho giá vốn)
  model: string;
  name: string;
  min: number | null;        // giá thấp nhất đáng tin
  officialMin: number | null; // giá thấp nhất từ trang chính hãng
  siteCount: number;
  prices: AgentPricePoint[]; // chính hãng để trước
  at: string;                // ISO thời điểm cào
}

export interface AgentRunStatus {
  lastRunAt?: string;   // ISO kết thúc lần chạy gần nhất
  lastCount?: number;   // số SP cào được giá lần gần nhất
  total?: number;       // tổng SP trong worklist lần gần nhất
  machine?: string;     // tên máy nhân viên chạy agent
  running?: boolean;    // đang chạy?
  startedAt?: string;
}

const TABLE = "bnb_market_prices";
const CFG = "rms_agent";

export async function listAgentPrices(): Promise<AgentPrice[]> {
  try {
    return await pullCollection<AgentPrice>(TABLE);
  } catch {
    return [];
  }
}

/** Map code → giá agent (để join nhanh với kho giá vốn). */
export async function agentPriceMap(): Promise<Map<string, AgentPrice>> {
  const rows = await listAgentPrices();
  const m = new Map<string, AgentPrice>();
  for (const r of rows) if (r.code) m.set(r.code, r);
  return m;
}

/** Lưu/đè 1 lô giá agent (id = code). */
export async function saveAgentPrices(items: AgentPrice[]): Promise<void> {
  const valid = items.filter((i) => i.code);
  if (!valid.length) return;
  await upsertMany(TABLE, valid.map((i) => ({ id: i.code, ...i })));
}

export async function getAgentStatus(): Promise<AgentRunStatus> {
  return (await getConfig<AgentRunStatus>(CFG)) || {};
}
export async function setAgentStatus(patch: Partial<AgentRunStatus>): Promise<void> {
  await setConfig(CFG, { ...(await getAgentStatus()), ...patch });
}
