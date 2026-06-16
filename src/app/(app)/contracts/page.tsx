import Link from "next/link";
import { Icon } from "@/components/icon";
import { EmployeeSelect } from "@/components/employee-select";
import { TableFilter } from "@/components/table-filter";
import { createContractAction, deleteContractAction, terminateContractAction } from "@/lib/org/actions";
import { listContracts, listEmployees } from "@/lib/org/store";
import {
  CONTRACT_STATUS_BADGE,
  CONTRACT_STATUS_LABEL,
  CONTRACT_TYPE_LABEL,
  contractStatus,
  type ContractType,
} from "@/lib/org/types";
import { formatVND } from "@/lib/payroll/calc";
import { can, requirePermission } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/scope";

const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default async function ContractsPage() {
  const session = await requirePermission("contract.read");
  const [allContracts, allEmployees] = await Promise.all([listContracts(), listEmployees()]);

  const visIds = await visibleEmployeeIds(session);
  const inScope = (id: string) => visIds === "all" || visIds.has(id);
  const contracts = allContracts.filter((c) => inScope(c.employeeId));
  const roster = allEmployees.filter((e) => inScope(e.id) && e.status !== "left");
  const empName = (id: string) => allEmployees.find((e) => e.id === id)?.fullName ?? "—";
  const canManage = can(session, "contract.manage");

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const soon = new Date(now.getTime() + 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const withStatus = contracts
    .map((c) => ({ c, status: contractStatus(c, today, soon) }))
    .sort((a, b) => (a.c.endDate ?? "9999").localeCompare(b.c.endDate ?? "9999"));
  const alerts = withStatus.filter((x) => x.status === "expiring" || x.status === "expired");

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Hợp đồng lao động
      </div>
      <div className="page-head">
        <div>
          <h1>Hợp đồng lao động</h1>
          <p>{contracts.length} hợp đồng trong phạm vi của bạn · cảnh báo hết hạn trong 60 ngày.</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: 18, borderLeft: "3px solid var(--c-amber)" }}>
          <div className="flex aic" style={{ gap: 10 }}>
            <Icon name="bell" />
            <b>{alerts.length} hợp đồng cần chú ý</b>
          </div>
          <ul className="small" style={{ lineHeight: 1.9, paddingLeft: 18, margin: "8px 0 0" }}>
            {alerts.map(({ c, status }) => (
              <li key={c.id}>
                <b>{empName(c.employeeId)}</b> — HĐ {c.code} {status === "expired" ? "đã hết hạn" : "sắp hết hạn"} ngày {fmt(c.endDate)}.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div className="card-h">
          <div>
            <h3>Danh sách hợp đồng</h3>
            <div className="sub">{contracts.length} hợp đồng</div>
          </div>
          {withStatus.length > 8 && <TableFilter targetId="contracts-table" />}
        </div>
        {withStatus.length === 0 ? (
          <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>Chưa có hợp đồng nào.</p>
        ) : (
          <table id="contracts-table">
            <thead>
              <tr>
                <th>Nhân viên</th><th>Số HĐ</th><th>Loại</th><th>Thời hạn</th>
                <th style={{ textAlign: "right" }}>Lương cơ bản</th><th>Trạng thái</th><th></th>
              </tr>
            </thead>
            <tbody>
              {withStatus.map(({ c, status }) => (
                <tr key={c.id}>
                  <td className="uname">{empName(c.employeeId)}</td>
                  <td><span className="badge b-indigo">{c.code}</span></td>
                  <td>{CONTRACT_TYPE_LABEL[c.type]}</td>
                  <td>{fmt(c.startDate)} → {c.endDate ? fmt(c.endDate) : "vô thời hạn"}</td>
                  <td style={{ textAlign: "right" }}>{c.baseSalary ? formatVND(c.baseSalary) : "—"}</td>
                  <td><span className={`badge ${CONTRACT_STATUS_BADGE[status]}`}>{CONTRACT_STATUS_LABEL[status]}</span></td>
                  <td style={{ textAlign: "right" }}>
                    {canManage && (
                      <div className="flex gap" style={{ justifyContent: "flex-end" }}>
                        <Link href={`/contracts/${c.id}`} className="iconbtn" title="Sửa"><Icon name="edit" /></Link>
                        {status !== "terminated" && (
                          <form action={terminateContractAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <button type="submit" className="iconbtn" title="Chấm dứt HĐ"><Icon name="x" /></button>
                          </form>
                        )}
                        <form action={deleteContractAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="iconbtn" title="Xoá"><Icon name="trash" /></button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canManage && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h"><h3>Tạo hợp đồng</h3></div>
          <form action={createContractAction}>
            <div className="grid-k g-4" style={{ gap: 14 }}>
              <div className="field">
                <label>Nhân viên *</label>
                <EmployeeSelect name="employeeId" required employees={roster} />
              </div>
              <div className="field">
                <label>Số hợp đồng *</label>
                <input name="code" required placeholder="HD-2026-001" />
              </div>
              <div className="field">
                <label>Loại HĐ</label>
                <select name="type" defaultValue="fixed">
                  {(Object.keys(CONTRACT_TYPE_LABEL) as ContractType[]).map((t) => (
                    <option key={t} value={t}>{CONTRACT_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Ngày ký</label>
                <input type="date" name="signedDate" />
              </div>
              <div className="field">
                <label>Ngày bắt đầu *</label>
                <input type="date" name="startDate" required />
              </div>
              <div className="field">
                <label>Ngày kết thúc <span className="muted small">(bỏ trống nếu vô thời hạn)</span></label>
                <input type="date" name="endDate" />
              </div>
              <div className="field">
                <label>Lương cơ bản</label>
                <input type="number" name="baseSalary" min="0" step="100000" />
              </div>
              <div className="field">
                <label>Phụ cấp</label>
                <input type="number" name="allowance" min="0" step="100000" />
              </div>
            </div>
            <div className="field">
              <label>Ghi chú</label>
              <input name="note" placeholder="Điều khoản đặc biệt…" />
            </div>
            <button type="submit" className="btn primary"><Icon name="plus" /> Tạo hợp đồng</button>
          </form>
        </div>
      )}
    </div>
  );
}
