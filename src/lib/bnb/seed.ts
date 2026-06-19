// BNB · Dữ liệu mẫu cho chế độ dev (không cần Supabase). Mốc thời gian quanh 16/06/2026.
import type {
  Activity, AdCampaign, BankTxn, CalendarItem, ContentPillar, Customer, DeliveryJob,
  InternalTask, Lead, NpsResponse, Order, PurchaseOrder,
  Quote, Review, ShiftReport, Survey, WarrantyTicket,
  ZaloConversation, ZaloMessage, ReceptionLog, ShiftCheckin,
} from "./types";

// Hôm nay (demo) = 2026-06-16. Một số mốc tương đối để dashboard "hôm nay" có dữ liệu.
const D = (s: string) => `2026-06-${s}T08:30:00.000Z`;
const TODAY = "2026-06-16";

export type BNBSeed = {
  leads: Lead[];
  customers: Customer[];
  activities: Activity[];
  surveys: Survey[];
  quotes: Quote[];
  orders: Order[];
  deliveries: DeliveryJob[];
  warranties: WarrantyTicket[];
  shiftReports: ShiftReport[];
  tasks: InternalTask[];
  npsResponses: NpsResponse[];
  pillars: ContentPillar[];
  calendarItems: CalendarItem[];
  adCampaigns: AdCampaign[];
  purchaseOrders: PurchaseOrder[];
  bankTxns: BankTxn[];
  reviews: Review[];
  zaloConversations: ZaloConversation[];
  zaloMessages: ZaloMessage[];
  receptionLogs: ReceptionLog[];
  shiftCheckins: ShiftCheckin[];
};

export function seedBNB(): BNBSeed {
  const customers: Customer[] = [
    { id: "cus-1", code: "KH-1001", name: "Anh Trần Quốc Bảo", phone: "0903123456", email: "baotran@gmail.com", address: "12 Nguyễn Văn Đậu, Bình Thạnh, TP.HCM", source: "showroom", totalSpent: 58900000, orderCount: 1, firstOrderAt: D("02"), lastOrderAt: D("02"), createdAt: D("01"), updatedAt: D("02") },
    { id: "cus-2", code: "KH-1002", name: "Chị Nguyễn Thu Hà", phone: "0912987654", email: "hant@gmail.com", address: "45 Phan Xích Long, Phú Nhuận, TP.HCM", source: "website", totalSpent: 21900000, orderCount: 1, firstOrderAt: D("09"), lastOrderAt: D("09"), createdAt: D("05"), updatedAt: D("09") },
    { id: "cus-3", code: "KH-1003", name: "Anh Lê Minh Khôi", phone: "0987456123", address: "78 Cách Mạng Tháng 8, Q.10, TP.HCM", source: "facebook", totalSpent: 0, orderCount: 0, createdAt: D("12"), updatedAt: D("12") },
  ];

  const leads: Lead[] = [
    { id: "lead-1", code: "LD-1010", name: "Anh Phạm Văn Dũng", phone: "0938111222", source: "zalo", stage: "new", need: "Bếp từ + hút mùi cho căn hộ 2PN", budget: 25000000, assigneeId: "e24", address: "Vinhomes Grand Park, TP.Thủ Đức", createdAt: D("16"), updatedAt: D("16"), nextFollowUpAt: D("16") },
    { id: "lead-2", code: "LD-1011", name: "Chị Đỗ Thanh Mai", phone: "0907333444", source: "website", stage: "consulting", need: "Trọn bộ bếp nhà phố", budget: 60000000, assigneeId: "e30", customerId: "cus-3", createdAt: D("13"), updatedAt: D("15"), lastContactAt: D("15"), nextFollowUpAt: D("16") },
    { id: "lead-3", code: "LD-1012", name: "Anh Hoàng Nam", phone: "0916555666", source: "hotline", stage: "quoted", need: "Máy rửa bát Bosch", budget: 22000000, assigneeId: "e24", createdAt: D("11"), updatedAt: D("14"), lastContactAt: D("14") },
    { id: "lead-4", code: "LD-1013", name: "Chị Vũ Lan Anh", phone: "0905777888", source: "showroom", stage: "won", need: "Combo bếp từ + lò + hút mùi", budget: 55000000, assigneeId: "e30", customerId: "cus-1", createdAt: D("01"), updatedAt: D("02"), lastContactAt: D("02") },
    { id: "lead-5", code: "LD-1014", name: "Anh Bùi Tiến", phone: "0934999000", source: "tiktok", stage: "lost", need: "Bếp gas (đã chọn nơi khác)", budget: 8000000, assigneeId: "e24", createdAt: D("08"), updatedAt: D("12"), lastContactAt: D("12") },
    { id: "lead-6", code: "LD-1015", name: "Chị Trương Mỹ Linh", phone: "0978222333", source: "facebook", stage: "new", need: "Tư vấn bếp cho nhà mới", budget: 40000000, createdAt: D("16"), updatedAt: D("16"), nextFollowUpAt: D("17") },
  ];

  const activities: Activity[] = [
    { id: "act-1", leadId: "lead-2", type: "call", content: "Gọi tư vấn nhu cầu, KH quan tâm combo Bosch", byId: "e30", at: D("15") },
    { id: "act-2", leadId: "lead-3", type: "quote", content: "Đã gửi báo giá BG-2003 qua Zalo", byId: "e24", at: D("14") },
    { id: "act-3", customerId: "cus-1", type: "order", content: "Chốt đơn DH-3001 combo bếp", byId: "e30", at: D("02") },
  ];

  const surveys: Survey[] = [
    { id: "svy-1", code: "KS-2001", leadId: "lead-2", customerId: "cus-3", address: "78 CMT8, Q.10", layout: "L", lengthCm: 320, widthCm: 240, heightCm: 280, currentStatus: "Bếp cũ gạch men, cần thay toàn bộ thiết bị", needs: "Bếp từ, hút mùi, chậu rửa, máy rửa bát", byId: "e30", createdAt: D("15") },
  ];

  const quotes: Quote[] = [
    { id: "qte-1", code: "BG-2003", leadId: "lead-3", tier: "balanced", status: "sent", byId: "e24", createdAt: D("13"), updatedAt: D("14"), sentAt: D("14"), validUntil: D("28"),
      lines: [
        { sku: "MRB-BOSCH-SMS46MI05E", name: "Máy rửa bát Bosch SMS46MI05E", qty: 1, unitPrice: 19500000, discount: 1000000 },
        { sku: "CR-KONOX-KN8048DUB", name: "Chậu rửa Konox KN8048DUB", qty: 1, unitPrice: 4200000 },
      ] },
    { id: "qte-2", code: "BG-2002", leadId: "lead-2", customerId: "cus-3", tier: "premium", status: "draft", byId: "e30", createdAt: D("15"), updatedAt: D("15"), validUntil: D("30"),
      lines: [
        { sku: "BT-BOSCH-PXY875DE3E", name: "Bếp từ Bosch PXY875DE3E", qty: 1, unitPrice: 38900000 },
        { sku: "HM-HAFELE-HH-WVG90B", name: "Hút mùi Hafele HH-WVG90B", qty: 1, unitPrice: 9800000 },
        { sku: "LO-BOSCH-HBA5570S0B", name: "Lò nướng Bosch HBA5570S0B", qty: 1, unitPrice: 21900000 },
      ] },
  ];

  const orders: Order[] = [
    { id: "ord-1", code: "DH-3001", customerId: "cus-1", quoteId: "qte-x", status: "completed", assigneeId: "e30", total: 58900000, paid: 58900000, address: "12 Nguyễn Văn Đậu, Bình Thạnh", deliveryDate: D("05"), createdAt: D("02"), updatedAt: D("05"), confirmedAt: D("02"),
      lines: [
        { sku: "BT-BOSCH-PXY875DE3E", name: "Bếp từ Bosch PXY875DE3E", qty: 1, unitPrice: 38900000 },
        { sku: "LO-BOSCH-HBA5570S0B", name: "Lò nướng Bosch HBA5570S0B", qty: 1, unitPrice: 20000000 },
      ], payments: [{ id: "pay-1", amount: 58900000, method: "transfer", at: D("02") }] },
    { id: "ord-2", code: "DH-3002", customerId: "cus-2", status: "delivering", assigneeId: "e24", total: 21900000, paid: 10000000, address: "45 Phan Xích Long, Phú Nhuận", deliveryDate: D("16"), createdAt: D("09"), updatedAt: D("14"), confirmedAt: D("09"),
      lines: [{ sku: "LO-BOSCH-HBA5570S0B", name: "Lò nướng Bosch HBA5570S0B", qty: 1, unitPrice: 21900000 }],
      payments: [{ id: "pay-2", amount: 10000000, method: "cash", at: D("09") }] },
    { id: "ord-3", code: "DH-3003", customerId: "cus-3", status: "pending", assigneeId: "e30", total: 23700000, paid: 0, address: "78 CMT8, Q.10", createdAt: D("15"), updatedAt: D("15"),
      lines: [
        { sku: "MRB-BOSCH-SMS46MI05E", name: "Máy rửa bát Bosch SMS46MI05E", qty: 1, unitPrice: 19500000 },
        { sku: "CR-KONOX-KN8048DUB", name: "Chậu rửa Konox KN8048DUB", qty: 1, unitPrice: 4200000 },
      ] },
  ];

  const deliveries: DeliveryJob[] = [
    { id: "dlv-1", code: "GL-4001", orderId: "ord-2", customerId: "cus-2", scheduledAt: `${TODAY}T09:00:00.000Z`, address: "45 Phan Xích Long, Phú Nhuận", teamId: "e33", status: "scheduled", note: "Lắp lò âm tủ, KH có nhà sau 9h", createdAt: D("14"), updatedAt: D("14") },
    { id: "dlv-2", code: "GL-4002", orderId: "ord-1", customerId: "cus-1", scheduledAt: D("05"), address: "12 Nguyễn Văn Đậu, Bình Thạnh", teamId: "e33", status: "done", createdAt: D("03"), updatedAt: D("05"), doneAt: D("05") },
  ];

  const warranties: WarrantyTicket[] = [
    { id: "wty-1", code: "BH-5001", customerId: "cus-1", orderId: "ord-1", productName: "Bếp từ Bosch PXY875DE3E", installedAt: "2026-06-05", status: "due", nextCareAt: TODAY, careDone: [1, 7], assigneeId: "e24", createdAt: D("05"), updatedAt: D("13") },
    { id: "wty-2", code: "BH-5002", customerId: "cus-2", orderId: "ord-2", productName: "Lò nướng Bosch HBA5570S0B", installedAt: "2026-06-16", status: "active", nextCareAt: "2026-06-17", careDone: [], assigneeId: "e24", createdAt: D("16"), updatedAt: D("16") },
  ];

  const shiftReports: ShiftReport[] = [
    { id: "shr-1", code: "BC-6001", date: "2026-06-15", shift: "full", byId: "e33", showroom: "Bạch Đằng", revenue: 21900000, orders: 1, leads: 3, visitors: 12, issues: "Máy POS lag buổi chiều", handover: "Còn 2 đơn chờ giao sáng mai", createdAt: D("15") },
  ];

  const tasks: InternalTask[] = [
    { id: "tsk-1", code: "CV-7001", title: "Sửa đèn LED quầy trưng bày bếp từ", type: "incident", category: "showroom", status: "open", priority: "high", assigneeId: "e36", createdById: "e33", dueAt: TODAY, createdAt: D("15"), updatedAt: D("15") },
    { id: "tsk-2", code: "CV-7002", title: "Cập nhật giá Bosch tháng 6 lên website", type: "task", category: "it", status: "doing", priority: "normal", assigneeId: "e19", createdById: "e30", dueAt: "2026-06-18", createdAt: D("14"), updatedAt: D("16") },
    { id: "tsk-3", code: "CV-7003", title: "Chuẩn bị hàng mẫu cho sự kiện cuối tuần", type: "task", category: "ops", status: "open", priority: "urgent", assigneeId: "e33", createdById: "e26", dueAt: TODAY, createdAt: D("16"), updatedAt: D("16") },
  ];

  const npsResponses: NpsResponse[] = [
    { id: "nps-1", customerId: "cus-1", customerName: "Anh Trần Quốc Bảo", score: 10, comment: "Lắp nhanh, tư vấn nhiệt tình", channel: "zalo", orderId: "ord-1", byId: "e24", createdAt: D("06") },
    { id: "nps-2", customerId: "cus-2", customerName: "Chị Nguyễn Thu Hà", score: 8, comment: "Hài lòng, giao hơi trễ chút", channel: "call", orderId: "ord-2", byId: "e24", createdAt: D("14") },
    { id: "nps-3", customerName: "Anh Lê Văn Tâm", score: 6, comment: "Giá hơi cao so với kỳ vọng", channel: "showroom", byId: "e30", createdAt: D("12") },
  ];

  const pillars: ContentPillar[] = [
    { id: "pil-1", name: "Bí quyết gian bếp", desc: "Mẹo nấu ăn, sử dụng thiết bị", color: "#0e9d6e", createdAt: D("01") },
    { id: "pil-2", name: "Review sản phẩm", desc: "Đánh giá bếp từ, hút mùi, lò...", color: "#2b78c5", createdAt: D("01") },
    { id: "pil-3", name: "Khuyến mãi & Sự kiện", desc: "Ưu đãi, mở bán, sự kiện showroom", color: "#9e1b32", createdAt: D("01") },
  ];
  const calendarItems: CalendarItem[] = [
    { id: "cal-1", title: "Review bếp từ Bosch PXY875DE3E", channel: "tiktok", pillarId: "pil-2", status: "published", scheduledAt: D("12"), byId: "e35", createdAt: D("10") },
    { id: "cal-2", title: "5 mẹo vệ sinh máy hút mùi", channel: "facebook", pillarId: "pil-1", status: "in_progress", scheduledAt: D("17"), byId: "e35", createdAt: D("14") },
    { id: "cal-3", title: "Ưu đãi combo bếp tháng 6", channel: "zalo", pillarId: "pil-3", status: "planned", scheduledAt: D("20"), byId: "e34", createdAt: D("15") },
  ];
  const adCampaigns: AdCampaign[] = [
    { id: "ad-1", name: "FB Leads - Combo bếp T6", channel: "facebook", spend: 8000000, leads: 42, clicks: 1300, startAt: D("01"), status: "active", createdAt: D("01") },
    { id: "ad-2", name: "TikTok - Review bếp từ", channel: "tiktok", spend: 5000000, leads: 18, clicks: 900, startAt: D("05"), status: "active", createdAt: D("05") },
    { id: "ad-3", name: "Google - Máy rửa bát", channel: "google", spend: 6000000, leads: 12, clicks: 400, startAt: D("03"), endAt: D("13"), status: "ended", createdAt: D("03") },
  ];
  const purchaseOrders: PurchaseOrder[] = [
    { id: "po-1", code: "PO-9001", supplierName: "NPP Bosch Việt Nam", status: "ordered", total: 180000000, expectedAt: D("20"), byId: "e33", createdAt: D("10"), updatedAt: D("12"),
      items: [
        { name: "Bếp từ Bosch PXY875DE3E", sku: "BT-BOSCH-PXY875DE3E", qty: 5, unitCost: 30000000 },
        { name: "Lò nướng Bosch HBA5570S0B", sku: "LO-BOSCH-HBA5570S0B", qty: 3, unitCost: 10000000 },
      ] },
    { id: "po-2", code: "PO-9002", supplierName: "Hafele HCM", status: "received", total: 49000000, expectedAt: D("08"), byId: "e33", createdAt: D("03"), updatedAt: D("08"),
      items: [{ name: "Hút mùi Hafele HH-WVG90B", sku: "HM-HAFELE-HH-WVG90B", qty: 7, unitCost: 7000000 }] },
  ];

  const bankTxns: BankTxn[] = [
    { id: "btx-1", date: "2026-06-02", amount: 58900000, direction: "in", bank: "Techcombank", ref: "FT26060212345", counterparty: "TRAN QUOC BAO", matchedOrderId: "ord-1", note: "Thanh toán DH-3001", createdAt: D("02") },
    { id: "btx-2", date: "2026-06-09", amount: 10000000, direction: "in", bank: "MB Bank", ref: "MB26060998765", counterparty: "NGUYEN THU HA", matchedOrderId: "ord-2", note: "Cọc DH-3002", createdAt: D("09") },
    { id: "btx-3", date: "2026-06-08", amount: 49000000, direction: "out", bank: "Techcombank", ref: "FT26060888888", counterparty: "HAFELE HCM", note: "Thanh toán PO-9002", createdAt: D("08") },
    { id: "btx-4", date: "2026-06-15", amount: 5000000, direction: "in", bank: "Techcombank", ref: "FT26061556789", counterparty: "KHACH LE", note: "Chưa khớp đơn", createdAt: D("15") },
  ];
  const reviews: Review[] = [
    { id: "rev-1", customerName: "Anh Trần Quốc Bảo", channel: "google", rating: 5, content: "Tư vấn nhiệt tình, lắp đặt chuyên nghiệp", status: "responded", response: "Cảm ơn anh đã tin tưởng BNB!", orderId: "ord-1", byId: "e24", createdAt: D("07") },
    { id: "rev-2", customerName: "Chị Nguyễn Thu Hà", channel: "facebook", rating: 4, content: "Sản phẩm tốt, giao hơi chậm", status: "new", createdAt: D("14") },
    { id: "rev-3", customerName: "Khách ẩn danh", channel: "shopee", rating: 2, content: "Đóng gói chưa kỹ", status: "flagged", createdAt: D("13") },
  ];

  const zaloConversations: ZaloConversation[] = [
    { id: "zconv-1", zaloUserId: "zu-1001", name: "Anh Trần Quốc Bảo", phone: "0903123456", customerId: "cus-1", status: "open", assigneeId: "e24", lastText: "Bếp lắp xong rồi, cảm ơn shop nhé!", lastDirection: "in", lastAt: D("15"), unread: 1, createdAt: D("10"), updatedAt: D("15") },
    { id: "zconv-2", zaloUserId: "zu-1002", name: "Chị Phương Anh", phone: "0912988777", status: "pending", lastText: "Cho mình hỏi bếp từ Bosch còn hàng không ạ?", lastDirection: "in", lastAt: D("16"), unread: 2, createdAt: D("16"), updatedAt: D("16") },
    { id: "zconv-3", zaloUserId: "zu-1003", name: "Anh Minh Hoàng", status: "closed", lastText: "Dạ em cảm ơn anh đã quan tâm BNB ạ.", lastDirection: "out", lastAt: D("13"), unread: 0, assigneeId: "e30", createdAt: D("11"), updatedAt: D("13") },
  ];
  const zaloMessages: ZaloMessage[] = [
    { id: "zmsg-1", conversationId: "zconv-1", direction: "in", text: "Chào shop, mình đặt bếp tuần trước đã lắp chưa ạ?", at: D("10") },
    { id: "zmsg-2", conversationId: "zconv-1", direction: "out", text: "Dạ kỹ thuật sẽ qua lắp chiều nay anh nhé!", byId: "e24", at: D("10") },
    { id: "zmsg-3", conversationId: "zconv-1", direction: "in", text: "Bếp lắp xong rồi, cảm ơn shop nhé!", at: D("15") },
    { id: "zmsg-4", conversationId: "zconv-2", direction: "in", text: "Cho mình hỏi bếp từ Bosch còn hàng không ạ?", at: D("16") },
    { id: "zmsg-5", conversationId: "zconv-2", direction: "in", text: "Mình ở Thủ Đức, có ship lắp tận nơi không?", at: D("16") },
    { id: "zmsg-6", conversationId: "zconv-3", direction: "in", text: "Bên mình tư vấn combo bếp giúp em với", at: D("11") },
    { id: "zmsg-7", conversationId: "zconv-3", direction: "out", text: "Dạ em cảm ơn anh đã quan tâm BNB ạ.", byId: "e30", at: D("13") },
  ];

  return {
    leads, customers, activities, surveys, quotes, orders, deliveries, warranties,
    shiftReports, tasks, npsResponses, pillars, calendarItems, adCampaigns, purchaseOrders,
    bankTxns, reviews, zaloConversations, zaloMessages,
    receptionLogs: [],
    shiftCheckins: [],
  };
}
