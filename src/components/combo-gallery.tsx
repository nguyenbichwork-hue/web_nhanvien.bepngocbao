// BNB · Thư viện 12 combo mẫu (KB-01..12) — tính dữ liệu phía server rồi giao cho
// client render lưới + modal chi tiết (bấm vào thẻ xem nhiều ảnh theo phong cách/
// phân tầng). Ảnh bìa lấy từ Google Drive qua API.
import { FIT_QUESTIONS, FIT_SCENARIOS, TIER_ORDER } from "@/lib/bnb/fit";
import { TIER_LABEL, type Product } from "@/lib/bnb/types";
import { ComboGalleryClient, type ComboCard } from "./combo-gallery-client";

const OPT_LABEL: Record<string, Record<string, string>> = Object.fromEntries(
  FIT_QUESTIONS.map((q) => [q.id, Object.fromEntries(q.options.map((o) => [o.id, o.label]))]),
);
function categoryLine(match: Partial<Record<string, string[]>>): string {
  const parts: string[] = [];
  const house = match.house?.[0];
  const budget = match.budget?.[0];
  if (house) parts.push(OPT_LABEL.house?.[house] ?? house);
  if (budget) parts.push(OPT_LABEL.budget?.[budget] ?? budget);
  return parts.join(" · ");
}

export function ComboGallery({
  products,
  comboImages,
}: {
  products: Product[];
  comboImages: Record<string, string>;
}) {
  const prod = new Map<string, { name: string; price: number }>();
  for (const p of products) if (p.sku) prod.set(p.sku, { name: p.name, price: p.price || 0 });

  const combos: ComboCard[] = FIT_SCENARIOS.map((sc) => {
    const tiers = TIER_ORDER.map((t) => {
      const lines = sc.tiers[t].skus.map((sku) => {
        const p = prod.get(sku);
        return { name: p?.name || sku, price: p?.price || 0 };
      });
      return { key: t, label: TIER_LABEL[t], total: lines.reduce((s, l) => s + l.price, 0), lines };
    });
    return {
      id: sc.id,
      name: sc.name,
      desc: sc.desc,
      cat: categoryLine(sc.match),
      count: sc.tiers.basic.skus.length,
      fromPrice: tiers[0].total,
      cover: comboImages[sc.id],
      tiers,
    };
  });

  return <ComboGalleryClient combos={combos} />;
}
