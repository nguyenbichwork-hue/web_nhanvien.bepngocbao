// CX OS — Hành trình khách hàng 12 bước + chỉ số NPS.
import type {
  Customer, DeliveryJob, Lead, NpsResponse, Order, Quote, Survey, WarrantyTicket,
} from "./types";
import { npsCategory } from "./types";

export type JourneyStage = { key: string; label: string; icon: string; desc: string };

// 12 bước hành trình (đúng tinh thần CX OS · Journey 12 bước).
export const JOURNEY_STAGES: JourneyStage[] = [
  { key: "reach", label: "Tiếp cận", icon: "leads", desc: "Lead mới từ các kênh" },
  { key: "interest", label: "Quan tâm", icon: "chat", desc: "Đang trao đổi" },
  { key: "consult", label: "Tư vấn (Fit)", icon: "fit", desc: "Chẩn đoán nhu cầu bếp" },
  { key: "survey", label: "Khảo sát", icon: "survey", desc: "Khảo sát hiện trạng" },
  { key: "quote", label: "Báo giá", icon: "quote", desc: "Đã gửi báo giá" },
  { key: "close", label: "Chốt đơn", icon: "cart", desc: "Đơn đã tạo/chốt" },
  { key: "pay", label: "Thanh toán", icon: "wallet", desc: "Đã thu tiền" },
  { key: "deliver", label: "Giao hàng", icon: "truck", desc: "Đang giao" },
  { key: "install", label: "Lắp đặt", icon: "wrench", desc: "Đang lắp đặt" },
  { key: "accept", label: "Nghiệm thu", icon: "check", desc: "Hoàn tất bàn giao" },
  { key: "care", label: "Hậu mãi", icon: "warranty", desc: "Chăm sóc bảo hành" },
  { key: "loyal", label: "Trung thành", icon: "award", desc: "Khách mua lại" },
];

export type FunnelInput = {
  leads: Lead[];
  surveys: Survey[];
  quotes: Quote[];
  orders: Order[];
  deliveries: DeliveryJob[];
  warranties: WarrantyTicket[];
  customers: Customer[];
};

/** Đếm số thực thể ở mỗi bước hành trình (suy từ dữ liệu sẵn có). */
export function computeJourneyFunnel(d: FunnelInput): { stage: JourneyStage; count: number }[] {
  const ord = (sts: string[]) => d.orders.filter((o) => sts.includes(o.status)).length;
  const counts: Record<string, number> = {
    reach: d.leads.filter((l) => l.stage === "new").length,
    interest: d.leads.filter((l) => l.stage === "consulting").length,
    consult: d.leads.filter((l) => l.need).length,
    survey: d.surveys.length,
    quote: d.quotes.length,
    close: ord(["pending", "confirmed"]),
    pay: d.orders.filter((o) => (o.paid || 0) > 0).length,
    deliver: d.deliveries.filter((x) => ["scheduled", "enroute"].includes(x.status)).length + ord(["delivering"]),
    install: d.deliveries.filter((x) => x.status === "installing").length + ord(["installing"]),
    accept: ord(["completed"]) + d.deliveries.filter((x) => x.status === "done").length,
    care: d.warranties.filter((w) => ["active", "due", "contacted"].includes(w.status)).length,
    loyal: d.customers.filter((c) => (c.orderCount || 0) > 1).length,
  };
  return JOURNEY_STAGES.map((s) => ({ stage: s, count: counts[s.key] || 0 }));
}

export type NpsStats = {
  total: number; score: number; promoters: number; passives: number; detractors: number;
};

/** NPS = %khuyến nghị − %không hài lòng (thang −100..100). */
export function computeNps(responses: NpsResponse[]): NpsStats {
  const total = responses.length;
  if (!total) return { total: 0, score: 0, promoters: 0, passives: 0, detractors: 0 };
  let p = 0, pa = 0, de = 0;
  for (const r of responses) {
    const c = npsCategory(r.score);
    if (c === "promoter") p++;
    else if (c === "passive") pa++;
    else de++;
  }
  return { total, score: Math.round(((p - de) / total) * 100), promoters: p, passives: pa, detractors: de };
}
