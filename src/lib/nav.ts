// Cấu hình điều hướng sidebar BNB — phân hệ nhóm theo lớp kiến trúc.
// `perm`: quyền cần để thấy mục (bỏ trống = luôn hiện khi đã đăng nhập).
//
// CẬP NHẬT (yêu cầu sếp):
//  - HIỆN đầy đủ các phân hệ vận hành/bán hàng để các sếp test: Thiết kế bếp AI,
//    Khảo sát nhà khách, Hộp thoại Zalo OA, CX · NPS, Việc nội bộ & Sự cố,
//    Marketing, Đánh giá.
//  - BỎ toàn bộ nhóm NHÂN SỰ (Nhân viên, Tính lương, lịch, nghỉ phép, OT, KPI,
//    tuyển dụng, hợp đồng, phúc lợi, tài sản, đào tạo, khen thưởng, báo cáo HR…)
//    khỏi menu — nhân sự đã được quản lý bằng hệ thống HRM khác. Code/route vẫn
//    còn (vào được qua URL nếu cần), chỉ ẩn khỏi menu.
export type NavItem = { href: string; label: string; icon: string; perm?: string; external?: boolean };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Hằng ngày",
    items: [
      { href: "/dashboard", label: "Hôm nay", icon: "today" },
    ],
  },
  {
    label: "Bán hàng",
    items: [
      { href: "/crm", label: "Khách hàng & Lead", icon: "customer", perm: "lead.read" },
      { href: "/journey", label: "Hành trình CX", icon: "award", perm: "lead.read" },
      { href: "/cx", label: "CX · NPS", icon: "award", perm: "cx.read" },
      { href: "/referral", label: "Giới thiệu (Referral)", icon: "users", perm: "lead.read" },
      { href: "/reception", label: "Nhật ký tiếp khách", icon: "doc", perm: "lead.read" },
      { href: "/customers", label: "Khách hàng 360", icon: "users", perm: "customer.read" },
      { href: "/fit", label: "Fit Diagnostic", icon: "fit", perm: "fit.read" },
      { href: "/design", label: "Thiết kế bếp AI", icon: "sparkle", perm: "design.read" },
      { href: "/survey", label: "Khảo sát nhà khách", icon: "survey", perm: "survey.read" },
      { href: "/inbox", label: "Hộp thoại Zalo OA", icon: "chat", perm: "inbox.read" },
      { href: "https://thietkebep.bepngocbao.vn/", label: "Tư vấn & Báo giá", icon: "quote", perm: "quote.read", external: true },
      { href: "/pos", label: "POS quầy", icon: "wallet", perm: "order.manage" },
      { href: "/orders", label: "Đơn hàng", icon: "cart", perm: "order.read" },
    ],
  },
  {
    label: "Tìm nguồn (RMS)",
    items: [
      { href: "/sourcing", label: "Tìm nguồn & So giá", icon: "search", perm: "quote.read" },
      { href: "/sourcing/catalog", label: "Quản lý SP & giá", icon: "edit", perm: "quote.manage" },
      { href: "/sourcing/update", label: "Cập nhật giá tuần", icon: "download", perm: "quote.manage" },
      { href: "/sourcing/market", label: "Giá thị trường (cào web)", icon: "search", perm: "quote.read" },
      { href: "/sourcing/gia-agent", label: "Giá thị trường (Agent local)", icon: "download", perm: "quote.read" },
      { href: "/sourcing/suppliers", label: "Nhà cung cấp", icon: "truck", perm: "quote.read" },
    ],
  },
  {
    label: "Thiết kế bếp (Web tư vấn)",
    items: [
      { href: "/tkb", label: "Quản trị Thiết kế bếp", icon: "sparkle", perm: "tkb.read" },
      { href: "/tkb/products", label: "Sản phẩm web tư vấn", icon: "box", perm: "tkb.read" },
    ],
  },
  {
    label: "Kho & Mua hàng",
    items: [
      { href: "/inventory", label: "Tồn kho", icon: "box", perm: "order.read" },
      { href: "/purchase", label: "Nhập hàng (PO)", icon: "truck", perm: "purchase.read" },
    ],
  },
  {
    label: "Hiện trường & Hậu mãi",
    items: [
      { href: "/delivery", label: "Giao – Lắp đặt", icon: "truck", perm: "delivery.read" },
      { href: "/warranty", label: "Bảo hành & Hậu mãi", icon: "warranty", perm: "warranty.read" },
      { href: "/checkin", label: "Báo cáo ca", icon: "handover", perm: "shiftreport.read" },
      { href: "/tasks", label: "Việc nội bộ & Sự cố", icon: "alert", perm: "task.read" },
    ],
  },
  {
    label: "Marketing & Đánh giá",
    items: [
      { href: "/marketing", label: "Marketing", icon: "sparkle", perm: "marketing.read" },
      { href: "/reviews", label: "Đánh giá", icon: "chat", perm: "review.read" },
    ],
  },
  {
    label: "Quản trị",
    items: [
      { href: "/admin", label: "Dashboard quản trị", icon: "crown", perm: "bizdash.read" },
      { href: "/bi", label: "BI · Phân tích KD", icon: "chart", perm: "bizdash.read" },
      { href: "/finance", label: "Tài chính – Kế toán", icon: "wallet", perm: "finance.read" },
      { href: "/integrations", label: "Tích hợp & Kết nối", icon: "settings", perm: "system.rbac" },
    ],
  },
];
