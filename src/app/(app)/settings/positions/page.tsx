import { Icon } from "@/components/icon";
import { createJobTitleAction, toggleJobTitleAction } from "@/lib/org/actions";
import { listJobTitles } from "@/lib/org/store";
import { requirePermission } from "@/lib/auth/session";

const LEVEL_LABEL: Record<number, string> = {
  1: "Nhân viên",
  2: "Trưởng nhóm",
  3: "Quản lý",
  4: "Giám đốc",
  5: "Ban lãnh đạo",
};

export default async function PositionsPage() {
  await requirePermission("org.manage");
  const jobTitles = (await listJobTitles()).sort(
    (a, b) => (b.jobLevel ?? 0) - (a.jobLevel ?? 0),
  );

  return (
    <div className="card hover">
      <div className="card-h">
        <div>
          <h3>Chức danh</h3>
          <div className="sub">Danh mục dùng chung toàn tập đoàn.</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Mã</th>
            <th>Tên chức danh</th>
            <th>Cấp bậc</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {jobTitles.map((j) => (
            <tr key={j.id}>
              <td>
                <span className="badge b-gray">{j.code}</span>
              </td>
              <td className="uname">{j.name}</td>
              <td>
                {j.jobLevel ? (
                  <span className="badge b-indigo">
                    Bậc {j.jobLevel} · {LEVEL_LABEL[j.jobLevel] ?? ""}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td>
                <span className={`badge ${j.isActive ? "b-green" : "b-gray"}`}>
                  {j.isActive ? "Đang dùng" : "Ngừng dùng"}
                </span>
              </td>
              <td style={{ textAlign: "right" }}>
                <form action={toggleJobTitleAction}>
                  <input type="hidden" name="id" value={j.id} />
                  {!j.isActive && <input type="hidden" name="isActive" value="1" />}
                  <button type="submit" className="btn ghost" style={{ height: 34, padding: "0 12px" }}>
                    {j.isActive ? "Ngừng dùng" : "Bật lại"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <details style={{ marginTop: 18 }}>
        <summary className="btn primary" style={{ width: "fit-content", listStyle: "none" }}>
          <Icon name="plus" /> Thêm chức danh
        </summary>
        <form action={createJobTitleAction} style={{ marginTop: 18 }}>
          <div className="grid-k g-3">
            <div className="field">
              <label>Mã *</label>
              <input name="code" required placeholder="ASST" />
            </div>
            <div className="field">
              <label>Tên chức danh *</label>
              <input name="name" required placeholder="Trợ lý" />
            </div>
            <div className="field">
              <label>Cấp bậc</label>
              <select name="jobLevel" defaultValue="1">
                <option value="1">Bậc 1 · Nhân viên</option>
                <option value="2">Bậc 2 · Trưởng nhóm</option>
                <option value="3">Bậc 3 · Quản lý</option>
                <option value="4">Bậc 4 · Giám đốc</option>
                <option value="5">Bậc 5 · Ban lãnh đạo</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn primary">
            <Icon name="check" /> Lưu chức danh
          </button>
        </form>
      </details>
    </div>
  );
}
