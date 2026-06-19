import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { EmployeeForm } from "@/components/employee-form";
import { updateOwnProfileAction } from "@/lib/org/actions";
import { getEmployee } from "@/lib/org/store";
import { requireSession } from "@/lib/auth/session";

type SP = { ok?: string };

export default async function MyProfilePage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await requireSession();
  const sp = await searchParams;
  const employee = session.employee ? await getEmployee(session.employee.id) : undefined;

  return (
    <div>
      <PageHero
        icon="user"
        title="Hồ sơ của tôi"
        subtitle="Cập nhật thông tin cá nhân, giấy tờ và tài khoản nhận lương. Lương, chức danh, phòng ban do Nhân sự quản lý."
        crumb={[["Trang chủ", "/dashboard"], ["Tài khoản", "/account"], ["Hồ sơ của tôi"]]}
        actions={
          <Link href="/account" className="btn">
            <Icon name="chevleft" /> Quay lại
          </Link>
        }
      />

      {!employee ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Tài khoản của bạn chưa được gắn với hồ sơ nhân viên. Vui lòng liên hệ bộ phận Nhân sự.
          </p>
        </div>
      ) : (
        <>
          {sp.ok && (
            <div className="badge b-green" style={{ marginBottom: 16 }}>
              Đã lưu hồ sơ của bạn.
            </div>
          )}
          <EmployeeForm
            action={updateOwnProfileAction}
            mode="self"
            companyId=""
            departments={[]}
            jobTitles={[]}
            roles={[]}
            employee={employee}
          />
        </>
      )}
    </div>
  );
}
