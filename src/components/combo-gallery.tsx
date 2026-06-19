// BNB · Thư viện 12 combo mẫu (KB-01..12) kiểu thietkebep.bepngocbao.vn:
// thẻ ảnh bìa + mã KB + tên + danh mục (loại nhà · ngân sách) + số thiết bị + giá "từ".
// Ảnh bìa lấy từ Google Drive qua API (comboImages). Server Component.
import { Icon } from "./icon";
import { FIT_QUESTIONS, FIT_SCENARIOS } from "@/lib/bnb/fit";
import type { Product } from "@/lib/bnb/types";
import { compactVnd } from "@/lib/bnb/util";

// Nhãn option theo questionId → optionId (để dựng dòng "Chung cư · dưới 15 triệu").
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
  const priceOf = new Map<string, number>();
  for (const p of products) if (p.sku) priceOf.set(p.sku, p.price || 0);

  return (
    <div className="combo-grid">
      {FIT_SCENARIOS.map((sc) => {
        const basic = sc.tiers.basic;
        const fromPrice = basic.skus.reduce((s, sku) => s + (priceOf.get(sku) || 0), 0);
        const count = basic.skus.length;
        const img = comboImages[sc.id];
        const cat = categoryLine(sc.match);
        return (
          <div key={sc.id} className="combo-card card hover">
            <div className="combo-cover">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={`Phối cảnh ${sc.name}`} loading="lazy" />
              ) : (
                <div className="combo-cover-ph"><Icon name="sparkle" /></div>
              )}
              <span className="combo-code">{sc.id}</span>
            </div>
            <div className="combo-body">
              <b className="combo-name">{sc.name}</b>
              {cat && <div className="combo-cat">{cat}</div>}
              <p className="combo-desc">{sc.desc}</p>
              <div className="combo-foot">
                <span className="badge b-gray">{count} thiết bị</span>
                {fromPrice > 0 && <b className="combo-price">từ {compactVnd(fromPrice)}</b>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
