import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { listShiftCheckins } from "@/lib/bnb/store";
import { fmtDateTime } from "@/lib/bnb/util";
import { CheckinWizard } from "./checkin-wizard";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  await requirePermission("shiftreport.read");
  const checkins = await listShiftCheckins();
  return (
    <div>
      <PageHero
        icon="handover"
        title="Báo cáo ca"
        subtitle="Mở ca · đóng ca bằng ảnh checklist (đóng dấu giờ + GPS chống ảnh cũ). Ảnh gửi về Drive + Telegram như cũ; dữ liệu lưu Supabase."
        crumb={[["Trang chủ", "/dashboard"], ["Hiện trường & Hậu mãi"], ["Báo cáo ca"]]}
      />
      <div className="grid-k g-2" style={{ alignItems: "start" }}>
        <CheckinWizard />
        <div className="card">
          <div className="card-h"><h3>Báo cáo gần đây ({checkins.length})</h3></div>
          {checkins.length === 0 ? (
            <p className="muted small" style={{ padding: "10px 0" }}>Chưa có báo cáo ca nào. Tạo báo cáo đầu tiên bên trái.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {checkins.slice(0, 40).map((c) => (
                <div key={c.id} className="card" style={{ background: "var(--surface-2)", padding: 14 }}>
                  <div className="flex between aic" style={{ flexWrap: "wrap", gap: 8 }}>
                    <div className="flex aic gap" style={{ flexWrap: "wrap" }}>
                      <span className={`badge ${c.shift === "open" ? "b-green" : "b-amber"}`}>{c.shiftLabel || (c.shift === "open" ? "Mở ca" : "Đóng ca")}</span>
                      <b className="small">{c.showroom}</b>
                      <span className="urole">{c.employee}</span>
                    </div>
                    <span className="small muted">{fmtDateTime(c.createdAt)}</span>
                  </div>
                  <div className="small muted" style={{ marginTop: 6, display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span>📸 {c.photoCount || 0} ảnh</span>
                    {c.address && <span>📍 {c.address}</span>}
                    {!c.sentToServer && <span style={{ color: "var(--c-rose)" }}>⚠ chưa gửi Drive</span>}
                  </div>
                  {c.note && <p className="small" style={{ marginTop: 6 }}>📝 {c.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
