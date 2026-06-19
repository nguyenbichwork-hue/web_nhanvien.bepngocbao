import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { DonutChart } from "@/components/charts/rich";
import { EmployeeSelect } from "@/components/employee-select";
import {
  createBenefitAction,
  deleteBenefitAction,
  enrollBenefitAction,
  removeBenefitEnrollmentAction,
  toggleBenefitAction,
} from "@/lib/org/actions";
import { listBenefitEnrollments, listBenefits, listEmployees } from "@/lib/org/store";
import { formatVND } from "@/lib/payroll/calc";
import { compactVnd } from "@/lib/bnb/util";
import { can, requirePermission } from "@/lib/auth/session";

const fmt = (iso?: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default async function BenefitsPage() {
  const session = await requirePermission("benefit.read");
  const [benefits, enrollments, employees] = await Promise.all([
    listBenefits(),
    listBenefitEnrollments(),
    listEmployees(),
  ]);
  const canManage = can(session, "benefit.manage");
  const empName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? "—";
  const benefitName = (id: string) => benefits.find((b) => b.id === id)?.name ?? "—";
  const countOf = (benefitId: string) => enrollments.filter((e) => e.benefitId === benefitId).length;
  const roster = employees.filter((e) => e.status !== "left");

  const activeCount = benefits.filter((b) => b.isActive).length;
  // Tổng giá trị phúc lợi/năm theo số người hưởng thực tế.
  const totalValue = benefits.reduce((s, b) => s + (b.valuePerYear || 0) * countOf(b.id), 0);

  // Cơ cấu lượt đăng ký theo phúc lợi (donut).
  const MIX_COLORS = ["#2563eb", "#7c3aed", "#0e9d6e", "#d98309", "#e23b54", "#0d9488", "#9aa1ab"];
  const mix = benefits
    .map((b, i) => ({ name: b.name, value: countOf(b.id), color: MIX_COLORS[i % MIX_COLORS.length] }))
    .filter((x) => x.value > 0);

  return (
    <div>
      <PageHero
        icon="award"
        title="Phúc lợi"
        subtitle="Danh mục chế độ đãi ngộ và quản lý đăng ký phúc lợi cho nhân viên."
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Phúc lợi"]]}
        stats={[
          { label: "Loại phúc lợi", value: benefits.length },
          { label: "Lượt đăng ký", value: enrollments.length },
          { label: "Giá trị/năm", value: compactVnd(totalValue), tone: "up" },
        ]}
      />

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
        <div className="card kpi grad hover gr-deepblue">
          <div className="ic"><Icon name="award" /></div>
          <div className="val"><CountUp to={activeCount} /></div>
          <div className="lbl">phúc lợi đang áp dụng</div>
        </div>
        <div className="card kpi grad hover gr-azure">
          <div className="ic"><Icon name="users" /></div>
          <div className="val"><CountUp to={enrollments.length} /></div>
          <div className="lbl">lượt đăng ký</div>
        </div>
        <div className="card kpi grad hover gr-teal">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 24 }}>{formatVND(totalValue)}</div>
          <div className="lbl">tổng giá trị/năm</div>
        </div>
      </div>

      {mix.length > 0 && (
        <div className="grid-k g-2 mt" style={{ marginBottom: 20 }}>
          <div className="card hover">
            <div className="card-h"><h3 className="sec-title">Cơ cấu lượt đăng ký theo phúc lợi</h3></div>
            <DonutChart data={mix} height={250} centerValue={enrollments.length} centerLabel="lượt" unit=" lượt" />
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-h"><div><h3 className="sec-title">Danh mục phúc lợi</h3><div className="sub">Chế độ đãi ngộ áp dụng cho nhân viên</div></div></div>
        {benefits.length === 0 ? (
          <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>Chưa có phúc lợi nào.</p>
        ) : (
          <table>
            <thead><tr><th>Mã</th><th>Tên</th><th>Nhóm</th><th style={{ textAlign: "right" }}>Giá trị/năm</th><th style={{ textAlign: "center" }}>Người hưởng</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              {benefits.map((b) => (
                <tr key={b.id}>
                  <td><span className="badge b-indigo">{b.code}</span></td>
                  <td><div className="uname">{b.name}</div>{b.description && <div className="small muted">{b.description}</div>}</td>
                  <td>{b.category ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>{b.valuePerYear ? formatVND(b.valuePerYear) : "—"}</td>
                  <td style={{ textAlign: "center" }}>{countOf(b.id)}</td>
                  <td><span className={`badge ${b.isActive ? "b-green" : "b-gray"}`}>{b.isActive ? "Đang áp dụng" : "Tạm dừng"}</span></td>
                  <td style={{ textAlign: "right" }}>
                    {canManage && (
                      <div className="flex gap" style={{ justifyContent: "flex-end" }}>
                        <form action={toggleBenefitAction}>
                          <input type="hidden" name="id" value={b.id} />
                          {!b.isActive && <input type="hidden" name="isActive" value="1" />}
                          <button type="submit" className="iconbtn" title={b.isActive ? "Tạm dừng" : "Bật lại"}><Icon name={b.isActive ? "x" : "check"} /></button>
                        </form>
                        <form action={deleteBenefitAction}>
                          <input type="hidden" name="id" value={b.id} />
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
        <div className="grid-k g-2" style={{ marginTop: 18, alignItems: "start" }}>
          <div className="card">
            <div className="card-h"><h3 className="sec-title">Thêm phúc lợi</h3></div>
            <form action={createBenefitAction}>
              <div className="grid-k g-2" style={{ gap: 12 }}>
                <div className="field"><label>Mã *</label><input name="code" required placeholder="BH-SK" /></div>
                <div className="field"><label>Nhóm</label><input name="category" placeholder="Bảo hiểm / Phúc lợi…" /></div>
              </div>
              <div className="field"><label>Tên *</label><input name="name" required placeholder="Bảo hiểm sức khoẻ" /></div>
              <div className="field"><label>Giá trị/người/năm</label><input type="number" name="valuePerYear" min="0" step="100000" /></div>
              <div className="field"><label>Mô tả</label><input name="description" /></div>
              <button type="submit" className="btn primary"><Icon name="plus" /> Thêm</button>
            </form>
          </div>

          <div className="card">
            <div className="card-h"><h3 className="sec-title">Đăng ký phúc lợi cho nhân viên</h3></div>
            <form action={enrollBenefitAction} className="flex gap aic" style={{ flexWrap: "wrap" }}>
              <select name="benefitId" required defaultValue="" style={{ height: 38, minWidth: 180 }}>
                <option value="" disabled>— Phúc lợi —</option>
                {benefits.filter((b) => b.isActive).map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
              </select>
              <EmployeeSelect name="employeeId" required employees={roster} placeholder="— Nhân viên —" style={{ minWidth: 220 }} />
              <button type="submit" className="btn primary"><Icon name="plus" /> Đăng ký</button>
            </form>
            <div style={{ marginTop: 14 }}>
              {enrollments.length === 0 ? (
                <p className="muted small">Chưa có đăng ký nào.</p>
              ) : (
                <table>
                  <thead><tr><th>Nhân viên</th><th>Phúc lợi</th><th>Từ ngày</th><th></th></tr></thead>
                  <tbody>
                    {enrollments.map((en) => (
                      <tr key={en.id}>
                        <td className="uname">{empName(en.employeeId)}</td>
                        <td>{benefitName(en.benefitId)}</td>
                        <td>{fmt(en.startDate)}</td>
                        <td style={{ textAlign: "right" }}>
                          <form action={removeBenefitEnrollmentAction}>
                            <input type="hidden" name="id" value={en.id} />
                            <button type="submit" className="iconbtn" title="Gỡ"><Icon name="trash" /></button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
