import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
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
    <div>
      <PageHero
        icon="users"
        title="Thêm nhân viên"
        subtitle="Tạo hồ sơ nhân sự mới và gán vào phòng ban, chức danh."
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Nhân viên", "/employees"], ["Thêm mới"]]}
        actions={
          <Link href="/employees" className="btn">
            <Icon name="chevleft" /> Quay lại
          </Link>
        }
      />

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
