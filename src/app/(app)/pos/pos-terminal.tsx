"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { ProductThumb } from "@/components/product-thumb";
import { fmtVnd } from "@/lib/bnb/util";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/bnb/types";
import { checkoutAction } from "./actions";

type ProductLite = { id: string; name: string; sku?: string; price: number; brand?: string; image?: string };
type CustomerLite = { id: string; name: string; phone: string };

type CartLine = {
  key: string;
  productId?: string;
  sku?: string;
  name: string;
  qty: number;
  unitPrice: number;
};

const METHODS: PaymentMethod[] = ["cash", "transfer", "card", "cod"];
const lineAmt = (l: CartLine) => Math.max(0, l.qty * l.unitPrice);

export function POSTerminal({
  products, customers, canPushHaravan,
}: {
  products: ProductLite[];
  customers: CustomerLite[];
  canPushHaravan: boolean;
}) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [pushHaravan, setPushHaravan] = useState(false);

  const total = useMemo(() => cart.reduce((s, l) => s + lineAmt(l), 0), [cart]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? products.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q))
      : products;
    return list.slice(0, 24);
  }, [query, products]);

  function addProduct(p: ProductLite) {
    setCart((cs) => {
      const i = cs.findIndex((l) => l.productId === p.id);
      if (i >= 0) {
        const next = [...cs];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...cs, { key: `${p.id}-${Date.now()}`, productId: p.id, sku: p.sku, name: p.name, qty: 1, unitPrice: p.price }];
    });
  }
  function setQty(key: string, qty: number) {
    setCart((cs) => cs.map((l) => (l.key === key ? { ...l, qty: Math.max(1, qty) } : l)));
  }
  function remove(key: string) {
    setCart((cs) => cs.filter((l) => l.key !== key));
  }

  const cartJson = JSON.stringify(
    cart.map((l) => ({ productId: l.productId, sku: l.sku, name: l.name, qty: l.qty, unitPrice: l.unitPrice })),
  );

  const canCheckout = cart.length > 0 && total > 0;

  return (
    <div className="grid-k g-2" style={{ alignItems: "start", gridTemplateColumns: "1.3fr 1fr" }}>
      {/* Cột trái: tìm & chọn sản phẩm */}
      <div className="card">
        <div className="card-h"><h3>Chọn sản phẩm</h3><span className="badge b-gray">{products.length} mặt hàng</span></div>
        <div className="field" style={{ margin: 0 }}>
          <label>Tìm theo tên hoặc SKU</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Gõ để lọc sản phẩm..." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="pos-prod"
              onClick={() => addProduct(p)}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <ProductThumb src={p.image} name={p.name} size={64} />
              </div>
              <div className="small" style={{ fontWeight: 700, lineHeight: 1.25 }}>{p.name}</div>
              <div className="urole" style={{ marginTop: 3 }}>{p.brand || p.sku || "—"}</div>
              <div className="small" style={{ marginTop: 6, fontWeight: 700, color: "var(--brand-1)" }}>{fmtVnd(p.price)}</div>
            </button>
          ))}
          {results.length === 0 && <p className="muted small">Không tìm thấy sản phẩm phù hợp.</p>}
        </div>
      </div>

      {/* Cột phải: giỏ + thanh toán */}
      <form action={checkoutAction} style={{ display: "grid", gap: 20 }}>
        <input type="hidden" name="cart" value={cartJson} />
        <input type="hidden" name="customerId" value={customerId} />
        <input type="hidden" name="guestName" value={guestName} />
        <input type="hidden" name="guestPhone" value={guestPhone} />
        <input type="hidden" name="method" value={method} />
        <input type="hidden" name="pushHaravan" value={pushHaravan ? "1" : "0"} />

        <div className="card">
          <div className="card-h"><h3>Giỏ hàng</h3><span className="badge b-gray">{cart.length} dòng</span></div>
          {cart.length === 0 ? (
            <p className="muted small" style={{ padding: "12px 0" }}>Bấm vào sản phẩm để thêm vào giỏ.</p>
          ) : (
            <div style={{ display: "grid", gap: 0 }}>
              {cart.map((l) => (
                <div key={l.key} className="flex between aic" style={{ padding: "10px 0", borderTop: "1px solid var(--line)", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 600 }}>{l.name}</div>
                    <div className="urole">{fmtVnd(l.unitPrice)} × {l.qty} = <b>{fmtVnd(lineAmt(l))}</b></div>
                  </div>
                  <div className="flex aic" style={{ gap: 4 }}>
                    <button type="button" className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => setQty(l.key, l.qty - 1)} aria-label="Giảm">−</button>
                    <input className="qty" inputMode="numeric" value={l.qty} onChange={(e) => setQty(l.key, Number(e.target.value.replace(/[^\d]/g, "")) || 1)} />
                    <button type="button" className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => setQty(l.key, l.qty + 1)} aria-label="Tăng">+</button>
                    <button type="button" className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => remove(l.key)} aria-label="Xoá"><Icon name="trash" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ borderTop: "2px solid var(--line)", marginTop: 12, paddingTop: 12 }}>
            <div className="flex between aic">
              <b>Tổng tiền</b>
              <b style={{ fontSize: 24, color: "var(--brand-1)" }}>{fmtVnd(total)}</b>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Khách & thanh toán</h3></div>
          <div className="field" style={{ margin: 0 }}>
            <label>Khách hàng</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— Khách lẻ —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
              ))}
            </select>
          </div>
          {!customerId && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Tên khách lẻ</label>
                <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Không bắt buộc" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>SĐT</label>
                <input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Không bắt buộc" />
              </div>
            </div>
          )}
          <div className="field" style={{ margin: "12px 0 0" }}>
            <label>Phương thức thanh toán</label>
            <div className="chips">
              {METHODS.map((m) => (
                <button key={m} type="button" className={`chip${method === m ? " on" : ""}`} onClick={() => setMethod(m)}>{PAYMENT_LABEL[m]}</button>
              ))}
            </div>
          </div>
          {canPushHaravan && (
            <label className="flex aic small" style={{ gap: 8, marginTop: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={pushHaravan} onChange={(e) => setPushHaravan(e.target.checked)} />
              Đẩy đơn lên Haravan
            </label>
          )}
          <button type="submit" className="btn primary mt" style={{ width: "100%" }} disabled={!canCheckout}>
            <Icon name="wallet" /> Thanh toán {total > 0 ? fmtVnd(total) : ""}
          </button>
          {!canCheckout && <p className="muted small mt">Thêm ít nhất một sản phẩm vào giỏ để thanh toán.</p>}
        </div>
      </form>

      <style>{`
        .pos-prod { text-align: left; border: 1px solid var(--line); background: var(--surface-2);
          border-radius: var(--r-sm); padding: 12px; cursor: pointer; transition: all .12s; }
        .pos-prod:hover { border-color: var(--brand-1); background: var(--surface);
          box-shadow: 0 0 0 3px rgba(var(--brand-rgb), 0.10); }
        .qty { width: 44px; height: 30px; text-align: center; border: 1px solid var(--line);
          background: var(--surface-2); border-radius: var(--r-sm); font-family: inherit; font-size: 13px; color: var(--tx); }
        .qty:focus { outline: none; border-color: var(--brand-1); }
      `}</style>
    </div>
  );
}
