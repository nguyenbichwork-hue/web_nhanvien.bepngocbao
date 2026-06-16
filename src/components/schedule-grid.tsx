"use client";

// Lưới lịch làm việc tương tác: nhấn vào 1 ô để mở modal xếp/đổi ca cho ngày đó.
// Hỗ trợ: chọn ca chuẩn hoặc tùy chỉnh giờ; áp dụng cho mọi ngày cùng thứ còn lại trong tháng.
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icon";
import { clearScheduleEntryAction, setScheduleEntryAction } from "@/lib/org/actions";
import {
  SCHEDULE_KIND_BADGE,
  SCHEDULE_KIND_LABEL,
  type ResolvedDay,
  type ScheduleKind,
  type WorkShift,
} from "@/lib/org/types";

export type ScheduleRow = { empId: string; empName: string; deptName: string; days: ResolvedDay[] };
type DayHeader = { day: number; weekend: boolean };

type Props = {
  rows: ScheduleRow[];
  dayHeaders: DayHeader[];
  shifts: WorkShift[]; // ca đang hoạt động
  defaultShiftId: string;
  // Những hàng được phép sửa: "all" (HR/Quản lý) hoặc danh sách empId (NV chỉ sửa hàng của mình).
  editable?: "all" | string[];
};

const KIND_USES_SHIFT = (k: ScheduleKind) => k === "work" || k === "wfh" || k === "makeup";
const WD = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
function weekdayName(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}
function dayTimes(d: ResolvedDay): string {
  if (d.customStart && d.customEnd) return `${d.customStart}–${d.customEnd}`;
  if (d.shift) return `${d.shift.startTime}–${d.shift.endTime}`;
  return "";
}
function cellLabel(d: ResolvedDay): string {
  if (d.kind === "work") return d.customStart ? "TC" : d.shift?.code ?? "LÀM";
  if (d.kind === "wfh") return "WFH";
  if (d.kind === "makeup") return "BÙ";
  if (d.kind === "holiday") return "LỄ";
  if (d.kind === "business") return "CT";
  if (d.kind === "leave") return "P";
  return "";
}

type Selected = { empId: string; empName: string; day: ResolvedDay };

export function ScheduleGrid({ rows, dayHeaders, shifts, defaultShiftId, editable = "all" }: Props) {
  const canEditRow = (empId: string) => editable === "all" || editable.includes(empId);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [pending, start] = useTransition();

  function submitSet(fd: FormData) {
    start(async () => {
      await setScheduleEntryAction(fd);
      setSelected(null);
    });
  }
  function submitClear(fd: FormData) {
    start(async () => {
      await clearScheduleEntryAction(fd);
      setSelected(null);
    });
  }

  return (
    <>
      <table id="schedule-grid-table" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ position: "sticky", left: 0, background: "var(--surface)", minWidth: 160 }}>Nhân viên</th>
            {dayHeaders.map((h) => (
              <th key={h.day} style={{ textAlign: "center", padding: "6px 4px", color: h.weekend ? "var(--c-rose)" : undefined }}>
                {h.day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowEditable = canEditRow(row.empId);
            return (
            <tr key={row.empId} data-search={`${row.empName} ${row.deptName}`}>
              <td style={{ position: "sticky", left: 0, background: "var(--surface)" }}>
                <div className="uname">{row.empName}</div>
                <div className="small muted">{row.deptName}</div>
              </td>
              {row.days.map((day) => {
                const times = dayTimes(day);
                return (
                  <td
                    key={day.date}
                    className={rowEditable ? "sch-cell" : undefined}
                    onClick={rowEditable ? () => setSelected({ empId: row.empId, empName: row.empName, day }) : undefined}
                    title={`${day.date} · ${SCHEDULE_KIND_LABEL[day.kind]}${times ? " · " + times : ""}${day.customStart ? " (giờ tùy chỉnh)" : ""}${day.note ? " · " + day.note : ""}${rowEditable ? " — bấm để sửa" : ""}`}
                    style={{ textAlign: "center", padding: "4px 3px" }}
                  >
                    {day.kind === "off" ? (
                      <span className="muted">·</span>
                    ) : (
                      <span
                        className={`badge ${SCHEDULE_KIND_BADGE[day.kind]}`}
                        style={{ padding: "2px 5px", fontSize: 10, fontWeight: 700, outline: day.isOverride ? "1.5px solid var(--c-amber)" : undefined }}
                      >
                        {cellLabel(day)}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
            );
          })}
        </tbody>
      </table>

      {selected &&
        createPortal(
          // Portal ra <body> để overlay luôn canh giữa MÀN HÌNH (không bị "kẹt" trong .view-in có transform).
          <div className="sch-overlay" onClick={() => !pending && setSelected(null)}>
            <div className="sch-modal" onClick={(e) => e.stopPropagation()}>
              <EditModal
                key={`${selected.empId}-${selected.day.date}`}
                selected={selected}
                shifts={shifts}
                defaultShiftId={defaultShiftId}
                pending={pending}
                onSet={submitSet}
                onClear={submitClear}
                onClose={() => setSelected(null)}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function EditModal({
  selected,
  shifts,
  defaultShiftId,
  pending,
  onSet,
  onClear,
  onClose,
}: {
  selected: Selected;
  shifts: WorkShift[];
  defaultShiftId: string;
  pending: boolean;
  onSet: (fd: FormData) => void;
  onClear: (fd: FormData) => void;
  onClose: () => void;
}) {
  const { empId, empName, day } = selected;
  // "leave" không xếp tay được → mặc định về "work" khi mở ô đang là nghỉ phép.
  const [kind, setKind] = useState<ScheduleKind>(day.kind === "leave" ? "work" : day.kind);
  const [shiftChoice, setShiftChoice] = useState<string>(
    day.customStart ? "custom" : day.shift?.id ?? defaultShiftId,
  );
  const wdName = weekdayName(day.date);
  const showShift = KIND_USES_SHIFT(kind);
  const isCustom = shiftChoice === "custom";

  return (
    <>
      <div className="card-h" style={{ marginBottom: 14 }}>
        <div>
          <h3>{empName}</h3>
          <div className="sub">
            {wdName}, {day.date} · hiện tại:{" "}
            <span className={`badge ${SCHEDULE_KIND_BADGE[day.kind]}`}>{SCHEDULE_KIND_LABEL[day.kind]}</span>
            {dayTimes(day) ? ` · ${dayTimes(day)}` : ""}
            {day.isOverride ? "" : " (lịch nền)"}
          </div>
        </div>
        <button type="button" className="iconbtn" title="Đóng" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>

      <form action={onSet}>
        <input type="hidden" name="employeeId" value={empId} />
        <input type="hidden" name="date" value={day.date} />

        <div className="field">
          <label>Loại ngày</label>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as ScheduleKind)}>
            {(Object.keys(SCHEDULE_KIND_LABEL) as ScheduleKind[])
              .filter((k) => k !== "leave") // nghỉ phép do module Nghỉ phép quản lý
              .map((k) => (
                <option key={k} value={k}>{SCHEDULE_KIND_LABEL[k]}</option>
              ))}
          </select>
        </div>

        {showShift && (
          <>
            <div className="field">
              <label>Ca làm việc</label>
              <select name="shiftId" value={shiftChoice} onChange={(e) => setShiftChoice(e.target.value)}>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>
                ))}
                <option value="custom">⚙ Tùy chỉnh giờ…</option>
              </select>
            </div>
            {isCustom && (
              <div className="grid-k g-2" style={{ gap: 12 }}>
                <div className="field">
                  <label>Giờ bắt đầu</label>
                  <input type="time" name="startTime" defaultValue={day.customStart ?? "13:30"} required />
                </div>
                <div className="field">
                  <label>Giờ kết thúc</label>
                  <input type="time" name="endTime" defaultValue={day.customEnd ?? "17:00"} required />
                </div>
              </div>
            )}
          </>
        )}

        <div className="field">
          <label>Ghi chú</label>
          <input name="note" defaultValue={day.note ?? ""} placeholder="VD: Đi công tác khách hàng" />
        </div>

        <label className="flex aic" style={{ gap: 8, marginBottom: 14, fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" name="applyWeekday" value="1" style={{ width: 17, height: 17 }} />
          Áp dụng cho mọi <b>{wdName}</b> còn lại trong tháng (đăng ký nhanh)
        </label>

        <div className="flex gap" style={{ flexWrap: "wrap" }}>
          <button type="submit" className="btn primary" disabled={pending}>
            <Icon name="check" /> {pending ? "Đang lưu…" : "Lưu lịch"}
          </button>
          {day.isOverride && (
            <button type="submit" formAction={onClear} formNoValidate className="btn" disabled={pending} style={{ color: "var(--c-rose)" }}>
              <Icon name="trash" /> Về lịch nền
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onClose} disabled={pending}>
            Đóng
          </button>
        </div>
      </form>
    </>
  );
}
