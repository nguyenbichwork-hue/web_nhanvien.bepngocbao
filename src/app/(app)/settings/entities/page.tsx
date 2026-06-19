import { Icon } from "@/components/icon";
import { updateEntityAction } from "@/lib/org/actions";
import { listEntities } from "@/lib/org/store";
import { requirePermission } from "@/lib/auth/session";

// Hệ thống vận hành cho MỘT công ty (Peaki) — trang này là hồ sơ công ty:
// thông tin pháp lý dùng cho bảng lương, BHXH, phiếu lương & báo cáo.
export default async function CompanyPage() {
  await requirePermission("org.manage");
  const entities = await listEntities();
  const e = entities[0];

  if (!e) {
    return (
      <div className="card">
        <p className="muted">Chưa có hồ sơ công ty.</p>
      </div>
    );
  }

  return (
    <div className="card hover" style={{ maxWidth: 860 }}>
      <div className="card-h">
        <div className="flex aic" style={{ gap: 12 }}>
          <div className="ic" style={{ width: 42, height: 42, borderRadius: 12, background: "var(--c-indigo-soft)", color: "var(--c-indigo)", display: "grid", placeItems: "center" }}>
            <Icon name="building" />
          </div>
          <div>
            <h3>{e.name}</h3>
            <div className="sub">Thông tin công ty — dùng cho lương, BHXH &amp; phiếu lương</div>
          </div>
        </div>
      </div>

      <form action={updateEntityAction} style={{ marginTop: 8 }}>
        <input type="hidden" name="id" value={e.id} />
        <div className="grid-k g-3">
          <div className="field">
            <label>Tên hiển thị *</label>
            <input name="name" required defaultValue={e.name} />
          </div>
          <div className="field">
            <label>Tên pháp lý</label>
            <input name="legalName" defaultValue={e.legalName ?? ""} />
          </div>
          <div className="field">
            <label>Tên tiếng Anh</label>
            <input name="legalNameEn" defaultValue={e.legalNameEn ?? ""} />
          </div>
          <div className="field">
            <label>Mã số thuế (MST)</label>
            <input name="taxCode" defaultValue={e.taxCode ?? ""} />
          </div>
          <div className="field">
            <label>Số ĐKKD</label>
            <input name="regNo" defaultValue={e.regNo ?? ""} />
          </div>
          <div className="field">
            <label>Ngày cấp ĐKKD</label>
            <input type="date" name="regDate" defaultValue={e.regDate ?? ""} />
          </div>
          <div className="field">
            <label>Mã đơn vị BHXH</label>
            <input name="bhxhCode" defaultValue={e.bhxhCode ?? ""} />
          </div>
          <div className="field">
            <label>Vùng lương tối thiểu</label>
            <select name="region" defaultValue={String(e.region ?? 1)}>
              <option value="1">Vùng I</option>
              <option value="2">Vùng II</option>
              <option value="3">Vùng III</option>
              <option value="4">Vùng IV</option>
            </select>
          </div>
          <div className="field">
            <label>Người đại diện</label>
            <input name="director" defaultValue={e.director ?? ""} />
          </div>
          <div className="field">
            <label>Chức vụ đại diện</label>
            <input name="directorTitle" defaultValue={e.directorTitle ?? ""} placeholder="Giám đốc" />
          </div>
          <div className="field">
            <label>Ngân hàng chi lương</label>
            <input name="payrollBank" defaultValue={e.payrollBank ?? ""} />
          </div>
          <div className="field">
            <label>Số TK công ty</label>
            <input name="companyAccount" defaultValue={e.companyAccount ?? ""} />
          </div>
          <div className="field">
            <label>Điện thoại</label>
            <input name="phone" defaultValue={e.phone ?? ""} />
          </div>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" defaultValue={e.email ?? ""} />
          </div>
        </div>
        <div className="field">
          <label>Địa chỉ</label>
          <input name="address" defaultValue={e.address ?? ""} />
        </div>
        <button type="submit" className="btn primary">
          <Icon name="check" /> Lưu thay đổi
        </button>
      </form>
    </div>
  );
}
