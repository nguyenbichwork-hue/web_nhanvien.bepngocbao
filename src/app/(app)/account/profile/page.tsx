import Link from "next/link";
import { Icon } from "@/components/icon";
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
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> <Link href="/account">Tài khoản</Link> <Icon name="chev" /> Hồ sơ của tôi
      </div>
      <div className="page-head">
        <div className="flex aic" style={{ gap: 12 }}>
          <Link href="/account" className="iconbtn" title="Quay lại">
            <Icon name="chevleft" />
          </Link>
          <div>
            <h1>Hồ sơ của tôi</h1>
            <p>Cập nhật thông tin cá nhân, giấy tờ và tài khoản nhận lương. Lương, chức danh, phòng ban do Nhân sự quản lý.</p>
          </div>
        </div>
      </div>

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
