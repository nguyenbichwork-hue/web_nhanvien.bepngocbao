import { getSession, can } from "@/lib/auth/session";
import { rowsToXlsxResponse } from "@/lib/export/xlsx";

// File MẪU để nhập nhân viên: 1 dòng tiêu đề đúng tên cột + 1 dòng ví dụ minh hoạ định dạng.
// Người dùng tải về, điền tiếp các dòng rồi nhập lại ở trang "Nhập từ Excel".
export async function GET() {
  const session = await getSession();
  if (!session || !can(session, "employee.create")) return new Response("Forbidden", { status: 403 });

  const rows: unknown[][] = [
    ["Mã NV", "Họ tên", "Email", "Phòng ban", "Chức danh", "Trạng thái", "Loại hình", "Ngày vào", "Lương cơ bản", "Phụ cấp"],
    ["", "Nguyễn Văn A", "vana@example.com", "", "Nhân viên", "Chính thức", "Toàn thời gian", "2026-01-15", 10000000, 1000000],
  ];

  return rowsToXlsxResponse("mau-nhap-nhan-vien", rows, "Mẫu nhập NV");
}
