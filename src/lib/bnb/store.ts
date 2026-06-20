// BNB · Kho dữ liệu các phân hệ bán hàng (in-memory seed + swap Supabase).
// Mô hình giống store HR: dev mode dùng seed in-memory; khi cấu hình Supabase
// thì pull/persist qua helper persist.ts (bảng JSONB: id text + data jsonb).

import { cache } from "react";
import {
  isSupabaseStoreConfigured,
  pullCollection,
  upsertRow,
  deleteRow,
} from "@/lib/org/persist";
import {
  STUB_PRODUCTS, fetchProducts, fetchAllProducts, fetchCustomers, fetchOrders,
  fetchOrderById, fetchCustomerById, fetchInventory,
  createHaravanCustomer, createHaravanOrder, haravanConfigured,
} from "@/lib/haravan/client";
import type {
  Activity, AdCampaign, BankTxn, CalendarItem, ContentPillar, Customer, DeliveryJob,
  InternalTask, Lead, NpsResponse, Order, Product, PurchaseOrder,
  Quote, Review, ShiftReport, Survey, WarrantyTicket,
  ZaloConversation, ZaloMessage, ZaloMsgDirection, ReceptionLog, ShiftCheckin,
  CxJourney, JourneyStageKey, CxReferral, OrderStatus,
} from "./types";
import { CARE_MILESTONES, CX_JOURNEY_STAGES, ORDER_STATUS_LABEL } from "./types";
import { sendCareZNS } from "@/lib/zalo/zns";
import { seedBNB } from "./seed";
import { cxAlerts } from "./cx-sla";

const dayKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export type BNBDB = {
  leads: Lead[];
  customers: Customer[];
  activities: Activity[];
  surveys: Survey[];
  quotes: Quote[];
  orders: Order[];
  deliveries: DeliveryJob[];
  warranties: WarrantyTicket[];
  shiftReports: ShiftReport[];
  tasks: InternalTask[];
  npsResponses: NpsResponse[];
  pillars: ContentPillar[];
  calendarItems: CalendarItem[];
  adCampaigns: AdCampaign[];
  purchaseOrders: PurchaseOrder[];
  bankTxns: BankTxn[];
  reviews: Review[];
  zaloConversations: ZaloConversation[];
  zaloMessages: ZaloMessage[];
  products: Product[];
  receptionLogs: ReceptionLog[];
  shiftCheckins: ShiftCheckin[];
  cxJourneys: CxJourney[];
  referrals: CxReferral[];
  seq: number;
};

type Coll = Exclude<keyof BNBDB, "seq">;

// Bản đồ collection ↔ bảng Supabase.
const TABLE: Record<Coll, string> = {
  leads: "bnb_leads",
  customers: "bnb_customers",
  activities: "bnb_activities",
  surveys: "bnb_surveys",
  quotes: "bnb_quotes",
  orders: "bnb_orders",
  deliveries: "bnb_deliveries",
  warranties: "bnb_warranties",
  shiftReports: "bnb_shift_reports",
  tasks: "bnb_tasks",
  npsResponses: "bnb_nps_responses",
  pillars: "bnb_pillars",
  calendarItems: "bnb_calendar_items",
  adCampaigns: "bnb_ad_campaigns",
  purchaseOrders: "bnb_purchase_orders",
  bankTxns: "bnb_bank_txns",
  reviews: "bnb_reviews",
  zaloConversations: "bnb_zalo_conversations",
  zaloMessages: "bnb_zalo_messages",
  products: "bnb_products",
  receptionLogs: "bnb_reception_logs",
  shiftCheckins: "bnb_shift_checkins",
  cxJourneys: "bnb_cx_journeys",
  referrals: "bnb_cx_referrals",
};

function freshDB(): BNBDB {
  return { ...seedBNB(), referrals: [], products: [...STUB_PRODUCTS], seq: 1000 };
}

// Singleton tồn tại qua HMR của dev server.
const g = globalThis as unknown as { __bnbSalesDB?: BNBDB };
function db(): BNBDB {
  if (!g.__bnbSalesDB) g.__bnbSalesDB = freshDB();
  return g.__bnbSalesDB;
}

// Theo dõi collection đã nạp từ Supabase trong request hiện tại (tránh nạp lại).
const reqLoaded = cache(() => new Set<Coll>());

async function ensureLoaded(keys: Coll[]): Promise<void> {
  if (!isSupabaseStoreConfigured) return;
  const loaded = reqLoaded();
  const dbo = db();
  await Promise.all(
    keys
      .filter((k) => !loaded.has(k))
      .map(async (k) => {
        const rows = await pullCollection<BNBDB[Coll][number]>(TABLE[k]);
        // Supabase là nguồn chân lý khi đã cấu hình.
        (dbo[k] as unknown[]) = rows;
        loaded.add(k);
      }),
  );
}

async function getDb(...keys: Coll[]): Promise<BNBDB> {
  await ensureLoaded(keys);
  return db();
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const now = () => new Date().toISOString();

function nextId(prefix: string): string {
  const dbo = db();
  dbo.seq += 1;
  return `${prefix}-${dbo.seq}`;
}

/** Sinh mã hiển thị dạng PREFIX + số tăng dần (vd LD-1042). */
function nextCode(prefix: string): string {
  const dbo = db();
  return `${prefix}-${dbo.seq + 1}`;
}

/* ============ Đọc danh sách ============ */
export async function listLeads(): Promise<Lead[]> {
  return clone((await getDb("leads")).leads);
}
export async function listCustomers(): Promise<Customer[]> {
  const local = clone((await getDb("customers")).customers);
  if (haravanConfigured()) {
    try {
      const live = await fetchCustomers(100);
      if (live.length) return [...live, ...local];
    } catch (err) {
      console.error("[bnb] listCustomers Haravan lỗi:", err);
    }
  }
  return local;
}
export async function listSurveys(): Promise<Survey[]> {
  return clone((await getDb("surveys")).surveys);
}
export async function listQuotes(): Promise<Quote[]> {
  return clone((await getDb("quotes")).quotes);
}
export async function listOrders(): Promise<Order[]> {
  const local = clone((await getDb("orders")).orders);
  if (haravanConfigured()) {
    try {
      const live = await fetchOrders(50);
      if (live.length) return [...live, ...local].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    } catch (err) {
      console.error("[bnb] listOrders Haravan lỗi:", err);
    }
  }
  return local;
}
export async function listDeliveries(): Promise<DeliveryJob[]> {
  return clone((await getDb("deliveries")).deliveries);
}
export async function listWarranties(): Promise<WarrantyTicket[]> {
  return clone((await getDb("warranties")).warranties);
}
export async function listShiftReports(): Promise<ShiftReport[]> {
  return clone((await getDb("shiftReports")).shiftReports);
}
export async function listTasks(): Promise<InternalTask[]> {
  return clone((await getDb("tasks")).tasks);
}
export async function listProducts(): Promise<Product[]> {
  // Khi có token Haravan → dùng catalog THẬT (cache 5') + giữ SKU demo (cho Fit Diagnostic)
  // mà catalog live chưa có. Lỗi/thiếu token → quay về collection seed (stub).
  if (haravanConfigured()) {
    try {
      const live = await fetchProducts(150);
      if (live.length) {
        const liveSkus = new Set(live.map((p) => p.sku).filter(Boolean));
        const fallback = STUB_PRODUCTS.filter((s) => s.sku && !liveSkus.has(s.sku));
        return [...live, ...fallback];
      }
    } catch (err) {
      console.error("[bnb] listProducts Haravan lỗi, dùng stub:", err);
    }
  }
  return clone((await getDb("products")).products);
}
/** TOÀN BỘ catalog — cho POS/Báo giá cần tìm trên mọi mặt hàng (nạp đủ, cache 5'). */
export async function listAllProducts(): Promise<Product[]> {
  if (haravanConfigured()) {
    try {
      const live = await fetchAllProducts();
      if (live.length) {
        const liveSkus = new Set(live.map((p) => p.sku).filter(Boolean));
        const fallback = STUB_PRODUCTS.filter((s) => s.sku && !liveSkus.has(s.sku));
        return [...live, ...fallback];
      }
    } catch (err) {
      console.error("[bnb] listAllProducts Haravan lỗi, dùng stub:", err);
    }
  }
  return clone((await getDb("products")).products);
}
/** Tồn kho real-time (lấy tươi từ Haravan, không cache). */
export async function listInventory(): Promise<Product[]> {
  if (haravanConfigured()) {
    try {
      const live = await fetchInventory(150);
      if (live.length) return live;
    } catch (err) {
      console.error("[bnb] listInventory Haravan lỗi:", err);
    }
  }
  return clone((await getDb("products")).products);
}

export async function listActivities(refId: string): Promise<Activity[]> {
  const dbo = await getDb("activities");
  return clone(
    dbo.activities
      .filter((a) => a.leadId === refId || a.customerId === refId)
      .sort((x, y) => (x.at < y.at ? 1 : -1)),
  );
}

/* ============ Lấy 1 bản ghi ============ */
export async function getLead(id: string): Promise<Lead | undefined> {
  return clone((await getDb("leads")).leads.find((x) => x.id === id));
}
export async function getCustomer(id: string): Promise<Customer | undefined> {
  const local = (await getDb("customers")).customers.find((x) => x.id === id);
  if (local) return clone(local);
  if (haravanConfigured() && id.startsWith("hrv-cus-")) {
    return (await fetchCustomerById(id.replace("hrv-cus-", ""))) || undefined;
  }
  return undefined;
}
export async function getQuote(id: string): Promise<Quote | undefined> {
  return clone((await getDb("quotes")).quotes.find((x) => x.id === id));
}
export async function getOrder(id: string): Promise<Order | undefined> {
  const local = (await getDb("orders")).orders.find((x) => x.id === id);
  if (local) return clone(local);
  if (haravanConfigured() && id.startsWith("hrv-ord-")) {
    return (await fetchOrderById(id.replace("hrv-ord-", ""))) || undefined;
  }
  return undefined;
}

/* ============ Ghi (write-through) ============ */
async function put<K extends Coll>(key: K, row: BNBDB[K][number] & { id: string }): Promise<void> {
  const dbo = db();
  const arr = dbo[key] as (typeof row)[];
  const i = arr.findIndex((x) => x.id === row.id);
  if (i >= 0) arr[i] = row;
  else arr.push(row);
  await upsertRow(TABLE[key], row.id, row);
}

export async function createLead(input: Omit<Lead, "id" | "code" | "createdAt" | "updatedAt">): Promise<Lead> {
  await getDb("leads");
  const lead: Lead = { ...input, id: nextId("lead"), code: nextCode("LD"), createdAt: now(), updatedAt: now() };
  await put("leads", lead);
  await logActivity({ leadId: lead.id, type: "note", content: `Tạo lead từ nguồn ${lead.source}`, byId: lead.assigneeId });
  return clone(lead);
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | undefined> {
  const dbo = await getDb("leads");
  const cur = dbo.leads.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: Lead = { ...cur, ...patch, updatedAt: now() };
  await put("leads", next);
  return clone(next);
}

export async function setLeadStage(id: string, stage: Lead["stage"], byId?: string): Promise<Lead | undefined> {
  const updated = await updateLead(id, { stage, lastContactAt: now() });
  if (updated) await logActivity({ leadId: id, type: "stage", content: `Chuyển trạng thái → ${stage}`, byId });
  return updated;
}

export async function createCustomer(input: Omit<Customer, "id" | "code" | "createdAt" | "updatedAt">): Promise<Customer> {
  await getDb("customers");
  const c: Customer = { ...input, id: nextId("cus"), code: nextCode("KH"), createdAt: now(), updatedAt: now() };
  await put("customers", c);
  return clone(c);
}

export async function updateCustomer(id: string, patch: Partial<Customer>): Promise<Customer | undefined> {
  const dbo = await getDb("customers");
  const cur = dbo.customers.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: Customer = { ...cur, ...patch, updatedAt: now() };
  await put("customers", next);
  return clone(next);
}

export async function createSurvey(input: Omit<Survey, "id" | "code" | "createdAt">): Promise<Survey> {
  await getDb("surveys");
  const s: Survey = { ...input, id: nextId("svy"), code: nextCode("KS"), createdAt: now() };
  await put("surveys", s);
  if (s.leadId) await logActivity({ leadId: s.leadId, type: "survey", content: `Khảo sát ${s.code}`, byId: s.byId });
  return clone(s);
}

export async function createQuote(input: Omit<Quote, "id" | "code" | "createdAt" | "updatedAt">): Promise<Quote> {
  await getDb("quotes");
  const q: Quote = { ...input, id: nextId("qte"), code: nextCode("BG"), createdAt: now(), updatedAt: now() };
  await put("quotes", q);
  if (q.leadId) await logActivity({ leadId: q.leadId, type: "quote", content: `Tạo báo giá ${q.code}`, byId: q.byId });
  return clone(q);
}

export async function updateQuote(id: string, patch: Partial<Quote>): Promise<Quote | undefined> {
  const dbo = await getDb("quotes");
  const cur = dbo.quotes.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: Quote = { ...cur, ...patch, updatedAt: now() };
  await put("quotes", next);
  return clone(next);
}

export async function createOrder(input: Omit<Order, "id" | "code" | "createdAt" | "updatedAt">): Promise<Order> {
  await getDb("orders");
  const o: Order = { ...input, id: nextId("ord"), code: nextCode("DH"), createdAt: now(), updatedAt: now() };
  await put("orders", o);
  if (o.customerId) await logActivity({ customerId: o.customerId, type: "order", content: `Tạo đơn ${o.code}`, byId: o.assigneeId });
  return clone(o);
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order | undefined> {
  const dbo = await getDb("orders");
  const cur = dbo.orders.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: Order = { ...cur, ...patch, updatedAt: now() };
  await put("orders", next);
  return clone(next);
}

/* ===== Ghi ngược lên Haravan ===== */
/** Đẩy 1 khách local lên Haravan, lưu haravanId. Trả Haravan id (hoặc null). */
export async function pushCustomerToHaravan(customerId: string): Promise<string | null> {
  if (!haravanConfigured()) return null;
  if (customerId.startsWith("hrv-cus-")) return customerId.replace("hrv-cus-", "");
  const c = (await getDb("customers")).customers.find((x) => x.id === customerId);
  if (!c) return null;
  if (c.haravanId) return c.haravanId;
  const hid = await createHaravanCustomer({ name: c.name, phone: c.phone, email: c.email, address: c.address });
  if (hid) await updateCustomer(customerId, { haravanId: hid });
  return hid;
}

/** Đẩy 1 đơn local lên Haravan (kèm tạo khách nếu cần), lưu haravanId. */
export async function pushOrderToHaravan(orderId: string): Promise<{ haravanId: string; code: string } | null> {
  if (!haravanConfigured()) return null;
  const o = (await getDb("orders")).orders.find((x) => x.id === orderId);
  if (!o || o.id.startsWith("hrv-ord-")) return null;
  if (o.haravanId) return { haravanId: o.haravanId, code: o.code };
  let customerHid: string | undefined;
  if (o.customerId) customerHid = (await pushCustomerToHaravan(o.customerId)) || undefined;
  const res = await createHaravanOrder(o, customerHid);
  if (res) await updateOrder(orderId, { haravanId: res.haravanId });
  return res;
}

export async function createDelivery(input: Omit<DeliveryJob, "id" | "code" | "createdAt" | "updatedAt">): Promise<DeliveryJob> {
  await getDb("deliveries");
  const d: DeliveryJob = { ...input, id: nextId("dlv"), code: nextCode("GL"), createdAt: now(), updatedAt: now() };
  await put("deliveries", d);
  return clone(d);
}

export async function updateDelivery(id: string, patch: Partial<DeliveryJob>): Promise<DeliveryJob | undefined> {
  const dbo = await getDb("deliveries");
  const cur = dbo.deliveries.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: DeliveryJob = { ...cur, ...patch, updatedAt: now() };
  await put("deliveries", next);
  return clone(next);
}

export async function createWarranty(input: Omit<WarrantyTicket, "id" | "code" | "createdAt" | "updatedAt">): Promise<WarrantyTicket> {
  await getDb("warranties");
  const w: WarrantyTicket = { ...input, id: nextId("wty"), code: nextCode("BH"), createdAt: now(), updatedAt: now() };
  await put("warranties", w);
  return clone(w);
}

export async function updateWarranty(id: string, patch: Partial<WarrantyTicket>): Promise<WarrantyTicket | undefined> {
  const dbo = await getDb("warranties");
  const cur = dbo.warranties.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: WarrantyTicket = { ...cur, ...patch, updatedAt: now() };
  await put("warranties", next);
  return clone(next);
}

/** Quét bảo hành → nhắc chăm sóc các mốc 1/7/30/90 ngày đã đến hạn nhưng chưa nhắc.
 * Mỗi mốc: tạo việc nội bộ cho người phụ trách + gửi ZNS cho khách + đánh dấu đã nhắc. */
export async function runWarrantyReminders(today = new Date()): Promise<{
  scanned: number;
  reminded: { code: string; milestone: number; znsOk: boolean }[];
}> {
  const dbo = await getDb("warranties");
  const todayKey = dayKeyOf(today);
  const reminded: { code: string; milestone: number; znsOk: boolean }[] = [];

  for (const w of dbo.warranties) {
    if (!w.installedAt || w.status === "resolved" || w.status === "expired") continue;
    const installed = new Date(`${w.installedAt}T00:00:00`);
    const daysSince = Math.floor((today.getTime() - installed.getTime()) / 86400000);
    const done = new Set(w.careDone || []);
    const already = new Set(w.remindedMilestones || []);
    const due = CARE_MILESTONES.filter((m) => daysSince >= m && !done.has(m) && !already.has(m));
    if (!due.length) continue;

    const m = due[0];
    const cust = w.customerId ? await getCustomer(w.customerId) : undefined;

    await createTask({
      title: `Chăm sóc KH bảo hành ${w.code} — mốc ${m} ngày${cust ? ` · ${cust.name}` : ""}`,
      detail: `${w.productName || "Thiết bị"} · SĐT ${cust?.phone || "—"}`,
      type: "task",
      category: "ops",
      status: "open",
      priority: m <= 7 ? "high" : "normal",
      assigneeId: w.assigneeId,
      dueAt: todayKey,
    });

    let znsOk = false;
    if (cust?.phone) {
      const r = await sendCareZNS({
        phone: cust.phone,
        customerName: cust.name,
        productName: w.productName || "thiết bị bếp",
        milestone: m,
      });
      znsOk = r.ok;
    }

    const nextUpcoming = CARE_MILESTONES.find((x) => x > m && !done.has(x));
    await updateWarranty(w.id, {
      status: "due",
      remindedMilestones: [...(w.remindedMilestones || []), m],
      nextCareAt: nextUpcoming ? dayKeyOf(addDays(installed, nextUpcoming)) : undefined,
    });
    reminded.push({ code: w.code, milestone: m, znsOk });
  }

  return { scanned: dbo.warranties.length, reminded };
}

export async function createShiftReport(input: Omit<ShiftReport, "id" | "code" | "createdAt">): Promise<ShiftReport> {
  await getDb("shiftReports");
  const r: ShiftReport = { ...input, id: nextId("shr"), code: nextCode("BC"), createdAt: now() };
  await put("shiftReports", r);
  return clone(r);
}

export async function createTask(input: Omit<InternalTask, "id" | "code" | "createdAt" | "updatedAt">): Promise<InternalTask> {
  await getDb("tasks");
  const t: InternalTask = { ...input, id: nextId("tsk"), code: nextCode("CV"), createdAt: now(), updatedAt: now() };
  await put("tasks", t);
  return clone(t);
}

export async function updateTask(id: string, patch: Partial<InternalTask>): Promise<InternalTask | undefined> {
  const dbo = await getDb("tasks");
  const cur = dbo.tasks.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: InternalTask = { ...cur, ...patch, updatedAt: now() };
  await put("tasks", next);
  return clone(next);
}

export async function deleteTask(id: string): Promise<void> {
  const dbo = await getDb("tasks");
  dbo.tasks = dbo.tasks.filter((x) => x.id !== id);
  await deleteRow(TABLE.tasks, id);
}

export async function listNpsResponses(): Promise<NpsResponse[]> {
  const dbo = await getDb("npsResponses");
  return clone([...dbo.npsResponses].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
}

export async function createNpsResponse(input: Omit<NpsResponse, "id" | "createdAt">): Promise<NpsResponse> {
  await getDb("npsResponses");
  const r: NpsResponse = { ...input, id: nextId("nps"), createdAt: now() };
  await put("npsResponses", r);
  if (input.customerId) await logActivity({ customerId: input.customerId, type: "note", content: `NPS ${input.score}/10${input.comment ? ` — ${input.comment}` : ""}`, byId: input.byId });
  return clone(r);
}

/* ===== Marketing ===== */
export async function listPillars(): Promise<ContentPillar[]> {
  return clone((await getDb("pillars")).pillars);
}
export async function createPillar(input: Omit<ContentPillar, "id" | "createdAt">): Promise<ContentPillar> {
  await getDb("pillars");
  const p: ContentPillar = { ...input, id: nextId("pil"), createdAt: now() };
  await put("pillars", p);
  return clone(p);
}
export async function listCalendarItems(): Promise<CalendarItem[]> {
  return clone((await getDb("calendarItems")).calendarItems);
}
export async function createCalendarItem(input: Omit<CalendarItem, "id" | "createdAt">): Promise<CalendarItem> {
  await getDb("calendarItems");
  const c: CalendarItem = { ...input, id: nextId("cal"), createdAt: now() };
  await put("calendarItems", c);
  return clone(c);
}
export async function updateCalendarItem(id: string, patch: Partial<CalendarItem>): Promise<CalendarItem | undefined> {
  const dbo = await getDb("calendarItems");
  const cur = dbo.calendarItems.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: CalendarItem = { ...cur, ...patch };
  await put("calendarItems", next);
  return clone(next);
}
export async function listAdCampaigns(): Promise<AdCampaign[]> {
  return clone((await getDb("adCampaigns")).adCampaigns);
}
export async function createAdCampaign(input: Omit<AdCampaign, "id" | "createdAt">): Promise<AdCampaign> {
  await getDb("adCampaigns");
  const a: AdCampaign = { ...input, id: nextId("ad"), createdAt: now() };
  await put("adCampaigns", a);
  return clone(a);
}

/* ===== Mua hàng / Nhập kho (PO) ===== */
export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  return clone((await getDb("purchaseOrders")).purchaseOrders);
}
export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
  return clone((await getDb("purchaseOrders")).purchaseOrders.find((x) => x.id === id));
}
export async function createPurchaseOrder(
  input: Omit<PurchaseOrder, "id" | "code" | "createdAt" | "updatedAt">,
): Promise<PurchaseOrder> {
  await getDb("purchaseOrders");
  const po: PurchaseOrder = { ...input, id: nextId("po"), code: nextCode("PO"), createdAt: now(), updatedAt: now() };
  await put("purchaseOrders", po);
  return clone(po);
}
export async function updatePurchaseOrder(id: string, patch: Partial<PurchaseOrder>): Promise<PurchaseOrder | undefined> {
  const dbo = await getDb("purchaseOrders");
  const cur = dbo.purchaseOrders.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: PurchaseOrder = { ...cur, ...patch, updatedAt: now() };
  await put("purchaseOrders", next);
  return clone(next);
}

/* ===== Tài chính · Ngân hàng ===== */
export async function listBankTxns(): Promise<BankTxn[]> {
  const dbo = await getDb("bankTxns");
  return clone([...dbo.bankTxns].sort((a, b) => (a.date < b.date ? 1 : -1)));
}
export async function createBankTxn(input: Omit<BankTxn, "id" | "createdAt">): Promise<BankTxn> {
  await getDb("bankTxns");
  const t: BankTxn = { ...input, id: nextId("btx"), createdAt: now() };
  await put("bankTxns", t);
  return clone(t);
}
export async function matchBankTxn(id: string, orderId: string | undefined): Promise<BankTxn | undefined> {
  const dbo = await getDb("bankTxns");
  const cur = dbo.bankTxns.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: BankTxn = { ...cur, matchedOrderId: orderId };
  await put("bankTxns", next);
  return clone(next);
}
/** Bản đồ sku → giá vốn (đơn giá nhập gần nhất từ PO chưa huỷ). Dùng tính COGS/lãi gộp. */
export async function costBySku(): Promise<Record<string, number>> {
  const dbo = await getDb("purchaseOrders");
  const map: Record<string, number> = {};
  const pos = [...dbo.purchaseOrders].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  for (const po of pos) {
    if (po.status === "cancelled") continue;
    for (const it of po.items) if (it.sku) map[it.sku] = it.unitCost;
  }
  return map;
}

/* ===== Đánh giá (Reviews) ===== */
export async function listReviews(): Promise<Review[]> {
  const dbo = await getDb("reviews");
  return clone([...dbo.reviews].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
}
export async function createReview(input: Omit<Review, "id" | "createdAt">): Promise<Review> {
  await getDb("reviews");
  const r: Review = { ...input, id: nextId("rev"), createdAt: now() };
  await put("reviews", r);
  return clone(r);
}
export async function respondReview(id: string, response: string, byId?: string): Promise<Review | undefined> {
  const dbo = await getDb("reviews");
  const cur = dbo.reviews.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: Review = { ...cur, response, status: "responded", byId: byId ?? cur.byId };
  await put("reviews", next);
  return clone(next);
}

/* ===== Nhật ký tiếp khách (tích hợp từ app nhân viên) ===== */
export async function listReceptionLogs(): Promise<ReceptionLog[]> {
  try {
    const dbo = await getDb("receptionLogs");
    return clone([...dbo.receptionLogs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
  } catch {
    // Bảng bnb_reception_logs chưa được tạo (chưa chạy migration 0009) → không vỡ trang.
    return [];
  }
}
export async function createReceptionLog(input: Omit<ReceptionLog, "id" | "createdAt">): Promise<ReceptionLog> {
  await getDb("receptionLogs");
  const r: ReceptionLog = { ...input, id: nextId("rl"), createdAt: now() };
  await put("receptionLogs", r);
  return clone(r);
}
export async function updateReceptionLog(id: string, patch: Partial<ReceptionLog>): Promise<ReceptionLog | undefined> {
  const dbo = await getDb("receptionLogs");
  const cur = dbo.receptionLogs.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: ReceptionLog = { ...cur, ...patch, id, createdAt: cur.createdAt };
  await put("receptionLogs", next);
  return clone(next);
}
export async function deleteReceptionLog(id: string): Promise<void> {
  const dbo = await getDb("receptionLogs");
  dbo.receptionLogs = dbo.receptionLogs.filter((x) => x.id !== id);
  await deleteRow(TABLE.receptionLogs, id);
}
/** Nhập hàng loạt (import từ Google Sheet) — bỏ qua nếu id đã tồn tại. */
export async function importReceptionLogs(rows: ReceptionLog[]): Promise<{ added: number; skipped: number }> {
  const dbo = await getDb("receptionLogs");
  const have = new Set(dbo.receptionLogs.map((x) => x.id));
  let added = 0, skipped = 0;
  for (const r of rows) {
    if (have.has(r.id)) { skipped++; continue; }
    await put("receptionLogs", r);
    have.add(r.id);
    added++;
  }
  return { added, skipped };
}

/* ===== Báo cáo ca (check-in chụp ảnh) ===== */
export async function listShiftCheckins(): Promise<ShiftCheckin[]> {
  try {
    const dbo = await getDb("shiftCheckins");
    return clone([...dbo.shiftCheckins].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
  } catch {
    return [];
  }
}
export async function createShiftCheckin(input: Omit<ShiftCheckin, "id" | "createdAt">): Promise<ShiftCheckin> {
  await getDb("shiftCheckins");
  const r: ShiftCheckin = { ...input, id: nextId("ck"), createdAt: now() };
  await put("shiftCheckins", r);
  return clone(r);
}

/* ===== Hành trình khách hàng CX OS ===== */
export async function listCxJourneys(): Promise<CxJourney[]> {
  try {
    const dbo = await getDb("cxJourneys");
    return clone([...dbo.cxJourneys].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)));
  } catch {
    return [];
  }
}
export async function createCxJourney(input: Omit<CxJourney, "id" | "createdAt" | "updatedAt" | "history"> & { history?: CxJourney["history"] }): Promise<CxJourney> {
  await getDb("cxJourneys");
  const r: CxJourney = {
    ...input, id: nextId("jn"), createdAt: now(), updatedAt: now(),
    history: input.history ?? [{ stage: input.stage, at: now() }],
  };
  await put("cxJourneys", r);
  return clone(r);
}
export async function updateCxJourney(id: string, patch: Partial<CxJourney>, byId?: string): Promise<CxJourney | undefined> {
  const dbo = await getDb("cxJourneys");
  const cur = dbo.cxJourneys.find((x) => x.id === id);
  if (!cur) return undefined;
  const stageChanged = patch.stage && patch.stage !== cur.stage;
  const next: CxJourney = {
    ...cur, ...patch, id, createdAt: cur.createdAt, updatedAt: now(),
    history: stageChanged ? [...(cur.history || []), { stage: patch.stage as JourneyStageKey, at: now(), byId }] : cur.history,
  };
  await put("cxJourneys", next);
  return clone(next);
}
export async function deleteCxJourney(id: string): Promise<void> {
  const dbo = await getDb("cxJourneys");
  dbo.cxJourneys = dbo.cxJourneys.filter((x) => x.id !== id);
  await deleteRow(TABLE.cxJourneys, id);
}
// Cron CX SLA: đẩy các mốc SLA đến hạn (48H/check-in D1-3-7/mời review) thành
// follow-up hôm nay; đánh dấu đã xử lý để không lặp.
export async function runCxSla(): Promise<{ promoted: number }> {
  const dbo = await getDb("cxJourneys");
  const todayStr = new Date().toISOString().slice(0, 10);
  let promoted = 0;
  for (const j of dbo.cxJourneys) {
    const alerts = cxAlerts(j);
    if (!alerts.length) continue;
    const done = new Set(j.slaDone || []);
    const fresh = alerts.filter((a) => !done.has(a.key));
    if (!fresh.length) continue;
    fresh.forEach((a) => done.add(a.key));
    await put("cxJourneys", { ...j, slaDone: [...done], nextFollowUpAt: todayStr, updatedAt: now() });
    promoted++;
  }
  return { promoted };
}

// Đồng bộ từ Lead (Acquisition) — tạo hành trình cho lead chưa có, map theo stage lead.
export async function syncCxJourneysFromLeads(): Promise<{ added: number }> {
  const [jdb, leads] = await Promise.all([getDb("cxJourneys"), listLeads()]);
  const linked = new Set(jdb.cxJourneys.map((j) => j.leadId).filter(Boolean));
  const map: Record<string, JourneyStageKey> = { new: "trigger", consulting: "trust", quoted: "consultation", won: "decision" };
  let added = 0;
  for (const l of leads) {
    if (l.stage === "lost" || linked.has(l.id)) continue;
    const stage = map[l.stage] || "discovery";
    await createCxJourney({
      name: l.name, phone: l.phone, leadId: l.id, stage,
      nextFollowUpAt: l.nextFollowUpAt ? l.nextFollowUpAt.slice(0, 10) : undefined,
      ownerId: l.assigneeId,
    });
    added++;
  }
  return { added };
}

/* ===== Chương trình giới thiệu — Referral (CX OS Đợt 4) ===== */
export async function listReferrals(): Promise<CxReferral[]> {
  try {
    const dbo = await getDb("referrals");
    return clone([...dbo.referrals].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)));
  } catch {
    return [];
  }
}

// Mã giới thiệu dùng CHUNG cho 1 người giới thiệu: nếu đã có lượt giới thiệu
// trùng SĐT (hoặc trùng tên khi thiếu SĐT) thì tái dùng mã cũ, ngược lại sinh mã mới.
function referralCodeFor(existing: CxReferral[], phone?: string, name?: string): string {
  const key = (r: CxReferral) => (r.referrerPhone || "").trim() || (r.referrerName || "").trim().toLowerCase();
  const myKey = (phone || "").trim() || (name || "").trim().toLowerCase();
  if (myKey) {
    const prev = existing.find((r) => key(r) === myKey && r.code);
    if (prev) return prev.code;
  }
  return nextCode("GT");
}

export async function createReferral(
  input: Omit<CxReferral, "id" | "code" | "createdAt" | "updatedAt" | "status"> & { code?: string; status?: CxReferral["status"] },
): Promise<CxReferral> {
  const dbo = await getDb("referrals");
  const r: CxReferral = {
    ...input,
    id: nextId("ref"),
    code: input.code || referralCodeFor(dbo.referrals, input.referrerPhone, input.referrerName),
    status: input.status || "invited",
    createdAt: now(),
    updatedAt: now(),
  };
  await put("referrals", r);
  return clone(r);
}

export async function updateReferral(id: string, patch: Partial<CxReferral>): Promise<CxReferral | undefined> {
  const dbo = await getDb("referrals");
  const cur = dbo.referrals.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: CxReferral = { ...cur, ...patch, id, code: cur.code, createdAt: cur.createdAt, updatedAt: now() };
  await put("referrals", next);
  return clone(next);
}

export async function deleteReferral(id: string): Promise<void> {
  const dbo = await getDb("referrals");
  dbo.referrals = dbo.referrals.filter((x) => x.id !== id);
  await deleteRow(TABLE.referrals, id);
}

/* ============================================================================
 * CASCADE — nối các bước thành MỘT MẠCH: Lead → Báo giá → Đơn → Giao-lắp →
 * Bảo hành → (Review/Referral), bám theo một CxJourney duy nhất.
 * Mọi trigger đều idempotent (không tạo trùng) và bỏ qua đơn Haravan (hrv-*).
 * ========================================================================== */
const STAGE_KEYS = CX_JOURNEY_STAGES.map((s) => s.key);
const stageRank = (k?: JourneyStageKey) => (k ? STAGE_KEYS.indexOf(k) : -1);
const addDaysStr = (isoOrDate: string, days: number): string => {
  const d = new Date(isoOrDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

type JourneyMatch = { journeyId?: string; leadId?: string; customerId?: string; phone?: string; name?: string };

function findJourneyIn(list: CxJourney[], m: JourneyMatch): CxJourney | undefined {
  return (
    (m.journeyId && list.find((x) => x.id === m.journeyId)) ||
    (m.leadId && list.find((x) => x.leadId === m.leadId)) ||
    (m.customerId && list.find((x) => x.customerId === m.customerId)) ||
    (m.phone && list.find((x) => x.phone && x.phone === m.phone)) ||
    undefined
  );
}

/** Đẩy hành trình của một khách TỚI ÍT NHẤT bước `stage` (không bao giờ lùi);
 * gắn link đơn & các cờ. Tạo hành trình mới nếu chưa có. */
export async function advanceJourney(
  match: JourneyMatch,
  stage: JourneyStageKey,
  opts: { byId?: string; orderId?: string; readyReferral?: boolean } = {},
): Promise<void> {
  const dbo = await getDb("cxJourneys");
  const cur = findJourneyIn(dbo.cxJourneys, match);
  if (cur) {
    const patch: Partial<CxJourney> = {};
    if (stageRank(stage) > stageRank(cur.stage)) patch.stage = stage;
    if (opts.orderId && !cur.orderId) patch.orderId = opts.orderId;
    if (opts.readyReferral && !cur.readyReferral) patch.readyReferral = true;
    if (match.customerId && !cur.customerId) patch.customerId = match.customerId;
    if (match.leadId && !cur.leadId) patch.leadId = match.leadId;
    if (Object.keys(patch).length) await updateCxJourney(cur.id, patch, opts.byId);
  } else if (match.name || match.customerId || match.leadId) {
    await createCxJourney({
      name: match.name || "Khách",
      phone: match.phone,
      customerId: match.customerId,
      leadId: match.leadId,
      stage,
      orderId: opts.orderId,
      readyReferral: opts.readyReferral,
    });
  }
}

/** Đơn `confirmed` → tự tạo lịch Giao-lắp (nếu chưa có). */
async function ensureDeliveryForOrder(order: Order): Promise<void> {
  if (order.id.startsWith("hrv-")) return;
  const dbo = await getDb("deliveries");
  if (dbo.deliveries.some((d) => d.orderId === order.id)) return;
  // deliveryDate có thể là 'yyyy-mm-dd' hoặc datetime ISO → parse an toàn, lỗi thì lùi 3 ngày.
  let scheduledAt = new Date(Date.now() + 3 * 86400000).toISOString();
  if (order.deliveryDate) {
    const raw = order.deliveryDate.includes("T") ? order.deliveryDate : `${order.deliveryDate}T08:00`;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) scheduledAt = d.toISOString();
  }
  await createDelivery({ orderId: order.id, customerId: order.customerId, scheduledAt, address: order.address, status: "scheduled" });
}

/** Đơn hoàn tất / bàn giao → tự tạo phiếu Bảo hành (nếu chưa có). */
async function ensureWarrantyForOrder(order: Order): Promise<void> {
  if (order.id.startsWith("hrv-")) return;
  const dbo = await getDb("warranties");
  if (dbo.warranties.some((w) => w.orderId === order.id)) return;
  const installedAt = new Date().toISOString().slice(0, 10);
  const nextCareAt = addDaysStr(installedAt, CARE_MILESTONES[0]);
  await createWarranty({
    customerId: order.customerId, orderId: order.id,
    productName: order.lines?.[0]?.name, installedAt,
    status: "active", careDone: [], nextCareAt,
  });
}

/** Báo giá CHỐT → tạo Đơn (kế thừa dòng hàng + khách/lead) + đẩy hành trình + lịch giao. */
export async function acceptQuoteToOrder(quoteId: string, byId?: string): Promise<Order | undefined> {
  const q = await getQuote(quoteId);
  if (!q) return undefined;
  let customerId = q.customerId;
  const leadId = q.leadId;
  let name = ""; let phone = ""; let address: string | undefined;
  if (leadId) {
    const lead = await getLead(leadId);
    if (lead) {
      name = lead.name; phone = lead.phone; address = lead.address;
      if (lead.customerId) customerId = customerId || lead.customerId;
      else if (!customerId) {
        const cus = await createCustomer({ name: lead.name, phone: lead.phone, email: lead.email, address: lead.address, source: lead.source });
        customerId = cus.id;
      }
      await updateLead(leadId, { customerId, stage: "won" });
    }
  }
  if (customerId) {
    const cus = await getCustomer(customerId);
    if (cus) { address = address || cus.address; name = name || cus.name; phone = phone || cus.phone; }
  }
  // Dedup: đã có đơn từ báo giá này chưa?
  const orders = (await getDb("orders")).orders;
  let order = orders.find((o) => o.quoteId === quoteId);
  if (!order) {
    const total = Math.max(0, q.lines.reduce((sum, l) => sum + (l.unitPrice * l.qty - (l.discount || 0)), 0) - (q.discount || 0));
    order = await createOrder({
      customerId, quoteId, leadId, lines: q.lines, total, paid: 0,
      status: "confirmed", assigneeId: byId, address, confirmedAt: now(),
    });
  }
  await advanceJourney({ leadId, customerId, phone, name }, "order_confirmed", { byId, orderId: order.id });
  await ensureDeliveryForOrder(order);
  return clone(order);
}

/** Cascade theo trạng thái Đơn: đẩy hành trình + tạo Giao/Bảo hành + ghi nhật ký. */
export async function cascadeOrderStatus(orderId: string, status: OrderStatus, byId?: string): Promise<void> {
  const order = await getOrder(orderId);
  if (!order) return;
  const match: JourneyMatch = { customerId: order.customerId, leadId: order.leadId, journeyId: order.journeyId };
  if (status === "confirmed" || status === "paid") {
    await advanceJourney(match, "order_confirmed", { byId, orderId });
    await ensureDeliveryForOrder(order);
  } else if (status === "delivering") {
    await advanceJourney(match, "pre_install", { byId, orderId });
  } else if (status === "installing") {
    await advanceJourney(match, "installation", { byId, orderId });
  } else if (status === "completed") {
    await advanceJourney(match, "handover", { byId, orderId, readyReferral: true });
    await ensureWarrantyForOrder(order);
  }
  if (order.customerId) {
    await logActivity({ customerId: order.customerId, orderId, type: "order", content: `Đơn ${order.code} → ${ORDER_STATUS_LABEL[status]}`, byId });
  }
}

/** Cascade theo trạng thái Giao-lắp: bàn giao xong → tạo bảo hành + mời review + mở referral. */
export async function cascadeDeliveryStatus(deliveryId: string, status: string, byId?: string): Promise<void> {
  const dbo = await getDb("deliveries");
  const d = dbo.deliveries.find((x) => x.id === deliveryId);
  if (!d) return;
  const order = d.orderId ? await getOrder(d.orderId) : undefined;
  const match: JourneyMatch = { customerId: d.customerId, leadId: order?.leadId, journeyId: order?.journeyId };
  if (status === "installing") {
    await advanceJourney(match, "installation", { byId, orderId: d.orderId });
  } else if (status === "done") {
    await advanceJourney(match, "handover", { byId, orderId: d.orderId, readyReferral: true });
    if (order) await ensureWarrantyForOrder(order);
    await createTask({
      title: `Mời khách đánh giá sau bàn giao (${order?.code || d.code})`,
      detail: "Mời khách để lại review Google/Facebook sau 3–7 ngày; thu ảnh thật. Gắn với bước Review của hành trình CX.",
      type: "task", category: "ops", status: "open", priority: "normal", assigneeId: byId,
    });
    if (d.customerId) await logActivity({ customerId: d.customerId, orderId: d.orderId, type: "order", content: `Nghiệm thu & bàn giao (${d.code})`, byId });
  }
}

/* ===== Zalo OA · Hộp thoại ===== */
export async function listConversations(): Promise<ZaloConversation[]> {
  const dbo = await getDb("zaloConversations");
  return clone([...dbo.zaloConversations].sort((a, b) => ((a.lastAt || a.updatedAt) < (b.lastAt || b.updatedAt) ? 1 : -1)));
}
export async function getConversation(id: string): Promise<ZaloConversation | undefined> {
  return clone((await getDb("zaloConversations")).zaloConversations.find((x) => x.id === id));
}
/** Tìm hội thoại theo zaloUserId (dùng cho webhook). */
export async function findConversationByZaloUser(zaloUserId: string): Promise<ZaloConversation | undefined> {
  return clone((await getDb("zaloConversations")).zaloConversations.find((x) => x.zaloUserId === zaloUserId));
}
export async function listMessages(conversationId: string): Promise<ZaloMessage[]> {
  const dbo = await getDb("zaloMessages");
  return clone(
    dbo.zaloMessages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => (a.at < b.at ? -1 : 1)),
  );
}

/** Tạo hội thoại mới (webhook khi gặp user lạ). */
export async function createConversation(
  input: Omit<ZaloConversation, "id" | "createdAt" | "updatedAt">,
): Promise<ZaloConversation> {
  await getDb("zaloConversations");
  const c: ZaloConversation = { ...input, id: nextId("zconv"), createdAt: now(), updatedAt: now() };
  await put("zaloConversations", c);
  return clone(c);
}
export async function updateConversation(id: string, patch: Partial<ZaloConversation>): Promise<ZaloConversation | undefined> {
  const dbo = await getDb("zaloConversations");
  const cur = dbo.zaloConversations.find((x) => x.id === id);
  if (!cur) return undefined;
  const next: ZaloConversation = { ...cur, ...patch, updatedAt: now() };
  await put("zaloConversations", next);
  return clone(next);
}

/** Ghi 1 tin nhắn vào hội thoại + cập nhật tóm tắt (lastText/unread). */
export async function appendMessage(input: {
  conversationId: string;
  direction: ZaloMsgDirection;
  text: string;
  msgId?: string;
  byId?: string;
}): Promise<ZaloMessage> {
  const dbo = await getDb("zaloMessages", "zaloConversations");
  // Chống trùng webhook theo msgId.
  if (input.msgId) {
    const dup = dbo.zaloMessages.find((m) => m.msgId === input.msgId);
    if (dup) return clone(dup);
  }
  const m: ZaloMessage = { ...input, id: nextId("zmsg"), at: now() };
  dbo.zaloMessages.push(m);
  await upsertRow(TABLE.zaloMessages, m.id, m);

  const conv = dbo.zaloConversations.find((c) => c.id === input.conversationId);
  if (conv) {
    const next: ZaloConversation = {
      ...conv,
      lastText: input.text,
      lastDirection: input.direction,
      lastAt: m.at,
      unread: input.direction === "in" ? (conv.unread || 0) + 1 : 0,
      status: input.direction === "in" && conv.status === "closed" ? "open" : conv.status,
      updatedAt: now(),
    };
    await put("zaloConversations", next);
  }
  return clone(m);
}

/** Đánh dấu đã đọc (đặt unread = 0). */
export async function markConversationRead(id: string): Promise<void> {
  const conv = (await getDb("zaloConversations")).zaloConversations.find((x) => x.id === id);
  if (conv && conv.unread) await put("zaloConversations", { ...conv, unread: 0 });
}

export async function logActivity(input: Omit<Activity, "id" | "at">): Promise<Activity> {
  const dbo = db();
  const a: Activity = { ...input, id: nextId("act"), at: now() };
  dbo.activities.push(a);
  await upsertRow(TABLE.activities, a.id, a);
  return clone(a);
}
