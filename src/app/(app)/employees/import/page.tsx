import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { ImportEmployees } from "@/components/import-employees";
import { requirePermission } from "@/lib/auth/session";

export default async function ImportEmployeesPage() {
  await requirePermission("employee.create");

  return (
    <div>
      <PageHero
        icon="users"
        title="Nhập nhân viên từ Excel"
        subtitle="Tải lên tệp Excel (.xlsx) để tạo nhiều nhân viên cùng lúc."
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Nhân viên", "/employees"], ["Nhập từ Excel"]]}
        actions={
          <div className="flex gap" style={{ flexWrap: "wrap" }}>
            <Link href="/employees" className="btn"><Icon name="chevleft" /> Quay lại</Link>
            <Link href="/export/employees/template" className="btn primary"><Icon name="download" /> Tải file mẫu</Link>
            <Link href="/export/employees" className="btn"><Icon name="download" /> Xuất danh sách hiện có</Link>
          </div>
        }
      />

      <div className="card" style={{ marginBottom: 18, maxWidth: 720 }}>
        <div className="card-h"><h3 className="sec-title">Hướng dẫn</h3></div>
        <ul className="small" style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
          <li>Tệp <b>Excel (.xlsx)</b> — bấm <b>Tải file mẫu</b> để lấy đúng tiêu đề cột và một dòng ví dụ.</li>
          <li>Cột bắt buộc: <b>Họ tên</b>.</li>
          <li>Cột tuỳ chọn: Mã NV (trống → tự sinh), Email, Phòng ban, Chức danh, Trạng thái, Loại hình, Ngày vào (yyyy-mm-dd), Lương cơ bản, Phụ cấp.</li>
          <li>Điền dữ liệu vào file mẫu (giữ nguyên hàng tiêu đề), lưu lại rồi tải lên ở khung dưới.</li>
        </ul>
      </div>

      <ImportEmployees />
    </div>
  );
}
