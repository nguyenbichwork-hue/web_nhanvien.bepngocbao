import { Icon } from "@/components/icon";
import { updateGroupAction } from "@/lib/org/actions";
import { getApprovalConfig, getGroup, getScheduleConfig } from "@/lib/org/store";
import { requirePermission } from "@/lib/auth/session";

const WD = ["", "T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default async function GroupSettingsPage() {
  await requirePermission("org.manage");
  const [group, approval, sched] = await Promise.all([
    getGroup(),
    getApprovalConfig(),
    getScheduleConfig(),
  ]);
  const workDays = sched.workingWeekdays
    .map((d) => WD[d === 0 ? 7 : d])
    .join(", ");

  return (
    <div className="grid-k g-2" style={{ alignItems: "start" }}>
      <div className="card hover">
        <div className="card-h">
          <div>
            <h3>Cấu hình tập đoàn</h3>
            <div className="sub">Thông tin chung & tham số mặc định toàn nhóm công ty.</div>
          </div>
          <span className="badge b-indigo">{group.code}</span>
        </div>

        <form action={updateGroupAction} style={{ marginTop: 8 }}>
          <div className="grid-k g-2">
            <div className="field">
              <label>Tên tập đoàn *</label>
              <input name="name" required defaultValue={group.name} />
            </div>
            <div className="field">
              <label>Tên thương hiệu hiển thị</label>
              <input name="shortName" defaultValue={group.shortName ?? ""} placeholder="K-Homes" />
            </div>
            <div className="field">
              <label>Chủ sở hữu / Người sáng lập</label>
              <input name="owner" defaultValue={group.owner ?? ""} />
            </div>
            <div className="field">
              <label>Email hệ thống</label>
              <input name="systemEmail" type="email" defaultValue={group.systemEmail ?? ""} />
            </div>
            <div className="field">
              <label>Điện thoại liên hệ</label>
              <input name="phone" defaultValue={group.phone ?? ""} />
            </div>
            <div className="field">
              <label>Website</label>
              <input name="website" defaultValue={group.website ?? ""} />
            </div>
            <div className="field">
              <label>Ngày chốt công hằng tháng</label>
              <input type="number" name="payCutoffDay" min={1} max={31} defaultValue={group.payCutoffDay ?? ""} />
            </div>
            <div className="field">
              <label>Ngày trả lương hằng tháng</label>
              <input type="number" name="payDay" min={1} max={31} defaultValue={group.payDay ?? ""} />
            </div>
          </div>
          <div className="field">
            <label>Giờ làm việc chuẩn</label>
            <input name="standardHours" defaultValue={group.standardHours ?? ""} placeholder="09:00–18:00, nghỉ trưa 12:00–13:30" />
          </div>
          <button type="submit" className="btn primary">
            <Icon name="check" /> Lưu cấu hình
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Tham số liên quan</h3>
        </div>
        <div className="muted small" style={{ marginBottom: 14 }}>
          Các tham số dưới đây được cấu hình ở trang riêng.
        </div>
        <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none", padding: 0, margin: 0 }}>
          <li className="flex aic between" style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            <span>Số ngày làm việc / tuần</span>
            <b>{sched.workingWeekdays.length} ngày ({workDays})</b>
          </li>
          <li className="flex aic between" style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            <span>Số cấp duyệt đơn (nghỉ/OT)</span>
            <b>{approval.leaveLevels} cấp</b>
          </li>
          <li className="flex aic between" style={{ padding: "10px 0" }}>
            <span>Giảm trừ bản thân (thuế TNCN)</span>
            <b>15.500.000 đ/tháng</b>
          </li>
        </ul>
      </div>
    </div>
  );
}
