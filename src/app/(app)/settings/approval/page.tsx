import { Icon } from "@/components/icon";
import { setApprovalLevelsAction } from "@/lib/org/actions";
import { getApprovalConfig } from "@/lib/org/store";
import { requirePermission } from "@/lib/auth/session";

export default async function ApprovalSettingsPage() {
  await requirePermission("org.manage");
  const config = await getApprovalConfig();

  return (
    <div className="card hover" style={{ maxWidth: 720 }}>
      <div className="card-h">
        <div>
          <h3>Quy trình duyệt đơn nghỉ phép</h3>
          <div className="sub">Số cấp phê duyệt cần có để một đơn nghỉ được chấp thuận</div>
        </div>
      </div>
      <form action={setApprovalLevelsAction}>
        <div className="field" style={{ maxWidth: 360 }}>
          <label>Số cấp duyệt</label>
          <select name="leaveLevels" defaultValue={String(config.leaveLevels)}>
            <option value="1">1 cấp — quản lý hoặc HR duyệt là xong</option>
            <option value="2">2 cấp — cần 2 người duyệt (vd Trưởng phòng → HR)</option>
            <option value="3">3 cấp — cần 3 người duyệt</option>
          </select>
        </div>
        <p className="small muted" style={{ marginTop: 4 }}>
          Khi đặt nhiều cấp, đơn chỉ chuyển sang <b>Đã duyệt</b> sau khi đủ số người (khác nhau) phê duyệt; từ chối ở bất kỳ cấp nào là kết thúc.
        </p>
        <button type="submit" className="btn primary" style={{ marginTop: 12 }}>
          <Icon name="check" /> Lưu cấu hình
        </button>
      </form>
    </div>
  );
}
