import { Icon } from "@/components/icon";
import { EmployeeSelect } from "@/components/employee-select";
import { TableFilter } from "@/components/table-filter";
import { createRewardAction, deleteRewardAction } from "@/lib/org/actions";
import { listEmployees, listRewards } from "@/lib/org/store";
import { RECORD_KIND_BADGE, RECORD_KIND_LABEL, type RecordKind } from "@/lib/org/types";
import { formatVND } from "@/lib/payroll/calc";
import { can, requirePermission } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/scope";

const fmt = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default async function RewardsPage() {
  const session = await requirePermission("reward.read");
  const [allRecords, allEmployees] = await Promise.all([listRewards(), listEmployees()]);

  const visIds = await visibleEmployeeIds(session);
  const inScope = (id: string) => visIds === "all" || visIds.has(id);
  const records = allRecords.filter((r) => inScope(r.employeeId));
  const roster = allEmployees.filter((e) => inScope(e.id) && e.status !== "left");
  const empName = (id: string) => allEmployees.find((e) => e.id === id)?.fullName ?? "—";
  const canManage = can(session, "reward.manage");

  const rewards = records.filter((r) => r.kind === "reward").length;
  const disciplines = records.filter((r) => r.kind === "discipline").length;

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Khen thưởng – Kỷ luật
      </div>
      <div className="page-head">
        <div>
          <h1>Khen thưởng – Kỷ luật</h1>
          <p>{rewards} khen thưởng · {disciplines} kỷ luật trong phạm vi của bạn.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div>
            <h3>Danh sách quyết định</h3>
            <div className="sub">{records.length} bản ghi</div>
          </div>
          {records.length > 8 && <TableFilter targetId="rewards-table" />}
        </div>
        {records.length === 0 ? (
          <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>Chưa có khen thưởng/kỷ luật nào.</p>
        ) : (
          <table id="rewards-table">
            <thead>
              <tr><th>Ngày</th><th>Nhân viên</th><th>Loại</th><th>Nội dung</th><th style={{ textAlign: "right" }}>Số tiền</th><th></th></tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{fmt(r.date)}</td>
                  <td className="uname">{empName(r.employeeId)}</td>
                  <td><span className={`badge ${RECORD_KIND_BADGE[r.kind]}`}>{RECORD_KIND_LABEL[r.kind]}</span></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div className="small muted">{r.reason ?? ""}{r.decisionNo ? ` · ${r.decisionNo}` : ""}</div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {r.amount ? (
                      <b style={{ color: r.kind === "reward" ? "var(--c-teal)" : "var(--c-rose)" }}>
                        {r.kind === "reward" ? "+" : "−"}{formatVND(r.amount)}
                      </b>
                    ) : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {canManage && (
                      <form action={deleteRewardAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="iconbtn" title="Xoá"><Icon name="trash" /></button>
                      </form>
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
          <div className="card-h"><h3>Ghi nhận khen thưởng / kỷ luật</h3></div>
          <form action={createRewardAction}>
            <div className="grid-k g-4" style={{ gap: 14 }}>
              <div className="field">
                <label>Nhân viên *</label>
                <EmployeeSelect name="employeeId" required employees={roster} />
              </div>
              <div className="field">
                <label>Loại</label>
                <select name="kind" defaultValue="reward">
                  {(Object.keys(RECORD_KIND_LABEL) as RecordKind[]).map((k) => (
                    <option key={k} value={k}>{RECORD_KIND_LABEL[k]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Ngày</label>
                <input type="date" name="date" />
              </div>
              <div className="field">
                <label>Số quyết định</label>
                <input name="decisionNo" placeholder="QĐ-2026/…" />
              </div>
            </div>
            <div className="grid-k g-2" style={{ gap: 14 }}>
              <div className="field">
                <label>Tiêu đề *</label>
                <input name="title" required placeholder="VD: Hoàn thành xuất sắc chỉ tiêu" />
              </div>
              <div className="field">
                <label>Số tiền (nếu có)</label>
                <input type="number" name="amount" min="0" step="100000" />
              </div>
            </div>
            <div className="field">
              <label>Lý do / mô tả</label>
              <input name="reason" placeholder="Chi tiết lý do…" />
            </div>
            <button type="submit" className="btn primary"><Icon name="plus" /> Ghi nhận</button>
          </form>
        </div>
      )}
    </div>
  );
}
