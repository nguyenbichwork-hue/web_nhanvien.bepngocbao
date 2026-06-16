import { listAuditLogs } from "@/lib/org/store";
import { MODULE_LABEL } from "@/lib/org/store";
import { requirePermission } from "@/lib/auth/session";

function fmt(iso: string) {
  const d = iso.slice(0, 10).split("-");
  return `${d[2]}/${d[1]}/${d[0]} ${iso.slice(11, 19)}`;
}

export default async function AuditPage() {
  await requirePermission("system.rbac");
  const logs = await listAuditLogs(300);

  return (
    <div className="card hover">
      <div className="card-h">
        <div>
          <h3>Nhật ký thao tác</h3>
          <div className="sub">{logs.length} bản ghi gần nhất · thao tác nhạy cảm trên hệ thống</div>
        </div>
      </div>
      {logs.length === 0 ? (
        <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>
          Chưa có thao tác nào được ghi nhận. Hãy thử thêm/sửa nhân viên, duyệt đơn nghỉ, chốt lương…
        </p>
      ) : (
        <table>
          <thead>
            <tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Phân hệ</th><th>Chi tiết</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="small">{fmt(l.at)}</td>
                <td className="uname">{l.userName}</td>
                <td><b>{l.action}</b></td>
                <td><span className="badge b-gray">{MODULE_LABEL[l.module] ?? l.module}</span></td>
                <td className="small muted">{l.detail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
