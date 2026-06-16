"use client";

// Form tạo đơn nghỉ phép: chọn nhân viên + loại nghỉ + khoảng ngày.
// Tự tính số ngày công (chỉ ngày làm việc) và nhắc số dư quỹ phép năm.
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/icon";
import { EmployeeSelect } from "@/components/employee-select";
import { createLeaveRequestAction } from "@/lib/org/actions";
import type { Employee, LeaveBalance, LeaveType } from "@/lib/org/types";

type Props = {
  employees: Pick<Employee, "id" | "fullName" | "code">[];
  leaveTypes: LeaveType[];
  balances: Record<string, LeaveBalance>; // employeeId → số dư phép năm năm hiện tại
  workingWeekdays: number[];
};

/** Đếm ngày làm việc trong [start, end] (1=T2…7=CN). */
function countWorkdays(start: string, end: string, working: number[]): number {
  if (!start || !end) return 0;
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return 0;
  let n = 0;
  for (let t = new Date(s); t <= e; t.setUTCDate(t.getUTCDate() + 1)) {
    const dow = t.getUTCDay() === 0 ? 7 : t.getUTCDay();
    if (working.includes(dow)) n++;
  }
  return n;
}

export function LeaveRequestForm({ employees, leaveTypes, balances, workingWeekdays }: Props) {
  const annualId = leaveTypes.find((t) => t.code === "ANNUAL")?.id;
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState(annualId ?? leaveTypes[0]?.id ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [halfDay, setHalfDay] = useState(false);
  const [pending, start] = useTransition();

  const singleDay = !!startDate && startDate === endDate;
  const isAnnual = leaveTypeId === annualId;
  const days = useMemo(() => {
    const n = countWorkdays(startDate, endDate || startDate, workingWeekdays);
    return halfDay && singleDay ? (n ? 0.5 : 0) : n;
  }, [startDate, endDate, halfDay, singleDay, workingWeekdays]);

  const bal = employeeId ? balances[employeeId] : undefined;
  const overQuota = isAnnual && bal ? days > bal.remaining : false;

  function onSubmit(fd: FormData) {
    start(async () => {
      await createLeaveRequestAction(fd);
      // reset nhẹ phần ngày để gửi đơn kế tiếp nhanh
      setStartDate("");
      setEndDate("");
      setHalfDay(false);
    });
  }

  return (
    <form action={onSubmit}>
      <div className="grid-k g-2">
        <div className="field">
          <label>Nhân viên *</label>
          <EmployeeSelect name="employeeId" required employees={employees} onChange={setEmployeeId} />
        </div>
        <div className="field">
          <label>Loại nghỉ *</label>
          <select name="leaveTypeId" required value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
            {leaveTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}{t.deductsQuota ? " (trừ quỹ phép)" : t.paid ? " (hưởng lương)" : " (không lương)"}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid-k g-3" style={{ alignItems: "end" }}>
        <div className="field">
          <label>Từ ngày *</label>
          <input type="date" name="startDate" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Đến ngày *</label>
          <input type="date" name="endDate" required value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <label className="flex aic" style={{ gap: 8, marginBottom: 14, fontSize: 13, fontWeight: 600, opacity: singleDay ? 1 : 0.5 }}>
          <input type="checkbox" name="halfDay" value="1" checked={halfDay} disabled={!singleDay} onChange={(e) => setHalfDay(e.target.checked)} style={{ width: 17, height: 17 }} />
          Nghỉ nửa ngày
        </label>
      </div>

      <div className="field">
        <label>Lý do</label>
        <input name="reason" placeholder="VD: Việc gia đình" />
      </div>

      <div className="flex aic gap" style={{ flexWrap: "wrap", marginBottom: 14 }}>
        <span className="badge b-indigo">Số ngày công: <b>{days}</b></span>
        {isAnnual && bal && (
          <span className={`badge ${overQuota ? "b-rose" : "b-gray"}`}>
            Quỹ phép còn: {bal.remaining}/{bal.quota} ngày
          </span>
        )}
        {overQuota && <span className="small" style={{ color: "var(--c-rose)" }}>Vượt quỹ phép năm còn lại.</span>}
      </div>

      <button type="submit" className="btn primary" disabled={pending || !employeeId || !startDate || days <= 0}>
        <Icon name="check" /> {pending ? "Đang gửi…" : "Gửi đơn nghỉ"}
      </button>
    </form>
  );
}
