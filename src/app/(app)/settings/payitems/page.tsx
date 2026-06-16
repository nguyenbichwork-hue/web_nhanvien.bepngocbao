import { Icon } from "@/components/icon";
import {
  createPayItemAction,
  deletePayItemAction,
  togglePayItemAction,
} from "@/lib/org/actions";
import { listPayItems } from "@/lib/org/store";
import { formatVND } from "@/lib/payroll/calc";
import { PAY_ITEM_KIND_BADGE, PAY_ITEM_KIND_LABEL } from "@/lib/org/types";
import { requirePermission } from "@/lib/auth/session";

export default async function PayItemsPage() {
  await requirePermission("org.manage");
  const items = await listPayItems();
  const allowances = items.filter((p) => p.kind === "allowance").length;
  const deductions = items.length - allowances;

  return (
    <div className="grid-k g-2" style={{ alignItems: "start" }}>
      <div className="card hover">
        <div className="card-h">
          <div>
            <h3>Phụ cấp & Khấu trừ</h3>
            <div className="sub">
              {allowances} khoản phụ cấp · {deductions} khoản khấu trừ · danh mục nền cho tính lương
            </div>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>
            Chưa khai báo khoản nào.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên khoản</th>
                <th>Loại</th>
                <th style={{ textAlign: "right" }}>Mức mặc định</th>
                <th style={{ textAlign: "center" }}>Chịu thuế</th>
                <th style={{ textAlign: "center" }}>Đóng BHXH</th>
                <th style={{ textAlign: "center" }}>Áp dụng</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} style={{ opacity: p.isActive ? 1 : 0.5 }}>
                  <td>
                    <span className="badge b-gray">{p.code}</span>
                  </td>
                  <td>{p.name}</td>
                  <td>
                    <span className={`badge ${PAY_ITEM_KIND_BADGE[p.kind]}`}>
                      {PAY_ITEM_KIND_LABEL[p.kind]}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {p.defaultAmount != null ? formatVND(p.defaultAmount) : "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`badge ${p.taxable ? "b-amber" : "b-gray"}`}>
                      {p.taxable ? "Có" : "Không"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`badge ${p.insurable ? "b-indigo" : "b-gray"}`}>
                      {p.insurable ? "Có" : "Không"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <form action={togglePayItemAction}>
                      <input type="hidden" name="id" value={p.id} />
                      {/* Đang tắt → gửi kèm isActive để BẬT; đang bật → không gửi để TẮT. */}
                      {!p.isActive && <input type="hidden" name="isActive" value="1" />}
                      <button
                        type="submit"
                        className={`badge ${p.isActive ? "b-green" : "b-gray"}`}
                        style={{ border: 0, cursor: "pointer" }}
                        title="Bật/tắt áp dụng"
                      >
                        {p.isActive ? "Đang dùng" : "Ngừng"}
                      </button>
                    </form>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <form action={deletePayItemAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="iconbtn" title="Xoá">
                        <Icon name="trash" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Thêm khoản</h3>
        </div>
        <form action={createPayItemAction}>
          <div className="grid-k g-2">
            <div className="field">
              <label>Mã khoản *</label>
              <input name="code" required placeholder="PC-AN" />
            </div>
            <div className="field">
              <label>Loại *</label>
              <select name="kind" defaultValue="allowance">
                <option value="allowance">Phụ cấp</option>
                <option value="deduction">Khấu trừ</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Tên khoản *</label>
            <input name="name" required placeholder="VD: Phụ cấp ăn trưa" />
          </div>
          <div className="field">
            <label>Mức mặc định (VND)</label>
            <input type="number" name="defaultAmount" min={0} step={1000} placeholder="730000" />
          </div>
          <div className="flex" style={{ gap: 22, marginBottom: 14, flexWrap: "wrap" }}>
            <label className="flex aic" style={{ gap: 8, fontWeight: 600, fontSize: 13.5 }}>
              <input type="checkbox" name="taxable" value="1" style={{ width: 17, height: 17 }} />
              Chịu thuế TNCN
            </label>
            <label className="flex aic" style={{ gap: 8, fontWeight: 600, fontSize: 13.5 }}>
              <input type="checkbox" name="insurable" value="1" style={{ width: 17, height: 17 }} />
              Đóng BHXH
            </label>
          </div>
          <button type="submit" className="btn primary">
            <Icon name="plus" /> Thêm
          </button>
        </form>
      </div>
    </div>
  );
}
