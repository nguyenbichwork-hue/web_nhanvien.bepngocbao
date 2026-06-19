import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { ScheduleGrid, type ScheduleRow } from "@/components/schedule-grid";
import { TableFilter } from "@/components/table-filter";
import { clearScheduleEntryAction } from "@/lib/org/actions";
import {
  getScheduleConfig,
  listDepartments,
  listEmployees,
  listScheduleEntries,
  listShifts,
  resolveMonth,
} from "@/lib/org/store";
import {
  SCHEDULE_KIND_BADGE,
  SCHEDULE_KIND_LABEL,
  type ScheduleKind,
} from "@/lib/org/types";
import { can, requirePermission } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/scope";

const VN_MONTH = (m: number) => `Tháng ${m}`;
const pad = (n: number) => String(n).padStart(2, "0");

type SP = { y?: string; m?: string; dept?: string };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await requirePermission("schedule.read");
  const sp = await searchParams;
  const [departments, allEmployees, shifts, config, entries] = await Promise.all([
    listDepartments(),
    listEmployees(),
    listShifts(),
    getScheduleConfig(),
    listScheduleEntries(),
  ]);

  // Giới hạn theo phạm vi: chỉ thấy nhân viên trong tầm của mình.
  const visIds = await visibleEmployeeIds(session);
  const employees = visIds === "all" ? allEmployees : allEmployees.filter((e) => visIds.has(e.id));
  const canManage = can(session, "schedule.manage"); // sửa lịch mọi người (HR/Quản lý)
  const selfId = session.employee?.id;
  // Hàng được phép sửa: tất cả (quản lý) hoặc chỉ hàng của chính mình (nhân viên tự phục vụ).
  const editable: "all" | string[] = canManage ? "all" : selfId ? [selfId] : [];
  const canEditRow = (empId: string) => editable === "all" || editable.includes(empId);
  const selfEditOnly = !canManage && (editable as string[]).length > 0;

  // Tháng đang xem (mặc định 2026-06 — khớp dữ liệu mẫu).
  const year = Number(sp.y) || 2026;
  const month = Number(sp.m) || 6;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const js = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    return { day: d, weekend: js === 0 || js === 6 };
  });

  // Điều hướng tháng.
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const qs = (o: Record<string, string | number | undefined>) =>
    "?" + new URLSearchParams(
      Object.entries({ ...sp, ...o }).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)]),
    ).toString();

  // Lọc nhân viên hiển thị (bỏ người đã nghỉ việc).
  const roster = employees.filter((e) => {
    if (sp.dept && e.departmentId !== sp.dept) return false;
    return e.status !== "left";
  });

  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? "—";
  const empName = (id: string) => employees.find((e) => e.id === id)?.fullName ?? id;
  const filterDepts = departments;

  // Giải lịch tháng cho từng nhân viên → hàng cho lưới tương tác.
  const rows: ScheduleRow[] = await Promise.all(
    roster.map(async (e) => ({
      empId: e.id,
      empName: e.fullName,
      deptName: deptName(e.departmentId),
      days: await resolveMonth(e.id, year, month),
    })),
  );

  // Ngoại lệ thuộc tháng đang xem.
  const prefix = `${year}-${pad(month)}`;
  const monthOverrides = entries
    .filter((x) => x.date.startsWith(prefix) && roster.some((e) => e.id === x.employeeId))
    .sort((a, b) => a.date.localeCompare(b.date));

  const defaultShift = shifts.find((s) => s.id === config.defaultShiftId);
  const activeShifts = shifts.filter((s) => s.isActive);

  const subtitle = `Lịch hành chính nền (${defaultShift?.startTime}–${defaultShift?.endTime}, nghỉ trưa ${defaultShift?.breakStart}–${defaultShift?.breakEnd}) · T2–T6. ` +
    (canManage
      ? "Bấm vào một ô để xếp/đổi ca cho ngày đó."
      : selfEditOnly
        ? "Bấm vào ô trên hàng của bạn để xếp/đổi ca cho ngày đó."
        : "Bạn đang xem ở chế độ chỉ đọc.");

  return (
    <div>
      <PageHero
        icon="clock"
        title="Lịch làm việc"
        subtitle={subtitle}
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Lịch làm việc"]]}
        stats={[
          { label: "Nhân viên", value: rows.length },
          { label: "Ngoại lệ tháng", value: monthOverrides.length, tone: monthOverrides.length > 0 ? "flat" : undefined },
          { label: "Đang xem", value: `${VN_MONTH(month)}/${year}` },
        ]}
        actions={
          <div className="flex aic gap">
            <Link href={qs({ y: prev.y, m: prev.m })} className="iconbtn" title="Tháng trước">
              <Icon name="chevleft" />
            </Link>
            <strong style={{ minWidth: 110, textAlign: "center" }}>{VN_MONTH(month)}/{year}</strong>
            <Link href={qs({ y: next.y, m: next.m })} className="iconbtn" title="Tháng sau">
              <Icon name="chev" />
            </Link>
          </div>
        }
      />

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="card kpi grad hover gr-deepblue">
          <div className="ic"><Icon name="users" /></div>
          <div className="val"><CountUp to={rows.length} /></div>
          <div className="lbl">nhân viên xếp lịch</div>
        </div>
        <div className="card kpi grad hover gr-azure">
          <div className="ic"><Icon name="calendar" /></div>
          <div className="val"><CountUp to={daysInMonth} /></div>
          <div className="lbl">ngày trong tháng</div>
        </div>
        <div className="card kpi grad hover gr-sunny">
          <div className="ic"><Icon name="edit" /></div>
          <div className="val"><CountUp to={monthOverrides.length} /></div>
          <div className="lbl">ngoại lệ đã xếp</div>
        </div>
      </div>

      {/* Bộ lọc phòng ban */}
      <form className="card mt" method="get" style={{ marginBottom: 18 }}>
        <input type="hidden" name="y" value={year} />
        <input type="hidden" name="m" value={month} />
        <div className="grid-k g-2" style={{ alignItems: "end" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Phòng ban</label>
            <select name="dept" defaultValue={sp.dept ?? ""}>
              <option value="">Tất cả</option>
              {filterDepts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap">
            <button type="submit" className="btn primary"><Icon name="filter" /> Lọc</button>
            <Link href="/schedule" className="btn ghost">Xoá lọc</Link>
          </div>
        </div>
      </form>

      {/* Lưới lịch tháng tương tác */}
      <div className="card" style={{ overflowX: "auto" }}>
        <div className="card-h">
          <div>
            <h3 className="sec-title">Bảng lịch — {VN_MONTH(month)}/{year}</h3>
            <div className="sub">{rows.length} nhân viên · viền cam = ngoại lệ đã xếp</div>
          </div>
          <div className="flex gap small muted" style={{ flexWrap: "wrap" }}>
            {(["work", "off", "holiday", "wfh", "business", "makeup", "leave"] as ScheduleKind[]).map((k) => (
              <span key={k} className={`badge ${SCHEDULE_KIND_BADGE[k]}`}>{SCHEDULE_KIND_LABEL[k]}</span>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="muted" style={{ padding: "24px 0", textAlign: "center" }}>Không có nhân viên nào.</p>
        ) : (
          <>
            {rows.length > 8 && (
              <div style={{ marginBottom: 12 }}>
                <TableFilter targetId="schedule-grid-table" />
              </div>
            )}
            <ScheduleGrid rows={rows} dayHeaders={dayHeaders} shifts={activeShifts} defaultShiftId={config.defaultShiftId} editable={editable} />
          </>
        )}
      </div>

      {/* Danh sách ngoại lệ trong tháng */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h">
          <div>
            <h3 className="sec-title">Ngoại lệ trong {VN_MONTH(month)}</h3>
            <div className="sub">{monthOverrides.length} mục đã ghi đè lịch nền</div>
          </div>
        </div>
        {monthOverrides.length === 0 ? (
          <p className="muted" style={{ padding: "16px 0" }}>Chưa có ngoại lệ — mọi người theo lịch hành chính nền.</p>
        ) : (
          <table>
            <thead><tr><th>Ngày</th><th>Nhân viên</th><th>Loại</th><th>Ghi chú</th><th></th></tr></thead>
            <tbody>
              {monthOverrides.map((o) => (
                <tr key={o.id}>
                  <td>{o.date}</td>
                  <td>{empName(o.employeeId)}</td>
                  <td><span className={`badge ${SCHEDULE_KIND_BADGE[o.kind]}`}>{SCHEDULE_KIND_LABEL[o.kind]}</span></td>
                  <td className="small muted">{o.note ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    {canEditRow(o.employeeId) && (
                      <form action={clearScheduleEntryAction}>
                        <input type="hidden" name="employeeId" value={o.employeeId} />
                        <input type="hidden" name="date" value={o.date} />
                        <button type="submit" className="iconbtn" title="Xoá ngoại lệ (về lịch nền)"><Icon name="trash" /></button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
