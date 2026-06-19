import { getSession, can } from "@/lib/auth/session";
import { filterEmployees } from "@/lib/auth/scope";
import { listDepartments, listEmployees, listJobTitles } from "@/lib/org/store";
import { EMPLOYEE_STATUS_LABEL, EMPLOYMENT_TYPE_LABEL } from "@/lib/org/types";
import { rowsToXlsxResponse } from "@/lib/export/xlsx";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session, "employee.read")) return new Response("Forbidden", { status: 403 });

  const [allEmployees, departments, jobTitles] = await Promise.all([
    listEmployees(),
    listDepartments(),
    listJobTitles(),
  ]);
  const employees = await filterEmployees(session, allEmployees);

  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? "";
  const titleName = (id?: string | null) => jobTitles.find((j) => j.id === id)?.name ?? "";

  const rows: unknown[][] = [[
    "Mã NV", "Họ tên", "Email", "Phòng ban", "Chức danh",
    "Trạng thái", "Loại hình", "Ngày vào", "Lương cơ bản", "Phụ cấp", "Số NPT",
  ]];
  for (const e of employees) {
    rows.push([
      e.code, e.fullName, e.email ?? "", deptName(e.departmentId),
      titleName(e.jobTitleId), EMPLOYEE_STATUS_LABEL[e.status],
      e.employmentType ? EMPLOYMENT_TYPE_LABEL[e.employmentType] : "",
      e.joinDate ?? "", e.baseSalary ?? "", e.allowance ?? "", e.dependents ?? 0,
    ]);
  }

  return rowsToXlsxResponse("danh-ba-nhan-vien", rows, "Nhân viên");
}
