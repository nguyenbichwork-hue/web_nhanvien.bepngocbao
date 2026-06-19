// Cấu hình điều hướng sidebar BNB — phân hệ nhóm theo lớp kiến trúc.
// `perm`: quyền cần để thấy mục (bỏ trống = luôn hiện khi đã đăng nhập).
//
// ĐÃ TINH GỌN MENU (theo yêu cầu "không quản lý nổi"): các phân hệ ít dùng được
// ẨN KHỎI MENU nhưng GIỮ NGUYÊN code + route (vẫn vào được bằng URL, bật lại dễ).
// Đã ẩn: marketing, inbox, cx, reviews, survey, shift-report, tasks, schedule,
//        leave, overtime, performance, reports, recruit, contracts, benefits,
//        assets, training, rewards.
// Muốn bật lại mục nào → thêm dòng tương ứng vào nhóm bên dưới.
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
      { href: "/customers", label: "Khách hàng 360", icon: "users", perm: "customer.read" },
      { href: "/fit", label: "Fit Diagnostic", icon: "fit", perm: "fit.read" },
      { href: "https://thietkebep.bepngocbao.vn/", label: "Tư vấn & Báo giá", icon: "quote", perm: "quote.read", external: true },
      { href: "/pos", label: "POS quầy", icon: "wallet", perm: "order.manage" },
      { href: "/orders", label: "Đơn hàng", icon: "cart", perm: "order.read" },
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
    ],
  },
  {
    label: "Nhân sự",
    items: [
      { href: "/employees", label: "Nhân viên", icon: "users", perm: "employee.read" },
      { href: "/payroll", label: "Tính lương", icon: "wallet", perm: "payroll.read" },
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
