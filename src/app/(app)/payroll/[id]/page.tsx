import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import {
  addPayrollAdjustmentAction,
  adjustSalaryAction,
  deletePayrollAdjustmentAction,
} from "@/lib/org/actions";
import {
  getEmployee,
  getOvertimePay,
  getRewardAdjustment,
  getUnpaidLeaveDays,
  listDepartments,
  listEntities,
  listJobTitles,
  listOvertime,
  listPayrollAdjustments,
  listRewards,
  listSalaryRecords,
  resolveSalary,
  standardWorkdaysInMonth,
} from "@/lib/org/store";
import { ADJ_KIND_LABEL, RECORD_KIND_LABEL, otMultiplierLabel, type AdjustmentKind } from "@/lib/org/types";
import { computePayslip, formatVND, type Region } from "@/lib/payroll/calc";
import { INSURANCE_RATE, PIT_DEPENDENT_DEDUCTION, PIT_SELF_DEDUCTION } from "@/lib/payroll/config";
import { can, requirePermission } from "@/lib/auth/session";
import { canSeeEmployee } from "@/lib/auth/scope";
import { redirect } from "next/navigation";

type Params = { id: string };
type SP = { month?: string };

const currentYm = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  return `Tháng ${Number(m)}/${y}`;
};

function Row({
  label,
  value,
  tone,
  strong,
  sub,
}: {
  label: string;
  value: string;
  tone?: "rose" | "teal";
  strong?: boolean;
  sub?: boolean;
}) {
  const color = tone === "rose" ? "var(--c-rose)" : tone === "teal" ? "var(--c-teal)" : undefined;
  return (
    <div
      className="flex between aic"
      style={{
        padding: sub ? "5px 0 5px 16px" : "9px 0",
        borderBottom: sub ? "none" : "1px solid var(--line)",
      }}
    >
      <span className={sub ? "small muted" : ""} style={{ fontWeight: strong ? 700 : 400 }}>
        {label}
      </span>
      <b style={{ color, fontWeight: strong ? 800 : 600, fontSize: strong ? 16 : 14 }}>{value}</b>
    </div>
  );
}

export default async function PayslipPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SP>;
}) {
  const session = await requirePermission("payroll.read");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!(await canSeeEmployee(session, id))) redirect("/forbidden");
  const ym = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : currentYm();
  const canManage = can(session, "payroll.manage");

  const [emp, entities, departments, jobTitles, unpaidDays, standardDays, sal, payAdjustments, salaryRecords] =
    await Promise.all([
      getEmployee(id),
      listEntities(),
      listDepartments(),
      listJobTitles(),
      getUnpaidLeaveDays(id, ym),
      standardWorkdaysInMonth(ym),
      resolveSalary(id, ym),
      listPayrollAdjustments(id, ym),
      listSalaryRecords(id),
    ]);

  if (!emp) {
    return (
      <div>
        <PageHero
          icon="wallet"
          title="Phiếu lương"
          crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Tính lương", "/payroll"], ["Phiếu lương"]]}
          actions={
            <Link href="/payroll" className="btn">
              <Icon name="chevleft" /> Về bảng lương
            </Link>
          }
        />
        <div className="card">
          <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>
            Không tìm thấy nhân viên.
          </p>
          <div style={{ textAlign: "center" }}>
            <Link href="/payroll" className="btn">
              <Icon name="chevleft" /> Về bảng lương
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const entity = entities.find((e) => e.id === emp.legalEntityId);
  const region = (entity?.region ?? 1) as Region;
  const dept = departments.find((d) => d.id === emp.departmentId)?.name ?? "—";
  const title = jobTitles.find((j) => j.id === emp.jobTitleId)?.name ?? "—";
  // Điều chỉnh kỳ lương: tách chịu thuế (vào gross/thuế) và sau thuế (vào net).
  const signed = (a: (typeof payAdjustments)[number]) =>
    a.kind === "deduction" ? -Math.abs(a.amount) : Math.abs(a.amount);
  const extraTaxable = payAdjustments.filter((a) => a.taxable).reduce((t, a) => t + signed(a), 0);
  const postTaxAdj = payAdjustments.filter((a) => !a.taxable).reduce((t, a) => t + signed(a), 0);
  const s = computePayslip({ ...emp, ...sal }, region, { unpaidDays, standardDays, extraTaxable, postTaxAdjustment: postTaxAdj });
  const pct = (r: number) => `${(r * 100).toLocaleString("vi-VN")}%`;
  // Thưởng/phạt (từ QĐ khen thưởng) + làm thêm giờ trong kỳ → cộng sau thuế.
  const adj = await getRewardAdjustment(emp.id, ym);
  const monthRewards = (await listRewards(emp.id)).filter((r) => r.date.startsWith(ym) && r.amount);
  const ot = await getOvertimePay(emp.id, ym);
  const otRequests = (await listOvertime({ employeeId: emp.id })).filter((o) => o.status === "approved" && o.date.startsWith(ym));
  // Thực nhận = net từ lương + điều chỉnh kỳ sau thuế + thưởng QĐ + OT.
  const netFinal = s.net + postTaxAdj + adj + ot;
  const hasExtra = adj !== 0 || ot > 0 || postTaxAdj !== 0;

  return (
    <div>
      <PageHero
        icon="wallet"
        title={`Phiếu lương · ${emp.fullName}`}
        subtitle={`${monthLabel(ym)} · ${emp.code} · ${entity?.name ?? "—"} · ${dept} · ${title}`}
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Tính lương", "/payroll"], [emp.fullName]]}
        actions={
          <Link href={`/payroll?month=${ym}`} className="btn">
            <Icon name="chevleft" /> Về bảng lương
          </Link>
        }
      />

      {!emp.baseSalary && (
        <div className="card" style={{ marginBottom: 18 }}>
          <p className="muted" style={{ margin: 0 }}>
            Nhân viên này chưa có dữ liệu lương cơ bản.{" "}
            <Link href={`/employees/${emp.id}`}>Bổ sung tại hồ sơ →</Link>
          </p>
        </div>
      )}

      <div className="grid-k g-2">
        {/* Thu nhập & khấu trừ → thực lĩnh */}
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Thu nhập & khấu trừ</h3></div>
          <Row label="Lương cơ bản" value={formatVND(s.base)} />
          <Row label="Phụ cấp" value={formatVND(s.allowance)} />
          {payAdjustments.filter((a) => a.taxable).map((a) => (
            <Row
              key={a.id}
              label={`${ADJ_KIND_LABEL[a.kind]}: ${a.label} (chịu thuế)`}
              value={`${signed(a) >= 0 ? "+" : "−"}${formatVND(Math.abs(signed(a)))}`}
              tone={signed(a) >= 0 ? "teal" : "rose"}
              sub
            />
          ))}
          {s.unpaidDays > 0 && (
            <Row
              label={`Trừ nghỉ không lương (${s.unpaidDays}/${s.standardDays} ngày)`}
              value={`−${formatVND(s.unpaidDeduction)}`}
              tone="rose"
            />
          )}
          <Row label="Thu nhập thực (Gross)" value={formatVND(s.gross)} strong />

          <div style={{ height: 10 }} />
          <Row label="Bảo hiểm NLĐ đóng (10,5%)" value={`−${formatVND(s.empInsurance)}`} tone="rose" />
          <Row label={`BHXH ${pct(INSURANCE_RATE.employee.bhxh)}`} value={formatVND(s.empBhxh)} sub />
          <Row label={`BHYT ${pct(INSURANCE_RATE.employee.bhyt)}`} value={formatVND(s.empBhyt)} sub />
          <Row label={`BHTN ${pct(INSURANCE_RATE.employee.bhtn)}`} value={formatVND(s.empBhtn)} sub />
          <Row label="Thuế TNCN" value={`−${formatVND(s.pit)}`} tone="rose" />

          <div style={{ height: 10 }} />
          {payAdjustments.filter((a) => !a.taxable).map((a) => (
            <Row
              key={a.id}
              label={`${ADJ_KIND_LABEL[a.kind]}: ${a.label}`}
              value={`${signed(a) >= 0 ? "+" : "−"}${formatVND(Math.abs(signed(a)))}`}
              tone={signed(a) >= 0 ? "teal" : "rose"}
            />
          ))}
          {ot > 0 && (
            <>
              <Row label="Tiền làm thêm giờ (OT)" value={`+${formatVND(ot)}`} tone="teal" />
              {otRequests.map((o) => (
                <Row key={o.id} label={`${o.date} · ${o.hours}h × ${otMultiplierLabel(o.multiplier)}`} value="" sub />
              ))}
            </>
          )}
          {monthRewards.map((r) => (
            <Row
              key={r.id}
              label={`${RECORD_KIND_LABEL[r.kind]}: ${r.title}`}
              value={`${r.kind === "reward" ? "+" : "−"}${formatVND(r.amount as number)}`}
              tone={r.kind === "reward" ? "teal" : "rose"}
              sub
            />
          ))}
          {hasExtra ? (
            <>
              <Row label="Thực lĩnh từ lương (Net)" value={formatVND(s.net)} />
              <Row label="Thực nhận sau điều chỉnh" value={formatVND(netFinal)} tone="teal" strong />
            </>
          ) : (
            <Row label="Thực lĩnh (Net)" value={formatVND(s.net)} tone="teal" strong />
          )}
        </div>

        {/* Tính thuế TNCN + chi phí DN */}
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Cơ sở tính thuế TNCN</h3></div>
          <Row label="Thu nhập chịu thuế (Gross − BH)" value={formatVND(s.taxableIncome)} />
          <Row label="Giảm trừ bản thân" value={`−${formatVND(PIT_SELF_DEDUCTION)}`} tone="rose" />
          <Row
            label={`Giảm trừ ${s.dependents} người phụ thuộc`}
            value={`−${formatVND(s.dependents * PIT_DEPENDENT_DEDUCTION)}`}
            tone="rose"
          />
          <Row label="Thu nhập tính thuế (TNTT)" value={formatVND(s.pitBase)} strong />
          <Row label="Thuế TNCN phải nộp" value={formatVND(s.pit)} tone="rose" strong />

          <div style={{ height: 18 }} />
          <div className="card-h"><h3 className="sec-title">Chi phí doanh nghiệp</h3></div>
          <Row label="Bảo hiểm NSDLĐ đóng (21,5%)" value={formatVND(s.erInsurance)} />
          <Row label="Mức lương đóng BHXH/BHYT" value={formatVND(s.insuranceBaseBhxh)} sub />
          <Row label="Mức lương đóng BHTN" value={formatVND(s.insuranceBaseBhtn)} sub />
          <Row label="Tổng chi phí (Gross + BH NSDLĐ)" value={formatVND(s.totalCost)} strong />
        </div>
      </div>

      {/* Điều chỉnh kỳ lương (HR/Admin) */}
      {canManage && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h">
            <div>
              <h3 className="sec-title">Điều chỉnh kỳ lương · {monthLabel(ym)}</h3>
              <div className="sub">Thưởng / phụ cấp thêm / khấu trừ áp riêng cho kỳ này. Khoản chịu thuế sẽ được tính lại thuế TNCN.</div>
            </div>
          </div>
          {payAdjustments.length === 0 ? (
            <p className="muted" style={{ padding: "8px 0" }}>Chưa có điều chỉnh nào trong kỳ.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Loại</th><th>Nội dung</th><th style={{ textAlign: "center" }}>Chịu thuế</th><th style={{ textAlign: "right" }}>Số tiền</th><th></th></tr>
              </thead>
              <tbody>
                {payAdjustments.map((a) => (
                  <tr key={a.id}>
                    <td>{ADJ_KIND_LABEL[a.kind]}</td>
                    <td className="uname">{a.label}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`badge ${a.taxable ? "b-amber" : "b-gray"}`}>{a.taxable ? "Có" : "Không"}</span>
                    </td>
                    <td style={{ textAlign: "right", color: a.kind === "deduction" ? "var(--c-rose)" : "var(--c-teal)" }}>
                      {a.kind === "deduction" ? "−" : "+"}{formatVND(Math.abs(a.amount))}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <form action={deletePayrollAdjustmentAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="employeeId" value={emp.id} />
                        <button type="submit" className="iconbtn" title="Xoá"><Icon name="trash" /></button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <form action={addPayrollAdjustmentAction} style={{ marginTop: 14 }}>
            <input type="hidden" name="employeeId" value={emp.id} />
            <input type="hidden" name="ym" value={ym} />
            <div className="grid-k g-4" style={{ gap: 12, alignItems: "end" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Loại</label>
                <select name="kind" defaultValue="bonus">
                  {(Object.keys(ADJ_KIND_LABEL) as AdjustmentKind[]).map((k) => (
                    <option key={k} value={k}>{ADJ_KIND_LABEL[k]}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Nội dung *</label>
                <input name="label" required placeholder="Thưởng KPI quý, phụ cấp xăng xe…" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Số tiền (VND) *</label>
                <input type="number" name="amount" min="0" step="10000" required />
              </div>
              <label className="flex aic" style={{ gap: 8, fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>
                <input type="checkbox" name="taxable" value="1" style={{ width: 17, height: 17 }} /> Chịu thuế TNCN
              </label>
            </div>
            <button type="submit" className="btn primary" style={{ marginTop: 12 }}><Icon name="plus" /> Thêm điều chỉnh</button>
          </form>
        </div>
      )}

      {/* Chỉnh lương + lịch sử lương (HR/Admin) */}
      {canManage && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h">
            <div>
              <h3 className="sec-title">Điều chỉnh lương</h3>
              <div className="sub">Lương hiện áp cho kỳ: cơ bản <b>{formatVND(sal.baseSalary)}</b>, phụ cấp <b>{formatVND(sal.allowance)}</b>. Tạo điều chỉnh sẽ áp từ tháng hiệu lực.</div>
            </div>
          </div>
          <form action={adjustSalaryAction}>
            <input type="hidden" name="employeeId" value={emp.id} />
            <div className="grid-k g-4" style={{ gap: 12, alignItems: "end" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Hiệu lực từ tháng *</label>
                <input type="month" name="effectiveFrom" defaultValue={ym} required />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Lương cơ bản mới *</label>
                <input type="number" name="baseSalary" min="0" step="100000" defaultValue={sal.baseSalary || ""} required />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Phụ cấp mới</label>
                <input type="number" name="allowance" min="0" step="100000" defaultValue={sal.allowance || ""} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Lương đóng BHXH</label>
                <input type="number" name="insuranceSalary" min="0" step="100000" defaultValue={sal.insuranceSalary || ""} placeholder="mặc định = lương cơ bản" />
              </div>
            </div>
            <div className="field" style={{ marginTop: 12, marginBottom: 12 }}>
              <label>Lý do điều chỉnh</label>
              <input name="reason" placeholder="Tăng lương định kỳ, thăng chức…" />
            </div>
            <button type="submit" className="btn primary"><Icon name="check" /> Lưu điều chỉnh lương</button>
          </form>

          {salaryRecords.length > 0 && (
            <>
              <div className="card-h" style={{ marginTop: 18 }}><h3 className="sec-title" style={{ fontSize: 15 }}>Lịch sử lương</h3></div>
              <table>
                <thead>
                  <tr><th>Hiệu lực từ</th><th style={{ textAlign: "right" }}>Lương cơ bản</th><th style={{ textAlign: "right" }}>Phụ cấp</th><th>Lý do</th></tr>
                </thead>
                <tbody>
                  {salaryRecords.map((r) => (
                    <tr key={r.id}>
                      <td className="uname">{r.effectiveFrom}</td>
                      <td style={{ textAlign: "right" }}>{formatVND(r.baseSalary)}</td>
                      <td style={{ textAlign: "right" }}>{formatVND(r.allowance)}</td>
                      <td className="small muted">{r.reason || "—"}{r.createdByName ? ` · ${r.createdByName}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
