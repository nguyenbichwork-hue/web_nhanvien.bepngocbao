// Xuất kế toán (AMIS) — workbook .xlsx 2 sheet: Công nợ (đơn còn nợ) + Dòng tiền (bankTxns).
// Bắt chước export/payroll/route.ts; dùng SheetJS để gộp nhiều sheet (helper rowsToXlsx* chỉ 1 sheet).

import * as XLSX from "xlsx";
import { getSession, can } from "@/lib/auth/session";
import { listOrders, listBankTxns, listCustomers } from "@/lib/bnb/store";
import { orderRemaining } from "@/lib/bnb/util";
import { ORDER_STATUS_LABEL, TXN_DIR_LABEL } from "@/lib/bnb/types";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function autoWidth(rows: unknown[][]): { wch: number }[] {
  const colCount = rows.reduce((m, r) => Math.max(m, r.length), 0);
  return Array.from({ length: colCount }, (_, c) => {
    const widest = rows.reduce((m, r) => Math.max(m, String(r[c] ?? "").length), 8);
    return { wch: Math.min(widest + 2, 40) };
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || !can(session, "finance.read")) return new Response("Forbidden", { status: 403 });

  const [orders, txns, customers] = await Promise.all([listOrders(), listBankTxns(), listCustomers()]);
  const custName = new Map(customers.map((c) => [c.id, c.name]));
  const orderCode = new Map(orders.map((o) => [o.id, o.code]));

  // Sheet 1 — Công nợ: đơn chưa huỷ còn dư nợ.
  const debtRows: unknown[][] = [[
    "Mã đơn", "Khách hàng", "Trạng thái", "Tổng tiền", "Đã thu", "Còn nợ", "Ngày tạo",
  ]];
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const rem = orderRemaining(o);
    if (rem <= 0) continue;
    debtRows.push([
      o.code,
      o.customerId ? custName.get(o.customerId) || o.customerId : "—",
      ORDER_STATUS_LABEL[o.status],
      o.total || 0,
      o.paid || 0,
      rem,
      o.createdAt ? o.createdAt.slice(0, 10) : "",
    ]);
  }

  // Sheet 2 — Dòng tiền: tất cả giao dịch ngân hàng.
  const txnRows: unknown[][] = [[
    "Ngày", "Loại", "Số tiền", "Ngân hàng", "Đối tác", "Tham chiếu", "Đơn khớp", "Ghi chú",
  ]];
  for (const t of txns) {
    txnRows.push([
      t.date,
      TXN_DIR_LABEL[t.direction],
      t.amount || 0,
      t.bank || "",
      t.counterparty || "",
      t.ref || "",
      t.matchedOrderId ? orderCode.get(t.matchedOrderId) || t.matchedOrderId : "",
      t.note || "",
    ]);
  }

  const wb = XLSX.utils.book_new();
  const wsDebt = XLSX.utils.aoa_to_sheet(debtRows);
  wsDebt["!cols"] = autoWidth(debtRows);
  XLSX.utils.book_append_sheet(wb, wsDebt, "Công nợ");
  const wsTxn = XLSX.utils.aoa_to_sheet(txnRows);
  wsTxn["!cols"] = autoWidth(txnRows);
  XLSX.utils.book_append_sheet(wb, wsTxn, "Dòng tiền");

  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const name = `ke-toan-amis-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(bytes, {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
