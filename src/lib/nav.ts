// Cấu hình điều hướng sidebar BNB — phân hệ nhóm theo lớp kiến trúc.
// `perm`: quyền cần để thấy mục (bỏ trống = luôn hiện khi đã đăng nhập).
export type NavItem = { href: string; label: string; icon: string; perm?: string };
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
      { href: "/customers", label: "Khách hàng 360", icon: "users", perm: "customer.read" },
      { href: "/cx", label: "CX · Hành trình & NPS", icon: "award", perm: "cx.read" },
      { href: "/reviews", label: "Đánh giá", icon: "chat", perm: "review.read" },
      { href: "/fit", label: "Fit Diagnostic", icon: "fit", perm: "fit.read" },
      { href: "/design", label: "Thiết kế bếp AI", icon: "sparkle", perm: "design.read" },
      { href: "/survey", label: "Khảo sát nhà khách", icon: "survey", perm: "survey.read" },
      { href: "/quote", label: "Tư vấn & Báo giá", icon: "quote", perm: "quote.read" },
      { href: "/pos", label: "POS quầy", icon: "wallet", perm: "order.manage" },
      { href: "/orders", label: "Đơn hàng", icon: "cart", perm: "order.read" },
    ],
  },
  {
    label: "Marketing & Kho",
    items: [
      { href: "/marketing", label: "Marketing", icon: "chart", perm: "marketing.read" },
      { href: "/inventory", label: "Tồn kho", icon: "box", perm: "order.read" },
      { href: "/purchase", label: "Nhập hàng (PO)", icon: "truck", perm: "purchase.read" },
    ],
  },
  {
    label: "Hiện trường & Hậu mãi",
    items: [
      { href: "/delivery", label: "Giao – Lắp đặt", icon: "truck", perm: "delivery.read" },
      { href: "/warranty", label: "Bảo hành & Hậu mãi", icon: "warranty", perm: "warranty.read" },
      { href: "/shift-report", label: "Báo cáo ca", icon: "handover", perm: "shiftreport.read" },
      { href: "/tasks", label: "Việc nội bộ & Sự cố", icon: "alert", perm: "task.read" },
    ],
  },
  {
    label: "Nhân sự",
    items: [
      { href: "/employees", label: "Nhân viên", icon: "users", perm: "employee.read" },
      { href: "/schedule", label: "Ca làm việc", icon: "clock", perm: "schedule.read" },
      { href: "/leave", label: "Nghỉ phép", icon: "calendar", perm: "leave.read" },
      { href: "/overtime", label: "Làm thêm giờ", icon: "clock", perm: "overtime.read" },
      { href: "/payroll", label: "Tính lương", icon: "wallet", perm: "payroll.read" },
      { href: "/performance", label: "Đánh giá KPI", icon: "target", perm: "performance.read" },
    ],
  },
  {
    label: "Quản trị",
    items: [
      { href: "/admin", label: "Dashboard quản trị", icon: "crown", perm: "bizdash.read" },
      { href: "/finance", label: "Tài chính – Kế toán", icon: "wallet", perm: "finance.read" },
      { href: "/reports", label: "Báo cáo", icon: "chart", perm: "report.read" },
    ],
  },
];
