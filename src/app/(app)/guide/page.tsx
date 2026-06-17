import { Icon } from "@/components/icon";
import {
  MODULE_LABEL,
  PERMISSIONS,
  getGroup,
  getScheduleConfig,
  listEntities,
  listLeaveTypes,
  listPayItems,
  listRoles,
  listShifts,
} from "@/lib/org/store";
import {
  CANDIDATE_STAGE_BADGE,
  CANDIDATE_STAGE_LABEL,
  EMPLOYEE_STATUS_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  LEAVE_STATUS_BADGE,
  LEAVE_STATUS_LABEL,
  OPENING_STATUS_BADGE,
  OPENING_STATUS_LABEL,
  PIPELINE_STAGES,
  REVIEW_STATUS_BADGE,
  REVIEW_STATUS_LABEL,
  PAY_ITEM_KIND_BADGE,
  PAY_ITEM_KIND_LABEL,
  SCHEDULE_KIND_BADGE,
  SCHEDULE_KIND_LABEL,
  SCOPE_LABEL,
  type CandidateStage,
  type EmployeeStatus,
  type LeaveStatus,
  type OpeningStatus,
  type ReviewStatus,
  type ScheduleKind,
  type ScopeType,
} from "@/lib/org/types";
import {
  CAP_BHXH_BHYT,
  INSURANCE_RATE,
  PIT_BRACKETS,
  PIT_DEPENDENT_DEDUCTION,
  PIT_SELF_DEDUCTION,
  REGION_MIN_WAGE,
} from "@/lib/payroll/config";
import { formatVND } from "@/lib/payroll/calc";
import {
  AD_STATUS_BADGE,
  AD_STATUS_LABEL,
  CARE_MILESTONES,
  CONTENT_STATUS_BADGE,
  CONTENT_STATUS_LABEL,
  DELIVERY_STATUS_BADGE,
  DELIVERY_STATUS_LABEL,
  LAYOUT_LABEL,
  MKT_CHANNEL_LABEL,
  MKT_CHANNELS,
  LEAD_SOURCE_LABEL,
  LEAD_STAGE_BADGE,
  LEAD_STAGE_LABEL,
  LEAD_STAGES,
  ORDER_FLOW,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  PAYMENT_LABEL,
  PO_STATUS_BADGE,
  PO_STATUS_LABEL,
  PRIORITY_BADGE,
  PRIORITY_LABEL,
  QUOTE_STATUS_BADGE,
  QUOTE_STATUS_LABEL,
  REVIEW_CHANNEL_LABEL,
  REVIEW_CHANNELS,
  REVIEW_STATUS_LABEL as BNB_REVIEW_STATUS_LABEL,
  REVIEW_STATUS_BADGE as BNB_REVIEW_STATUS_BADGE,
  TXN_DIR_LABEL,
  SHIFT_LABEL,
  TASK_STATUS_BADGE,
  TASK_STATUS_LABEL,
  TIER_LABEL,
  WARRANTY_STATUS_BADGE,
  WARRANTY_STATUS_LABEL,
  ZALO_CONV_STATUS_LABEL,
  type DeliveryStatus,
  type KitchenLayout,
  type LeadSource,
  type OrderStatus,
  type PaymentMethod,
  type POStatus,
  type QuoteStatus,
  type ReviewChannel,
  type ReviewStatus as BNBReviewStatus,
  type ShiftKind,
  type TaskPriority,
  type TaskStatus,
  type TxnDirection,
  type WarrantyStatus,
  type AdStatus,
  type ContentStatus,
} from "@/lib/bnb/types";

// ---- Thành phần phụ trợ ----
function Section({
  id,
  icon,
  title,
  routes,
  purpose,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  routes: string;
  purpose: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ scrollMarginTop: 20, marginBottom: 18 }}>
      <div className="card hover">
        <div className="card-h">
          <div className="flex aic" style={{ gap: 12 }}>
            <div className="ic" style={{ width: 38, height: 38 }}>
              <Icon name={icon} />
            </div>
            <div>
              <h3>{title}</h3>
              <div className="sub" style={{ fontFamily: "monospace" }}>{routes}</div>
            </div>
          </div>
        </div>
        <p style={{ marginTop: 0 }}>
          <b>Mục đích.</b> {purpose}
        </p>
        {children}
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="small" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--tx-soft)", marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Chips({ items }: { items: { label: string; badge?: string }[] }) {
  return (
    <div className="flex gap" style={{ flexWrap: "wrap" }}>
      {items.map((i) => (
        <span key={i.label} className={`badge ${i.badge ?? "b-gray"}`}>{i.label}</span>
      ))}
    </div>
  );
}

const pct = (r: number) => `${(r * 100).toLocaleString("vi-VN")}%`;
const DOW = ["", "T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const ROMAN: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" };

export default async function GuidePage() {
  const [entities, leaveTypes, shifts, config, roles, payItems, group] = await Promise.all([
    listEntities(),
    listLeaveTypes(),
    listShifts(),
    getScheduleConfig(),
    listRoles(),
    listPayItems(),
    getGroup(),
  ]);

  const defaultShift = shifts.find((s) => s.id === config.defaultShiftId);
  const permByModule = new Map<string, typeof PERMISSIONS>();
  for (const p of PERMISSIONS) {
    const arr = permByModule.get(p.module) ?? [];
    arr.push(p);
    permByModule.set(p.module, arr);
  }

  const toc = [
    { id: "overview", icon: "grid", label: "Tổng quan hệ thống" },
    { id: "auth", icon: "shield", label: "Đăng nhập & phân quyền" },
    { id: "account", icon: "key", label: "Tài khoản & mật khẩu" },
    { id: "today", icon: "today", label: "Hôm nay (Dashboard)" },
    { id: "crm", icon: "customer", label: "CRM & Lead" },
    { id: "customers", icon: "users", label: "Khách hàng 360" },
    { id: "inbox", icon: "chat", label: "Hộp thoại Zalo OA" },
    { id: "fit", icon: "fit", label: "Fit Diagnostic" },
    { id: "design", icon: "sparkle", label: "Thiết kế bếp AI" },
    { id: "survey", icon: "survey", label: "Khảo sát nhà khách" },
    { id: "quote", icon: "quote", label: "Tư vấn & Báo giá" },
    { id: "orders", icon: "cart", label: "Đơn hàng" },
    { id: "delivery", icon: "truck", label: "Giao – Lắp đặt" },
    { id: "warranty", icon: "warranty", label: "Bảo hành & Hậu mãi" },
    { id: "reviews", icon: "chat", label: "Đánh giá" },
    { id: "shift-report", icon: "handover", label: "Báo cáo ca & bàn giao" },
    { id: "tasks", icon: "alert", label: "Việc nội bộ & Sự cố" },
    { id: "marketing", icon: "sparkle", label: "Marketing" },
    { id: "purchase", icon: "box", label: "Nhập hàng (PO)" },
    { id: "pos", icon: "cart", label: "POS quầy" },
    { id: "finance", icon: "wallet", label: "Tài chính – Kế toán" },
    { id: "bizdash", icon: "crown", label: "Dashboard quản trị" },
    { id: "bi", icon: "chart", label: "BI · Phân tích kinh doanh" },
    { id: "integrations", icon: "settings", label: "Tích hợp & Kết nối" },
    { id: "dashboard", icon: "grid", label: "Bảng điều khiển (HR)" },
    { id: "employees", icon: "users", label: "Nhân viên" },
    { id: "contracts", icon: "doc", label: "Hợp đồng lao động" },
    { id: "schedule", icon: "clock", label: "Lịch làm việc" },
    { id: "leave", icon: "calendar", label: "Nghỉ phép" },
    { id: "overtime", icon: "clock", label: "Làm thêm giờ" },
    { id: "payroll", icon: "wallet", label: "Tính lương" },
    { id: "payitems", icon: "wallet", label: "Phụ cấp & Khấu trừ" },
    { id: "assets", icon: "box", label: "Tài sản" },
    { id: "recruit", icon: "userplus", label: "Tuyển dụng" },
    { id: "performance", icon: "target", label: "Đánh giá KPI" },
    { id: "training", icon: "cap", label: "Đào tạo" },
    { id: "rewards", icon: "award", label: "Khen thưởng – Kỷ luật" },
    { id: "benefits", icon: "award", label: "Phúc lợi" },
    { id: "reports", icon: "chart", label: "Báo cáo" },
    { id: "notifications", icon: "bell", label: "Thông báo" },
    { id: "settings", icon: "settings", label: "Cài đặt & phân quyền" },
  ];

  // Biểu thuế TNCN — cận dưới mỗi bậc = cận trên bậc trước.
  const brackets = PIT_BRACKETS.map((b, i) => {
    const lower = i === 0 ? 0 : PIT_BRACKETS[i - 1].upTo;
    const range =
      b.upTo === Infinity
        ? `Trên ${formatVND(lower)}`
        : i === 0
          ? `Đến ${formatVND(b.upTo)}`
          : `${formatVND(lower)} – ${formatVND(b.upTo)}`;
    return { range, rate: pct(b.rate) };
  });

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Hướng dẫn
      </div>
      <div className="page-head">
        <div>
          <h1>Hướng dẫn sử dụng Bếp Ngọc Bảo (BNB)</h1>
          <p>Giải thích chức năng, logic và cách dùng từng phân hệ trong hệ thống vận hành cửa hàng.</p>
        </div>
      </div>

      {/* Mục lục */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h"><h3>Mục lục</h3></div>
        <div className="grid-k g-3" style={{ gap: 8 }}>
          {toc.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="flex aic" style={{ gap: 10, padding: "9px 12px", borderRadius: "var(--r-md)", color: "inherit", border: "1px solid var(--line)" }}>
              <Icon name={t.icon} /> <span style={{ fontWeight: 600, fontSize: 13.5 }}>{t.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ===== Tổng quan ===== */}
      <Section
        id="overview"
        icon="grid"
        title="Tổng quan hệ thống"
        routes="Khái niệm dùng chung toàn bộ phân hệ"
        purpose="Bếp Ngọc Bảo (BNB) là hệ thống vận hành cửa hàng — gộp bán hàng, CRM, giao–lắp, hậu mãi và nhân sự — dùng chung cho mọi nhân viên; mỗi người thấy đúng phần việc theo vai trò (Sales, CSKH, Kỹ thuật, Quản lý Showroom, HR, Quản trị…)."
      >
        <Block title="Khái niệm cốt lõi">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Đa pháp nhân:</b> Pháp nhân (công ty, có MST/BHXH/vùng lương riêng) → Phòng ban (dạng cây) → Nhân viên. Dữ liệu tách theo pháp nhân.</li>
            <li><b>Phân quyền (RBAC):</b> mỗi tài khoản gắn <i>Vai trò</i> (tập hợp quyền) + <i>Phạm vi dữ liệu</i>. Chi tiết ở mục <a href="#settings">Cài đặt &amp; phân quyền</a>.</li>
            <li><b>Tích hợp chéo:</b> Hồ sơ NV cấp dữ liệu lương cho <a href="#payroll">Tính lương</a>; đơn nghỉ đã duyệt hiện trên <a href="#schedule">Lịch làm việc</a>; nghỉ không lương trừ vào <a href="#payroll">lương</a>.</li>
            <li><b>Dữ liệu demo:</b> hiện lưu trong bộ nhớ máy chủ (in-memory) — thao tác đầy đủ nhưng <b>mất khi khởi động lại server</b>; sẽ lưu bền khi nối Supabase.</li>
            <li><b>Giao diện:</b> chế độ Sáng/Tối (nút góc trên bên phải); nhiều trang có thanh lọc theo pháp nhân/phòng ban (lọc qua URL nên chia sẻ link là giữ bộ lọc).</li>
          </ul>
        </Block>
        <Block title={`Pháp nhân trong hệ thống (${entities.length})`}>
          <Chips items={entities.map((e) => ({ label: `${e.code} · ${e.name}${e.region ? ` (Vùng ${ROMAN[String(e.region)]})` : ""}`, badge: "b-indigo" }))} />
        </Block>
      </Section>

      {/* ===== Đăng nhập & phân quyền ===== */}
      <Section
        id="auth"
        icon="shield"
        title="Đăng nhập & phân quyền"
        routes="/login · áp dụng cho toàn bộ phân hệ"
        purpose="Mỗi người đăng nhập chỉ thấy đúng phần việc theo CẤP của mình — menu, trang chủ và dữ liệu đều khác nhau. Đây là lớp kiểm soát xuyên suốt hệ thống."
      >
        <Block title="Đăng nhập">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Đăng nhập bằng <b>email + mật khẩu</b>. Sau khi vào, hệ thống tự đưa tới <b>trang chủ phù hợp với cấp</b> của bạn.</li>
            <li><b>Chế độ dev</b> (chưa nối Supabase): trang đăng nhập có sẵn các nút <b>“Đăng nhập nhanh”</b> theo vai trò để xem thử từng cấp; mật khẩu demo dùng chung là <code>123456</code>.</li>
            <li>Khi nối Supabase, đăng nhập/mật khẩu do <b>Supabase Auth</b> quản lý; lớp vai trò–quyền–phạm vi bên dưới giữ nguyên.</li>
            <li><b>Đổi mật khẩu lần đầu:</b> tài khoản do HR cấp sẽ bị <b>buộc đổi mật khẩu</b> ngay lần đăng nhập đầu trước khi vào hệ thống. <b>Quên mật khẩu:</b> link “Quên mật khẩu?” ở trang đăng nhập cho đặt lại qua <b>email + số điện thoại đã đăng ký</b>. Chi tiết ở mục <a href="#account">Tài khoản &amp; mật khẩu</a>.</li>
            <li>Đăng xuất ở nút góc trên bên phải; vào trang không có quyền sẽ được chuyển tới màn “Không có quyền truy cập”.</li>
          </ul>
        </Block>
        <Block title="Bốn cấp giao diện (tier)">
          <table>
            <thead><tr><th>Cấp</th><th>Vai trò tiêu biểu</th><th>Trang chủ &amp; trải nghiệm</th></tr></thead>
            <tbody>
              <tr><td><span className="badge b-rose">Quản trị</span></td><td>ADMIN, BOD</td><td>Toàn quyền (ADMIN có <b>Cài đặt</b> &amp; <b>Vai trò &amp; quyền</b>); BOD xem báo cáo hợp nhất toàn tập đoàn &amp; phê duyệt cấp cao.</td></tr>
              <tr><td><span className="badge b-indigo">Nhân sự</span></td><td>HRG, HR, REC</td><td>Tổng quan tổ chức (HR pháp nhân chỉ thấy pháp nhân mình); quản lý nhân sự, lương, KPI. REC chuyên tuyển dụng.</td></tr>
              <tr><td><span className="badge b-amber">Quản lý</span></td><td>MGR</td><td>Trang <b>“Quản lý đội”</b>: duyệt đơn nghỉ, xếp lịch, xem nhân sự &amp; KPI của phòng mình.</td></tr>
              <tr><td><span className="badge b-green">Nhân viên</span></td><td>EMP</td><td><b>Cổng nhân viên</b> tự phục vụ: lịch của tôi, nghỉ phép, phiếu lương &amp; KPI của bản thân.</td></tr>
            </tbody>
          </table>
        </Block>
        <Block title="Phạm vi dữ liệu (mỗi tài khoản gắn 1 phạm vi)">
          <Chips items={(Object.keys(SCOPE_LABEL) as ScopeType[]).map((s) => ({ label: SCOPE_LABEL[s], badge: "b-amber" }))} />
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: "10px 0 0" }}>
            <li><b>Toàn tập đoàn</b> → thấy mọi pháp nhân. <b>Một pháp nhân</b> → chỉ dữ liệu pháp nhân đó.</li>
            <li><b>Theo phòng ban</b> → chỉ nhân sự/đơn từ phòng (gồm phòng con). <b>Chỉ cá nhân</b> → chỉ dữ liệu của chính mình.</li>
            <li>Phạm vi áp cho cả <b>menu</b>, <b>bảng dữ liệu</b> và <b>thao tác</b>: nút Thêm/Sửa/Xoá/Duyệt chỉ hiện khi có quyền, và mọi thao tác đều được kiểm tra lại ở máy chủ.</li>
          </ul>
        </Block>
        <Block title="Lưu ý">
          <p className="small muted" style={{ margin: 0 }}>
            Danh mục quyền, vai trò và phạm vi chi tiết xem ở mục <a href="#settings">Cài đặt &amp; phân quyền</a> — các bảng đó lấy trực tiếp từ cấu hình hệ thống nên luôn khớp thực tế. Hiện hệ thống có <b>{roles.length}</b> vai trò.
          </p>
        </Block>
      </Section>

      {/* ===== Tài khoản & mật khẩu ===== */}
      <Section id="account" icon="key" title="Tài khoản & mật khẩu" routes="/account · /settings/account · /account/profile · /change-password · /forgot-password"
        purpose="Cấp & bảo mật tài khoản: HR cấp tài khoản cho nhân viên mới, nhân viên tự đổi mật khẩu và cập nhật thông tin cá nhân của mình.">
        <Block title="Cấp tài khoản (chỉ HR trở lên)">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Chỉ người có quyền <b>sửa hồ sơ nhân viên</b> (HR, HR Toàn hệ thống, Quản trị) mới cấp được tài khoản — trong hồ sơ nhân viên, thẻ <b>“Tài khoản đăng nhập”</b>.</li>
            <li>HR cấp tài khoản với <b>mật khẩu tạm</b> (<code>123456</code>) rồi gửi cho nhân viên qua Zalo/Gmail. Tài khoản mới luôn bị <b>buộc đổi mật khẩu</b> ở lần đăng nhập đầu.</li>
            <li>Nếu nhân viên mất mật khẩu, HR bấm <b>“Đặt lại mật khẩu”</b> trong hồ sơ → mật khẩu về tạm &amp; buộc đổi lại.</li>
          </ul>
        </Block>
        <Block title="Nhân viên tự phục vụ (trang Tài khoản của tôi)">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Vào <b>Tài khoản của tôi</b> bằng <b>ảnh đại diện góc trên bên phải</b>, hoặc menu <b>Cài đặt → tab “Tài khoản &amp; Bảo mật”</b> (mục Cài đặt hiển thị cho <b>mọi vai trò</b>): xem email/vai trò/phạm vi, <b>đổi mật khẩu</b>, và mở <b>Hồ sơ của tôi</b>.</li>
            <li><b>Hồ sơ của tôi</b> — nhân viên tự sửa <b>thông tin cá nhân</b>: ảnh chân dung/CCCD, điện thoại, email cá nhân, địa chỉ, số CCCD, số tài khoản &amp; ngân hàng nhận lương.</li>
            <li><b>Bảo vệ quyền lợi 2 bên:</b> lương/thuế/BHXH, trạng thái, pháp nhân, phòng ban, chức danh, vai trò &amp; tài khoản <b>chỉ HR sửa được</b> — nhân viên không tự đổi.</li>
          </ul>
        </Block>
        <Block title="Quên / đổi mật khẩu">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Đổi mật khẩu:</b> Tài khoản của tôi (avatar) <b>hoặc</b> Cài đặt → tab “Tài khoản &amp; Bảo mật” → nhập mật khẩu hiện tại + mật khẩu mới (≥ 6 ký tự). Có sẵn cho <b>mọi phân quyền</b>.</li>
            <li><b>Quên mật khẩu:</b> link ở trang đăng nhập → nhập email + <b>số điện thoại trùng hồ sơ</b> → đặt mật khẩu mới. Vì vậy hãy giữ số điện thoại trên hồ sơ luôn đúng.</li>
            <li>Hiện ở chế độ dev nên xác minh bằng email + SĐT; khi nối Supabase sẽ dùng <b>OTP gửi qua SMS</b> thật.</li>
          </ul>
        </Block>
      </Section>

      {/* ============================================================ */}
      {/* ===== PHÂN HỆ BÁN HÀNG & VẬN HÀNH CỬA HÀNG (BNB) ===== */}
      {/* ============================================================ */}

      {/* ===== Hôm nay ===== */}
      <Section id="today" icon="today" title="Dashboard “Hôm nay”" routes="/dashboard · trang chủ vận hành"
        purpose="Bảng điều hành đầu ngày của showroom — gom việc cần làm hôm nay (lead cần gọi lại, lịch giao–lắp, mốc chăm sóc đến hạn, đơn chờ xử lý) để không bỏ sót khách.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Chỉ số nhanh:</b> lead mới trong ngày, đơn chờ xác nhận, lịch giao–lắp hôm nay, phiếu chăm sóc đến hạn — tổng hợp realtime từ các phân hệ CRM, Đơn hàng, Giao–Lắp và Bảo hành.</li>
            <li><b>Việc cần làm hôm nay:</b> lead có <i>lịch hẹn gọi lại</i> (nextFollowUpAt) rơi vào hôm nay, ticket bảo hành tới mốc chăm sóc, công việc/sự cố đang mở được giao cho bạn.</li>
            <li>Nội dung lọc theo <b>vai trò &amp; phạm vi</b>: Sales thấy lead/đơn của mình, Kỹ thuật thấy lịch giao–lắp, Quản lý Showroom thấy toàn cảnh điểm bán.</li>
          </ul>
        </Block>
        <Block title="Cách dùng">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Mở đầu ca: rà danh sách “việc hôm nay”, bấm thẳng vào từng mục để sang đúng phân hệ xử lý.</li>
            <li>Dùng các nút tắt để tạo nhanh lead, báo giá hoặc phiếu giao–lắp.</li>
          </ul>
        </Block>
      </Section>

      {/* ===== CRM & Lead ===== */}
      <Section id="crm" icon="customer" title="CRM &amp; Lead" routes="/crm · Khách hàng & Lead"
        purpose="Quản lý phễu khách hàng tiềm năng và hồ sơ khách 360 — từ lúc khách để lại thông tin đến khi chốt đơn và chăm sóc lại.">
        <Block title="Phễu 5 trạng thái lead">
          <Chips items={LEAD_STAGES.map((s) => ({ label: LEAD_STAGE_LABEL[s], badge: LEAD_STAGE_BADGE[s] }))} />
          <p className="small muted" style={{ margin: "8px 0 0" }}>
            Lead đi tuần tự qua phễu; “Chốt đơn” chuyển khách sang hồ sơ Khách hàng &amp; sinh đơn hàng, “Đã mất” đóng phễu (kèm lý do).
          </p>
        </Block>
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Lead:</b> mỗi lead có mã, người liên hệ, SĐT/email, nhu cầu, ngân sách, nguồn, người phụ trách (assignee) và <b>lịch hẹn gọi lại</b> để nhắc theo dõi.</li>
            <li><b>Nhật ký chăm sóc (Activity):</b> ghi lại mỗi lần gọi điện, nhắn Zalo, gặp mặt, khảo sát, báo giá, đổi trạng thái — tạo dòng thời gian đầy đủ cho từng khách.</li>
            <li><b>Khách hàng 360:</b> khi chốt, lead lên thành Customer kèm tổng chi tiêu, số đơn, lần mua đầu/cuối — đồng bộ được với Haravan.</li>
          </ul>
        </Block>
        <Block title="Nguồn lead">
          <Chips items={(Object.keys(LEAD_SOURCE_LABEL) as LeadSource[]).map((s) => ({ label: LEAD_SOURCE_LABEL[s], badge: "b-indigo" }))} />
        </Block>
        <Block title="Cách dùng">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Thêm lead (hoặc nhận lead từ kênh đổ về), gán người phụ trách.</li>
            <li>Mỗi lần liên hệ ghi một hoạt động; đặt <b>lịch hẹn gọi lại</b> để hệ thống nhắc ở Dashboard “Hôm nay”.</li>
            <li>Kéo lead qua các bước phễu; chốt đơn để sang <a href="#quote">Báo giá</a> / <a href="#orders">Đơn hàng</a>.</li>
          </ol>
        </Block>
      </Section>

      {/* ===== Khách hàng 360 ===== */}
      <Section id="customers" icon="users" title="Khách hàng 360" routes="/customers · /customers/[id]"
        purpose="Hồ sơ khách hợp nhất — gom mọi dấu vết của một khách (đơn hàng, bảo hành, NPS, lead, khảo sát, hoạt động) về một chỗ để chăm sóc &amp; bán thêm; gồm cả khách đồng bộ từ Haravan.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Danh sách khách:</b> mọi khách hàng (tạo trong hệ thống hoặc <b>đồng bộ từ Haravan</b>), tìm nhanh theo tên/SĐT/mã; sắp theo tổng chi tiêu giảm dần.</li>
            <li><b>KPI:</b> tổng khách hàng, tổng doanh thu (Σ tổng đơn chưa huỷ) và <b>AOV trung bình</b> = doanh thu ÷ tổng số đơn.</li>
            <li><b>Số liệu mỗi khách</b> ưu tiên tính từ đơn thực (số đơn, tổng chi tiêu, đơn gần nhất, AOV = chi tiêu ÷ số đơn); nếu khách chưa có đơn trong hệ thống thì lấy theo trường tổng hợp trên hồ sơ (totalSpent/orderCount từ Haravan).</li>
            <li><b>Hồ sơ 360 (chi tiết khách):</b> gộp <a href="#orders">đơn hàng</a>, <a href="#warranty">bảo hành &amp; mốc chăm sóc</a>, điểm <b>NPS</b> gần nhất, <a href="#crm">lead</a> nguồn, <a href="#survey">khảo sát nhà</a> và <b>dòng thời gian hoạt động</b> (gọi/Zalo/gặp/báo giá…) của riêng khách đó.</li>
            <li>Cần <code>customer.read</code> để xem; <code>customer.manage</code> để tạo/sửa hồ sơ khách.</li>
          </ul>
        </Block>
        <Block title="Cách dùng">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Mở <b>Khách hàng 360</b>, tìm khách theo tên/SĐT → bấm <b>“Hồ sơ 360”</b> để xem toàn cảnh.</li>
            <li>Khách mới sinh ra khi <a href="#crm">chốt lead</a>, tạo đơn, hoặc đồng bộ từ Haravan — không cần nhập tay trùng lặp.</li>
          </ol>
        </Block>
      </Section>

      {/* ===== Hộp thoại Zalo OA ===== */}
      <Section id="inbox" icon="chat" title="Hộp thoại Zalo OA" routes="/inbox · /api/zalo/webhook"
        purpose="Chat hai chiều với khách qua Zalo Official Account ngay trong hệ thống — nhận tin khách gửi, trả lời, gán trạng thái xử lý và liên kết về hồ sơ khách 360.">
        <Block title="Chức năng & logic">
          <ul>
            <li><b>Nhận tin tự động:</b> Zalo đẩy sự kiện <code>user_send_text</code> tới <code>/api/zalo/webhook</code> (xác thực chữ ký bằng <code>ZALO_OA_SECRET_KEY</code>). Khách lạ được tạo hội thoại mới (lấy tên/ảnh qua API hồ sơ OA), tin được chống trùng theo <code>msg_id</code>.</li>
            <li><b>Trả lời:</b> soạn tin → gửi qua Zalo OA Message API (cửa sổ tương tác 7 ngày). Chưa cắm <code>ZALO_OA_ACCESS_TOKEN</code> thì tin chỉ lưu nội bộ (chế độ xem trước).</li>
            <li><b>Trạng thái hội thoại:</b> {Object.values(ZALO_CONV_STATUS_LABEL).join(" · ")}. Tin mới của khách tự mở lại hội thoại đã đóng và tăng số <i>chưa đọc</i>.</li>
            <li><b>Liên kết:</b> hội thoại gắn được <a href="#customers">Khách hàng 360</a> qua <code>customerId</code>; khác với <b>ZNS</b> (tin template chăm sóc tự động ở <a href="#warranty">Bảo hành</a>).</li>
          </ul>
        </Block>
        <Block title="Cách dùng">
          <ol>
            <li>Mở <b>Hộp thoại Zalo</b> ở nhóm Bán hàng → chọn hội thoại bên trái để xem dòng tin.</li>
            <li>Nhập nội dung và bấm <b>Gửi</b>; đổi trạng thái hoặc bấm <b>Đã đọc</b> khi xử lý xong.</li>
            <li>Cấu hình token OA và đăng ký webhook ở mục <a href="#integrations">Tích hợp &amp; Kết nối</a>.</li>
          </ol>
        </Block>
      </Section>

      {/* ===== Fit Diagnostic ===== */}
      <Section id="fit" icon="fit" title="Fit Diagnostic" routes="/fit"
        purpose="Bộ chẩn đoán nhu cầu nhanh giúp Sales tư vấn đúng tầng sản phẩm cho khách — 5 câu hỏi suy ra kịch bản tư vấn và đề xuất gói phù hợp.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>5 câu hỏi</b> ngắn về thói quen nấu, không gian bếp, ngân sách, ưu tiên (thẩm mỹ/công năng) và mức độ sẵn sàng mua.</li>
            <li>Kết quả map vào <b>12 kịch bản tư vấn (KB-01…KB-12)</b> — mỗi kịch bản là một “chân dung khách” với cách tiếp cận, điểm nhấn và lời thoại gợi ý.</li>
            <li>Từ kịch bản, hệ thống đề xuất <b>3 tầng sản phẩm</b>: {Object.values(TIER_LABEL).join(" · ")} — để Sales chào theo khả năng chi của khách.</li>
            <li>Cần quyền <code>fit.read</code> để dùng; <code>fit.manage</code> để chỉnh kịch bản KB.</li>
          </ul>
        </Block>
        <Block title="3 tầng đề xuất">
          <Chips items={Object.values(TIER_LABEL).map((l) => ({ label: l, badge: "b-indigo" }))} />
        </Block>
        <Block title="Cách dùng">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Ngồi cùng khách, trả lời 5 câu → xem kịch bản &amp; 3 tầng gợi ý.</li>
            <li>Dùng gợi ý để sang <a href="#quote">Tư vấn &amp; Báo giá</a> đúng tầng, hoặc <a href="#design">Thiết kế bếp AI</a> để minh hoạ.</li>
          </ol>
        </Block>
      </Section>

      {/* ===== Thiết kế bếp AI ===== */}
      <Section id="design" icon="sparkle" title="Thiết kế bếp AI" routes="/design"
        purpose="Công cụ phác thảo bố trí bếp bằng AI để chốt khách tại chỗ — từ kích thước &amp; kiểu dáng bếp, sinh hình ảnh/ý tưởng minh hoạ kèm gợi ý sản phẩm.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Nhập <b>kiểu bố trí bếp</b> và kích thước (kế thừa được từ <a href="#survey">Khảo sát nhà khách</a>) → AI dựng phương án minh hoạ.</li>
            <li>Liên kết với <a href="#fit">Fit Diagnostic</a> &amp; <a href="#quote">Báo giá</a>: phương án thiết kế gắn được vào báo giá theo tầng sản phẩm.</li>
            <li>Cần quyền <code>design.read</code> để dùng; <code>design.manage</code> để quản lý mẫu/cấu hình.</li>
          </ul>
        </Block>
        <Block title="Kiểu bố trí bếp hỗ trợ">
          <Chips items={(Object.keys(LAYOUT_LABEL) as KitchenLayout[]).map((k) => ({ label: LAYOUT_LABEL[k], badge: "b-sky" }))} />
        </Block>
      </Section>

      {/* ===== Khảo sát nhà khách ===== */}
      <Section id="survey" icon="survey" title="Khảo sát nhà khách" routes="/survey"
        purpose="Ghi nhận hiện trạng bếp tại nhà khách (kích thước, bố trí, ảnh hiện trạng, nhu cầu) làm cơ sở cho thiết kế, báo giá và giao–lắp chính xác.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Mỗi phiếu khảo sát gắn với lead/khách hàng, ghi <b>địa chỉ, kiểu bố trí, dài × rộng × cao (cm), hiện trạng &amp; nhu cầu</b>, kèm <b>ảnh hiện trạng</b>.</li>
            <li>Dữ liệu khảo sát là đầu vào cho <a href="#design">Thiết kế bếp AI</a> và <a href="#quote">Báo giá</a> (đúng kích thước → đúng vật tư).</li>
            <li>Cần <code>survey.read</code> để xem, <code>survey.manage</code> để tạo/cập nhật.</li>
          </ul>
        </Block>
        <Block title="Kiểu bố trí bếp">
          <Chips items={(Object.keys(LAYOUT_LABEL) as KitchenLayout[]).map((k) => ({ label: LAYOUT_LABEL[k], badge: "b-sky" }))} />
        </Block>
      </Section>

      {/* ===== Tư vấn & Báo giá ===== */}
      <Section id="quote" icon="quote" title="Tư vấn &amp; Báo giá" routes="/quote"
        purpose="Lập báo giá theo tầng sản phẩm, gửi khách và theo dõi đến lúc chốt — báo giá được chấp nhận sẽ lên đơn hàng.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Báo giá gồm nhiều <b>dòng sản phẩm</b> (SKU, số lượng, đơn giá, chiết khấu dòng) + chiết khấu tổng; gắn được <b>tầng</b> ({Object.values(TIER_LABEL).join(" / ")}).</li>
            <li>Vòng đời theo trạng thái: Nháp → Đã gửi → Đã chốt / Từ chối / Hết hạn (có hạn hiệu lực <i>validUntil</i>).</li>
            <li><b>Báo giá “Đã chốt”</b> là cầu nối sang <a href="#orders">Đơn hàng</a> (giữ nguyên dòng sản phẩm &amp; tổng tiền).</li>
            <li>Cần <code>quote.read</code> / <code>quote.manage</code>.</li>
          </ul>
        </Block>
        <Block title="Trạng thái báo giá">
          <Chips items={(Object.keys(QUOTE_STATUS_LABEL) as QuoteStatus[]).map((s) => ({ label: QUOTE_STATUS_LABEL[s], badge: QUOTE_STATUS_BADGE[s] }))} />
        </Block>
        <Block title="Cách dùng">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Tạo báo giá (chọn khách/lead, chọn tầng, thêm dòng sản phẩm).</li>
            <li>Gửi khách → theo dõi trạng thái; khi khách đồng ý, chuyển “Đã chốt” để lên đơn.</li>
          </ol>
        </Block>
      </Section>

      {/* ===== Đơn hàng ===== */}
      <Section id="orders" icon="cart" title="Đơn hàng" routes="/orders"
        purpose="Quản lý vòng đời đơn từ lúc chốt tới hoàn tất, kèm theo dõi thanh toán (đã thu / còn lại) và đồng bộ Haravan.">
        <Block title="Vòng đời đơn (ORDER_FLOW)">
          <Chips items={ORDER_FLOW.map((s) => ({ label: ORDER_STATUS_LABEL[s], badge: ORDER_STATUS_BADGE[s] }))} />
          <p className="small muted" style={{ margin: "8px 0 0" }}>
            Đơn đi tuần tự qua các bước trên; ngoài luồng còn trạng thái <span className={`badge ${ORDER_STATUS_BADGE.cancelled}`}>{ORDER_STATUS_LABEL.cancelled}</span> khi huỷ đơn.
          </p>
        </Block>
        <Block title="Tất cả trạng thái đơn">
          <table>
            <thead><tr><th>Trạng thái</th><th>Ý nghĩa trong luồng vận hành</th></tr></thead>
            <tbody>
              {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => (
                <tr key={s}>
                  <td><span className={`badge ${ORDER_STATUS_BADGE[s]}`}>{ORDER_STATUS_LABEL[s]}</span></td>
                  <td className="small muted">
                    {s === "pending" ? "Mới tạo từ báo giá, chờ xác nhận." :
                     s === "confirmed" ? "Đã chốt với khách, sẵn sàng thu tiền." :
                     s === "paid" ? "Đã nhận thanh toán (đủ hoặc theo thoả thuận)." :
                     s === "delivering" ? "Hàng đang trên đường giao." :
                     s === "installing" ? "Đội kỹ thuật đang lắp đặt tại nhà khách." :
                     s === "completed" ? "Nghiệm thu xong, đơn hoàn tất." :
                     "Đơn bị huỷ."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
        <Block title="Thanh toán">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Mỗi đơn ghi <b>tổng tiền</b>, <b>đã thu</b> và lịch sử các lần thu (Payment) — còn lại = tổng − đã thu.</li>
            <li>Hỗ trợ nhiều hình thức: {Object.values(PAYMENT_LABEL).join(" · ")}.</li>
            <li>Đơn liên kết khách hàng, báo giá nguồn, người phụ trách và ngày giao dự kiến; sinh được <a href="#delivery">phiếu giao–lắp</a>.</li>
          </ul>
        </Block>
        <Block title="Hình thức thanh toán">
          <Chips items={(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => ({ label: PAYMENT_LABEL[m], badge: "b-gray" }))} />
        </Block>
      </Section>

      {/* ===== Giao – Lắp đặt ===== */}
      <Section id="delivery" icon="truck" title="Giao – Lắp đặt" routes="/delivery"
        purpose="Điều phối đội kỹ thuật giao hàng và lắp đặt tại nhà khách — từ xếp lịch tới nghiệm thu, có xử lý thất bại / dời lịch.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Mỗi phiếu giao–lắp gắn với đơn hàng &amp; khách, có <b>thời gian hẹn, địa chỉ, đội phụ trách</b> và trạng thái hiện trường.</li>
            <li>Trạng thái phản ánh tiến độ ngoài hiện trường; <b>Nghiệm thu</b> đánh dấu hoàn tất (doneAt) → thường kéo đơn sang “Hoàn tất” và mở <a href="#warranty">bảo hành</a>.</li>
            <li>Cần <code>delivery.read</code> để xem lịch, <code>delivery.manage</code> để điều phối.</li>
          </ul>
        </Block>
        <Block title="Trạng thái giao – lắp">
          <Chips items={(Object.keys(DELIVERY_STATUS_LABEL) as DeliveryStatus[]).map((s) => ({ label: DELIVERY_STATUS_LABEL[s], badge: DELIVERY_STATUS_BADGE[s] }))} />
        </Block>
      </Section>

      {/* ===== Bảo hành & Hậu mãi ===== */}
      <Section id="warranty" icon="warranty" title="Bảo hành &amp; Hậu mãi" routes="/warranty"
        purpose="Theo dõi bảo hành và chăm sóc khách sau lắp đặt theo các mốc cố định, đảm bảo không bỏ sót khách đã mua.">
        <Block title="Mốc chăm sóc (CARE_MILESTONES)">
          <Chips items={CARE_MILESTONES.map((d) => ({ label: `Ngày ${d}`, badge: "b-amber" }))} />
          <p className="small muted" style={{ margin: "8px 0 0" }}>
            Sau lắp đặt, hệ thống nhắc liên hệ khách tại các mốc {CARE_MILESTONES.join(" / ")} ngày (kiểm tra vận hành, hài lòng, bảo dưỡng). Mốc đã làm được ghi nhận (careDone) để biết còn mốc nào.
          </p>
        </Block>
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Mỗi <b>ticket bảo hành</b> gắn khách/đơn/sản phẩm, ngày lắp, người phụ trách và <b>mốc chăm sóc kế tiếp</b> (nextCareAt) — đến hạn sẽ nổi lên Dashboard “Hôm nay”.</li>
            <li>Trạng thái đi từ Đang theo dõi → Đến hạn chăm sóc → Đã liên hệ → Đã xử lý / Hết hạn.</li>
            <li>Cần <code>warranty.read</code> / <code>warranty.manage</code> (vai trò CSKH/Kỹ thuật).</li>
          </ul>
        </Block>
        <Block title="Trạng thái bảo hành">
          <Chips items={(Object.keys(WARRANTY_STATUS_LABEL) as WarrantyStatus[]).map((s) => ({ label: WARRANTY_STATUS_LABEL[s], badge: WARRANTY_STATUS_BADGE[s] }))} />
        </Block>
      </Section>

      {/* ===== Đánh giá ===== */}
      <Section id="reviews" icon="chat" title="Đánh giá" routes="/reviews · /api/leads/webhook"
        purpose="Gom đánh giá khách từ nhiều kênh (Google, Facebook, sàn TMĐT, Zalo, website) về một bảng để theo dõi điểm số, phản hồi kịp thời và xử lý đánh giá xấu — giữ uy tín thương hiệu.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>KPI:</b> tổng số đánh giá, <b>điểm trung bình</b> (Σ sao ÷ số đánh giá), số đánh giá <b>cần xử lý</b> và số <b>chưa phản hồi</b>.</li>
            <li><b>Phân bố:</b> biểu đồ theo số sao (5→1) và theo kênh để biết khách khen/chê ở đâu.</li>
            <li><b>Phản hồi &amp; trạng thái:</b> mỗi đánh giá có nội dung, số sao (1–5) và trạng thái {BNB_REVIEW_STATUS_LABEL.new} → {BNB_REVIEW_STATUS_LABEL.responded} / {BNB_REVIEW_STATUS_LABEL.flagged}; người có quyền soạn phản hồi ngay trên dòng (lưu kèm người trả lời).</li>
            <li><b>Lead tự về:</b> đánh giá/biểu mẫu quảng cáo có thể đẩy lead thẳng vào CRM qua webhook <code>POST /api/leads/webhook</code> (body <code>{`{ name, phone, source?, need?, email? }`}</code>, bảo vệ bằng <code>LEADS_WEBHOOK_SECRET</code> nếu cấu hình) — lead mới ở trạng thái “Mới”, nguồn mặc định Facebook.</li>
            <li>Cần <code>review.read</code> để xem; <code>review.manage</code> để thêm đánh giá thủ công &amp; phản hồi.</li>
          </ul>
        </Block>
        <Block title="Kênh đánh giá">
          <table>
            <thead><tr><th>Kênh</th><th>Mã</th></tr></thead>
            <tbody>
              {REVIEW_CHANNELS.map((ch: ReviewChannel) => (
                <tr key={ch}>
                  <td><span className="badge b-indigo">{REVIEW_CHANNEL_LABEL[ch]}</span></td>
                  <td className="small muted" style={{ fontFamily: "monospace" }}>{ch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
        <Block title="Trạng thái đánh giá">
          <Chips items={(Object.keys(BNB_REVIEW_STATUS_LABEL) as BNBReviewStatus[]).map((s) => ({ label: BNB_REVIEW_STATUS_LABEL[s], badge: BNB_REVIEW_STATUS_BADGE[s] }))} />
        </Block>
      </Section>

      {/* ===== Báo cáo ca ===== */}
      <Section id="shift-report" icon="handover" title="Báo cáo ca &amp; bàn giao" routes="/shift-report"
        purpose="Chốt số cuối mỗi ca và bàn giao cho ca sau — ghi doanh thu, lượng khách, lead, sự cố và nội dung bàn giao.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Mỗi báo cáo gắn ngày &amp; loại ca, showroom, người lập; ghi <b>doanh thu, số đơn, số lead, lượng khách</b>, <b>sự cố trong ca</b> và <b>nội dung bàn giao</b> cho ca kế.</li>
            <li>Là sổ vận hành điểm bán theo ngày; số liệu góp vào <a href="#bizdash">Dashboard quản trị</a>.</li>
            <li>Cần <code>shiftreport.read</code> / <code>shiftreport.manage</code>.</li>
          </ul>
        </Block>
        <Block title="Loại ca">
          <Chips items={(Object.keys(SHIFT_LABEL) as ShiftKind[]).map((k) => ({ label: SHIFT_LABEL[k], badge: "b-indigo" }))} />
        </Block>
      </Section>

      {/* ===== Việc nội bộ & Sự cố ===== */}
      <Section id="tasks" icon="alert" title="Việc nội bộ &amp; Sự cố" routes="/tasks"
        purpose="Giao việc nội bộ và ghi nhận – xử lý sự cố vận hành (showroom, IT, vận hành) với mức ưu tiên và người phụ trách rõ ràng.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Hai loại: <b>Việc (task)</b> và <b>Sự cố (incident)</b>; phân nhóm Vận hành / IT / Showroom / Khác, có người giao, người nhận, hạn xử lý.</li>
            <li>Theo dõi theo <b>trạng thái</b> và <b>mức ưu tiên</b>; việc/sự cố được giao cho bạn hiện ở Dashboard “Hôm nay”.</li>
            <li>Cần <code>task.read</code> / <code>task.manage</code>.</li>
          </ul>
        </Block>
        <Block title="Trạng thái">
          <Chips items={(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((s) => ({ label: TASK_STATUS_LABEL[s], badge: TASK_STATUS_BADGE[s] }))} />
        </Block>
        <Block title="Mức ưu tiên">
          <Chips items={(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => ({ label: PRIORITY_LABEL[p], badge: PRIORITY_BADGE[p] }))} />
        </Block>
      </Section>

      {/* ===== Marketing ===== */}
      <Section id="marketing" icon="sparkle" title="Marketing" routes="/marketing · Trụ nội dung · Lịch · Quảng cáo"
        purpose="Quản lý trụ nội dung, lịch đăng và chiến dịch quảng cáo ngay trong hệ thống (thay Google Sheets), đo chi phí mỗi lead (CPL) theo từng chiến dịch và từng kênh.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>KPI:</b> tổng chi quảng cáo (Σ spend), tổng leads từ ads (Σ leads), <b>CPL = Σ chi phí ÷ Σ leads</b>, và số nội dung đã/đang lên lịch.</li>
            <li><b>Trụ nội dung (Content Pillar):</b> các chủ đề nội dung (tên, mô tả, màu) để gán cho từng bài trong lịch.</li>
            <li><b>Lịch nội dung:</b> danh sách bài viết theo <b>thời điểm đăng</b> (sắp tới lên đầu), gán kênh + trụ + người phụ trách; đổi trạng thái nhanh theo luồng {CONTENT_STATUS_LABEL.planned} → {CONTENT_STATUS_LABEL.in_progress} → {CONTENT_STATUS_LABEL.published}.</li>
            <li><b>Chiến dịch quảng cáo:</b> theo dõi chi phí, leads, clicks, trạng thái; <b>CPL từng chiến dịch</b> = chi phí ÷ leads. Biểu đồ <b>so sánh CPL theo kênh</b> (gộp spend/leads mỗi kênh) để biết kênh nào rẻ nhất.</li>
            <li>Cần <code>marketing.read</code> để xem, <code>marketing.manage</code> để tạo trụ/nội dung/chiến dịch và đổi trạng thái.</li>
          </ul>
        </Block>
        <Block title="Kênh marketing">
          <Chips items={MKT_CHANNELS.map((c) => ({ label: MKT_CHANNEL_LABEL[c] }))} />
        </Block>
        <Block title="Trạng thái nội dung">
          <Chips items={(Object.keys(CONTENT_STATUS_LABEL) as ContentStatus[]).map((s) => ({ label: CONTENT_STATUS_LABEL[s], badge: CONTENT_STATUS_BADGE[s] }))} />
        </Block>
        <Block title="Trạng thái chiến dịch">
          <Chips items={(Object.keys(AD_STATUS_LABEL) as AdStatus[]).map((s) => ({ label: AD_STATUS_LABEL[s], badge: AD_STATUS_BADGE[s] }))} />
        </Block>
      </Section>

      {/* ===== Nhập hàng (PO) ===== */}
      <Section id="purchase" icon="box" title="Nhập hàng (PO)" routes="/purchase · /purchase/new · /purchase/[id]"
        purpose="Đặt hàng nhà cung cấp và theo dõi hàng về nhập kho — quản lý phiếu nhập (PO) từ lúc soạn tới khi nhận đủ hàng.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>KPI:</b> số PO đang đặt, số PO đã nhận và tổng giá trị các PO (trừ PO huỷ).</li>
            <li><b>Tạo PO:</b> chọn nhà cung cấp, thêm nhiều dòng hàng (tên, SKU, số lượng, <b>giá vốn</b>) — <b>tổng tiền tính realtime</b> = Σ (SL × giá vốn); kèm ngày dự kiến về và ghi chú.</li>
            <li><b>Vòng đời PO:</b> đi tuần tự {PO_STATUS_LABEL.draft} → {PO_STATUS_LABEL.ordered} → {PO_STATUS_LABEL.received}; có thể huỷ khi chưa nhận hàng.</li>
            <li>Cần <code>purchase.read</code> để xem, <code>purchase.manage</code> để tạo PO và đổi trạng thái.</li>
          </ul>
        </Block>
        <Block title="Trạng thái PO">
          <Chips items={(Object.keys(PO_STATUS_LABEL) as POStatus[]).map((s) => ({ label: PO_STATUS_LABEL[s], badge: PO_STATUS_BADGE[s] }))} />
        </Block>
      </Section>

      {/* ===== POS quầy ===== */}
      <Section id="pos" icon="cart" title="POS quầy" routes="/pos"
        purpose="Bán nhanh tại quầy showroom — chọn hàng từ danh mục Haravan, thu tiền và xuất đơn hoàn tất trong một màn hình.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Chọn hàng:</b> tìm theo tên/SKU từ danh mục sản phẩm (live Haravan), bấm để thêm vào giỏ; sửa số lượng từng dòng — <b>tổng tiền cập nhật realtime</b>.</li>
            <li><b>Khách:</b> chọn khách hàng có sẵn hoặc bán khách lẻ (nhập tên / SĐT tuỳ chọn).</li>
            <li><b>Thanh toán:</b> chọn hình thức ({Object.values(PAYMENT_LABEL).join(" · ")}) rồi bấm Thanh toán → tạo <a href="#orders">đơn hàng</a> trạng thái {ORDER_STATUS_LABEL.completed} (đã thu = tổng), chuyển sang trang chi tiết đơn.</li>
            <li>Tuỳ chọn <b>đẩy đơn lên Haravan</b> ngay khi thanh toán (khi đã cấu hình Haravan).</li>
            <li>Cần quyền <code>order.manage</code>.</li>
          </ul>
        </Block>
      </Section>

      {/* ===== Tài chính – Kế toán ===== */}
      <Section id="finance" icon="wallet" title="Tài chính – Kế toán" routes="/finance · /finance/export"
        purpose="Sổ sách tài chính thay cho các file Excel rời rạc — theo dõi công nợ phải thu, giá vốn &amp; lãi gộp, đối soát tiền vào/ra ngân hàng và xuất dữ liệu cho phần mềm kế toán (AMIS).">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>KPI:</b> tổng <b>công nợ phải thu</b> (Σ còn nợ các đơn chưa huỷ), <b>doanh thu</b> (Σ tổng đơn), <b>lãi gộp</b> = doanh thu − giá vốn (kèm tỷ suất %), và <b>dòng tiền ròng</b> = tiền vào − tiền ra.</li>
            <li><b>Công nợ phải thu (AR aging):</b> các đơn còn nợ (còn nợ = tổng − đã thu) được gom theo <b>nhóm tuổi nợ</b> tính từ ngày tạo đơn: <span className="badge b-green">0–30 ngày</span> · <span className="badge b-amber">31–60 ngày</span> · <span className="badge b-rose">&gt;60 ngày</span> — để đòi nợ đúng ưu tiên.</li>
            <li><b>Giá vốn &amp; lãi gộp:</b> giá vốn (COGS) mỗi đơn = Σ (giá vốn SKU × số lượng), <b>giá vốn SKU lấy từ <a href="#purchase">phiếu nhập (PO)</a></b>; lãi gộp đơn = doanh thu − giá vốn, hiển thị tỷ suất từng đơn.</li>
            <li><b>Đối soát ngân hàng:</b> ghi các giao dịch ({Object.values(TXN_DIR_LABEL).join(" / ")}) rồi <b>khớp từng giao dịch với đơn hàng</b> (matchedOrderId) để biết tiền về thuộc đơn nào; giao dịch chưa khớp được đánh dấu để xử lý.</li>
            <li><b>Xuất kế toán (AMIS):</b> nút “Xuất kế toán (AMIS)” xuất Excel để nạp vào phần mềm kế toán MISA AMIS.</li>
            <li>Cần <code>finance.read</code> để xem (công nợ, lãi gộp, dòng tiền); <code>finance.manage</code> để thêm/khớp giao dịch ngân hàng và xuất kế toán.</li>
          </ul>
        </Block>
        <Block title="Loại giao dịch ngân hàng">
          <Chips items={(Object.keys(TXN_DIR_LABEL) as TxnDirection[]).map((d) => ({ label: TXN_DIR_LABEL[d], badge: d === "in" ? "b-green" : "b-rose" }))} />
        </Block>
      </Section>

      {/* ===== Dashboard quản trị ===== */}
      <Section id="bizdash" icon="crown" title="Dashboard quản trị" routes="/admin"
        purpose="Bức tranh kinh doanh toàn cửa hàng cho chủ/quản lý — doanh thu, phễu lead, hiệu suất bán hàng và vận hành hậu mãi tổng hợp.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Tổng hợp <b>doanh thu &amp; đơn hàng</b> theo kỳ, <b>tỷ lệ chuyển đổi phễu lead</b> ({LEAD_STAGES.map((s) => LEAD_STAGE_LABEL[s]).join(" → ")}), nguồn lead hiệu quả.</li>
            <li>Theo dõi <b>tiến độ giao–lắp</b>, <b>hậu mãi</b> (mốc chăm sóc đến hạn / đã làm) và năng suất theo nhân viên/showroom.</li>
            <li>Lấy số từ Báo cáo ca, Đơn hàng, CRM, Giao–Lắp, Bảo hành. Cần quyền <code>bizdash.read</code> (BOD / Quản lý Showroom / Quản trị).</li>
          </ul>
        </Block>
      </Section>

      {/* ===== BI · Phân tích kinh doanh ===== */}
      <Section id="bi" icon="chart" title="BI · Phân tích kinh doanh" routes="/bi"
        purpose="Lớp phân tích chuyên sâu đa phân hệ — bổ trợ Dashboard quản trị bằng các chỉ số tài chính và hiệu quả marketing tính toán liên kết.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Tài chính:</b> doanh thu đã thu, <b>lãi gộp ước tính</b> = doanh số − giá vốn (theo SKU trong <a href="#purchase">PO</a>), biên lãi gộp, AOV, công nợ phải thu.</li>
            <li><b>Xu hướng:</b> doanh thu thu được theo <b>6 tháng</b> (từ payments của đơn) và <b>phễu lead</b> ({LEAD_STAGES.map((s) => LEAD_STAGE_LABEL[s]).join(" → ")}).</li>
            <li><b>Marketing ROI:</b> chi phí / lead / <b>CPL</b> theo kênh ({MKT_CHANNELS.map((c) => MKT_CHANNEL_LABEL[c]).join(" · ")}) và CPL hợp nhất, lấy từ chiến dịch ở <a href="#marketing">Marketing</a>.</li>
            <li><b>Chất lượng &amp; dòng tiền:</b> cơ cấu <b>NPS</b> (từ <a href="#customers">CX</a>), <b>tuổi nợ công nợ</b> (AR aging) và dòng tiền vào/ra từ đối soát ngân hàng (<a href="#finance">Tài chính</a>).</li>
            <li>Top sản phẩm theo doanh số (gộp theo dòng đơn). Chỉ đọc, cần quyền <code>bizdash.read</code>.</li>
          </ul>
        </Block>
      </Section>

      {/* ===== Tích hợp & Kết nối ===== */}
      <Section id="integrations" icon="settings" title="Tích hợp & Kết nối" routes="/integrations"
        purpose="Trang quản trị trạng thái các kết nối bên ngoài và công cụ đăng ký webhook — chỉ Quản trị hệ thống truy cập (quyền system.rbac).">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Trạng thái cấu hình:</b> kiểm tra nhanh các biến môi trường đã cắm chưa — Haravan, Zalo OA/ZNS, AI thiết kế, Cron, Supabase.</li>
            <li><b>Đăng ký webhook Haravan:</b> một nút đăng ký (idempotent) các topic <code>inventory_levels/update · products/update · orders/create · orders/updated</code> trỏ về <code>/api/haravan/webhook</code>; bỏ qua topic đã có.</li>
            <li>Cần URL public (sau khi deploy) — nhập domain rồi bấm đăng ký; danh sách webhook hiện hành hiển thị ngay bên trên.</li>
          </ul>
        </Block>
      </Section>

      {/* ============================================================ */}
      {/* ===== PHÂN HỆ NHÂN SỰ (HR) ===== */}
      {/* ============================================================ */}

      {/* ===== Dashboard ===== */}
      <Section id="dashboard" icon="grid" title="Bảng điều khiển (HR)" routes="/dashboard"
        purpose="Trang chủ tự đổi theo CẤP người dùng (xem mục Đăng nhập & phân quyền) — tổng hợp realtime từ dữ liệu các phân hệ.">
        <Block title="Nội dung theo cấp">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Quản trị / Nhân sự:</b> 4 chỉ số (tổng nhân sự, chính thức, đơn chờ duyệt, tuyển trong năm), biểu đồ cơ cấu theo pháp nhân &amp; phòng ban, nhân viên mới onboarding và đơn nghỉ chờ duyệt — giới hạn theo phạm vi pháp nhân.</li>
            <li><b>Quản lý trực tiếp:</b> bảng “Quản lý đội” — thành viên phòng, đơn nghỉ chờ duyệt (duyệt nhanh), đang nghỉ hôm nay, điểm KPI trung bình của đội.</li>
            <li><b>Nhân viên:</b> cổng cá nhân — ngày phép còn lại, đơn đang chờ, lịch làm sắp tới, link phiếu lương và KPI của bản thân.</li>
          </ul>
        </Block>
        <Block title="Cách dùng">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Bấm <b>Xem báo cáo</b> để sang phân tích chi tiết; <b>Tạo đơn nghỉ</b> để sang Nghỉ phép.</li>
            <li>Bấm một đơn trong danh sách chờ duyệt để mở trang Nghỉ phép xử lý.</li>
          </ul>
        </Block>
      </Section>

      {/* ===== Employees ===== */}
      <Section id="employees" icon="users" title="Nhân viên" routes="/employees · /employees/new · /employees/[id]"
        purpose="Quản lý hồ sơ nhân sự đầy đủ (Core HR) cho toàn tập đoàn.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Danh bạ:</b> tìm theo tên/mã/email; lọc theo pháp nhân, phòng ban, trạng thái.</li>
            <li><b>Hồ sơ nhiều nhóm:</b> Thông tin cơ bản; <b>Ảnh hồ sơ &amp; giấy tờ</b> (ảnh chân dung + CCCD mặt trước/sau, tự nén trước khi lưu); Tổ chức &amp; công việc; Lương·thuế·bảo hiểm (lương cơ bản, phụ cấp, lương đóng BHXH, MST, sổ BHXH, tài khoản ngân hàng); Tài khoản đăng nhập.</li>
            <li><b>Ô “Ngân hàng”</b> có gợi ý lọc-khi-gõ danh mục ngân hàng VN (vẫn cho nhập tự do).</li>
            <li><b>Ảnh chân dung</b> hiển thị ở danh bạ và đầu hồ sơ; ảnh CCCD chỉ hiện cho người có quyền sửa hồ sơ (HR). Ảnh lưu in-memory (mất khi máy chủ khởi động lại — sẽ chuyển Supabase Storage sau).</li>
            <li><b>Lịch sử lương:</b> hồ sơ hiển thị các lần điều chỉnh lương (xem mục Tính lương); người có quyền xem lương mới thấy.</li>
            <li><b>Người phụ thuộc:</b> khai báo chi tiết (quan hệ, ngày sinh, MST, đã đăng ký giảm trừ) ngay trong hồ sơ; số NPT đã đăng ký <b>tự đồng bộ</b> vào giảm trừ thuế TNCN khi tính lương.</li>
            <li><b>Mã nhân viên</b> tự sinh dạng NVxxxx.</li>
            <li><b>Nhập Excel:</b> nút “Nhập Excel” tạo nhiều nhân viên từ tệp CSV (UTF-8); bấm “Tải mẫu” để lấy file đúng định dạng cột.</li>
            <li><b>Cấp tài khoản (chỉ HR+):</b> tick “Cấp tài khoản đăng nhập” + chọn vai trò + phạm vi → tạo tài khoản với mật khẩu tạm <code>123456</code> (buộc nhân viên đổi ở lần đăng nhập đầu). Có nút <b>Đặt lại mật khẩu</b> khi tài khoản đã tồn tại. Xem mục <a href="#account">Tài khoản &amp; mật khẩu</a>.</li>
            <li><b>Nhân viên tự sửa hồ sơ:</b> nhân viên không vào trang này nhưng sửa được <b>thông tin cá nhân của mình</b> ở <b>Tài khoản của tôi → Hồ sơ của tôi</b> (ảnh, CCCD, liên hệ, tài khoản nhận lương). Lương/tổ chức/vai trò vẫn do HR quản lý.</li>
          </ul>
        </Block>
        <Block title="Trạng thái nhân viên">
          <Chips items={(Object.keys(EMPLOYEE_STATUS_LABEL) as EmployeeStatus[]).map((s) => ({ label: EMPLOYEE_STATUS_LABEL[s] }))} />
        </Block>
        <Block title="Loại hình lao động">
          <Chips items={Object.values(EMPLOYMENT_TYPE_LABEL).map((l) => ({ label: l }))} />
        </Block>
        <Block title="Cách dùng">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Thêm:</b> bấm “Thêm nhân viên”, điền form, lưu.</li>
            <li><b>Sửa:</b> bấm biểu tượng ✎ ở dòng để mở hồ sơ.</li>
            <li><b>Xoá:</b> trong hồ sơ, mở vùng “Xoá” an toàn — tự gỡ vai trò trưởng phòng nếu có.</li>
          </ol>
          <p className="small muted" style={{ marginBottom: 0 }}>Dữ liệu lương nhập ở đây là <b>đầu vào cho phân hệ Tính lương</b>.</p>
        </Block>
      </Section>

      {/* ===== Contracts ===== */}
      <Section id="contracts" icon="doc" title="Hợp đồng lao động" routes="/contracts · /contracts/[id]"
        purpose="Quản lý vòng đời hợp đồng và cảnh báo hết hạn để gia hạn kịp thời.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Loại HĐ: Thử việc / Xác định thời hạn / Không xác định thời hạn / Thời vụ. HĐ không xác định thời hạn bỏ trống ngày kết thúc.</li>
            <li><b>Trạng thái tự tính theo ngày:</b> Hiệu lực · <b>Sắp hết hạn</b> (còn ≤ 60 ngày) · Hết hạn · Đã chấm dứt.</li>
            <li>Đầu trang có <b>bảng cảnh báo</b> các HĐ sắp/đã hết hạn để xử lý gia hạn.</li>
            <li>Lọc theo phạm vi: HR thấy HĐ trong pháp nhân, Trưởng phòng thấy HĐ phòng mình.</li>
          </ul>
        </Block>
        <Block title="Cách dùng">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Tạo HĐ bằng form (chọn NV, số HĐ, loại, ngày, lương).</li>
            <li>Bấm ✎ để sửa; nút ✕ để chấm dứt trước hạn; 🗑 để xoá.</li>
            <li><b>Tìm nhanh:</b> bảng “Danh sách hợp đồng” có ô tìm theo tên/mã nhân viên khi danh sách dài.</li>
          </ol>
        </Block>
      </Section>

      {/* ===== Schedule ===== */}
      <Section id="schedule" icon="clock" title="Lịch làm việc" routes="/schedule"
        purpose="Theo dõi ai làm ngày nào (công ty không chấm công/check-in) — cơ sở cho nghỉ phép & lương.">
        <Block title="Mô hình & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Lịch hành chính nền:</b> {config.workingWeekdays.map((d) => DOW[d]).join(", ")}, ca mặc định <b>{defaultShift?.name}</b> ({defaultShift?.startTime}–{defaultShift?.endTime}, {defaultShift?.workHours}h). Chỉ <b>ngoại lệ</b> mới được lưu; ngày không có ngoại lệ suy ra từ lịch nền.</li>
            <li>Bấm một ô ngày → cửa sổ chọn <b>loại ngày</b> + <b>ca</b> (chuẩn hoặc “Tùy chỉnh giờ”) + ghi chú.</li>
            <li>“<b>Áp dụng cho mọi {`{thứ}`} còn lại trong tháng</b>” để xếp nhanh theo tuần; “<b>Về lịch nền</b>” để xoá ngoại lệ.</li>
            <li><b>Phép đã duyệt</b> (phân hệ Nghỉ phép) tự phủ lên lịch (ô “P”); <b>ngày lễ</b> (khai báo ở Cài đặt) hiển thị ô “LỄ”. Ưu tiên: ngoại lệ thủ công {">"} phép {">"} lễ {">"} lịch nền.</li>
            <li>Ngày lễ <b>không tính</b> là ngày công → tự loại khỏi số ngày nghỉ phép và ngày công chuẩn khi tính lương.</li>
            <li><b>Ai được sửa:</b> HR/Quản lý xếp lịch cho mọi người trong phạm vi; <b>nhân viên tự sửa lịch trên hàng của chính mình</b> (chỉ bấm được vào ô thuộc hàng của mình). Riêng <b>Nghỉ phép</b> luôn đi qua đơn duyệt, không đặt tay trên lịch.</li>
            <li><b>Thông báo hai chiều khi đổi lịch:</b> nhân viên tự đổi lịch → HR/Quản lý quản người đó nhận thông báo; HR/Quản lý đổi hộ → chính nhân viên nhận thông báo. Thông báo hiện ở chuông, đẩy <b>realtime</b> sang màn người nhận và gửi kèm <b>email</b> (nếu đã cấu hình).</li>
            <li><b>Tìm nhanh:</b> khi danh sách có nhiều nhân viên, ô “Tìm nhân viên…” phía trên lưới lọc tức thì theo tên/mã (gõ không dấu vẫn khớp).</li>
          </ul>
        </Block>
        <Block title="Loại ngày">
          <Chips items={(Object.keys(SCHEDULE_KIND_LABEL) as ScheduleKind[]).map((k) => ({ label: SCHEDULE_KIND_LABEL[k], badge: SCHEDULE_KIND_BADGE[k] }))} />
        </Block>
        <Block title="Ca làm việc">
          <table>
            <thead><tr><th>Ca</th><th>Giờ</th><th>Nghỉ trưa</th><th style={{ textAlign: "center" }}>Giờ công</th><th>Áp dụng</th></tr></thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.name}</b></td>
                  <td>{s.startTime}–{s.endTime}</td>
                  <td>{s.breakStart ? `${s.breakStart}–${s.breakEnd}` : "—"}</td>
                  <td style={{ textAlign: "center" }}>{s.workHours}h</td>
                  <td><span className={`badge ${s.isActive ? "b-green" : "b-gray"}`}>{s.isActive ? "Đang dùng" : "Tắt"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      </Section>

      {/* ===== Leave ===== */}
      <Section id="leave" icon="calendar" title="Nghỉ phép" routes="/leave"
        purpose="Quản lý đơn nghỉ và quỹ phép năm theo Bộ luật Lao động, có workflow duyệt một cấp.">
        <Block title="Logic chính">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Quỹ phép năm</b> = 12 ngày + 1 ngày mỗi 5 năm thâm niên; năm đầu tính theo tỷ lệ số tháng làm.</li>
            <li><b>Số ngày nghỉ</b> chỉ tính ngày làm việc (theo lịch nền); nửa ngày = 0,5.</li>
            <li><b>Workflow:</b> Tạo đơn → Chờ duyệt → Duyệt / Từ chối (kèm lý do) → có thể Huỷ. Hỗ trợ <b>duyệt nhiều cấp</b> (cấu hình ở Cài đặt → Quy trình duyệt): cần đủ số người (khác nhau) duyệt thì đơn mới được chấp thuận.</li>
            <li><b>Chỉ “Phép năm” trừ vào quỹ.</b> “Nghỉ không lương” bị trừ tiền ở phân hệ <a href="#payroll">Tính lương</a>.</li>
          </ul>
        </Block>
        <Block title="Loại nghỉ phép">
          <table>
            <thead><tr><th>Loại</th><th style={{ textAlign: "center" }}>Có lương</th><th style={{ textAlign: "center" }}>Trừ quỹ phép</th></tr></thead>
            <tbody>
              {leaveTypes.map((t) => (
                <tr key={t.id}>
                  <td><span className={`badge ${t.badge}`}>{t.name}</span></td>
                  <td style={{ textAlign: "center" }}>{t.paid ? "Có" : "Không"}</td>
                  <td style={{ textAlign: "center" }}>{t.deductsQuota ? "Có" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
        <Block title="Trạng thái đơn">
          <Chips items={(Object.keys(LEAVE_STATUS_LABEL) as LeaveStatus[]).map((s) => ({ label: LEAVE_STATUS_LABEL[s], badge: LEAVE_STATUS_BADGE[s] }))} />
        </Block>
        <Block title="Cách dùng">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Tạo đơn:</b> chọn nhân viên + loại nghỉ + khoảng ngày — hệ thống tự tính ngày công và nhắc số dư quỹ.</li>
            <li><b>Duyệt:</b> ở bảng “Chờ duyệt”, bấm Duyệt hoặc Từ chối (nhập lý do).</li>
            <li><b>Tìm nhanh:</b> bảng “Tất cả đơn nghỉ” và “Quỹ phép năm” có ô tìm theo tên/mã nhân viên khi danh sách dài.</li>
          </ol>
        </Block>
      </Section>

      {/* ===== Overtime ===== */}
      <Section id="overtime" icon="clock" title="Làm thêm giờ (OT)" routes="/overtime"
        purpose="Đăng ký & duyệt giờ làm thêm; giờ đã duyệt tự quy ra tiền vào phiếu lương.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Nhân viên đăng ký OT (ngày, số giờ, <b>hệ số</b>: 150% ngày thường · 200% ngày nghỉ tuần · 300% ngày lễ); quản lý duyệt/từ chối.</li>
            <li>Tiền OT = (lương/giờ) × số giờ × hệ số, với lương/giờ = Gross ÷ (ngày công chuẩn × 8). Cộng vào <b>thực nhận</b> ở phiếu lương khi đã duyệt.</li>
            <li>Lọc theo phạm vi; nhân viên chỉ đăng ký/huỷ cho bản thân.</li>
            <li><b>Tìm nhanh:</b> bảng “Danh sách OT” có ô tìm theo tên/mã nhân viên khi nhiều đơn.</li>
          </ul>
        </Block>
      </Section>

      {/* ===== Payroll ===== */}
      <Section id="payroll" icon="wallet" title="Tính lương" routes="/payroll · /payroll/[id]"
        purpose="Tính lương tháng: bảo hiểm bắt buộc, thuế TNCN lũy tiến và thực lĩnh; có phiếu lương từng người.">
        <Block title="Công thức (mỗi nhân viên / tháng)">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Gross hợp đồng</b> = Lương cơ bản + Phụ cấp.</li>
            <li><b>Trừ nghỉ không lương</b> theo tỷ lệ: Gross × (ngày nghỉ KL ÷ ngày công chuẩn của tháng).</li>
            <li><b>Bảo hiểm (NLĐ {pct(INSURANCE_RATE.employee.bhxh + INSURANCE_RATE.employee.bhyt + INSURANCE_RATE.employee.bhtn)})</b> tính trên lương đóng BHXH (áp trần).</li>
            <li><b>Thu nhập chịu thuế</b> = Gross − Bảo hiểm (NLĐ).</li>
            <li><b>Thu nhập tính thuế</b> = chịu thuế − giảm trừ bản thân − (số NPT × giảm trừ NPT).</li>
            <li><b>Thuế TNCN</b> theo biểu lũy tiến từng phần.</li>
            <li><b>Thực lĩnh</b> = Gross − Bảo hiểm − Thuế. <b>Chi phí DN</b> = Gross + Bảo hiểm (NSDLĐ {pct(INSURANCE_RATE.employer.bhxh + INSURANCE_RATE.employer.bhyt + INSURANCE_RATE.employer.bhtn + INSURANCE_RATE.employer.tnld)}).</li>
          </ol>
        </Block>
        <Block title="Tỷ lệ bảo hiểm bắt buộc">
          <table>
            <thead><tr><th></th><th style={{ textAlign: "center" }}>BHXH</th><th style={{ textAlign: "center" }}>BHYT</th><th style={{ textAlign: "center" }}>BHTN</th><th style={{ textAlign: "center" }}>TNLĐ-BNN</th><th style={{ textAlign: "center" }}>Tổng</th></tr></thead>
            <tbody>
              <tr><td><b>Người lao động</b></td><td style={{ textAlign: "center" }}>{pct(INSURANCE_RATE.employee.bhxh)}</td><td style={{ textAlign: "center" }}>{pct(INSURANCE_RATE.employee.bhyt)}</td><td style={{ textAlign: "center" }}>{pct(INSURANCE_RATE.employee.bhtn)}</td><td style={{ textAlign: "center" }}>—</td><td style={{ textAlign: "center" }}><b>{pct(INSURANCE_RATE.employee.bhxh + INSURANCE_RATE.employee.bhyt + INSURANCE_RATE.employee.bhtn)}</b></td></tr>
              <tr><td><b>Doanh nghiệp</b></td><td style={{ textAlign: "center" }}>{pct(INSURANCE_RATE.employer.bhxh)}</td><td style={{ textAlign: "center" }}>{pct(INSURANCE_RATE.employer.bhyt)}</td><td style={{ textAlign: "center" }}>{pct(INSURANCE_RATE.employer.bhtn)}</td><td style={{ textAlign: "center" }}>{pct(INSURANCE_RATE.employer.tnld)}</td><td style={{ textAlign: "center" }}><b>{pct(INSURANCE_RATE.employer.bhxh + INSURANCE_RATE.employer.bhyt + INSURANCE_RATE.employer.bhtn + INSURANCE_RATE.employer.tnld)}</b></td></tr>
            </tbody>
          </table>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Trần đóng BHXH/BHYT = {formatVND(CAP_BHXH_BHYT)} (20× lương cơ sở). Trần BHTN = 20× lương tối thiểu vùng.
          </p>
        </Block>
        <Block title="Giảm trừ gia cảnh & biểu thuế TNCN">
          <p className="small" style={{ marginTop: 0 }}>
            Giảm trừ bản thân <b>{formatVND(PIT_SELF_DEDUCTION)}</b>/tháng · mỗi người phụ thuộc <b>{formatVND(PIT_DEPENDENT_DEDUCTION)}</b>/tháng.
          </p>
          <table>
            <thead><tr><th>Thu nhập tính thuế / tháng</th><th style={{ textAlign: "center" }}>Thuế suất</th></tr></thead>
            <tbody>
              {brackets.map((b) => (
                <tr key={b.range}><td>{b.range}</td><td style={{ textAlign: "center" }}>{b.rate}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="small muted" style={{ marginBottom: 0 }}>Biểu 5 bậc dự kiến 2026 chưa chốt ngưỡng → đang dùng biểu 7 bậc hiện hành (sửa ở <code>lib/payroll/config.ts</code>).</p>
        </Block>
        <Block title="Lương tối thiểu vùng (tham chiếu)">
          <Chips items={([1, 2, 3, 4] as const).map((k) => ({ label: `Vùng ${ROMAN[String(k)]}: ${formatVND(REGION_MIN_WAGE[k])}`, badge: "b-gray" }))} />
        </Block>
        <Block title="Chỉnh lương & lịch sử lương (HR/Admin)">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Chỉnh lương:</b> trên bảng lương mở “Chỉnh lương” ở mỗi dòng (hoặc trong phiếu lương) để đặt lương cơ bản/phụ cấp/lương BHXH mới + <b>tháng hiệu lực</b> + lý do. Mỗi lần tạo một <b>bản ghi lịch sử lương</b>.</li>
            <li><b>Lương theo kỳ:</b> bảng lương tự lấy mức lương có hiệu lực ≤ kỳ đang xem (bản ghi mới nhất phù hợp); chưa có bản ghi → dùng lương trên hồ sơ.</li>
            <li><b>Lịch sử lương</b> hiển thị trong hồ sơ nhân viên và phiếu lương (người có quyền xem lương).</li>
            <li>Cần quyền <b>payroll.manage</b> (HR/Admin) — nhân viên/quản lý không thấy nút chỉnh lương.</li>
          </ul>
        </Block>
        <Block title="Điều chỉnh theo kỳ & chốt kỳ">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Điều chỉnh kỳ lương</b> (trong phiếu lương): thêm Thưởng / Phụ cấp thêm / Khấu trừ / Khác cho riêng một tháng. Khoản <b>chịu thuế</b> được cộng vào thu nhập rồi <b>tính lại thuế TNCN</b>; khoản <b>không chịu thuế</b> cộng/trừ thẳng vào thực nhận.</li>
            <li><b>Chốt kỳ lương:</b> bấm “Chốt kỳ” để khoá số liệu tháng (có thể Mở lại). Trạng thái Đang mở / Đã chốt hiển thị đầu trang.</li>
            <li><b>Thưởng – Kỷ luật</b> (từ phân hệ Khen thưởng) và <b>tiền làm thêm giờ (OT)</b> trong tháng vẫn tự cộng/trừ vào thực nhận (sau thuế); phiếu lương liệt kê từng khoản.</li>
          </ul>
        </Block>
        <Block title="Cách dùng">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Chọn <b>kỳ lương (tháng)</b> + <b>pháp nhân</b> + (tuỳ chọn) lọc theo <b>một nhân viên</b> → xem bảng lương + dòng tổng. Ô “Nhân viên” gõ tên/mã để tìm nhanh; chọn “Tất cả nhân viên” để xem toàn bộ.</li>
            <li><b>Tìm nhanh trong bảng:</b> khi nhiều nhân sự, ô “Tìm nhân viên…” ở tiêu đề bảng lọc tức thì các dòng đang hiển thị theo tên/mã (không cần bấm lại “Xem bảng lương”).</li>
            <li>Bấm mũi tên cuối mỗi dòng để xem <b>phiếu lương chi tiết</b> (bóc tách BHXH, thuế, điều chỉnh kỳ, thưởng/phạt, chi phí DN); tại đây cũng quản lý điều chỉnh kỳ và chỉnh lương.</li>
          </ul>
        </Block>
      </Section>

      {/* ===== Phụ cấp & Khấu trừ ===== */}
      <Section id="payitems" icon="wallet" title="Phụ cấp & Khấu trừ" routes="/settings/payitems"
        purpose="Danh mục nền các khoản cộng (phụ cấp) và trừ (khấu trừ) vào lương dùng chung toàn tập đoàn. Mỗi khoản đánh dấu có chịu thuế TNCN và có tính vào lương đóng BHXH hay không — làm cơ sở chuẩn khi nhập lương/điều chỉnh kỳ cho từng nhân viên.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Hai loại khoản: <b>Phụ cấp</b> (cộng vào thu nhập) và <b>Khấu trừ</b> (trừ khỏi lương, vd đoàn phí công đoàn).</li>
            <li>Mỗi khoản có <b>mức mặc định</b> (gợi ý) cùng hai cờ: <b>chịu thuế TNCN</b> và <b>đóng BHXH</b>. Đây là danh mục nền; số tiền thực áp cho từng nhân viên vẫn do hồ sơ lương / điều chỉnh kỳ lương quyết định.</li>
            <li>Thêm khoản mới, bật/tắt áp dụng hoặc xoá tại tab <b>Cài đặt → Phụ cấp &amp; Khấu trừ</b> (cần quyền quản lý tổ chức).</li>
          </ul>
        </Block>
        <Block title={`Danh mục hiện có (${payItems.length})`}>
          <table>
            <thead>
              <tr>
                <th>Mã</th><th>Tên khoản</th><th>Loại</th>
                <th style={{ textAlign: "right" }}>Mức mặc định</th>
                <th style={{ textAlign: "center" }}>Chịu thuế</th>
                <th style={{ textAlign: "center" }}>Đóng BHXH</th>
              </tr>
            </thead>
            <tbody>
              {payItems.map((p) => (
                <tr key={p.id}>
                  <td><span className="badge b-gray">{p.code}</span></td>
                  <td>{p.name}</td>
                  <td><span className={`badge ${PAY_ITEM_KIND_BADGE[p.kind]}`}>{PAY_ITEM_KIND_LABEL[p.kind]}</span></td>
                  <td style={{ textAlign: "right" }}>{p.defaultAmount != null ? formatVND(p.defaultAmount) : "—"}</td>
                  <td style={{ textAlign: "center" }}>{p.taxable ? "Có" : "Không"}</td>
                  <td style={{ textAlign: "center" }}>{p.insurable ? "Có" : "Không"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      </Section>

      {/* ===== Assets ===== */}
      <Section id="assets" icon="box" title="Quản lý tài sản" routes="/assets"
        purpose="Theo dõi tài sản cấp phát cho nhân viên (laptop, điện thoại…) và thu hồi khi nghỉ việc.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Mỗi tài sản có mã, nhóm và trạng thái: Sẵn sàng / Đang cấp phát / Bảo trì / Đã thanh lý.</li>
            <li><b>Cấp phát</b> tài sản “sẵn sàng” cho một nhân viên → tự chuyển sang “đang cấp phát”; <b>Thu hồi</b> đưa về “sẵn sàng”.</li>
            <li>Cột “Người giữ” hiển thị ai đang giữ và từ ngày nào (lượt cấp phát đang mở).</li>
          </ul>
        </Block>
      </Section>

      {/* ===== Recruit ===== */}
      <Section id="recruit" icon="userplus" title="Tuyển dụng" routes="/recruit · /recruit/[id] · /recruit/[id]/preview"
        purpose="Quản lý tin tuyển dụng và phễu ứng viên theo pipeline dạng bảng Kanban.">
        <Block title="Pipeline ứng viên">
          <Chips items={[...PIPELINE_STAGES, "rejected" as CandidateStage].map((s) => ({ label: CANDIDATE_STAGE_LABEL[s], badge: CANDIDATE_STAGE_BADGE[s] }))} />
        </Block>
        <Block title="Chức năng">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Tin tuyển dụng đầy đủ:</b> vị trí, pháp nhân/phòng ban/chức danh, số lượng, trạng thái, <b>loại hình, địa điểm, mức lương (khoảng hoặc chữ), kinh nghiệm, mô tả công việc, yêu cầu, quyền lợi, hạn nộp, người/email/điện thoại liên hệ</b>.</li>
            <li><b>Xem trước tin đăng:</b> trang <code>/recruit/[id]/preview</code> hiển thị tin dạng bài đăng tuyển hoàn chỉnh, có nút <b>In</b> để in/lưu PDF hoặc chia sẻ. Đây là nơi tin được “đăng” trong nội bộ; kênh công khai (website tuyển dụng) là bước sau khi nối backend.</li>
            <li><b>Sửa tin:</b> mở “Sửa tin” trong trang chi tiết để cập nhật mọi trường.</li>
            <li><b>Bảng Kanban:</b> mỗi cột là một bước; bấm nút để chuyển ứng viên sang bước kế tiếp hoặc Loại; ứng viên đã loại có thể Khôi phục.</li>
            <li><b>Chi tiết ứng viên</b> (bấm tên trên thẻ): quản lý các <b>vòng phỏng vấn</b> (người PV, ngày, kết quả Đạt/Không đạt, điểm).</li>
            <li><b>Tuyển → tạo hồ sơ NV (1 chạm):</b> tạo ngay hồ sơ nhân viên kế thừa dữ liệu ứng viên + vị trí của tin (không nhập lại), chuyển ứng viên sang “Nhận việc”.</li>
            <li><b>Onboarding:</b> sau khi tuyển, hệ thống sinh <b>checklist hội nhập</b> (ký HĐ, cấp tài khoản, cấp tài sản, BHXH/thuế, đào tạo hội nhập…) để tick hoàn thành.</li>
            <li>Chỉ số: vị trí đang tuyển / tổng ứng viên / đang offer / đã nhận việc.</li>
          </ul>
        </Block>
        <Block title="Trạng thái tin">
          <Chips items={(Object.keys(OPENING_STATUS_LABEL) as OpeningStatus[]).map((s) => ({ label: OPENING_STATUS_LABEL[s], badge: OPENING_STATUS_BADGE[s] }))} />
        </Block>
        <Block title="Cách dùng">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Đăng tin</b> bằng form bên phải danh sách.</li>
            <li>Bấm vào tin → <b>thêm ứng viên</b> và <b>di chuyển</b> họ qua các bước bằng nút trên thẻ.</li>
          </ol>
        </Block>
      </Section>

      {/* ===== Performance ===== */}
      <Section id="performance" icon="target" title="Đánh giá KPI" routes="/performance · /performance/[id]"
        purpose="Đánh giá hiệu suất nhân viên theo kỳ, chấm điểm KPI có trọng số và xếp loại.">
        <Block title="Logic chấm điểm">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Kỳ đánh giá</b> (quý/năm) có trạng thái mở/đóng.</li>
            <li>Mỗi bản đánh giá gồm các <b>mục KPI có trọng số %</b> (nên tổng 100%), chấm điểm <b>1–5</b>.</li>
            <li><b>Quy trình:</b> Nhân viên <b>tự đánh giá</b> (Chưa bắt đầu → NV tự đánh giá) → Quản lý chấm điểm (QL đang chấm) → Chốt. Điểm tự đánh giá hiển thị cạnh điểm của quản lý để đối chiếu.</li>
            <li><b>Điểm tổng</b> = trung bình có trọng số các mục đã chấm (theo điểm của quản lý).</li>
            <li><b>Xếp loại:</b> A ≥ 4,5 (Xuất sắc) · B ≥ 3,5 (Tốt) · C ≥ 2,5 (Đạt) · D &lt; 2,5 (Cần cải thiện).</li>
          </ul>
        </Block>
        <Block title="Trạng thái bản đánh giá">
          <Chips items={(Object.keys(REVIEW_STATUS_LABEL) as ReviewStatus[]).map((s) => ({ label: REVIEW_STATUS_LABEL[s], badge: REVIEW_STATUS_BADGE[s] }))} />
        </Block>
        <Block title="Cách dùng">
          <ol style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Chọn <b>kỳ đánh giá</b> ở thanh lọc.</li>
            <li>Bấm ✎ ở dòng để mở bản đánh giá → chấm điểm từng mục + nhận xét.</li>
            <li>Tick <b>“Chốt đánh giá”</b> (cần chấm đủ mọi mục) để khoá bản đánh giá.</li>
            <li><b>Tìm nhanh:</b> bảng “Danh sách đánh giá” có ô tìm theo tên/mã nhân viên khi nhiều bản ghi.</li>
          </ol>
        </Block>
      </Section>

      {/* ===== Training ===== */}
      <Section id="training" icon="cap" title="Đào tạo & Phát triển" routes="/training · /training/[id]"
        purpose="Quản lý khoá học và ghi danh học viên; theo dõi kết quả hoàn thành.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Khoá học có lĩnh vực, đơn vị đào tạo, số giờ, chi phí, thời gian và trạng thái (Dự kiến / Đang diễn ra / Hoàn thành / Đã huỷ).</li>
            <li>Mở một khoá → <b>ghi danh</b> nhân viên; đánh dấu <b>hoàn thành</b> kèm điểm. Tránh ghi danh trùng.</li>
          </ul>
        </Block>
      </Section>

      {/* ===== Rewards ===== */}
      <Section id="rewards" icon="award" title="Khen thưởng – Kỷ luật" routes="/rewards"
        purpose="Ghi nhận quyết định khen thưởng và kỷ luật của nhân viên, kèm số tiền và số quyết định.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Mỗi bản ghi gắn một nhân viên, loại (Khen thưởng/Kỷ luật), tiêu đề, lý do, số tiền (nếu có), ngày và số quyết định.</li>
            <li>Lọc theo phạm vi như các phân hệ khác; số tiền thưởng hiển thị (+), kỷ luật (−).</li>
            <li><b>Tìm nhanh:</b> bảng “Danh sách quyết định” có ô tìm theo tên/mã nhân viên khi danh sách dài.</li>
          </ul>
        </Block>
      </Section>

      {/* ===== Benefits ===== */}
      <Section id="benefits" icon="award" title="Phúc lợi" routes="/benefits"
        purpose="Quản lý danh mục phúc lợi (BH sức khoẻ, du lịch, quà lễ tết…) và đăng ký cho nhân viên.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Danh mục phúc lợi: mã, tên, nhóm, giá trị/người/năm, bật/tắt áp dụng.</li>
            <li><b>Đăng ký</b> một phúc lợi cho nhân viên; xem ai đang hưởng phúc lợi nào.</li>
          </ul>
        </Block>
      </Section>

      {/* ===== Reports ===== */}
      <Section id="reports" icon="chart" title="Báo cáo" routes="/reports"
        purpose="Phân tích nhân sự tổng hợp theo 6 nhóm chỉ số, lọc được theo pháp nhân; số liệu tính realtime.">
        <Block title="6 nhóm chỉ số">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Nhân sự:</b> quy mô, cơ cấu theo pháp nhân/phòng ban/loại hình/chức danh, thâm niên trung bình.</li>
            <li><b>Đa dạng:</b> tỷ lệ nữ, tuổi trung bình, cơ cấu giới tính, phân bố nhóm tuổi.</li>
            <li><b>Tuyển dụng:</b> tuyển trong năm/tháng, biểu đồ tuyển mới 6 tháng.</li>
            <li><b>Nghỉ phép &amp; Nghỉ việc:</b> đang nghỉ hôm nay, đơn chờ duyệt, ngày phép duyệt trong tháng, đã nghỉ việc, nghỉ theo loại.</li>
            <li><b>Biến động nhân sự:</b> tỷ lệ nghỉ việc (turnover), nghỉ việc theo phòng/tháng, thâm niên trung bình khi nghỉ.</li>
            <li><b>Phân tích lương:</b> tổng quỹ lương, lương trung bình, lương TB theo phòng/cấp bậc/giới, chênh lệch lương Nam–Nữ.</li>
          </ul>
        </Block>
        <Block title="Xuất / Nhập Excel">
          <p className="small" style={{ margin: 0 }}>
            Nút <b>Xuất Excel</b> (cần quyền <code>report.export</code>) tải file <b>.xlsx thật</b> (số liệu là ô số, mở thẳng bằng Excel, đúng tiếng Việt): <b>danh bạ nhân viên</b> ở trang Báo cáo/Nhân viên, <b>bảng lương theo tháng</b> ở trang Tính lương. Dữ liệu xuất theo đúng phạm vi của bạn.
            {" "}Phần <b>Nhập nhân viên từ Excel</b> (cần quyền <code>employee.create</code>): bấm <b>Tải file mẫu</b> để lấy đúng tiêu đề cột, điền dữ liệu rồi tải lên — hệ thống đọc trực tiếp tệp <code>.xlsx</code>.
          </p>
        </Block>
      </Section>

      {/* ===== Notifications ===== */}
      <Section id="notifications" icon="bell" title="Thông báo" routes="/notifications · chuông trên thanh trên cùng"
        purpose="Cập nhật realtime cho từng người dùng theo sự kiện liên quan tới họ.">
        <Block title="Chức năng & logic">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Chuông ở góc trên hiển thị <b>số thông báo chưa đọc</b>; bấm để xem danh sách.</li>
            <li><b>Sự kiện sinh thông báo (hai chiều):</b> gửi đơn nghỉ → báo người duyệt; duyệt/từ chối nghỉ → báo người gửi; đăng ký OT → báo người duyệt, được duyệt/từ chối OT → báo người đăng ký; khen thưởng/kỷ luật → báo nhân viên; <b>đổi lịch làm việc</b> → nhân viên tự đổi báo HR/Quản lý, HR/Quản lý đổi hộ báo nhân viên.</li>
            <li><b>Ba kênh cùng lúc cho mỗi thông báo:</b> (1) chuông trong app; (2) <b>realtime</b> — màn người nhận đang mở tự cập nhật không cần tải lại (qua bảng tín hiệu <code>realtime_signals</code> của Supabase); (3) <b>email</b> gửi tới email cá nhân của người nhận (qua Resend — chỉ chạy khi đã cấu hình khoá <code>RESEND_API_KEY</code>).</li>
            <li>Đánh dấu đã đọc từng cái hoặc tất cả.</li>
          </ul>
        </Block>
      </Section>

      {/* ===== Settings ===== */}
      <Section id="settings" icon="settings" title="Cài đặt & phân quyền" routes="/settings (Pháp nhân · Phòng ban · Chức danh · Phụ cấp & Khấu trừ · Ngày lễ · Quy trình duyệt · Vai trò & quyền · Nhật ký)"
        purpose="Cấu hình cây tổ chức và hệ thống phân quyền (RBAC). Truy cập ở góc dưới thanh bên.">
        <Block title="Các tab">
          <ul style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li><b>Pháp nhân:</b> thêm/sửa công ty (MST, số ĐKKD, mã BHXH, vùng lương, ngân hàng chi lương &amp; số TK công ty, cờ công ty mẹ…).</li>
            <li><b>Phòng ban:</b> cây phân cấp theo từng pháp nhân; thêm/xoá.</li>
            <li><b>Chức danh:</b> danh mục dùng chung; thêm, bật/tắt.</li>
            <li><b>Phụ cấp &amp; Khấu trừ:</b> danh mục khoản cộng/trừ vào lương (kèm cờ chịu thuế / đóng BHXH).</li>
            <li><b>Ngày lễ:</b> khai báo ngày nghỉ lễ trong năm (ảnh hưởng lịch &amp; tính công).</li>
            <li><b>Quy trình duyệt:</b> đặt số cấp phê duyệt đơn nghỉ phép (1–3 cấp).</li>
            <li><b>Vai trò &amp; quyền:</b> ma trận bật/tắt quyền cho từng vai trò; bảng <b>Phân quyền người dùng</b> cho <b>gán/đổi/gỡ vai trò + phạm vi dữ liệu</b> ({Object.values(SCOPE_LABEL).join(" · ")}) cho từng tài khoản, áp dụng ngay. Không thể tự gỡ vai trò của chính mình (chống khoá ngoài).</li>
            <li><b>Nhật ký:</b> xem lịch sử thao tác nhạy cảm (thêm/sửa/xoá NV, duyệt đơn, chốt lương, đổi quyền…).</li>
          </ul>
        </Block>
        <Block title="Cấu hình hệ thống hiện tại">
          <table>
            <tbody>
              <tr><td><b>Tên hệ thống</b></td><td>{group.name}</td></tr>
              <tr><td><b>Chủ sở hữu</b></td><td>{group.owner ?? "—"}</td></tr>
              <tr><td><b>Email hệ thống</b></td><td>{group.systemEmail ?? "—"}</td></tr>
              <tr><td><b>Điện thoại</b></td><td>{group.phone ?? "—"}</td></tr>
              <tr><td><b>Website</b></td><td>{group.website ?? "—"}</td></tr>
              <tr><td><b>Ngày chốt công</b></td><td>{group.payCutoffDay ? `Ngày ${group.payCutoffDay} hằng tháng` : "—"}</td></tr>
              <tr><td><b>Ngày trả lương</b></td><td>{group.payDay ? `Ngày ${group.payDay} hằng tháng` : "—"}</td></tr>
              <tr><td><b>Giờ làm chuẩn</b></td><td>{group.standardHours ?? "—"}</td></tr>
            </tbody>
          </table>
        </Block>
        <Block title={`Vai trò hệ thống (${roles.length})`}>
          <table>
            <thead><tr><th>Mã</th><th>Tên</th><th style={{ textAlign: "center" }}>Số quyền</th><th>Mô tả</th></tr></thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td><span className="badge b-indigo">{r.code}</span></td>
                  <td><b>{r.name}</b></td>
                  <td style={{ textAlign: "center" }}>{r.permissions.length}</td>
                  <td className="small muted">{r.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
        <Block title="Phạm vi dữ liệu">
          <Chips items={(Object.keys(SCOPE_LABEL) as ScopeType[]).map((s) => ({ label: SCOPE_LABEL[s], badge: "b-amber" }))} />
        </Block>
        <Block title={`Danh mục quyền (${PERMISSIONS.length})`}>
          <table>
            <thead><tr><th>Phân hệ</th><th>Quyền</th><th>Mô tả</th></tr></thead>
            <tbody>
              {[...permByModule.entries()].map(([mod, perms]) =>
                perms.map((p, i) => (
                  <tr key={p.code}>
                    {i === 0 ? <td rowSpan={perms.length}><b>{MODULE_LABEL[mod] ?? mod}</b></td> : null}
                    <td><code>{p.code}</code></td>
                    <td className="small muted">{p.description}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </Block>
      </Section>

      {/* Ghi chú bảo trì */}
      <div className="card" style={{ borderLeft: "3px solid var(--brand-1)" }}>
        <p className="small muted" style={{ margin: 0 }}>
          <b>Về tài liệu này.</b> Các bảng dữ kiện (tỷ lệ bảo hiểm, biểu thuế, danh mục quyền, vai trò, loại nghỉ, ca làm, các bước tuyển dụng…) được lấy <b>trực tiếp từ cấu hình nguồn của hệ thống</b> nên luôn khớp với logic thực tế. Phần mô tả &amp; hướng dẫn được cập nhật mỗi khi chức năng thay đổi.
        </p>
      </div>
    </div>
  );
}
