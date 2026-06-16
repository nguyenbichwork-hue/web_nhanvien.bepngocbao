import Link from "next/link";
import { Icon } from "@/components/icon";
import { createEntityAction } from "@/lib/org/actions";
import { listDepartments, listEmployees, listEntities } from "@/lib/org/store";
import { requirePermission } from "@/lib/auth/session";

const ROMAN = ["", "I", "II", "III", "IV"];

export default async function EntitiesPage() {
  await requirePermission("org.manage");
  const [entities, departments, employees] = await Promise.all([
    listEntities(),
    listDepartments(),
    listEmployees(),
  ]);

  return (
    <div className="card hover">
      <div className="card-h">
        <div>
          <h3>Pháp nhân</h3>
          <div className="sub">Mỗi công ty có MST, mã BHXH và vùng lương riêng.</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Mã</th>
            <th>Tên công ty</th>
            <th>MST</th>
            <th>Vùng</th>
            <th>NH chi lương</th>
            <th>Phòng ban</th>
            <th>Nhân sự</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entities.map((e) => (
            <tr key={e.id}>
              <td>
                <span className="badge b-indigo">{e.code}</span>
              </td>
              <td>
                <div className="uname flex aic" style={{ gap: 6 }}>
                  {e.name}
                  {e.isParent && <span className="badge b-amber">Công ty mẹ</span>}
                </div>
                <div className="small muted">{e.legalName ?? ""}</div>
              </td>
              <td>{e.taxCode ?? "—"}</td>
              <td>{e.region ? ROMAN[e.region] : "—"}</td>
              <td>
                {e.payrollBank ? (
                  <>
                    {e.payrollBank}
                    {e.companyAccount && <div className="small muted">{e.companyAccount}</div>}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td>{departments.filter((d) => d.legalEntityId === e.id).length}</td>
              <td>{employees.filter((x) => x.legalEntityId === e.id).length}</td>
              <td>
                <span className={`badge ${e.isActive ? "b-green" : "b-gray"}`}>
                  {e.isActive ? "Hoạt động" : "Tạm dừng"}
                </span>
              </td>
              <td style={{ textAlign: "right" }}>
                <Link href={`/settings/entities/${e.id}`} className="iconbtn" title="Sửa">
                  <Icon name="edit" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <details style={{ marginTop: 18 }}>
        <summary className="btn primary" style={{ width: "fit-content", listStyle: "none" }}>
          <Icon name="plus" /> Thêm pháp nhân
        </summary>
        <form action={createEntityAction} style={{ marginTop: 18 }}>
          <div className="grid-k g-3">
            <div className="field">
              <label>Mã pháp nhân *</label>
              <input name="code" required placeholder="PN06" />
            </div>
            <div className="field">
              <label>Tên hiển thị *</label>
              <input name="name" required placeholder="Công ty K-Tech" />
            </div>
            <div className="field">
              <label>Tên pháp lý</label>
              <input name="legalName" placeholder="Công ty CP K-Tech" />
            </div>
            <div className="field">
              <label>Tên tiếng Anh</label>
              <input name="legalNameEn" />
            </div>
            <div className="field">
              <label>Mã số thuế (MST)</label>
              <input name="taxCode" placeholder="0100000006" />
            </div>
            <div className="field">
              <label>Số ĐKKD</label>
              <input name="regNo" />
            </div>
            <div className="field">
              <label>Ngày cấp ĐKKD</label>
              <input type="date" name="regDate" />
            </div>
            <div className="field">
              <label>Mã đơn vị BHXH</label>
              <input name="bhxhCode" />
            </div>
            <div className="field">
              <label>Vùng lương tối thiểu</label>
              <select name="region" defaultValue="1">
                <option value="1">Vùng I</option>
                <option value="2">Vùng II</option>
                <option value="3">Vùng III</option>
                <option value="4">Vùng IV</option>
              </select>
            </div>
            <div className="field">
              <label>Người đại diện</label>
              <input name="director" />
            </div>
            <div className="field">
              <label>Chức vụ đại diện</label>
              <input name="directorTitle" placeholder="Giám đốc" />
            </div>
            <div className="field">
              <label>Ngân hàng chi lương</label>
              <input name="payrollBank" />
            </div>
            <div className="field">
              <label>Số TK công ty</label>
              <input name="companyAccount" />
            </div>
            <div className="field">
              <label>Điện thoại</label>
              <input name="phone" />
            </div>
            <div className="field">
              <label>Email</label>
              <input name="email" type="email" />
            </div>
          </div>
          <div className="field">
            <label>Địa chỉ</label>
            <input name="address" />
          </div>
          <label className="flex aic" style={{ gap: 8, marginBottom: 14, fontSize: 13.5, fontWeight: 600 }}>
            <input type="checkbox" name="isParent" style={{ width: 18, height: 18 }} />
            Là công ty mẹ
          </label>
          <button type="submit" className="btn primary">
            <Icon name="check" /> Lưu pháp nhân
          </button>
        </form>
      </details>
    </div>
  );
}
