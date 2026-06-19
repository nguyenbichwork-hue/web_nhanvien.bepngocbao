import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { ImageUpload } from "@/components/image-upload";
import { listSurveys, listLeads, listCustomers } from "@/lib/bnb/store";
import { fmtDate } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import { LAYOUT_LABEL, type KitchenLayout } from "@/lib/bnb/types";
import { createSurveyAction } from "./actions";
import { ChipSelect } from "./chip-select";

export const dynamic = "force-dynamic";

const LAYOUTS = Object.keys(LAYOUT_LABEL) as KitchenLayout[];

/** Kích thước LxWxH dạng "dài × rộng × cao cm". */
function dims(l?: number, w?: number, h?: number): string {
  const parts = [l, w, h].filter((x): x is number => typeof x === "number" && x > 0);
  return parts.length ? `${[l || "—", w || "—", h || "—"].join(" × ")} cm` : "—";
}

export default async function SurveyPage() {
  const session = await requirePermission("survey.read");
  const canManage = session.permissions.has("survey.manage");
  const [surveys, leads, customers, names] = await Promise.all([
    listSurveys(),
    listLeads(),
    listCustomers(),
    employeeNameMap(),
  ]);
  const sorted = [...surveys].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const leadName = new Map(leads.map((l) => [l.id, l.name] as const));
  const cusName = new Map(customers.map((c) => [c.id, c.name] as const));
  const refName = (s: { leadId?: string; customerId?: string }) =>
    (s.customerId && cusName.get(s.customerId)) ||
    (s.leadId && leadName.get(s.leadId)) ||
    "Khách lẻ";

  const withPhotos = surveys.filter((s) => (s.photos?.length || 0) > 0).length;

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Khảo sát nhà khách</div>
      <div className="page-head">
        <div>
          <h1>Khảo sát nhà khách</h1>
          <p>Ghi nhận kích thước, hình ảnh và hiện trạng bếp tại nhà khách để tư vấn & báo giá chuẩn.</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card kpi">
          <div className="ic"><Icon name="survey" /></div>
          <div className="val">{surveys.length}</div>
          <div className="lbl">phiếu khảo sát</div>
        </div>
        <div className="card kpi">
          <div className="ic"><Icon name="stove" /></div>
          <div className="val">{withPhotos}</div>
          <div className="lbl">phiếu có ảnh hiện trạng</div>
        </div>
        <div className="card kpi">
          <div className="ic"><Icon name="pin" /></div>
          <div className="val">{leads.length + customers.length}</div>
          <div className="lbl">khách/lead có thể khảo sát</div>
        </div>
      </div>

      {/* Tạo khảo sát */}
      {canManage && (
        <details className="card mt">
          <summary style={{ fontWeight: 700, fontSize: 15.5, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="plus" /> Ghi nhận khảo sát mới
          </summary>
          <form action={createSurveyAction} className="mt" style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Khách hàng / Lead</label>
                <select name="ref" defaultValue="">
                  <option value="">— Khách lẻ —</option>
                  {customers.length > 0 && (
                    <optgroup label="Khách hàng">
                      {customers.map((c) => (
                        <option key={c.id} value={`cus:${c.id}`}>{c.name} · {c.phone}</option>
                      ))}
                    </optgroup>
                  )}
                  {leads.length > 0 && (
                    <optgroup label="Lead">
                      {leads.map((l) => (
                        <option key={l.id} value={`lead:${l.id}`}>{l.name} · {l.phone}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Địa chỉ khảo sát</label>
                <input name="address" placeholder="Số nhà, đường, phường/quận" />
              </div>
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label>Bố cục bếp (layout)</label>
              <ChipSelect
                name="layout"
                defaultValue=""
                options={[
                  { value: "", label: "Chưa rõ" },
                  ...LAYOUTS.map((l) => ({ value: l, label: LAYOUT_LABEL[l] })),
                ]}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div className="field" style={{ margin: 0 }}><label>Dài (cm)</label><input name="lengthCm" inputMode="numeric" placeholder="320" /></div>
              <div className="field" style={{ margin: 0 }}><label>Rộng (cm)</label><input name="widthCm" inputMode="numeric" placeholder="60" /></div>
              <div className="field" style={{ margin: 0 }}><label>Cao (cm)</label><input name="heightCm" inputMode="numeric" placeholder="85" /></div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field" style={{ margin: 0 }}><label>Hiện trạng bếp</label><textarea name="currentStatus" placeholder="Bếp gas cũ, tủ gỗ ẩm mốc, đường điện chưa đạt..." /></div>
              <div className="field" style={{ margin: 0 }}><label>Nhu cầu khách</label><textarea name="needs" placeholder="Muốn bếp từ đôi + hút mùi âm tủ, tông trắng..." /></div>
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label>Ảnh hiện trạng bếp (tối đa 3 ảnh)</label>
              <div className="flex" style={{ gap: 18, flexWrap: "wrap" }}>
                <ImageUpload name="photo0" label="Ảnh 1" variant="card" />
                <ImageUpload name="photo1" label="Ảnh 2" variant="card" />
                <ImageUpload name="photo2" label="Ảnh 3" variant="card" />
              </div>
            </div>

            <div className="field" style={{ margin: 0 }}><label>Ghi chú thêm</label><input name="note" placeholder="Lưu ý lắp đặt, hẹn giờ, người liên hệ tại nhà..." /></div>

            <div>
              <button type="submit" className="btn primary"><Icon name="check" /> Lưu khảo sát</button>
            </div>
          </form>
        </details>
      )}

      {/* Danh sách */}
      <div className="card mt">
        <div className="card-h"><h3>Danh sách khảo sát ({surveys.length})</h3></div>
        {sorted.length === 0 ? (
          <p className="muted small" style={{ padding: "14px 0" }}>Chưa có phiếu khảo sát nào.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Mã</th><th>Khách / Lead</th><th>Bố cục</th><th>Kích thước (D×R×C)</th><th>Ảnh</th><th>Ngày</th><th>Người khảo sát</th></tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id}>
                  <td><b className="small">{s.code}</b></td>
                  <td>
                    <div className="uname">{refName(s)}</div>
                    <div className="urole">{s.address || "—"}</div>
                  </td>
                  <td className="small">{s.layout ? LAYOUT_LABEL[s.layout] : "—"}</td>
                  <td className="small">{dims(s.lengthCm, s.widthCm, s.heightCm)}</td>
                  <td>
                    {(s.photos?.length || 0) > 0 ? (
                      <span className="badge b-indigo">{s.photos!.length} ảnh</span>
                    ) : (
                      <span className="muted small">—</span>
                    )}
                  </td>
                  <td className="small muted">{fmtDate(s.createdAt)}</td>
                  <td className="small muted">{s.byId ? names[s.byId] || "—" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
