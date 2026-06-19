// BNB · Kiểu dữ liệu các phân hệ bán hàng & vận hành cửa hàng.
// Lưu theo mô hình JSONB collection (id text + data jsonb) như store HR.
// Badge class dùng đúng hệ design: b-green / b-amber / b-rose / b-indigo / b-sky / b-gray.

export type Badge = "b-green" | "b-amber" | "b-rose" | "b-indigo" | "b-sky" | "b-gray";

/* ============ Lead & CRM ============ */
export type LeadStage = "new" | "consulting" | "quoted" | "won" | "lost";
export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  new: "Mới",
  consulting: "Đang tư vấn",
  quoted: "Đã báo giá",
  won: "Chốt đơn",
  lost: "Đã mất",
};
export const LEAD_STAGE_BADGE: Record<LeadStage, Badge> = {
  new: "b-sky",
  consulting: "b-indigo",
  quoted: "b-amber",
  won: "b-green",
  lost: "b-rose",
};
export const LEAD_STAGES: LeadStage[] = ["new", "consulting", "quoted", "won", "lost"];

export type LeadSource =
  | "website" | "facebook" | "tiktok" | "zalo" | "hotline" | "showroom" | "review" | "referral" | "other";
export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  website: "Website",
  facebook: "Facebook",
  tiktok: "TikTok",
  zalo: "Zalo OA",
  hotline: "Hotline",
  showroom: "Showroom",
  review: "Đánh giá",
  referral: "Giới thiệu",
  other: "Khác",
};
export const LEAD_SOURCES = Object.keys(LEAD_SOURCE_LABEL) as LeadSource[];

export type Lead = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  stage: LeadStage;
  customerId?: string;
  assigneeId?: string;
  need?: string;
  budget?: number;
  address?: string;
  note?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastContactAt?: string;
  nextFollowUpAt?: string;
};

export type Customer = {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  haravanId?: string;
  source?: LeadSource;
  totalSpent?: number;
  orderCount?: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityType = "call" | "zalo" | "meeting" | "survey" | "quote" | "order" | "stage" | "note";
export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  call: "Gọi điện",
  zalo: "Nhắn Zalo",
  meeting: "Gặp mặt",
  survey: "Khảo sát",
  quote: "Báo giá",
  order: "Đơn hàng",
  stage: "Đổi trạng thái",
  note: "Ghi chú",
};
export type Activity = {
  id: string;
  leadId?: string;
  customerId?: string;
  type: ActivityType;
  content: string;
  byId?: string;
  at: string;
};

/* ============ Khảo sát nhà khách ============ */
export type KitchenLayout = "I" | "L" | "U" | "G" | "island" | "parallel";
export const LAYOUT_LABEL: Record<KitchenLayout, string> = {
  I: "Chữ I (1 vách)",
  L: "Chữ L",
  U: "Chữ U",
  G: "Chữ G",
  island: "Có đảo bếp",
  parallel: "Song song",
};
export type Survey = {
  id: string;
  code: string;
  leadId?: string;
  customerId?: string;
  address?: string;
  layout?: KitchenLayout;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  currentStatus?: string;
  needs?: string;
  photos?: string[];
  byId?: string;
  note?: string;
  createdAt: string;
};

/* ============ Báo giá ============ */
export type QuoteTier = "basic" | "balanced" | "premium";
export const TIER_LABEL: Record<QuoteTier, string> = {
  basic: "Cơ bản",
  balanced: "Cân bằng",
  premium: "Cao cấp",
};
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";
export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Nháp",
  sent: "Đã gửi",
  accepted: "Đã chốt",
  rejected: "Từ chối",
  expired: "Hết hạn",
};
export const QUOTE_STATUS_BADGE: Record<QuoteStatus, Badge> = {
  draft: "b-gray",
  sent: "b-sky",
  accepted: "b-green",
  rejected: "b-rose",
  expired: "b-amber",
};
export type QuoteLine = {
  sku?: string;
  productId?: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount?: number;
};
export type Quote = {
  id: string;
  code: string;
  customerId?: string;
  leadId?: string;
  tier?: QuoteTier;
  lines: QuoteLine[];
  discount?: number;
  note?: string;
  status: QuoteStatus;
  byId?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  validUntil?: string;
};

/* ============ Đơn hàng ============ */
export type OrderStatus =
  | "pending" | "confirmed" | "paid" | "delivering" | "installing" | "completed" | "cancelled";
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã chốt",
  paid: "Đã thanh toán",
  delivering: "Đang giao",
  installing: "Đang lắp",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};
export const ORDER_STATUS_BADGE: Record<OrderStatus, Badge> = {
  pending: "b-amber",
  confirmed: "b-indigo",
  paid: "b-sky",
  delivering: "b-sky",
  installing: "b-indigo",
  completed: "b-green",
  cancelled: "b-rose",
};
export const ORDER_FLOW: OrderStatus[] = ["pending", "confirmed", "paid", "delivering", "installing", "completed"];
export type PaymentMethod = "cash" | "transfer" | "card" | "cod";
export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  card: "Thẻ",
  cod: "COD",
};
export type Payment = { id: string; amount: number; method: PaymentMethod; at: string; note?: string };
export type Order = {
  id: string;
  code: string;
  customerId?: string;
  quoteId?: string;
  haravanId?: string;
  lines: QuoteLine[];
  total: number;
  paid: number;
  status: OrderStatus;
  assigneeId?: string;
  address?: string;
  deliveryDate?: string;
  payments?: Payment[];
  note?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
};

/* ============ Giao – Lắp đặt ============ */
export type DeliveryStatus = "scheduled" | "enroute" | "installing" | "done" | "failed" | "rescheduled";
export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  scheduled: "Đã xếp lịch",
  enroute: "Đang giao",
  installing: "Đang lắp",
  done: "Nghiệm thu",
  failed: "Thất bại",
  rescheduled: "Dời lịch",
};
export const DELIVERY_STATUS_BADGE: Record<DeliveryStatus, Badge> = {
  scheduled: "b-sky",
  enroute: "b-amber",
  installing: "b-indigo",
  done: "b-green",
  failed: "b-rose",
  rescheduled: "b-amber",
};
export type DeliveryJob = {
  id: string;
  code: string;
  orderId?: string;
  customerId?: string;
  scheduledAt: string;
  address?: string;
  teamId?: string;
  status: DeliveryStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
  doneAt?: string;
};

/* ============ Bảo hành & Hậu mãi ============ */
export type WarrantyStatus = "active" | "due" | "contacted" | "resolved" | "expired";
export const WARRANTY_STATUS_LABEL: Record<WarrantyStatus, string> = {
  active: "Đang theo dõi",
  due: "Đến hạn chăm sóc",
  contacted: "Đã liên hệ",
  resolved: "Đã xử lý",
  expired: "Hết hạn",
};
export const WARRANTY_STATUS_BADGE: Record<WarrantyStatus, Badge> = {
  active: "b-sky",
  due: "b-amber",
  contacted: "b-indigo",
  resolved: "b-green",
  expired: "b-gray",
};
export const CARE_MILESTONES = [1, 7, 30, 90] as const;
export type WarrantyTicket = {
  id: string;
  code: string;
  customerId?: string;
  orderId?: string;
  productName?: string;
  installedAt?: string;
  status: WarrantyStatus;
  nextCareAt?: string;
  careDone?: number[];
  remindedMilestones?: number[];
  assigneeId?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

/* ============ Báo cáo ca ============ */
export type ShiftKind = "morning" | "afternoon" | "full";
export const SHIFT_LABEL: Record<ShiftKind, string> = {
  morning: "Ca sáng",
  afternoon: "Ca chiều",
  full: "Cả ngày",
};
export type ShiftReport = {
  id: string;
  code: string;
  date: string;
  shift: ShiftKind;
  byId?: string;
  showroom?: string;
  revenue?: number;
  orders?: number;
  leads?: number;
  visitors?: number;
  issues?: string;
  handover?: string;
  createdAt: string;
};

/* ============ Việc nội bộ & Sự cố ============ */
export type TaskStatus = "open" | "doing" | "done" | "cancelled";
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: "Mới",
  doing: "Đang làm",
  done: "Hoàn tất",
  cancelled: "Đã huỷ",
};
export const TASK_STATUS_BADGE: Record<TaskStatus, Badge> = {
  open: "b-sky",
  doing: "b-amber",
  done: "b-green",
  cancelled: "b-gray",
};
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Thấp",
  normal: "Bình thường",
  high: "Cao",
  urgent: "Khẩn",
};
export const PRIORITY_BADGE: Record<TaskPriority, Badge> = {
  low: "b-gray",
  normal: "b-sky",
  high: "b-amber",
  urgent: "b-rose",
};
export type TaskCategory = "ops" | "it" | "showroom" | "other";
export const TASK_CAT_LABEL: Record<TaskCategory, string> = {
  ops: "Vận hành",
  it: "IT",
  showroom: "Showroom",
  other: "Khác",
};
export type InternalTask = {
  id: string;
  code: string;
  title: string;
  detail?: string;
  type: "task" | "incident";
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  createdById?: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
  doneAt?: string;
};

/* ============ CX · NPS ============ */
export type NpsCategory = "promoter" | "passive" | "detractor";
export const NPS_LABEL: Record<NpsCategory, string> = {
  promoter: "Khuyến nghị (9–10)",
  passive: "Trung lập (7–8)",
  detractor: "Không hài lòng (0–6)",
};
export const NPS_BADGE: Record<NpsCategory, Badge> = {
  promoter: "b-green",
  passive: "b-amber",
  detractor: "b-rose",
};
export const npsCategory = (score: number): NpsCategory =>
  score >= 9 ? "promoter" : score >= 7 ? "passive" : "detractor";

export type NpsChannel = "zalo" | "call" | "email" | "showroom" | "web";
export const NPS_CHANNEL_LABEL: Record<NpsChannel, string> = {
  zalo: "Zalo", call: "Gọi điện", email: "Email", showroom: "Showroom", web: "Web",
};
export type NpsResponse = {
  id: string;
  customerId?: string;
  customerName: string;
  score: number; // 0..10
  comment?: string;
  channel?: NpsChannel;
  orderId?: string;
  byId?: string;
  createdAt: string;
};

/* ============ Marketing ============ */
export type MktChannel = "facebook" | "tiktok" | "zalo" | "google" | "website" | "email" | "other";
export const MKT_CHANNEL_LABEL: Record<MktChannel, string> = {
  facebook: "Facebook", tiktok: "TikTok", zalo: "Zalo", google: "Google Ads",
  website: "Website", email: "Email", other: "Khác",
};
export const MKT_CHANNELS = Object.keys(MKT_CHANNEL_LABEL) as MktChannel[];

export type ContentStatus = "planned" | "in_progress" | "published" | "cancelled";
export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  planned: "Lên lịch", in_progress: "Đang làm", published: "Đã đăng", cancelled: "Huỷ",
};
export const CONTENT_STATUS_BADGE: Record<ContentStatus, Badge> = {
  planned: "b-sky", in_progress: "b-amber", published: "b-green", cancelled: "b-gray",
};

export type ContentPillar = { id: string; name: string; desc?: string; color?: string; createdAt: string };

export type CalendarItem = {
  id: string;
  title: string;
  channel: MktChannel;
  pillarId?: string;
  status: ContentStatus;
  scheduledAt: string;
  byId?: string;
  note?: string;
  createdAt: string;
};

export type AdStatus = "active" | "paused" | "ended";
export const AD_STATUS_LABEL: Record<AdStatus, string> = { active: "Đang chạy", paused: "Tạm dừng", ended: "Kết thúc" };
export const AD_STATUS_BADGE: Record<AdStatus, Badge> = { active: "b-green", paused: "b-amber", ended: "b-gray" };
export type AdCampaign = {
  id: string;
  name: string;
  channel: MktChannel;
  spend: number;
  leads: number;
  clicks?: number;
  startAt?: string;
  endAt?: string;
  status: AdStatus;
  createdAt: string;
};

/* ============ Mua hàng / Nhập kho (PO) ============ */
export type POStatus = "draft" | "ordered" | "received" | "cancelled";
export const PO_STATUS_LABEL: Record<POStatus, string> = {
  draft: "Nháp", ordered: "Đã đặt", received: "Đã nhận", cancelled: "Huỷ",
};
export const PO_STATUS_BADGE: Record<POStatus, Badge> = {
  draft: "b-gray", ordered: "b-amber", received: "b-green", cancelled: "b-rose",
};
export type POItem = { name: string; sku?: string; qty: number; unitCost: number };
export type PurchaseOrder = {
  id: string;
  code: string;
  supplierName: string;
  items: POItem[];
  total: number;
  status: POStatus;
  expectedAt?: string;
  note?: string;
  byId?: string;
  createdAt: string;
  updatedAt: string;
};

/* ============ Tài chính · Ngân hàng ============ */
export type TxnDirection = "in" | "out";
export const TXN_DIR_LABEL: Record<TxnDirection, string> = { in: "Tiền vào", out: "Tiền ra" };
export type BankTxn = {
  id: string;
  date: string;
  amount: number;
  direction: TxnDirection;
  bank?: string;
  ref?: string;
  counterparty?: string;
  matchedOrderId?: string;
  note?: string;
  createdAt: string;
};

/* ============ Đánh giá (Reviews) ============ */
export type ReviewChannel = "google" | "facebook" | "shopee" | "lazada" | "zalo" | "web" | "showroom";
export const REVIEW_CHANNEL_LABEL: Record<ReviewChannel, string> = {
  google: "Google", facebook: "Facebook", shopee: "Shopee", lazada: "Lazada",
  zalo: "Zalo", web: "Website", showroom: "Showroom",
};
export const REVIEW_CHANNELS = Object.keys(REVIEW_CHANNEL_LABEL) as ReviewChannel[];
export type ReviewStatus = "new" | "responded" | "flagged";
export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  new: "Mới", responded: "Đã phản hồi", flagged: "Cần xử lý",
};
export const REVIEW_STATUS_BADGE: Record<ReviewStatus, Badge> = {
  new: "b-sky", responded: "b-green", flagged: "b-rose",
};
export type Review = {
  id: string;
  customerName: string;
  channel: ReviewChannel;
  rating: number; // 1..5
  content?: string;
  status: ReviewStatus;
  response?: string;
  orderId?: string;
  byId?: string;
  createdAt: string;
};

/* ============ Zalo OA · Hộp thoại tin nhắn ============ */
export type ZaloMsgDirection = "in" | "out";
export type ZaloConvStatus = "open" | "pending" | "closed";
export const ZALO_CONV_STATUS_LABEL: Record<ZaloConvStatus, string> = {
  open: "Đang mở",
  pending: "Chờ xử lý",
  closed: "Đã đóng",
};
export const ZALO_CONV_STATUS_BADGE: Record<ZaloConvStatus, Badge> = {
  open: "b-green",
  pending: "b-amber",
  closed: "b-gray",
};
/** Một tin nhắn trong hội thoại Zalo OA (vào: khách gửi, ra: OA trả lời). */
export type ZaloMessage = {
  id: string;
  conversationId: string;
  direction: ZaloMsgDirection;
  text: string;
  msgId?: string;       // id tin từ Zalo (chống trùng webhook)
  byId?: string;        // nhân viên gửi (tin ra)
  at: string;
};
/** Một hội thoại với 1 người dùng Zalo (định danh bằng user_id của OA). */
export type ZaloConversation = {
  id: string;
  zaloUserId: string;
  name: string;
  avatar?: string;
  phone?: string;
  customerId?: string;
  leadId?: string;
  status: ZaloConvStatus;
  assigneeId?: string;
  lastText?: string;
  lastDirection?: ZaloMsgDirection;
  lastAt?: string;
  unread?: number;
  createdAt: string;
  updatedAt: string;
};

/* ============ Sản phẩm (cache Haravan) ============ */
export type Product = {
  id: string;
  haravanId?: string;
  sku?: string;
  name: string;
  brand?: string;
  category?: string;
  price: number;
  compareAtPrice?: number;
  image?: string;
  available?: boolean;
  stock?: number;
  tags?: string[];
};

/* ============ Nhật ký tiếp khách (tích hợp từ app nhân viên) ============
   Mỗi lượt tiếp khách: thông tin cơ bản + "Hành trình khách hàng" 14 mục + chi tiết
   đơn (chỉ khi chốt). Lưu dạng chuỗi cho khớp dữ liệu sheet gốc. */
export const RECEPTION_CANVAS = [
  { k: "customer", icon: "👤", title: "Khách là ai?", opts: ["Cặp vợ chồng trẻ", "Gia đình có con nhỏ", "Chị nội trợ", "Anh chủ nhà", "Khách đầu tư/cho thuê", "Khách lớn tuổi"] },
  { k: "khachxem", icon: "👀", title: "Khách xem", opts: ["bếp từ", "hút mùi", "lò nướng", "lò hấp", "máy rửa chén (mrc)", "tủ lạnh", "máy xay sinh tố", "máy lọc nước"] },
  { k: "khachhoi", icon: "💬", title: "Khách hỏi về", opts: ["công suất", "giá và khuyến mãi", "kích thước lắp đặt", "sự khác nhau series 6 và 8", "chức năng & công nghệ", "xuất xứ", "chế độ bảo hành", "bếp mặt nghiêng và bếp âm", "đường ống/ống thoát"] },
  { k: "nvtuvan", icon: "🗣️", title: "Nhân viên đã tư vấn", opts: ["tư vấn chức năng công nghệ", "tư vấn công suất và kích thước", "tư vấn giá kèm voucher/khuyến mãi", "so sánh series 6 và 8 cho khách", "demo sản phẩm cho khách", "hướng dẫn kích thước & đường ống lắp đặt", "cho khách dùng thử", "xin contact gửi báo giá/PDF"] },
  { k: "trigger", icon: "💡", title: "Vì sao khách bắt đầu tìm giải pháp?", opts: ["Xây nhà mới", "Cải tạo bếp", "Chuyển nhà", "Bếp cũ hỏng", "Nâng cấp thiết bị"] },
  { k: "whynow", icon: "⏰", title: "Vì sao mua vào thời điểm này?", opts: ["Vừa nhận nhà", "Sắp bàn giao", "Chuẩn bị cưới", "Hết đợt khuyến mãi", "Sắp có em bé", "Cuối năm/Tết"] },
  { k: "need", icon: "📋", title: "3 nhu cầu lớn nhất?", opts: ["Tiết kiệm thời gian", "An toàn", "Thẩm mỹ", "Dễ vệ sinh", "Tiết kiệm điện", "Bền, ít hỏng", "Thương hiệu uy tín"] },
  { k: "influencer", icon: "👥", title: "Ai ảnh hưởng mạnh nhất?", opts: ["Vợ", "Chồng", "KTS", "Nhà thầu", "Bạn bè", "Người thân", "Con cái"] },
  { k: "solution", icon: "📦", title: "BNB đề xuất giải pháp gì?", opts: ["Bếp từ Bosch + máy rửa chén", "Combo Kaff", "Giải pháp full kitchen", "Hút mùi + bếp", "Lò nướng + lò hấp"] },
  { k: "objection", icon: "❓", title: "Khách đắn đo điều gì nhất?", opts: ["Giá", "Bảo hành", "Kích thước", "Thương hiệu", "Phù hợp không gian", "Lắp đặt", "So với hãng khác"] },
  { k: "whybuy", icon: "❤️", title: "Vì sao khách chọn BNB?", opts: ["Tư vấn kỹ", "Giá tốt", "Trải nghiệm showroom", "48H Promise", "Hàng chính hãng", "Hậu mãi tốt"] },
  { k: "whynotbuy", icon: "✖️", title: "Nếu không mua, vì sao?", opts: ["Giá cao", "Chưa quyết định", "Nhà chưa xong", "Đợi so sánh", "Hỏi ý kiến gia đình", "Chưa cần gấp"] },
  { k: "trust", icon: "🛡️", title: "Khoảnh khắc nào tạo niềm tin?", opts: ["Gặp Phú", "Trải nghiệm showroom", "Đề xuất giải pháp", "Feedback KH cũ", "Tốc độ phản hồi", "Demo sản phẩm"] },
  { k: "decision", icon: "📝", title: "Khách quyết định như thế nào?", opts: ["Chốt ngay", "Về bàn với gia đình", "So sánh thêm", "Đợi cuối tuần", "Cần thêm báo giá", "Đặt cọc giữ hàng"] },
] as const;

export type ReceptionCanvasKey = (typeof RECEPTION_CANVAS)[number]["k"];

export type ReceptionLog = {
  id: string;
  createdAt: string;
  ngay?: string; gio?: string; nhanvien?: string; sdt?: string; nguon?: string;
  donhang?: string; ngaychot?: string; tongtg?: string;
  masp?: string; tensp?: string; cat?: string; soluong?: string; sotien?: string; datcoc?: string;
  customer?: string; khachxem?: string; khachhoi?: string; nvtuvan?: string; trigger?: string;
  whynow?: string; need?: string; influencer?: string; solution?: string; objection?: string;
  whybuy?: string; whynotbuy?: string; trust?: string; decision?: string;
};

export const RECEPTION_STAFF_DEFAULT = ["Đào Kế Thịnh", "Lê Huỳnh Hiếu", "Bùi Khương Duy", "Cát An"];
export const RECEPTION_SOURCE_DEFAULT = ["Khách văng lai", "Cư dân Royal City", "Kiến trúc sư"];

/* ============ Báo cáo ca (check-in chụp ảnh — tích hợp từ app chamcongbnb) ============
   Ảnh + thông báo Telegram VẪN đi qua Apps Script cũ → Drive (bot nguyên); app chỉ
   lưu METADATA có cấu trúc vào Supabase (không lưu base64 ảnh). */
export type ShiftCheckin = {
  id: string;
  createdAt: string;
  showroom?: string;
  employee?: string;
  shift?: "open" | "close";
  shiftLabel?: string;
  address?: string;
  lat?: number;
  lng?: number;
  note?: string;
  photoCount?: number;
  photoLabels?: string[];
  sentToServer?: boolean; // đã gửi ảnh lên Apps Script/Drive thành công chưa
};

/* ============ Hành trình khách hàng CX OS (13 bước / 3 phase) ============ */
export type JourneyPhase = "acquisition" | "success" | "expansion";
export type JourneyStageKey =
  | "trigger" | "discovery" | "trust" | "consultation" | "decision"
  | "order_confirmed" | "pre_install" | "installation" | "handover" | "first7days"
  | "review" | "referral" | "community";

export const CX_PHASE_LABEL: Record<JourneyPhase, string> = {
  acquisition: "Thu hút (Acquisition)",
  success: "Thành công (Success)",
  expansion: "Mở rộng (Expansion)",
};

// owner: vai trò CX phụ trách bước (Growth / Business / CX Lead; Trust đồng sở hữu)
export const CX_JOURNEY_STAGES: {
  key: JourneyStageKey; no: number; label: string; phase: JourneyPhase; owner: string; desc: string;
}[] = [
  { key: "trigger", no: 1, label: "Trigger", phase: "acquisition", owner: "Growth Lead", desc: "Khách bắt đầu có nhu cầu (xây mới/cải tạo/nhận nhà)" },
  { key: "discovery", no: 2, label: "Discovery", phase: "acquisition", owner: "Growth Lead", desc: "Khách tìm hiểu & khám phá BNB" },
  { key: "trust", no: 3, label: "Trust", phase: "acquisition", owner: "Growth + Business", desc: "Khách tin tưởng & chọn BNB (đồng sở hữu)" },
  { key: "consultation", no: 4, label: "Consultation", phase: "acquisition", owner: "Business Lead", desc: "Tư vấn sâu & chốt giải pháp + báo giá" },
  { key: "decision", no: 5, label: "Decision", phase: "acquisition", owner: "Business Lead", desc: "Đặt cọc / ký hợp đồng" },
  { key: "order_confirmed", no: 6, label: "Order Confirmed", phase: "success", owner: "Business Lead", desc: "Xác nhận đơn < 2h, cam kết rõ ràng" },
  { key: "pre_install", no: 7, label: "Pre-installation", phase: "success", owner: "CX Lead", desc: "Khảo sát, chuẩn bị, xác nhận lịch trước 24h" },
  { key: "installation", no: 8, label: "Installation (48H)", phase: "success", owner: "CX Lead", desc: "Lắp đặt đúng cam kết 48H, đúng kỹ thuật" },
  { key: "handover", no: 9, label: "Handover", phase: "success", owner: "CX Lead", desc: "Nghiệm thu 21 điểm, bàn giao, kích hoạt bảo hành" },
  { key: "first7days", no: 10, label: "First 7 Days", phase: "success", owner: "CX Lead", desc: "Check-in ngày 1–3–7, hỗ trợ < 2h, CSAT" },
  { key: "review", no: 11, label: "Review", phase: "expansion", owner: "CX Lead", desc: "Mời review sau 3–7 ngày (Google/FB), thu ảnh thật" },
  { key: "referral", no: 12, label: "Referral", phase: "expansion", owner: "Growth Lead", desc: "Giới thiệu người thân, theo dõi referral → đơn" },
  { key: "community", no: 13, label: "Community", phase: "expansion", owner: "Growth Lead", desc: "Hội viên VIP, workshop, mua lại / nâng cấp" },
];

export type CxJourney = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  phone?: string;
  customerId?: string;
  leadId?: string;
  stage: JourneyStageKey;
  ownerId?: string;        // id nhân viên phụ trách (tuỳ chọn)
  blocker?: string;        // vướng mắc đang chặn
  nextFollowUpAt?: string; // yyyy-mm-dd — mốc cần follow-up
  readyReferral?: boolean; // đã sẵn sàng giới thiệu
  note?: string;
  history: { stage: JourneyStageKey; at: string; byId?: string }[];
  slaDone?: string[];      // các mốc SLA đã được cron đẩy thành follow-up (chống lặp)
};
