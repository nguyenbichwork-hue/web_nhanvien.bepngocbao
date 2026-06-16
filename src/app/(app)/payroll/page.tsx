import { Fragment } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { EmployeeSelect } from "@/components/employee-select";
import { TableFilter } from "@/components/table-filter";
import { adjustSalaryAction, closePayrollPeriodAction, reopenPayrollPeriodAction } from "@/lib/org/actions";
import {
  getOvertimePay,
  getPayrollAdjustmentTotals,
  getPayrollPeriod,
  getRewardAdjustment,
  getUnpaidLeaveDays,
  listEmployees,
  listEntities,
  resolveSalary,
  standardWorkdaysInMonth,
} from "@/lib/org/store";
import { computePayslip, formatVND, isPaidInMonth, type Region } from "@/lib/payroll/calc";
import {
  PIT_DEPENDENT_DEDUCTION,
  PIT_SELF_DEDUCTION,
} from "@/lib/payroll/config";
import { PAYROLL_STATUS_LABEL } from "@/lib/org/types";
import { can, requirePermission } from "@/lib/auth/session";
import { visibleEmployeeIds, visibleEntityIds } from "@/lib/auth/scope";

type SP = { month?: string; entity?: string; emp?: string };

const currentYm = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  return `Tháng ${Number(m)}/${y}`;
};

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await requirePermission("payroll.read");
  const sp = await searchParams;
  const ym = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : currentYm();
  const entityId = sp.entity || undefined;
  const isSelf = session.scope === "SELF";

  const [allEntities, allEmployees] = await Promise.all([listEntities(), listEmployees()]);

  // Giới hạn theo phạm vi (pháp nhân / cá nhân).
  const visIds = await visibleEmployeeIds(session);
  const vEntities = await visibleEntityIds(session);
  const entities = vEntities === "all" ? allEntities : allEntities.filter((e) => vEntities.includes(e.id));

  const regionOf = (id: string): Region => (allEntities.find((e) => e.id === id)?.region ?? 1) as Region;
  const entityName = (id: string) => allEntities.find((e) => e.id === id)?.name ?? "—";

  const inScope = (id: string) => visIds === "all" || visIds.has(id);
  // Danh sách nhân sự thuộc kỳ (sau lọc phạm vi + pháp nhân) — dùng cho cả bảng lẫn ô lọc nhân viên.
  const scopedEmployees = allEmployees
    .filter((e) => inScope(e.id))
    .filter((e) => (entityId ? e.legalEntityId === entityId : true))
    .filter((e) => isPaidInMonth(e, ym));

  // Lọc theo một nhân viên cụ thể (nếu chọn).
  const empId = sp.emp || undefined;
  const employees = empId ? scopedEmployees.filter((e) => e.id === empId) : scopedEmployees;

  const canManage = can(session, "payroll.manage");
  const period = await getPayrollPeriod(ym);
  const isClosed = period?.status === "closed";

  const standardDays = await standardWorkdaysInMonth(ym);
  const rows = (
    await Promise.all(
      employees.map(async (e) => {
        const unpaidDays = await getUnpaidLeaveDays(e.id, ym);
        const adj = await getRewardAdjustment(e.id, ym); // thưởng(+)/kỷ luật(−) trong kỳ
        const ot = await getOvertimePay(e.id, ym); // tiền làm thêm giờ đã duyệt
        const sal = await resolveSalary(e.id, ym); // lương hiệu lực của kỳ
        const padj = await getPayrollAdjustmentTotals(e.id, ym); // điều chỉnh kỳ (chịu thuế / sau thuế)
        return {
          e,
          sal,
          adj,
          ot,
          slip: computePayslip({ ...e, ...sal }, regionOf(e.legalEntityId), {
            unpaidDays,
            standardDays,
            extraTaxable: padj.taxable,
            postTaxAdjustment: padj.postTax,
          }),
        };
      }),
    )
  ).sort((a, b) => b.slip.gross - a.slip.gross);

  const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + pick(r), 0);
  const totalGross = sum((r) => r.slip.gross);
  const totalNet = sum((r) => r.slip.net + r.slip.postTaxAdjustment + r.adj + r.ot);
  const totalEmpIns = sum((r) => r.slip.empInsurance);
  const totalErIns = sum((r) => r.slip.erInsurance);
  const totalPit = sum((r) => r.slip.pit);

  const missing = rows.filter((r) => !r.slip.base).length;

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Tính lương
      </div>
      <div className="page-head">
        <div>
          <h1>{isSelf ? "Phiếu lương của tôi" : "Bảng lương"}</h1>
          <p>
            {isSelf
              ? monthLabel(ym)
              : `${monthLabel(ym)} · ${entityId ? entityName(entityId) : "Trong phạm vi của bạn"} · ${rows.length} nhân sự`}
          </p>
        </div>
        {!isSelf && can(session, "report.export") && (
          <a className="btn" href={`/export/payroll?month=${ym}${entityId ? `&entity=${entityId}` : ""}`}>
            <Icon name="download" /> Xuất Excel
          </a>
        )}
      </div>

      {/* Bộ lọc kỳ lương */}
      <form className="card" method="get" style={{ marginBottom: 20 }}>
        <div className="grid-k g-4" style={{ gap: 14, alignItems: "end" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Kỳ lương (tháng)</label>
            <input type="month" name="month" defaultValue={ym} />
          </div>
          {!isSelf && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Pháp nhân</label>
              <select name="entity" defaultValue={sp.entity ?? ""}>
                {vEntities === "all" && <option value="">Toàn tập đoàn</option>}
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.code} · {e.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {!isSelf && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Nhân viên</label>
              <EmployeeSelect name="emp" employees={scopedEmployees} defaultValue={sp.emp ?? ""} includeAllOption placeholder="Tất cả nhân viên" />
            </div>
          )}
          <div className="flex gap" style={{ marginBottom: 0 }}>
            <button type="submit" className="btn primary">
              <Icon name="filter" /> {isSelf ? "Xem phiếu lương" : "Xem bảng lương"}
            </button>
          </div>
        </div>
      </form>

      {/* Trạng thái kỳ lương + chốt/mở (người quản lý lương) */}
      {!isSelf && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="flex between aic" style={{ flexWrap: "wrap", gap: 12 }}>
            <div className="flex aic" style={{ gap: 10 }}>
              <span className={`badge ${isClosed ? "b-gray" : "b-green"}`}>{PAYROLL_STATUS_LABEL[period?.status ?? "open"]}</span>
              <span className="small muted">
                Kỳ {monthLabel(ym)}{isClosed && period?.closedByName ? ` · đã chốt bởi ${period.closedByName}` : ""}
              </span>
            </div>
            {canManage && (
              <form action={isClosed ? reopenPayrollPeriodAction : closePayrollPeriodAction}>
                <input type="hidden" name="ym" value={ym} />
                <button type="submit" className={`btn${isClosed ? "" : " primary"}`}>
                  <Icon name={isClosed ? "edit" : "check"} /> {isClosed ? "Mở lại kỳ" : "Chốt kỳ lương"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* KPI tổng — chỉ cho người xem nhiều người (ẩn với chế độ cá nhân) */}
      {!isSelf && (
      <div className="grid-k g-4 stagger" style={{ marginBottom: 20 }}>
        <div className="card kpi hover tone-i">
          <div className="ic"><Icon name="wallet" /></div>
          <div className="val" style={{ fontSize: 22 }}>{formatVND(totalGross)}</div>
          <div className="lbl">Tổng quỹ lương (Gross)</div>
        </div>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="check" /></div>
          <div className="val" style={{ fontSize: 22 }}>{formatVND(totalNet)}</div>
          <div className="lbl">Tổng thực lĩnh (Net)</div>
        </div>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="shield" /></div>
          <div className="val" style={{ fontSize: 22 }}>{formatVND(totalEmpIns)}</div>
          <div className="lbl">BHXH nhân viên đóng</div>
        </div>
        <div className="card kpi hover tone-r">
          <div className="ic"><Icon name="chart" /></div>
          <div className="val" style={{ fontSize: 22 }}>{formatVND(totalPit)}</div>
          <div className="lbl">Tổng thuế TNCN</div>
        </div>
      </div>
      )}

      {/* Bảng lương */}
      <div className="card">
        <div className="card-h">
          <div>
            <h3>Chi tiết bảng lương</h3>
            <div className="sub">
              Chi phí doanh nghiệp (gồm BH 21,5% NSDLĐ): <b>{formatVND(totalGross + totalErIns)}</b>
            </div>
          </div>
          <div className="flex aic gap" style={{ flexWrap: "wrap" }}>
            {!isSelf && rows.length > 8 && <TableFilter targetId="payroll-table" />}
            {missing > 0 && <span className="badge b-amber">{missing} NV thiếu lương</span>}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>
            Không có nhân sự nào trong kỳ lương này.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table id="payroll-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th style={{ textAlign: "right" }}>Lương cơ bản</th>
                  <th style={{ textAlign: "right" }}>Phụ cấp</th>
                  <th style={{ textAlign: "center" }}>Nghỉ KL</th>
                  <th style={{ textAlign: "right" }}>Gross thực</th>
                  <th style={{ textAlign: "right" }}>BH (NLĐ)</th>
                  <th style={{ textAlign: "center" }}>NPT</th>
                  <th style={{ textAlign: "right" }}>Thuế TNCN</th>
                  <th style={{ textAlign: "right" }}>Thực lĩnh</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ e, slip, adj, ot, sal }) => (
                  <Fragment key={e.id}>
                  <tr data-search={`${e.fullName} ${e.code}`}>
                    <td>
                      <div className="uname">{e.fullName}</div>
                      <div className="small muted">{e.code} · {entityName(e.legalEntityId)}</div>
                    </td>
                    <td style={{ textAlign: "right" }}>{formatVND(slip.base)}</td>
                    <td style={{ textAlign: "right" }}>{formatVND(slip.allowance)}</td>
                    <td style={{ textAlign: "center" }}>
                      {slip.unpaidDays > 0 ? (
                        <>
                          <span className="badge b-amber">{slip.unpaidDays} ngày</span>
                          <div className="small" style={{ color: "var(--c-rose)" }}>−{formatVND(slip.unpaidDeduction)}</div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}><b>{formatVND(slip.gross)}</b></td>
                    <td style={{ textAlign: "right", color: "var(--c-rose)" }}>−{formatVND(slip.empInsurance)}</td>
                    <td style={{ textAlign: "center" }}>{slip.dependents}</td>
                    <td style={{ textAlign: "right", color: "var(--c-rose)" }}>−{formatVND(slip.pit)}</td>
                    <td style={{ textAlign: "right" }}>
                      <b style={{ color: "var(--c-teal)" }}>{formatVND(slip.net + slip.postTaxAdjustment + adj + ot)}</b>
                      {(slip.extraTaxable !== 0 || slip.postTaxAdjustment !== 0) && (
                        <div className="small" style={{ color: "var(--c-indigo, var(--c-teal))" }}>
                          điều chỉnh kỳ {formatVND(slip.extraTaxable + slip.postTaxAdjustment)}
                        </div>
                      )}
                      {adj !== 0 && (
                        <div className="small" style={{ color: adj > 0 ? "var(--c-teal)" : "var(--c-rose)" }}>
                          {adj > 0 ? "+" : "−"}{formatVND(Math.abs(adj))} {adj > 0 ? "thưởng" : "phạt"}
                        </div>
                      )}
                      {ot > 0 && (
                        <div className="small" style={{ color: "var(--c-teal)" }}>+{formatVND(ot)} OT</div>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/payroll/${e.id}?month=${ym}`} className="iconbtn" title="Phiếu lương">
                        <Icon name="chev" />
                      </Link>
                    </td>
                  </tr>
                  {canManage && (
                    <tr data-search={`${e.fullName} ${e.code}`}>
                      <td colSpan={10} style={{ padding: 0, borderTop: "none" }}>
                        <details>
                          <summary className="btn ghost small" style={{ width: "fit-content", listStyle: "none", margin: "0 0 8px" }}>
                            <Icon name="edit" /> Chỉnh lương · {e.fullName}
                          </summary>
                          <form action={adjustSalaryAction} className="card" style={{ marginBottom: 12, background: "var(--surface-2)" }}>
                            <input type="hidden" name="employeeId" value={e.id} />
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
                              <input name="reason" placeholder="Tăng lương định kỳ, điều chuyển vị trí…" />
                            </div>
                            <button type="submit" className="btn primary"><Icon name="check" /> Lưu điều chỉnh lương</button>
                          </form>
                        </details>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, borderTop: "2px solid var(--line)" }}>
                  <td>Tổng cộng ({rows.length})</td>
                  <td colSpan={3}></td>
                  <td style={{ textAlign: "right" }}>{formatVND(totalGross)}</td>
                  <td style={{ textAlign: "right", color: "var(--c-rose)" }}>−{formatVND(totalEmpIns)}</td>
                  <td></td>
                  <td style={{ textAlign: "right", color: "var(--c-rose)" }}>−{formatVND(totalPit)}</td>
                  <td style={{ textAlign: "right", color: "var(--c-teal)" }}>{formatVND(totalNet)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Ghi chú tham số */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h"><h3>Tham số tính lương đang áp dụng</h3></div>
        <ul className="small muted" style={{ lineHeight: 1.9, paddingLeft: 18 }}>
          <li>BHXH bắt buộc: NLĐ đóng <b>10,5%</b> (BHXH 8% + BHYT 1,5% + BHTN 1%); NSDLĐ <b>21,5%</b>.</li>
          <li>
            Giảm trừ gia cảnh: bản thân <b>{formatVND(PIT_SELF_DEDUCTION)}</b>/tháng, mỗi người phụ thuộc{" "}
            <b>{formatVND(PIT_DEPENDENT_DEDUCTION)}</b>/tháng (kỳ tính thuế 2026).
          </li>
          <li>Thuế TNCN: biểu lũy tiến từng phần 7 bậc hiện hành (5%–35%). Biểu 5 bậc 2026 chưa chốt ngưỡng — cập nhật trong <code>lib/payroll/config.ts</code> khi có hiệu lực.</li>
          <li>Trần đóng BHXH/BHYT = 20× lương cơ sở (46.800.000 ₫); BHTN = 20× lương tối thiểu vùng.</li>
          <li>
            Nghỉ không lương đã duyệt bị trừ theo tỷ lệ ngày công ({standardDays} ngày công chuẩn trong kỳ).
            BHXH vẫn tính trên lương đóng theo hợp đồng (miễn khi nghỉ ≥14 ngày/tháng — bổ sung sau).
          </li>
        </ul>
      </div>
    </div>
  );
}
