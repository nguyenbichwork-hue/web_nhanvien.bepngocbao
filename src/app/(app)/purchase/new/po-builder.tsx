"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { fmtVnd } from "@/lib/bnb/util";
import { createPurchaseOrderAction } from "../actions";

type Row = {
  key: string;
  name: string;
  sku: string;
  qty: number;
  unitCost: number;
};

let _k = 0;
const newKey = () => `r${++_k}-${Date.now()}`;

const lineAmt = (r: Row) => Math.max(0, r.qty * r.unitCost);

export function POBuilder() {
  const [supplierName, setSupplierName] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { key: newKey(), name: "", sku: "", qty: 1, unitCost: 0 },
  ]);
  const [expectedAt, setExpectedAt] = useState("");
  const [note, setNote] = useState("");

  const total = useMemo(() => rows.reduce((s, r) => s + lineAmt(r), 0), [rows]);

  function addBlank() {
    setRows((rs) => [...rs, { key: newKey(), name: "", sku: "", qty: 1, unitCost: 0 }]);
  }
  function patch(key: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }
  function remove(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  const itemsJson = JSON.stringify(
    rows
      .filter((r) => r.name.trim() && r.qty > 0)
      .map((r) => ({ name: r.name.trim(), sku: r.sku.trim() || undefined, qty: r.qty, unitCost: r.unitCost })),
  );

  const canSubmit = supplierName.trim().length > 0 && rows.some((r) => r.name.trim() && r.qty > 0);

  return (
    <form action={createPurchaseOrderAction} className="grid-k g-2" style={{ alignItems: "start" }}>
      <input type="hidden" name="supplierName" value={supplierName} />
      <input type="hidden" name="items" value={itemsJson} />
      <input type="hidden" name="expectedAt" value={expectedAt} />
      <input type="hidden" name="note" value={note} />

      {/* Cột trái: NCC + dòng hàng */}
      <div style={{ display: "grid", gap: 20 }}>
        <div className="card">
          <div className="card-h"><h3>Nhà cung cấp</h3></div>
          <div className="field" style={{ margin: 0 }}>
            <label>Tên nhà cung cấp *</label>
            <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="VD: Công ty TNHH Bếp Việt" />
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Dòng hàng nhập</h3>
            <span className="badge b-gray">{rows.length} dòng</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th style={{ width: 120 }}>SKU</th>
                <th style={{ width: 70 }}>SL</th>
                <th style={{ width: 140 }}>Giá vốn</th>
                <th style={{ width: 120, textAlign: "right" }}>Thành tiền</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td><input className="cell" value={r.name} placeholder="Tên hàng" onChange={(e) => patch(r.key, { name: e.target.value })} /></td>
                  <td><input className="cell" value={r.sku} placeholder="SKU" onChange={(e) => patch(r.key, { sku: e.target.value })} /></td>
                  <td><input className="cell" inputMode="numeric" value={r.qty} onChange={(e) => patch(r.key, { qty: Math.max(1, Number(e.target.value.replace(/[^\d]/g, "")) || 1) })} /></td>
                  <td><input className="cell" inputMode="numeric" value={r.unitCost} onChange={(e) => patch(r.key, { unitCost: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} /></td>
                  <td className="small" style={{ textAlign: "right", fontWeight: 700 }}>{fmtVnd(lineAmt(r))}</td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="iconbtn" style={{ width: 34, height: 34 }} onClick={() => remove(r.key)} aria-label="Xoá dòng"><Icon name="trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn ghost mt" onClick={addBlank}><Icon name="plus" /> Thêm dòng</button>
        </div>
      </div>

      {/* Cột phải: thông tin + tổng + submit */}
      <div style={{ display: "grid", gap: 20 }}>
        <div className="card">
          <div className="card-h"><h3>Thông tin nhập</h3></div>
          <div className="field" style={{ margin: 0 }}>
            <label>Ngày dự kiến về</label>
            <input type="date" value={expectedAt} onChange={(e) => setExpectedAt(e.target.value)} />
          </div>
          <div className="field" style={{ margin: "14px 0 0" }}>
            <label>Ghi chú</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Điều khoản thanh toán, vận chuyển..." />
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Tổng kết</h3></div>
          <div className="flex between aic">
            <b>Tổng giá trị PO</b>
            <b style={{ fontSize: 22, color: "var(--brand-1)" }}>{fmtVnd(total)}</b>
          </div>
          <button type="submit" className="btn primary mt" style={{ width: "100%" }} disabled={!canSubmit}>
            <Icon name="check" /> Lưu PO (nháp)
          </button>
          {!canSubmit && <p className="muted small mt">Nhập tên NCC và ít nhất một dòng hàng có tên & số lượng.</p>}
        </div>
      </div>

      <style>{`
        .cell { width: 100%; height: 38px; border: 1px solid var(--line); background: var(--surface-2);
          border-radius: var(--r-sm); padding: 0 10px; font-family: inherit; font-size: 13.5px; color: var(--tx); }
        .cell:focus { outline: none; border-color: var(--brand-1); background: var(--surface);
          box-shadow: 0 0 0 3px rgba(var(--brand-rgb), 0.12); }
      `}</style>
    </form>
  );
}
