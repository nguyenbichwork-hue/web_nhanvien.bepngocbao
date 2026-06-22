// Lấy sản phẩm CỦA MÌNH (đang bán trên Haravan) để đối chiếu giá thị trường.
// Tái dùng client Haravan sẵn có của RMS (HARAVAN_API_TOKEN) — KHÔNG cần token thứ 2.

import { fetchAllProducts } from "@/lib/haravan/client";
import { bestCode } from "./price";
import type { MyProduct } from "./types";

/** Map sản phẩm Haravan (RMS) -> MyProduct dùng cho so giá. */
export async function getMyProducts(hardCap = 5000): Promise<MyProduct[]> {
  const ps = await fetchAllProducts({ hardCap });
  return ps.map((p) => ({
    productId: 0,
    variantIds: [],
    sku: p.sku || "",
    code: bestCode(p.sku, p.name),
    name: p.name,
    price: p.price || 0,
    comparePrice: p.compareAtPrice ?? null,
    productType: p.category || "",
    vendor: p.brand || "",
    tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
    image: p.image || "",
    handle: "",
    url: "",
    inventory: 0,
  }));
}
