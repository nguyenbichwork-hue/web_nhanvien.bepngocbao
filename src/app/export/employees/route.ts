import { getSession, can } from "@/lib/auth/session";
import { filterEmployees } from "@/lib/auth/scope";
import { listDepartments, listEmployees, listEntities, listJobTitles } from "@/lib/org/store";
import { EMPLOYEE_STATUS_LABEL, EMPLOYMENT_TYPE_LABEL } from "@/lib/org/types";
import { rowsToXlsxResponse } from "@/lib/export/xlsx";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !can(session, "employee.read")) return new Response("Forbidden", { status: 403 });

  const entity = new URL(request.url).searchParams.get("entity") || undefined;
  const [allEmployees, entities, departments, jobTitles] = await Promise.all([
    listEmployees(),
    listEntities(),
    listDepartments(),
    listJobTitles(),
  ]);
  let employees = await filterEmployees(session, allEmployees);
  if (entity) employees = employees.filter((e) => e.legalEntityId === entity);

  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? "";
  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? "";
  const titleName = (id?: string | null) => jobTitles.find((j) => j.id === id)?.name ?? "";

  const rows: unknown[][] = [[
    "Mã NV", "Họ tên", "Email", "Pháp nhân", "Phòng ban", "Chức danh",
    "Trạng thái", "Loại hình", "Ngày vào", "Lương cơ bản", "Phụ cấp", "Số NPT",
  ]];
  for (const e of employees) {
    rows.push([
      e.code, e.fullName, e.email ?? "", entityName(e.legalEntityId), deptName(e.departmentId),
      titleName(e.jobTitleId), EMPLOYEE_STATUS_LABEL[e.status],
      e.employmentType ? EMPLOYMENT_TYPE_LABEL[e.employmentType] : "",
      e.joinDate ?? "", e.baseSalary ?? "", e.allowance ?? "", e.dependents ?? 0,
    ]);
  }

  return rowsToXlsxResponse("danh-ba-nhan-vien", rows, "Nhân viên");
}
