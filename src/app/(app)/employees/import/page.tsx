import Link from "next/link";
import { Icon } from "@/components/icon";
import { ImportEmployees } from "@/components/import-employees";
import { requirePermission } from "@/lib/auth/session";

export default async function ImportEmployeesPage() {
  await requirePermission("employee.create");

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> <Link href="/employees">Nhân viên</Link> <Icon name="chev" /> Nhập từ Excel
      </div>
      <div className="page-head">
        <div className="flex aic" style={{ gap: 12 }}>
          <Link href="/employees" className="iconbtn" title="Quay lại"><Icon name="chevleft" /></Link>
          <div>
            <h1>Nhập nhân viên từ Excel</h1>
            <p>Tải lên tệp Excel (.xlsx) để tạo nhiều nhân viên cùng lúc.</p>
          </div>
        </div>
        <div className="flex gap" style={{ flexWrap: "wrap" }}>
          <Link href="/export/employees/template" className="btn primary"><Icon name="download" /> Tải file mẫu</Link>
          <Link href="/export/employees" className="btn"><Icon name="download" /> Xuất danh sách hiện có</Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, maxWidth: 720 }}>
        <div className="card-h"><h3>Hướng dẫn</h3></div>
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
