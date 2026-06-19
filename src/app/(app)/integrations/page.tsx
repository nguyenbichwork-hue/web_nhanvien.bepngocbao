import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { haravanConfigured, listHaravanWebhooks, HARAVAN_WEBHOOK_TOPICS } from "@/lib/haravan/client";
import { isSupabaseStoreConfigured } from "@/lib/org/persist";
import { getGroup } from "@/lib/org/store";
import { registerWebhooksAction, updateSystemConfigAction } from "./actions";

export const dynamic = "force-dynamic";

type SP = { reg?: string; err?: string; cfg?: string };

function StatusRow({ label, on, hint }: { label: string; on: boolean; hint: string }) {
  return (
    <tr>
      <td><b className="small">{label}</b><div className="urole">{hint}</div></td>
      <td style={{ textAlign: "right" }}>
        <span className={`badge ${on ? "b-green" : "b-gray"}`}>{on ? "Đã cấu hình" : "Chưa cấu hình"}</span>
      </td>
    </tr>
  );
}

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission("system.rbac");
  const sp = await searchParams;

  const env = (k: string) => Boolean(process.env[k]);
  const defaultBase =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  const [webhooks, group] = await Promise.all([
    haravanConfigured() ? listHaravanWebhooks() : Promise.resolve([]),
    getGroup(),
  ]);

  let regMsg: string | null = null;
  if (sp.reg) {
    const [c, e, x] = sp.reg.split("-");
    regMsg = `Đăng ký webhook: ${c} mới tạo · ${e} đã có · ${x} lỗi.`;
  }

  // Số kết nối đã cấu hình — từ trạng thái .env / Supabase sẵn có.
  const connFlags = [
    env("HARAVAN_API_TOKEN"),
    env("HARAVAN_WEBHOOK_SECRET"),
    env("ZALO_OA_ACCESS_TOKEN"),
    env("ZALO_ZNS_ACCESS_TOKEN"),
    env("OPENAI_API_KEY") || env("GEMINI_API_KEY"),
    env("CRON_SECRET"),
    isSupabaseStoreConfigured,
  ];
  const connCount = connFlags.filter(Boolean).length;

  return (
    <div>
      <PageHero
        icon="settings"
        title="Tích hợp & Kết nối"
        subtitle="Trạng thái các kết nối bên ngoài (Haravan, Zalo, AI, Supabase) và công cụ quản trị webhook."
        crumb={[["Trang chủ", "/dashboard"], ["Quản trị"], ["Tích hợp & Kết nối"]]}
        stats={[
          { label: "Kết nối đã cấu hình", value: `${connCount}/${connFlags.length}`, tone: connCount === connFlags.length ? "up" : "flat" },
          { label: "Webhook đăng ký", value: webhooks.length },
          { label: "Lưu trữ thật", value: isSupabaseStoreConfigured ? "Supabase" : "Mẫu", tone: isSupabaseStoreConfigured ? "up" : "flat" },
        ]}
      />

      {regMsg && <div className="card mt" style={{ borderColor: "var(--c-green)" }}><p className="small" style={{ margin: 0 }}><Icon name="check" /> {regMsg}</p></div>}
      {sp.cfg && <div className="card mt" style={{ borderColor: "var(--c-green)" }}><p className="small" style={{ margin: 0 }}><Icon name="check" /> Đã lưu cấu hình hệ thống.</p></div>}
      {sp.err && <div className="card mt" style={{ borderColor: "var(--c-rose)" }}><p className="small" style={{ margin: 0 }}><Icon name="alert" /> {sp.err}</p></div>}

      {/* Cấu hình hệ thống — sửa trực tiếp, không cần đụng code */}
      <div className="card mt">
        <div className="card-h">
          <div><h3 className="sec-title">Cấu hình hệ thống</h3><div className="sub">Thông tin doanh nghiệp &amp; tham số chung — dùng cho hoá đơn, email, tính lương.</div></div>
        </div>
        <form action={updateSystemConfigAction} style={{ display: "grid", gap: 12 }}>
          <div className="grid-k g-2" style={{ gap: 12 }}>
            <div className="field" style={{ margin: 0 }}><label>Tên doanh nghiệp</label><input name="name" defaultValue={group.name ?? ""} placeholder="Bếp Ngọc Bảo" /></div>
            <div className="field" style={{ margin: 0 }}><label>Chủ sở hữu</label><input name="owner" defaultValue={group.owner ?? ""} /></div>
            <div className="field" style={{ margin: 0 }}><label>Email hệ thống</label><input name="systemEmail" type="email" defaultValue={group.systemEmail ?? ""} /></div>
            <div className="field" style={{ margin: 0 }}><label>Điện thoại</label><input name="phone" defaultValue={group.phone ?? ""} /></div>
            <div className="field" style={{ margin: 0 }}><label>Website</label><input name="website" defaultValue={group.website ?? ""} /></div>
            <div className="field" style={{ margin: 0 }}><label>Giờ làm chuẩn</label><input name="standardHours" defaultValue={group.standardHours ?? ""} placeholder="09:00–18:00…" /></div>
            <div className="field" style={{ margin: 0 }}><label>Ngày chốt công (1–31)</label><input name="payCutoffDay" type="number" min={1} max={31} defaultValue={group.payCutoffDay ?? ""} /></div>
            <div className="field" style={{ margin: 0 }}><label>Ngày trả lương (1–31)</label><input name="payDay" type="number" min={1} max={31} defaultValue={group.payDay ?? ""} /></div>
          </div>
          <button type="submit" className="btn primary" style={{ justifySelf: "start" }}><Icon name="check" /> Lưu cấu hình</button>
        </form>
      </div>

      {/* Trạng thái cấu hình */}
      <div className="card mt">
        <div className="card-h"><h3 className="sec-title">Trạng thái cấu hình (.env)</h3></div>
        <table>
          <tbody>
            <StatusRow label="Haravan Admin API" on={env("HARAVAN_API_TOKEN")} hint="HARAVAN_API_TOKEN — sản phẩm/đơn/khách/tồn kho" />
            <StatusRow label="Haravan Webhook" on={env("HARAVAN_WEBHOOK_SECRET")} hint="HARAVAN_WEBHOOK_SECRET — xác thực HMAC webhook" />
            <StatusRow label="Zalo OA (chat)" on={env("ZALO_OA_ACCESS_TOKEN")} hint="ZALO_OA_ACCESS_TOKEN — hộp thoại 2 chiều /inbox" />
            <StatusRow label="Zalo ZNS (chăm sóc)" on={env("ZALO_ZNS_ACCESS_TOKEN")} hint="ZALO_ZNS_ACCESS_TOKEN — nhắc bảo hành 1/7/30/90" />
            <StatusRow label="Thiết kế bếp AI" on={env("OPENAI_API_KEY") || env("GEMINI_API_KEY")} hint="OPENAI_API_KEY / GEMINI_API_KEY — /design" />
            <StatusRow label="Bảo vệ Cron" on={env("CRON_SECRET")} hint="CRON_SECRET — chặn gọi trái phép /api/cron/*" />
            <StatusRow label="Supabase (lưu trữ thật)" on={isSupabaseStoreConfigured} hint="NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY" />
          </tbody>
        </table>
      </div>

      {/* Webhook Haravan */}
      <div className="card mt">
        <div className="card-h">
          <h3 className="sec-title">Webhook Haravan</h3>
          <span className={`badge ${haravanConfigured() ? "b-green" : "b-gray"}`}>{webhooks.length} đang đăng ký</span>
        </div>
        {!haravanConfigured() ? (
          <p className="muted small" style={{ padding: "10px 0" }}>Cần cấu hình <code>HARAVAN_API_TOKEN</code> trước.</p>
        ) : (
          <>
            <p className="small muted">Các topic BNB lắng nghe: {HARAVAN_WEBHOOK_TOPICS.join(", ")}.</p>
            <table>
              <tbody>
                <tr>
                  <td><b className="small">URL nhận webhook</b><div className="urole">Khai báo địa chỉ này trong Haravan admin cho mỗi topic.</div></td>
                  <td className="small muted" style={{ wordBreak: "break-all", textAlign: "right" }}><code>{defaultBase || "<domain>"}/api/haravan/webhook</code></td>
                </tr>
                <tr>
                  <td><b className="small">Xác thực chữ ký (HMAC)</b><div className="urole">HARAVAN_WEBHOOK_SECRET = chuỗi “Tất cả webhook đánh dấu với…”.</div></td>
                  <td style={{ textAlign: "right" }}><span className={`badge ${env("HARAVAN_WEBHOOK_SECRET") ? "b-green" : "b-amber"}`}>{env("HARAVAN_WEBHOOK_SECRET") ? "Đã bật" : "Chưa bật"}</span></td>
                </tr>
              </tbody>
            </table>
            {webhooks.length > 0 ? (
              <table style={{ marginTop: 10 }}>
                <thead><tr><th>Topic</th><th>Địa chỉ</th></tr></thead>
                <tbody>
                  {webhooks.map((w) => (
                    <tr key={w.id}><td className="small"><b>{w.topic}</b></td><td className="small muted" style={{ wordBreak: "break-all" }}>{w.address}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="small muted" style={{ marginTop: 10 }}>
                <Icon name="alert" /> Token hiện chưa có scope <code>com.*webhooks</code> nên không liệt kê/đăng ký tự động được —
                hãy <b>thêm webhook thủ công</b> trong Haravan admin (Cấu hình → Webhook) với URL ở trên. Nút dưới chỉ hoạt động khi token có scope webhook.
              </p>
            )}
            <form action={registerWebhooksAction} style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Domain public (đã deploy)</label>
                <input name="baseUrl" defaultValue={defaultBase} placeholder="https://bnb.vercel.app" required />
              </div>
              <button type="submit" className="btn primary" style={{ justifySelf: "start" }}>
                <Icon name="settings" /> Thử đăng ký tự động (cần scope webhook)
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
