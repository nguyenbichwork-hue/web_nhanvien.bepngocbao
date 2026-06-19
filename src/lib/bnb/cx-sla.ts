// BNB · Tính cảnh báo SLA cho hành trình CX từ lịch sử chuyển bước (client-safe).
// 48H Promise, check-in ngày 1/3/7 sau bàn giao, mời review sau 3 ngày.
import type { CxJourney } from "./types";

export type CxAlert = { key: string; label: string; tone: "rose" | "amber" | "indigo" };

const DAY = 86400000;
const stageAt = (j: CxJourney, stage: string): number | null => {
  const h = (j.history || []).find((x) => x.stage === stage);
  return h ? new Date(h.at).getTime() : null;
};

/** Danh sách cảnh báo SLA đang đến hạn của 1 hành trình (now = mốc hiện tại, ms). */
export function cxAlerts(j: CxJourney, now: number = Date.now()): CxAlert[] {
  const out: CxAlert[] = [];
  const installAt = stageAt(j, "installation");
  const handoverAt = stageAt(j, "handover");
  const inExpansion = ["review", "referral", "community"].includes(j.stage);

  // 48H Promise: tính từ lúc vào bước Installation đến khi Handover (hoặc tới giờ).
  if (installAt && (j.stage === "installation" || j.stage === "handover")) {
    const end = handoverAt ?? now;
    if (end - installAt > 2 * DAY) out.push({ key: "install48h", label: "Trễ cam kết 48H lắp đặt", tone: "rose" });
  }

  // Check-in ngày 1/3/7 sau bàn giao (khi đang ở Handover/First 7 Days).
  if (handoverAt && (j.stage === "handover" || j.stage === "first7days")) {
    for (const d of [1, 3, 7]) {
      if (now >= handoverAt + d * DAY) out.push({ key: `checkin-d${d}`, label: `Check-in ngày ${d} sau bàn giao`, tone: "amber" });
    }
  }

  // Mời review sau 3 ngày bàn giao (nếu chưa sang phase Mở rộng).
  if (handoverAt && now >= handoverAt + 3 * DAY && !inExpansion) {
    out.push({ key: "review", label: "Mời khách đánh giá (review)", tone: "indigo" });
  }
  return out;
}
