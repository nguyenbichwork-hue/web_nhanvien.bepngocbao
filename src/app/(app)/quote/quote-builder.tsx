"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { SearchSelect } from "@/components/search-select";
import { fmtVnd } from "@/lib/bnb/util";
import { TIER_LABEL, type QuoteTier } from "@/lib/bnb/types";
import { createQuoteAction } from "./actions";

type ProductLite = { id: string; name: string; sku?: string; price: number; brand?: string };
type PersonLite = { id: string; name: string; phone: string };

type Row = {
  key: string;
  productId?: string;
  sku?: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
};

const TIERS: QuoteTier[] = ["basic", "balanced", "premium"];

let _k = 0;
const newKey = () => `r${++_k}-${Date.now()}`;

const lineAmt = (r: Row) => Math.max(0, r.unitPrice * r.qty - (r.discount || 0));

export function QuoteBuilder({
  products, customers, leads,
}: {
  products: ProductLite[];
  customers: PersonLite[];
  leads: PersonLite[];
}) {
  const [refType, setRefType] = useState<"customer" | "lead">("customer");
  const [refId, setRefId] = useState("");
  const [tier, setTier] = useState<QuoteTier>("balanced");
  const [rows, setRows] = useState<Row[]>([]);
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [pick, setPick] = useState("");

  const subtotal = useMemo(() => rows.reduce((s, r) => s + lineAmt(r), 0), [rows]);
  const total = Math.max(0, subtotal - (discount || 0));

  const people = refType === "customer" ? customers : leads;

  function addProduct(id: string) {
    if (!id) return;
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setRows((rs) => [
      ...rs,
      { key: newKey(), productId: p.id, sku: p.sku, name: p.name, qty: 1, unitPrice: p.price, discount: 0 },
    ]);
    setPick("");
  }

  function addBlank() {
    setRows((rs) => [...rs, { key: newKey(), name: "", qty: 1, unitPrice: 0, discount: 0 }]);
  }

  function patch(key: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  }

  function remove(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  const linesJson = JSON.stringify(
    rows
      .filter((r) => r.name.trim() && r.qty > 0)
      .map((r) => ({ productId: r.productId, sku: r.sku, name: r.name.trim(), qty: r.qty, unitPrice: r.unitPrice, discount: r.discount })),
  );

  const canSubmit = rows.some((r) => r.name.trim() && r.qty > 0);

  return (
    <form action={createQuoteAction} className="grid-k g-2" style={{ alignItems: "start" }}>
      {/* Hidden payload */}
      <input type="hidden" name="refType" value={refType} />
      <input type="hidden" name="refId" value={refId} />
      <input type="hidden" name="tier" value={tier} />
      <input type="hidden" name="lines" value={linesJson} />
      <input type="hidden" name="discount" value={String(discount || 0)} />
      <input type="hidden" name="note" value={note} />
      <input type="hidden" name="validUntil" value={validUntil} />

      {/* Cột trái: khách + dòng hàng */}
      <div style={{ display: "grid", gap: 20 }}>
        <div className="card">
          <div className="card-h"><h3>Khách hàng</h3></div>
          <div className="chips" style={{ marginBottom: 14 }}>
            <button type="button" className={`chip${refType === "customer" ? " on" : ""}`} onClick={() => { setRefType("customer"); setRefId(""); }}>Khách hàng</button>
            <button type="button" className={`chip${refType === "lead" ? " on" : ""}`} onClick={() => { setRefType("lead"); setRefId(""); }}>Lead</button>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>{refType === "customer" ? "Chọn khách hàng" : "Chọn lead"}</label>
            <SearchSelect
              options={people.map((p) => ({ value: p.id, label: p.name, sub: p.phone }))}
              value={refId}
              onChange={setRefId}
              placeholder={refType === "customer" ? "Gõ tên / SĐT khách…" : "Gõ tên / SĐT lead…"}
              emptyLabel="— Khách lẻ / chưa chọn —"
            />
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Dòng sản phẩm</h3>
            <span className="badge b-gray">{rows.length} dòng</span>
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label>Thêm sản phẩm từ danh mục</label>
            <SearchSelect
              options={products.map((p) => ({
                value: p.id,
                label: p.name,
                sub: `${p.brand ? p.brand + " · " : ""}${fmtVnd(p.price)}`,
              }))}
              value={pick}
              onChange={addProduct}
              placeholder="Gõ tên / SKU sản phẩm để thêm…"
              resetOnPick
            />
          </div>

          {rows.length > 0 && (
            <table style={{ marginTop: 16 }}>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th style={{ width: 70 }}>SL</th>
                  <th style={{ width: 130 }}>Đơn giá</th>
                  <th style={{ width: 120 }}>CK dòng</th>
                  <th style={{ width: 120, textAlign: "right" }}>Thành tiền</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <input className="cell" value={r.name} placeholder="Tên sản phẩm" onChange={(e) => patch(r.key, { name: e.target.value })} />
                      {r.sku && <div className="urole" style={{ marginTop: 2 }}>SKU {r.sku}</div>}
                    </td>
                    <td><input className="cell" inputMode="numeric" value={r.qty} onChange={(e) => patch(r.key, { qty: Math.max(1, Number(e.target.value.replace(/[^\d]/g, "")) || 1) })} /></td>
                    <td><input className="cell" inputMode="numeric" value={r.unitPrice} onChange={(e) => patch(r.key, { unitPrice: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} /></td>
                    <td><input className="cell" inputMode="numeric" value={r.discount} onChange={(e) => patch(r.key, { discount: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })} /></td>
                    <td className="small" style={{ textAlign: "right", fontWeight: 700 }}>{fmtVnd(lineAmt(r))}</td>
                    <td style={{ textAlign: "right" }}>
                      <button type="button" className="iconbtn" style={{ width: 34, height: 34 }} onClick={() => remove(r.key)} aria-label="Xoá dòng"><Icon name="trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <button type="button" className="btn ghost mt" onClick={addBlank}><Icon name="plus" /> Thêm dòng trống</button>
          {rows.length === 0 && <p className="muted small mt">Chọn sản phẩm từ danh mục hoặc thêm dòng trống để bắt đầu.</p>}
        </div>
      </div>

      {/* Cột phải: phương án + tổng + submit */}
      <div style={{ display: "grid", gap: 20 }}>
        <div className="card">
          <div className="card-h"><h3>Phương án</h3></div>
          <div className="chips">
            {TIERS.map((t) => (
              <button key={t} type="button" className={`chip${tier === t ? " on" : ""}`} onClick={() => setTier(t)}>{TIER_LABEL[t]}</button>
            ))}
          </div>
          <div className="field mt" style={{ margin: "16px 0 0" }}>
            <label>Hạn báo giá</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div className="field" style={{ margin: "14px 0 0" }}>
            <label>Ghi chú</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bao gồm vận chuyển, lắp đặt..." />
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Tổng kết</h3></div>
          <Row2 label="Tạm tính" value={fmtVnd(subtotal)} />
          <div className="field" style={{ margin: "12px 0 0" }}>
            <label>Chiết khấu tổng (đ)</label>
            <input inputMode="numeric" value={discount || ""} placeholder="0" onChange={(e) => setDiscount(Number(e.target.value.replace(/[^\d]/g, "")) || 0)} />
          </div>
          <div style={{ borderTop: "1px solid var(--line)", margin: "16px 0 0", paddingTop: 14 }}>
            <div className="flex between aic">
              <b>Thành tiền</b>
              <b style={{ fontSize: 22, color: "var(--brand-1)" }}>{fmtVnd(total)}</b>
            </div>
          </div>
          <button type="submit" className="btn primary mt" style={{ width: "100%" }} disabled={!canSubmit}>
            <Icon name="check" /> Lưu báo giá (nháp)
          </button>
          {!canSubmit && <p className="muted small mt">Thêm ít nhất một dòng sản phẩm có tên & số lượng.</p>}
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

function Row2({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex between aic small" style={{ padding: "4px 0" }}>
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
