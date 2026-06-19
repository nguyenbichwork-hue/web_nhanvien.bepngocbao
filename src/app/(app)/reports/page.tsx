import { Icon } from "@/components/icon";
import { BarChart, CountUp, Donut, HBars } from "@/components/charts";
import { getHrAnalytics, getLeaveAnalytics, getSalaryAnalytics, getTurnoverAnalytics } from "@/lib/org/analytics";
import { formatVND } from "@/lib/payroll/calc";
import { can, requirePermission } from "@/lib/auth/session";

const oneDecimal = (v: number | null, suffix: string) =>
  v === null ? "—" : `${v.toFixed(1).replace(".", ",")}${suffix}`;

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 26 }}>
      <div style={{ margin: "4px 0 14px" }}>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h2>
        <div className="sub">{sub}</div>
      </div>
      {children}
    </section>
  );
}

export default async function ReportsPage() {
  const session = await requirePermission("report.read");

  const [hr, leave, turnover, salary] = await Promise.all([
    getHrAnalytics(),
    getLeaveAnalytics(),
    getTurnoverAnalytics(),
    getSalaryAnalytics(),
  ]);
  const canExport = can(session, "report.export");
  const exportHref = "/export/employees";

  const donut = (data: { label: string; count: number; color: string }[]) =>
    data.map((s) => [s.label, s.count, s.color] as [string, number, string]);

  // Biểu đồ cột tuyển mới 6 tháng — chuẩn hoá chiều cao theo giá trị lớn nhất.
  const maxHire = Math.max(1, ...hr.hiresByMonth.map((m) => m.count));
  const hireBars = hr.hiresByMonth.map(
    (m) => [m.label, Math.round((m.count / maxHire) * 88)] as [string, number],
  );

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Báo cáo
      </div>
      <div className="page-head">
        <div>
          <h1>Báo cáo nhân sự</h1>
          <p>Phân tích tổng quan toàn công ty.</p>
        </div>
        {canExport && (
          <a className="btn" href={exportHref}>
            <Icon name="download" /> Xuất Excel (danh bạ)
          </a>
        )}
      </div>

      {/* ===== Nhóm 1 — Nhân sự ===== */}
      <Section title="Nhân sự" sub="Quy mô & cơ cấu lực lượng lao động">
        <div className="grid-k g-4 stagger" style={{ marginBottom: 18 }}>
          <div className="card kpi hover tone-i">
            <div className="ic"><Icon name="users" /></div>
            <div className="val"><CountUp to={hr.total} /></div>
            <div className="lbl">Tổng nhân sự</div>
          </div>
          <div className="card kpi hover tone-t">
            <div className="ic"><Icon name="check" /></div>
            <div className="val"><CountUp to={hr.active} /></div>
            <div className="lbl">Chính thức</div>
          </div>
          <div className="card kpi hover tone-a">
            <div className="ic"><Icon name="clock" /></div>
            <div className="val"><CountUp to={hr.probation} /></div>
            <div className="lbl">Thử việc</div>
          </div>
          <div className="card kpi hover tone-r">
            <div className="ic"><Icon name="target" /></div>
            <div className="val">{oneDecimal(hr.avgTenure, "")}</div>
            <div className="lbl">Thâm niên TB (năm)</div>
          </div>
        </div>

        <div className="grid-k g-2 stagger" style={{ marginBottom: 18 }}>
          <div className="card hover">
            <div className="card-h"><h3>Theo phòng ban</h3></div>
            <HBars data={hr.byDepartment} unit=" NV" />
          </div>
          <div className="card hover">
            <div className="card-h"><h3>Theo loại hình lao động</h3></div>
            <HBars data={hr.byEmploymentType} unit=" NV" />
          </div>
        </div>

        <div className="card hover">
          <div className="card-h"><h3>Theo chức danh</h3></div>
          <HBars data={hr.byTitle} unit=" NV" />
        </div>
      </Section>

      {/* ===== Nhóm 2 — Đa dạng ===== */}
      <Section title="Đa dạng" sub="Giới tính & độ tuổi">
        <div className="grid-k g-4 stagger" style={{ marginBottom: 18 }}>
          <div className="card kpi hover tone-i">
            <div className="ic"><Icon name="users" /></div>
            <div className="val">{oneDecimal(hr.femalePct, "%")}</div>
            <div className="lbl">Tỷ lệ nữ</div>
          </div>
          <div className="card kpi hover tone-t">
            <div className="ic"><Icon name="user" /></div>
            <div className="val">{oneDecimal(hr.avgAge, "")}</div>
            <div className="lbl">Tuổi trung bình</div>
          </div>
        </div>
        <div className="grid-k g-2 stagger">
          <div className="card hover">
            <div className="card-h"><h3>Cơ cấu giới tính</h3></div>
            {hr.total === 0 ? (
              <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>Chưa có dữ liệu.</p>
            ) : (
              <div className="donut-wrap">
                <Donut data={donut(hr.byGender)} total={hr.byGender.reduce((s, d) => s + d.count, 0)} unit="NV" />
                <div style={{ flex: 1 }}>
                  {hr.byGender.map((d) => (
                    <div key={d.label} className="flex between aic" style={{ padding: "6px 0" }}>
                      <span className="small">
                        <i style={{ background: d.color, width: 11, height: 11, borderRadius: 4, display: "inline-block", marginRight: 8 }} />
                        {d.label}
                      </span>
                      <b className="small">{d.count}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="card hover">
            <div className="card-h"><h3>Phân bố theo nhóm tuổi</h3></div>
            <HBars data={hr.byAgeBand} unit=" NV" />
          </div>
        </div>
      </Section>

      {/* ===== Nhóm 3 — Tuyển dụng ===== */}
      <Section title="Tuyển dụng" sub="Nhân sự gia nhập theo thời gian">
        <div className="grid-k g-4 stagger" style={{ marginBottom: 18 }}>
          <div className="card kpi hover tone-i">
            <div className="ic"><Icon name="userplus" /></div>
            <div className="val"><CountUp to={hr.hiresThisYear} /></div>
            <div className="lbl">Tuyển trong năm</div>
          </div>
          <div className="card kpi hover tone-t">
            <div className="ic"><Icon name="userplus" /></div>
            <div className="val"><CountUp to={hr.hiresThisMonth} /></div>
            <div className="lbl">Tuyển trong tháng</div>
          </div>
        </div>
        <div className="card hover">
          <div className="card-h">
            <div>
              <h3>Tuyển mới theo tháng</h3>
              <div className="sub">6 tháng gần nhất</div>
            </div>
          </div>
          <BarChart data={hireBars} />
          <div className="flex between" style={{ marginTop: 4 }}>
            {hr.hiresByMonth.map((m) => (
              <span key={m.label} className="small muted" style={{ flex: 1, textAlign: "center" }}>
                {m.count}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* ===== Nhóm 4 — Nghỉ phép & Nghỉ việc ===== */}
      <Section title="Nghỉ phép & Nghỉ việc" sub="Vắng mặt và biến động giảm">
        <div className="grid-k g-4 stagger" style={{ marginBottom: 18 }}>
          <div className="card kpi hover tone-a">
            <div className="ic"><Icon name="calendar" /></div>
            <div className="val"><CountUp to={leave.onLeaveToday} /></div>
            <div className="lbl">Đang nghỉ hôm nay</div>
          </div>
          <div className="card kpi hover tone-a">
            <div className="ic"><Icon name="clock" /></div>
            <div className="val"><CountUp to={leave.pending} /></div>
            <div className="lbl">Đơn chờ duyệt</div>
          </div>
          <div className="card kpi hover tone-t">
            <div className="ic"><Icon name="check" /></div>
            <div className="val">{leave.approvedDaysThisMonth.toLocaleString("vi-VN")}</div>
            <div className="lbl">Ngày phép duyệt (tháng)</div>
          </div>
          <div className="card kpi hover tone-r">
            <div className="ic"><Icon name="userminus" /></div>
            <div className="val"><CountUp to={hr.left} /></div>
            <div className="lbl">Đã nghỉ việc</div>
          </div>
        </div>
        <div className="card hover">
          <div className="card-h"><h3>Đơn nghỉ theo loại (trong năm)</h3></div>
          <HBars data={leave.byType} unit=" đơn" />
        </div>
      </Section>

      {/* ===== Nhóm 5 — Biến động nhân sự (Turnover) ===== */}
      <Section title="Biến động nhân sự" sub="Tỷ lệ nghỉ việc & nguyên nhân giảm">
        <div className="grid-k g-4 stagger" style={{ marginBottom: 18 }}>
          <div className="card kpi hover tone-r">
            <div className="ic"><Icon name="chart" /></div>
            <div className="val">{oneDecimal(turnover.turnoverRatePct, "%")}</div>
            <div className="lbl">Tỷ lệ nghỉ việc (năm)</div>
          </div>
          <div className="card kpi hover tone-a">
            <div className="ic"><Icon name="userminus" /></div>
            <div className="val"><CountUp to={turnover.leftThisYear} /></div>
            <div className="lbl">Nghỉ việc trong năm</div>
          </div>
          <div className="card kpi hover tone-i">
            <div className="ic"><Icon name="users" /></div>
            <div className="val"><CountUp to={turnover.headcount} /></div>
            <div className="lbl">Đang làm việc</div>
          </div>
          <div className="card kpi hover tone-t">
            <div className="ic"><Icon name="target" /></div>
            <div className="val">{oneDecimal(turnover.avgTenureLeft, "")}</div>
            <div className="lbl">Thâm niên TB khi nghỉ (năm)</div>
          </div>
        </div>
        <div className="grid-k g-2 stagger">
          <div className="card hover">
            <div className="card-h"><h3>Nghỉ việc theo phòng ban</h3></div>
            {turnover.byDeptLeft.length === 0 ? (
              <p className="muted" style={{ padding: "20px 0", textAlign: "center" }}>Chưa có nghỉ việc.</p>
            ) : (
              <HBars data={turnover.byDeptLeft} unit=" người" />
            )}
          </div>
          <div className="card hover">
            <div className="card-h"><div><h3>Nghỉ việc theo tháng</h3><div className="sub">6 tháng gần nhất</div></div></div>
            <BarChart data={turnover.leftByMonth.map((m) => [m.label, Math.round((m.count / Math.max(1, ...turnover.leftByMonth.map((x) => x.count))) * 88)] as [string, number])} />
            <div className="flex between" style={{ marginTop: 4 }}>
              {turnover.leftByMonth.map((m) => (
                <span key={m.label} className="small muted" style={{ flex: 1, textAlign: "center" }}>{m.count}</span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ===== Nhóm 6 — Phân tích lương ===== */}
      <Section title="Phân tích lương" sub="Quỹ lương, mức lương trung bình & chênh lệch giới">
        <div className="grid-k g-4 stagger" style={{ marginBottom: 18 }}>
          <div className="card kpi hover tone-i">
            <div className="ic"><Icon name="wallet" /></div>
            <div className="val" style={{ fontSize: 20 }}>{formatVND(salary.totalGross)}</div>
            <div className="lbl">Tổng quỹ lương (Gross)</div>
          </div>
          <div className="card kpi hover tone-t">
            <div className="ic"><Icon name="wallet" /></div>
            <div className="val" style={{ fontSize: 20 }}>{salary.avgGross ? formatVND(Math.round(salary.avgGross)) : "—"}</div>
            <div className="lbl">Lương trung bình</div>
          </div>
          <div className="card kpi hover tone-a">
            <div className="ic"><Icon name="chart" /></div>
            <div className="val">{salary.payGapPct == null ? "—" : oneDecimal(salary.payGapPct, "%")}</div>
            <div className="lbl">Chênh lệch lương Nam–Nữ</div>
          </div>
        </div>
        <div className="grid-k g-2 stagger">
          <SalaryTable title="Lương TB theo phòng ban" rows={salary.byDept} />
          <div style={{ display: "grid", gap: 18 }}>
            <SalaryTable title="Lương TB theo cấp bậc" rows={salary.byLevel} />
            <SalaryTable title="Lương TB theo giới tính" rows={salary.byGender} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function SalaryTable({ title, rows }: { title: string; rows: { label: string; avg: number; count: number }[] }) {
  return (
    <div className="card hover">
      <div className="card-h"><h3>{title}</h3></div>
      {rows.length === 0 ? (
        <p className="muted" style={{ padding: "16px 0", textAlign: "center" }}>Chưa có dữ liệu lương.</p>
      ) : (
        <table>
          <thead><tr><th>Nhóm</th><th style={{ textAlign: "center" }}>Số NV</th><th style={{ textAlign: "right" }}>Lương TB</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td style={{ textAlign: "center" }}>{r.count}</td>
                <td style={{ textAlign: "right" }}><b>{formatVND(Math.round(r.avg))}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
