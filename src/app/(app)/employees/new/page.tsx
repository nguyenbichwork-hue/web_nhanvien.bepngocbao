import Link from "next/link";
import { Icon } from "@/components/icon";
import { EmployeeForm } from "@/components/employee-form";
import { createEmployeeAction } from "@/lib/org/actions";
import { listDepartments, listEntities, listJobTitles, listRoles, nextEmployeeCode } from "@/lib/org/store";
import { requirePermission } from "@/lib/auth/session";

export default async function NewEmployeePage() {
  await requirePermission("employee.create");
  const [entities, departments, jobTitles, roles, suggestedCode] = await Promise.all([
    listEntities(),
    listDepartments(),
    listJobTitles(),
    listRoles(),
    nextEmployeeCode(),
  ]);

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> <Link href="/employees">Nhân viên</Link> <Icon name="chev" /> Thêm mới
      </div>
      <div className="page-head">
        <div className="flex aic" style={{ gap: 12 }}>
          <Link href="/employees" className="iconbtn" title="Quay lại">
            <Icon name="chevleft" />
          </Link>
          <div>
            <h1>Thêm nhân viên</h1>
            <p>Tạo hồ sơ nhân sự mới và gán vào phòng ban, chức danh.</p>
          </div>
        </div>
      </div>

      <EmployeeForm
        action={createEmployeeAction}
        companyId={entities[0]?.id ?? ""}
        departments={departments}
        jobTitles={jobTitles}
        roles={roles}
        suggestedCode={suggestedCode}
      />
    </div>
  );
}
