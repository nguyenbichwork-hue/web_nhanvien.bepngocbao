// TKB · Hệ quản trị web tư vấn THIẾT KẾT BẾP (thietkebep.bepngocbao.vn)
// Kiểu SẢN PHẨM giữ NGUYÊN shape master-catalog.json của thietkebep để
// web tư vấn đọc snapshot dùng được ngay, không phải map lại.

export interface TkbSpec {
  label: string;
  value: string;
}

export interface TkbProduct {
  id: string; // Haravan ID (giữ để đối chiếu) hoặc mã nội bộ khi SP không có trên Haravan
  sku: string; // mã nội bộ BNB (BT-001…) — khoá quản trị chính
  slug: string;
  name: string;
  brand: string;
  category: string;
  categoryName: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  thumbnail: string;
  description?: string;
  shortDescription?: string;
  specs?: TkbSpec[];
  features?: string[];
  inStock?: boolean;
  tags?: string[];
  productType?: string;
  // lớp master
  masterCode?: string;
  model?: string;
  haravanId?: string | null;
  onWeb?: boolean; // hiện trên web tư vấn
  inventoryStatus?: "con-hang" | "sap-ve" | "het-hang";
  inventoryQty?: number;
  isStoreDisplay?: boolean;
  powerW?: number | null;
  origin?: string;
  warrantyMonths?: number | null;
  dimensions?: { w?: number; h?: number; d?: number; raw?: string };
  // lớp sale (nội bộ, thietkebep dùng cho tư vấn)
  strengths?: string[];
  weaknesses?: string[];
  competitor?: string;
  salesScript?: string;
}

export interface TkbCategory {
  id: string; // slug: bep-tu, may-hut-mui…
  name: string;
  order?: number;
  visible?: boolean; // hiện trong Product Finder
  icon?: string;
}

/** Con trỏ bản đã xuất bản (lưu ở app_config key `tkb_published`). */
export interface TkbPublishedPointer {
  version: string; // vd 20260702-1435
  at: string; // ISO
  by?: string; // email người bấm xuất bản
  counts: Record<string, number>; // số dòng từng section lúc xuất bản
}

/** Các section được đóng gói khi Xuất bản (id snapshot = `${version}/${section}`). */
export const TKB_SECTIONS = [
  "products",
  "categories",
  "facets",
  "scenarios",
  "questions",
  "knowledge",
  "rec_weights",
  "service_packages",
  "settings",
] as const;
export type TkbSection = (typeof TKB_SECTIONS)[number];

/** Bản đồ section → bảng nháp tương ứng. */
export const TKB_TABLES: Record<TkbSection, string> = {
  products: "tkb_products",
  categories: "tkb_categories",
  facets: "tkb_facets",
  scenarios: "tkb_scenarios",
  questions: "tkb_questions",
  knowledge: "tkb_knowledge",
  rec_weights: "tkb_rec_weights",
  service_packages: "tkb_service_packages",
  settings: "tkb_settings",
};
