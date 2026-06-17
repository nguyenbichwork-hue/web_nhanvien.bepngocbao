// Tầng tích hợp Haravan Admin API — nguồn sản phẩm/đơn hàng/khách hàng cho BNB.
// Khi thiếu HARAVAN_API_TOKEN/HARAVAN_SHOP_DOMAIN → chạy STUB (dữ liệu mẫu offline),
// app vẫn hoạt động ở chế độ dev. Cắm token thật => kéo dữ liệu live.
//
// Tham khảo Haravan REST Admin API: GET /admin/products.json (Bearer token).
// Token BNB cung cấp đặt ở env HARAVAN_API_TOKEN; shop ở HARAVAN_SHOP_DOMAIN.

import type { Customer, Order, OrderStatus, Product, QuoteLine } from "@/lib/bnb/types";

const TOKEN = process.env.HARAVAN_API_TOKEN || "";
const SHOP = process.env.HARAVAN_SHOP_DOMAIN || "";
// Haravan Open Platform: access token tự định danh shop → endpoint toàn cục
// https://apis.haravan.com/com (KHÔNG cần shop domain). Nếu là private app kiểu cũ
// thì khai HARAVAN_SHOP_DOMAIN để dùng https://{shop}/admin.
const BASE =
  process.env.HARAVAN_API_BASE ||
  (SHOP ? `https://${SHOP}/admin` : "https://apis.haravan.com/com");

export function haravanConfigured(): boolean {
  return Boolean(TOKEN);
}

type HaravanVariant = {
  id: number;
  sku?: string;
  price?: string;
  compare_at_price?: string | null;
  inventory_quantity?: number;
};
type HaravanProduct = {
  id: number;
  title: string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  images?: { src: string }[];
  image?: { src: string } | null;
  variants?: HaravanVariant[];
  published_at?: string | null;
};

function mapProduct(p: HaravanProduct): Product {
  const v = p.variants?.[0];
  const price = v?.price ? Number(v.price) : 0;
  const compare = v?.compare_at_price ? Number(v.compare_at_price) : undefined;
  const img = p.image?.src || p.images?.[0]?.src;
  const stock = (p.variants ?? []).reduce((s, x) => s + (x.inventory_quantity ?? 0), 0);
  const available = stock > 0 || Boolean(p.published_at);
  return {
    id: `hrv-${p.id}`,
    haravanId: String(p.id),
    sku: v?.sku || undefined,
    name: p.title,
    brand: p.vendor || undefined,
    category: p.product_type || undefined,
    price,
    compareAtPrice: compare && compare > price ? compare : undefined,
    image: img,
    available,
    stock,
    tags: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
  };
}

const AUTH = () => ({ Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" });

async function haravanGet<T>(path: string, opts?: { fresh?: boolean }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: AUTH(),
    // fresh = lấy tươi (tồn kho real-time); mặc định cache 5' để giảm gọi API.
    ...(opts?.fresh
      ? { cache: "no-store" as const }
      : { next: { revalidate: 300, tags: ["haravan"] } }),
  });
  if (!res.ok) throw new Error(`Haravan ${path}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

async function haravanSend<T>(method: "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: AUTH(),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Haravan ${method} ${path}: ${res.status} ${txt.slice(0, 200)}`);
  }
  return (await res.json().catch(() => ({}))) as T;
}

/** Lấy danh sách sản phẩm (live hoặc stub). Haravan giới hạn 50/trang → tự phân trang. */
export async function fetchProducts(limit = 50): Promise<Product[]> {
  if (!haravanConfigured()) return STUB_PRODUCTS.slice(0, limit);
  try {
    const out: Product[] = [];
    const pages = Math.ceil(limit / 50);
    for (let page = 1; page <= pages; page++) {
      const per = Math.min(50, limit - out.length);
      const data = await haravanGet<{ products: HaravanProduct[] }>(
        `/products.json?limit=${per}&page=${page}`,
      );
      const batch = (data.products ?? []).map(mapProduct);
      out.push(...batch);
      if (batch.length < per) break; // hết hàng
    }
    return out;
  } catch (err) {
    console.error("[haravan] fetchProducts thất bại, dùng stub:", err);
    return STUB_PRODUCTS.slice(0, limit);
  }
}

/** Tổng số sản phẩm trên Haravan (cho dashboard/đồng bộ). */
export async function fetchProductCount(): Promise<number | null> {
  if (!haravanConfigured()) return null;
  try {
    const data = await haravanGet<{ count: number }>(`/products/count.json`);
    return data.count ?? null;
  } catch {
    return null;
  }
}

/* ===================== Khách hàng ===================== */
type HaravanAddress = { address1?: string; ward?: string; district?: string; province?: string; city?: string; name?: string };
type HaravanCustomer = {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  addresses?: HaravanAddress[];
  default_address?: HaravanAddress;
  orders_count?: number;
  total_spent?: string;
  last_order_date?: string | null;
  created_at?: string;
  updated_at?: string;
  note?: string;
};

const fullName = (last?: string, first?: string) => [last, first].filter(Boolean).join(" ").trim();
const addrText = (a?: HaravanAddress) =>
  a ? [a.address1, a.ward, a.district, a.province || a.city].filter(Boolean).join(", ") : undefined;

function mapCustomer(c: HaravanCustomer): Customer {
  const name = c.default_address?.name || fullName(c.last_name, c.first_name) || "Khách Haravan";
  return {
    id: `hrv-cus-${c.id}`,
    code: `KH-${String(c.id).slice(-6)}`,
    name,
    phone: c.phone || c.default_address?.address1 ? c.phone || "" : "",
    email: c.email || undefined,
    address: addrText(c.default_address || c.addresses?.[0]),
    haravanId: String(c.id),
    totalSpent: c.total_spent ? Number(c.total_spent) : 0,
    orderCount: c.orders_count ?? 0,
    lastOrderAt: c.last_order_date || undefined,
    note: c.note || undefined,
    createdAt: c.created_at || new Date().toISOString(),
    updatedAt: c.updated_at || c.created_at || new Date().toISOString(),
  };
}

/** Đồng bộ khách hàng từ Haravan (live hoặc null khi chưa cấu hình). */
export async function fetchCustomers(limit = 100): Promise<Customer[]> {
  if (!haravanConfigured()) return [];
  try {
    const out: Customer[] = [];
    const pages = Math.ceil(limit / 50);
    for (let page = 1; page <= pages; page++) {
      const per = Math.min(50, limit - out.length);
      const data = await haravanGet<{ customers: HaravanCustomer[] }>(`/customers.json?limit=${per}&page=${page}`);
      const batch = (data.customers ?? []).map(mapCustomer);
      out.push(...batch);
      if (batch.length < per) break;
    }
    return out;
  } catch (err) {
    console.error("[haravan] fetchCustomers thất bại:", err);
    return [];
  }
}

/* ===================== Đơn hàng ===================== */
type HaravanLineItem = { sku?: string; title?: string; name?: string; quantity?: number; price?: string };
type HaravanOrder = {
  id: number;
  name?: string;
  order_number?: number;
  created_at?: string;
  updated_at?: string;
  financial_status?: string;
  fulfillment_status?: string | null;
  cancelled_at?: string | null;
  total_price?: string;
  customer?: { id: number; first_name?: string; last_name?: string } | null;
  line_items?: HaravanLineItem[];
  shipping_address?: HaravanAddress | null;
  billing_address?: HaravanAddress | null;
  note?: string;
};

function mapOrderStatus(o: HaravanOrder): OrderStatus {
  if (o.cancelled_at) return "cancelled";
  if (o.fulfillment_status === "fulfilled") return "completed";
  if (o.financial_status === "paid") return "paid";
  if (o.financial_status === "partially_paid") return "confirmed";
  return "pending";
}

function mapOrder(o: HaravanOrder): Order {
  const total = o.total_price ? Number(o.total_price) : 0;
  const status = mapOrderStatus(o);
  const paid = o.financial_status === "paid" ? total : 0;
  const lines: QuoteLine[] = (o.line_items ?? []).map((li) => ({
    sku: li.sku || undefined,
    name: li.title || li.name || "Sản phẩm",
    qty: li.quantity ?? 1,
    unitPrice: li.price ? Number(li.price) : 0,
  }));
  return {
    id: `hrv-ord-${o.id}`,
    code: o.name || `#${o.order_number ?? o.id}`,
    customerId: o.customer ? `hrv-cus-${o.customer.id}` : undefined,
    haravanId: String(o.id),
    lines: lines.length ? lines : [{ name: "Đơn Haravan", qty: 1, unitPrice: total }],
    total,
    paid,
    status,
    address: addrText(o.shipping_address || o.billing_address || undefined),
    note: o.note || undefined,
    createdAt: o.created_at || new Date().toISOString(),
    updatedAt: o.updated_at || o.created_at || new Date().toISOString(),
    confirmedAt: status !== "pending" ? o.created_at : undefined,
  };
}

/** Lấy 1 đơn theo Haravan id (cho trang chi tiết). */
export async function fetchOrderById(haravanId: string): Promise<Order | null> {
  if (!haravanConfigured()) return null;
  try {
    const data = await haravanGet<{ order: HaravanOrder }>(`/orders/${haravanId}.json`);
    return data.order ? mapOrder(data.order) : null;
  } catch {
    return null;
  }
}

/** Lấy 1 khách theo Haravan id. */
export async function fetchCustomerById(haravanId: string): Promise<Customer | null> {
  if (!haravanConfigured()) return null;
  try {
    const data = await haravanGet<{ customer: HaravanCustomer }>(`/customers/${haravanId}.json`);
    return data.customer ? mapCustomer(data.customer) : null;
  } catch {
    return null;
  }
}

/** Đồng bộ đơn hàng từ Haravan (mới nhất trước). */
export async function fetchOrders(limit = 50): Promise<Order[]> {
  if (!haravanConfigured()) return [];
  try {
    const out: Order[] = [];
    const pages = Math.ceil(limit / 50);
    for (let page = 1; page <= pages; page++) {
      const per = Math.min(50, limit - out.length);
      const data = await haravanGet<{ orders: HaravanOrder[] }>(`/orders.json?status=any&limit=${per}&page=${page}`);
      const batch = (data.orders ?? []).map(mapOrder);
      out.push(...batch);
      if (batch.length < per) break;
    }
    // Mới nhất trước.
    return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch (err) {
    console.error("[haravan] fetchOrders thất bại:", err);
    return [];
  }
}

/* ===================== Tồn kho (real-time) ===================== */
/** Tồn kho tươi — bỏ cache để phản ánh số lượng hiện tại trên Haravan. */
export async function fetchInventory(limit = 100): Promise<Product[]> {
  if (!haravanConfigured()) return STUB_PRODUCTS.slice(0, limit);
  try {
    const out: Product[] = [];
    const pages = Math.ceil(limit / 50);
    for (let page = 1; page <= pages; page++) {
      const per = Math.min(50, limit - out.length);
      const data = await haravanGet<{ products: HaravanProduct[] }>(
        `/products.json?limit=${per}&page=${page}`,
        { fresh: true },
      );
      const batch = (data.products ?? []).map(mapProduct);
      out.push(...batch);
      if (batch.length < per) break;
    }
    return out;
  } catch (err) {
    console.error("[haravan] fetchInventory thất bại:", err);
    return [];
  }
}

/* ===================== Ghi ngược (write-back) ===================== */
/** Tạo khách hàng trên Haravan → trả Haravan id (hoặc null nếu lỗi/chưa cấu hình). */
export async function createHaravanCustomer(c: {
  name: string; phone?: string; email?: string; address?: string; note?: string;
}): Promise<string | null> {
  if (!haravanConfigured()) return null;
  const parts = c.name.trim().split(/\s+/);
  const first = parts.length > 1 ? parts[parts.length - 1] : c.name;
  const last = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
  const payload = {
    customer: {
      first_name: first,
      last_name: last,
      phone: c.phone || undefined,
      email: c.email || undefined,
      note: c.note || "Tạo từ BNB ERP",
      addresses: c.address ? [{ address1: c.address, phone: c.phone }] : undefined,
    },
  };
  const res = await haravanSend<{ customer?: { id: number } }>("POST", "/customers.json", payload);
  return res.customer?.id ? String(res.customer.id) : null;
}

/** Tạo đơn hàng trên Haravan từ đơn BNB → trả {haravanId, code} (hoặc null). */
export async function createHaravanOrder(
  o: Order,
  customerHaravanId?: string,
): Promise<{ haravanId: string; code: string } | null> {
  if (!haravanConfigured()) return null;
  const line_items = o.lines.map((l) => ({
    title: l.name,
    price: String(l.unitPrice),
    quantity: l.qty,
    sku: l.sku || undefined,
  }));
  const paid = o.status === "paid" || o.status === "completed";
  const payload = {
    order: {
      line_items: line_items.length ? line_items : [{ title: "Đơn BNB", price: String(o.total), quantity: 1 }],
      customer: customerHaravanId ? { id: Number(customerHaravanId) } : undefined,
      financial_status: paid ? "paid" : "pending",
      note: o.note || "Tạo từ BNB ERP",
      tags: "BNB",
      send_receipt: false,
      send_fulfillment_receipt: false,
    },
  };
  const res = await haravanSend<{ order?: { id: number; name?: string } }>("POST", "/orders.json", payload);
  if (!res.order?.id) return null;
  return { haravanId: String(res.order.id), code: res.order.name || `#${res.order.id}` };
}

/* ===================== Webhook (đăng ký tự động) ===================== */
export type HaravanWebhook = { id: number; topic: string; address: string; format?: string };

/** Các topic BNB cần lắng nghe để đồng bộ real-time. */
export const HARAVAN_WEBHOOK_TOPICS = [
  "inventory_levels/update",
  "products/update",
  "orders/create",
  "orders/updated",
] as const;

/** Liệt kê webhook đã đăng ký trên shop. */
export async function listHaravanWebhooks(): Promise<HaravanWebhook[]> {
  if (!haravanConfigured()) return [];
  try {
    const data = await haravanGet<{ webhooks: HaravanWebhook[] }>(`/webhooks.json`, { fresh: true });
    return data.webhooks ?? [];
  } catch (err) {
    console.error("[haravan] listWebhooks lỗi:", err);
    return [];
  }
}

export type RegisterResult = { topic: string; status: "created" | "exists" | "error"; detail?: string };

/** Đăng ký (idempotent) toàn bộ webhook BNB trỏ về `${baseUrl}/api/haravan/webhook`.
 *  Bỏ qua topic đã tồn tại đúng địa chỉ. baseUrl phải là URL public (sau khi deploy). */
export async function registerHaravanWebhooks(baseUrl: string): Promise<RegisterResult[]> {
  if (!haravanConfigured()) return HARAVAN_WEBHOOK_TOPICS.map((topic) => ({ topic, status: "error", detail: "chưa cấu hình token" }));
  const address = `${baseUrl.replace(/\/+$/, "")}/api/haravan/webhook`;
  const existing = await listHaravanWebhooks();
  const out: RegisterResult[] = [];
  for (const topic of HARAVAN_WEBHOOK_TOPICS) {
    if (existing.some((w) => w.topic === topic && w.address === address)) {
      out.push({ topic, status: "exists" });
      continue;
    }
    try {
      await haravanSend("POST", "/webhooks.json", { webhook: { topic, address, format: "json" } });
      out.push({ topic, status: "created" });
    } catch (err) {
      out.push({ topic, status: "error", detail: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}

// ---- Dữ liệu mẫu offline (giống danh mục BNB: bếp từ, hút mùi, lò...) ----
export const STUB_PRODUCTS: Product[] = [
  { id: "hrv-1", sku: "BT-BOSCH-PXY875DE3E", name: "Bếp từ Bosch PXY875DE3E (4 vùng nấu)", brand: "Bosch", category: "Bếp từ", price: 38900000, compareAtPrice: 45900000, image: "", available: true, tags: ["bếp từ", "nhập khẩu", "Đức"] },
  { id: "hrv-2", sku: "BT-CHEFS-EH-DIH366", name: "Bếp từ Chef's EH-DIH366 (2 vùng nấu)", brand: "Chef's", category: "Bếp từ", price: 12900000, compareAtPrice: 18500000, image: "", available: true, tags: ["bếp từ", "đôi"] },
  { id: "hrv-3", sku: "HM-HAFELE-HH-WVG90B", name: "Máy hút mùi Hafele HH-WVG90B (90cm)", brand: "Hafele", category: "Máy hút mùi", price: 9800000, image: "", available: true, tags: ["hút mùi", "áp tường"] },
  { id: "hrv-4", sku: "HM-KAFF-KF-GB029", name: "Máy hút mùi Kaff KF-GB029 (đảo)", brand: "Kaff", category: "Máy hút mùi", price: 14500000, image: "", available: true, tags: ["hút mùi", "đảo"] },
  { id: "hrv-5", sku: "LO-BOSCH-HBA5570S0B", name: "Lò nướng Bosch HBA5570S0B (71L)", brand: "Bosch", category: "Lò nướng", price: 21900000, compareAtPrice: 24900000, image: "", available: true, tags: ["lò nướng", "âm tủ"] },
  { id: "hrv-6", sku: "MRB-BOSCH-SMS46MI05E", name: "Máy rửa bát Bosch SMS46MI05E (13 bộ)", brand: "Bosch", category: "Máy rửa bát", price: 19500000, compareAtPrice: 24500000, image: "", available: true, tags: ["máy rửa bát", "độc lập"] },
  { id: "hrv-7", sku: "CR-KONOX-KN8048DUB", name: "Chậu rửa Konox KN8048DUB (2 hố)", brand: "Konox", category: "Chậu rửa", price: 4200000, image: "", available: true, tags: ["chậu rửa", "inox"] },
  { id: "hrv-8", sku: "VS-KONOX-KN-PK01", name: "Vòi rửa Konox KN-PK01 (rút dây)", brand: "Konox", category: "Vòi rửa", price: 2600000, image: "", available: true, tags: ["vòi rửa"] },
  { id: "hrv-9", sku: "LVS-SPELIER-SPM-628", name: "Máy lọc nước Spelier SPM-628", brand: "Spelier", category: "Máy lọc nước", price: 6900000, image: "", available: false, tags: ["lọc nước"] },
  { id: "hrv-10", sku: "TBR-KAFF-KF-105I", name: "Bếp từ đôi Kaff KF-105I", brand: "Kaff", category: "Bếp từ", price: 8900000, compareAtPrice: 12900000, image: "", available: true, tags: ["bếp từ", "đôi"] },
];
