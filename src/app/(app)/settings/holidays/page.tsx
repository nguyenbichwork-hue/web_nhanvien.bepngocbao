import { Icon } from "@/components/icon";
import { createHolidayAction, deleteHolidayAction } from "@/lib/org/actions";
import { listHolidays } from "@/lib/org/store";
import { requirePermission } from "@/lib/auth/session";

const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const fmt = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};

export default async function HolidaysPage() {
  await requirePermission("org.manage");
  const year = 2026;
  const holidays = await listHolidays(year);
  const totalPaid = holidays.filter((h) => h.paid).length;

  return (
    <div className="grid-k g-2" style={{ alignItems: "start" }}>
      <div className="card hover">
        <div className="card-h">
          <div>
            <h3>Ngày lễ {year}</h3>
            <div className="sub">{holidays.length} ngày · {totalPaid} ngày hưởng lương · trừ khỏi ngày công khi tính lương/phép</div>
          </div>
        </div>
        {holidays.length === 0 ? (
          <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>Chưa khai báo ngày lễ.</p>
        ) : (
          <table>
            <thead><tr><th>Ngày</th><th>Tên</th><th style={{ textAlign: "center" }}>Hưởng lương</th><th></th></tr></thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id}>
                  <td><b>{fmt(h.date)}</b></td>
                  <td>{h.name}</td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`badge ${h.paid ? "b-green" : "b-gray"}`}>{h.paid ? "Có" : "Không"}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <form action={deleteHolidayAction}>
                      <input type="hidden" name="id" value={h.id} />
                      <button type="submit" className="iconbtn" title="Xoá"><Icon name="trash" /></button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-h"><h3>Thêm ngày lễ</h3></div>
        <form action={createHolidayAction}>
          <div className="field">
            <label>Ngày *</label>
            <input type="date" name="date" required defaultValue={`${year}-01-01`} />
          </div>
          <div className="field">
            <label>Tên ngày lễ *</label>
            <input name="name" required placeholder="VD: Quốc khánh" />
          </div>
          <label className="flex aic" style={{ gap: 8, marginBottom: 14, fontWeight: 600, fontSize: 13.5 }}>
            <input type="checkbox" name="paid" value="1" defaultChecked style={{ width: 17, height: 17 }} />
            Hưởng lương
          </label>
          <button type="submit" className="btn primary"><Icon name="plus" /> Thêm</button>
        </form>
      </div>
    </div>
  );
}
