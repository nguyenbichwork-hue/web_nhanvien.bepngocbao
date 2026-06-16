import { Icon } from "@/components/icon";
import { EmployeeSelect } from "@/components/employee-select";
import { allocateAssetAction, createAssetAction, deleteAssetAction, returnAllocationAction } from "@/lib/org/actions";
import { listAllocations, listAssets, listEmployees } from "@/lib/org/store";
import { ASSET_CATEGORIES, ASSET_STATUS_BADGE, ASSET_STATUS_LABEL } from "@/lib/org/types";
import { can, requirePermission } from "@/lib/auth/session";

const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default async function AssetsPage() {
  const session = await requirePermission("asset.read");
  const [assets, openAllocs, employees] = await Promise.all([
    listAssets(),
    listAllocations({ openOnly: true }),
    listEmployees(),
  ]);
  const canManage = can(session, "asset.manage");

  const empName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? "—";
  const allocOf = (assetId: string) => openAllocs.find((a) => a.assetId === assetId);
  const roster = employees.filter((e) => e.status !== "left");

  const counts = {
    total: assets.length,
    allocated: assets.filter((a) => a.status === "allocated").length,
    available: assets.filter((a) => a.status === "available").length,
  };

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Tài sản
      </div>
      <div className="page-head">
        <div>
          <h1>Quản lý tài sản cấp phát</h1>
          <p>{counts.total} tài sản · {counts.allocated} đang cấp phát · {counts.available} sẵn sàng.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div><h3>Danh mục tài sản</h3><div className="sub">Cấp phát cho nhân viên & thu hồi khi nghỉ việc</div></div>
        </div>
        {assets.length === 0 ? (
          <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>Chưa có tài sản nào.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Mã</th><th>Tên</th><th>Nhóm</th><th>Trạng thái</th><th>Người giữ</th><th></th></tr>
            </thead>
            <tbody>
              {assets.map((a) => {
                const al = allocOf(a.id);
                return (
                  <tr key={a.id}>
                    <td><span className="badge b-indigo">{a.code}</span></td>
                    <td><div className="uname">{a.name}</div>{a.note && <div className="small muted">{a.note}</div>}</td>
                    <td>{a.category}</td>
                    <td><span className={`badge ${ASSET_STATUS_BADGE[a.status]}`}>{ASSET_STATUS_LABEL[a.status]}</span></td>
                    <td>{al ? <>{empName(al.employeeId)} <span className="small muted">· từ {fmt(al.allocatedDate)}</span></> : "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      {canManage && (
                        <div className="flex gap" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {a.status === "available" && (
                            <details>
                              <summary className="btn ghost small" style={{ listStyle: "none" }}><Icon name="userplus" /> Cấp phát</summary>
                              <form action={allocateAssetAction} className="flex gap" style={{ marginTop: 8 }}>
                                <input type="hidden" name="assetId" value={a.id} />
                                <EmployeeSelect name="employeeId" required employees={roster} placeholder="— Chọn NV —" style={{ minWidth: 200 }} />
                                <button type="submit" className="btn small primary">Cấp</button>
                              </form>
                            </details>
                          )}
                          {al && (
                            <form action={returnAllocationAction}>
                              <input type="hidden" name="id" value={al.id} />
                              <button type="submit" className="btn ghost small"><Icon name="up" /> Thu hồi</button>
                            </form>
                          )}
                          <form action={deleteAssetAction}>
                            <input type="hidden" name="id" value={a.id} />
                            <button type="submit" className="iconbtn" title="Xoá"><Icon name="trash" /></button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {canManage && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h"><h3>Thêm tài sản</h3></div>
          <form action={createAssetAction}>
            <div className="grid-k g-4" style={{ gap: 14 }}>
              <div className="field"><label>Mã tài sản *</label><input name="code" required placeholder="TS-LP-003" /></div>
              <div className="field"><label>Tên *</label><input name="name" required placeholder="Laptop Dell…" /></div>
              <div className="field">
                <label>Nhóm</label>
                <select name="category" defaultValue="Laptop">
                  {ASSET_CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Trạng thái</label>
                <select name="status" defaultValue="available">
                  {(Object.keys(ASSET_STATUS_LABEL) as (keyof typeof ASSET_STATUS_LABEL)[]).map((s) => (
                    <option key={s} value={s}>{ASSET_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field"><label>Ghi chú</label><input name="note" placeholder="Số seri, cấu hình…" /></div>
            <button type="submit" className="btn primary"><Icon name="plus" /> Thêm tài sản</button>
          </form>
        </div>
      )}
    </div>
  );
}
