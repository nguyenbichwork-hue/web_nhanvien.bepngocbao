"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { ProductThumb } from "@/components/product-thumb";
import { fmtVnd } from "@/lib/bnb/util";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/bnb/types";
import { checkoutAction } from "./actions";

type ProductLite = {
  id: string; name: string; sku?: string; price: number;
  brand?: string; category?: string; image?: string; stock?: number; available?: boolean;
};
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
const QUICK_CASH = [50000, 100000, 200000, 500000];
const PER_PAGE = 24; // số sản phẩm mỗi trang lưới POS
const lineAmt = (l: CartLine) => Math.max(0, l.qty * l.unitPrice);
const onlyDigits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

/** Dãy số trang rút gọn có dấu "…" khi nhiều trang (1 … 4 5 6 … 73). */
function buildPageList(cur: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, cur - 1);
  const hi = Math.min(total - 1, cur + 1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < total - 1) out.push("…");
  out.push(total);
  return out;
}

export function POSTerminal({
  products, customers, canPushHaravan,
}: {
  products: ProductLite[];
  customers: CustomerLite[];
  canPushHaravan: boolean;
}) {
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("__all");
  const [category, setCategory] = useState("__all");
  const [inStock, setInStock] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState(0);
  const [received, setReceived] = useState(0);
  const [note, setNote] = useState("");
  const [pushHaravan, setPushHaravan] = useState(false);
  const [page, setPage] = useState(1);

  // Danh sách hãng / nhóm để đổ vào bộ lọc (loại bỏ rỗng, sắp xếp)
  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand).filter((b): b is string => !!b))].sort((a, b) => a.localeCompare(b, "vi")),
    [products],
  );
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "vi")),
    [products],
  );

  const subtotal = useMemo(() => cart.reduce((s, l) => s + lineAmt(l), 0), [cart]);
  const discountVal = Math.min(Math.max(0, discount), subtotal);
  const total = Math.max(0, subtotal - discountVal);
  const isCash = method === "cash";
  const changeDue = received - total;

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !(p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q))) return false;
      if (brand !== "__all" && p.brand !== brand) return false;
      if (category !== "__all" && p.category !== category) return false;
      if (inStock && !((p.stock ?? 0) > 0 || p.available)) return false;
      return true;
    });
  }, [query, brand, category, inStock, products]);
  const totalPages = Math.max(1, Math.ceil(matched.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const results = matched.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const pageNums = buildPageList(safePage, totalPages);
  // Đổi bộ lọc / tìm kiếm → quay về trang 1
  useEffect(() => { setPage(1); }, [query, brand, category, inStock]);

  const filterActive = brand !== "__all" || category !== "__all" || inStock || query.trim();

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
  function resetFilters() {
    setQuery(""); setBrand("__all"); setCategory("__all"); setInStock(false);
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
        {/* Bộ lọc nhanh sản phẩm */}
        <div className="flex aic" style={{ flexWrap: "wrap", gap: 9, marginTop: 12 }}>
          {brands.length > 0 && (
            <select className={`fsel${brand !== "__all" ? " act" : ""}`} value={brand} onChange={(e) => setBrand(e.target.value)} style={{ minWidth: 140 }} aria-label="Hãng">
              <option value="__all">Hãng: Tất cả</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
          {categories.length > 0 && (
            <select className={`fsel${category !== "__all" ? " act" : ""}`} value={category} onChange={(e) => setCategory(e.target.value)} style={{ minWidth: 140 }} aria-label="Nhóm">
              <option value="__all">Nhóm: Tất cả</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button type="button" className={`chip${inStock ? " on" : ""}`} onClick={() => setInStock((v) => !v)}>Còn hàng</button>
          {filterActive && (
            <button type="button" className="btn sm ghost" onClick={resetFilters} title="Xoá lọc">
              <Icon name="x" /> Xoá lọc
            </button>
          )}
          <span className="small muted" style={{ marginLeft: "auto" }}>
            {matched.length.toLocaleString("vi-VN")} sản phẩm{totalPages > 1 ? ` · trang ${safePage}/${totalPages}` : ""}
          </span>
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

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex aic" style={{ justifyContent: "center", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
            <button
              type="button"
              className="iconbtn"
              style={{ width: 34, height: 34, opacity: safePage <= 1 ? 0.4 : 1 }}
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
              aria-label="Trang trước"
            >
              <Icon name="chevleft" />
            </button>
            {pageNums.map((n, i) =>
              n === "…" ? (
                <span key={`gap-${i}`} className="muted small" style={{ padding: "0 4px" }}>…</span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={`chip${n === safePage ? " on" : ""}`}
                  style={{ minWidth: 36, textAlign: "center", padding: "7px 10px" }}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ),
            )}
            <button
              type="button"
              className="iconbtn"
              style={{ width: 34, height: 34, opacity: safePage >= totalPages ? 0.4 : 1 }}
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
              aria-label="Trang sau"
            >
              <Icon name="chev" />
            </button>
          </div>
        )}
      </div>

      {/* Cột phải: giỏ + thanh toán */}
      <form action={checkoutAction} style={{ display: "grid", gap: 20 }}>
        <input type="hidden" name="cart" value={cartJson} />
        <input type="hidden" name="customerId" value={customerId} />
        <input type="hidden" name="guestName" value={guestName} />
        <input type="hidden" name="guestPhone" value={guestPhone} />
        <input type="hidden" name="method" value={method} />
        <input type="hidden" name="discount" value={discountVal} />
        <input type="hidden" name="received" value={isCash ? received : 0} />
        <input type="hidden" name="note" value={note} />
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

          {/* Giảm giá đơn */}
          <div className="field" style={{ margin: "14px 0 0" }}>
            <label>Giảm giá đơn (đ)</label>
            <input
              inputMode="numeric"
              value={discount ? discount.toLocaleString("vi-VN") : ""}
              onChange={(e) => setDiscount(onlyDigits(e.target.value))}
              placeholder="0"
            />
          </div>

          {/* Tiền khách đưa — chỉ với tiền mặt, có nút mệnh giá nhanh + tính thối */}
          {isCash && (
            <div className="field" style={{ margin: "14px 0 0" }}>
              <label>Tiền khách đưa</label>
              <input
                inputMode="numeric"
                value={received ? received.toLocaleString("vi-VN") : ""}
                onChange={(e) => setReceived(onlyDigits(e.target.value))}
                placeholder="0"
              />
              <div className="flex aic" style={{ flexWrap: "wrap", gap: 7, marginTop: 9 }}>
                <button type="button" className="chip" onClick={() => setReceived(total)} disabled={total <= 0}>Đủ tiền</button>
                {QUICK_CASH.map((v) => (
                  <button key={v} type="button" className="chip" onClick={() => setReceived((r) => r + v)}>
                    +{v / 1000}k
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tóm tắt đơn — kiểu Haravan */}
          <div style={{ borderTop: "1px dashed var(--line)", marginTop: 16, paddingTop: 14, display: "grid", gap: 8 }}>
            <div className="flex between small"><span className="muted">Tạm tính</span><span>{fmtVnd(subtotal)}</span></div>
            {discountVal > 0 && (
              <div className="flex between small"><span className="muted">Giảm giá</span><span style={{ color: "var(--c-rose)" }}>− {fmtVnd(discountVal)}</span></div>
            )}
            <div className="flex between aic" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <b>Tổng cộng</b>
              <b style={{ fontSize: 24, color: "var(--brand-1)" }}>{fmtVnd(total)}</b>
            </div>
            {isCash && received > 0 && (
              <>
                <div className="flex between small"><span className="muted">Khách đưa</span><span>{fmtVnd(received)}</span></div>
                <div className="flex between aic">
                  <span className="small muted">Tiền thối lại</span>
                  <b style={{ color: changeDue >= 0 ? "var(--c-teal)" : "var(--c-rose)" }}>
                    {changeDue >= 0 ? fmtVnd(changeDue) : `Thiếu ${fmtVnd(-changeDue)}`}
                  </b>
                </div>
              </>
            )}
          </div>

          {/* Ghi chú đơn */}
          <div className="field" style={{ margin: "14px 0 0" }}>
            <label>Ghi chú đơn</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc — ghi chú giao hàng, yêu cầu riêng…" style={{ height: 64 }} />
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
