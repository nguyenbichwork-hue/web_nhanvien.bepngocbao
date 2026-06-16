// Tạo & đọc tệp Excel (.xlsx) bằng SheetJS — CHẠY ĐƯỢC trên Cloudflare Workers
// (thuần JS, không phụ thuộc Node fs/stream). Dùng cho xuất báo cáo & nhập từ tệp.
//
// Xuất: rowsToXlsxResponse(...) → Response tải về .xlsx thật (không phải CSV).
// Nhập: parseXlsxFile(file) → string[][] (mảng dòng × cột) để xử lý như bảng.

import * as XLSX from "xlsx";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Dựng workbook 1 sheet từ ma trận dòng (dòng đầu = tiêu đề) và trả về bytes .xlsx. */
export function rowsToXlsxBytes(rows: unknown[][], sheetName = "Sheet1"): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Ước lượng độ rộng cột theo nội dung dài nhất (đẹp khi mở bằng Excel).
  const colCount = rows.reduce((m, r) => Math.max(m, r.length), 0);
  ws["!cols"] = Array.from({ length: colCount }, (_, c) => {
    const widest = rows.reduce((m, r) => Math.max(m, String(r[c] ?? "").length), 8);
    return { wch: Math.min(widest + 2, 40) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31)); // Excel giới hạn 31 ký tự tên sheet
  return XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

/** Trả về Response tải file .xlsx (đặt tên file kèm phần mở rộng .xlsx). */
export function rowsToXlsxResponse(filename: string, rows: unknown[][], sheetName = "Sheet1"): Response {
  const bytes = rowsToXlsxBytes(rows, sheetName);
  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  return new Response(bytes, {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Đọc tệp tải lên thành ma trận chuỗi (mỗi phần tử = một dòng, mỗi dòng = mảng ô).
 * Hỗ trợ .xlsx/.xls (và .csv vẫn đọc được vì SheetJS tự nhận dạng). Lấy sheet ĐẦU TIÊN.
 */
export async function parseXlsxFile(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const ws = wb.Sheets[first];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, raw: false, defval: "" });
  return rows.map((r) => (r as unknown[]).map((c) => String(c ?? "").trim()));
}
