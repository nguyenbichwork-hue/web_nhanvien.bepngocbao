// TKB · Dashboard hệ quản trị web tư vấn thiết kế bếp (thietkebep.bepngocbao.vn)
// Chỉ ADMIN (tkb.read). Nháp trong bảng tkb_* → bấm "Xuất bản" mới lên web.
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { tkbCounts, getPublishedPointer, listTkbProducts } from "@/lib/tkb/store";
import { PublishButton } from "./publish-button";

export const dynamic = "force-dynamic";

const SECTION_LABEL: Record<string, string> = {
  products: "Sản phẩm",
  categories: "Ngành hàng",
  facets: "Bộ lọc Finder",
  scenarios: "Kịch bản combo",
  questions: "Câu hỏi tư vấn",
  knowledge: "Thư viện kiến thức",
  rec_weights: "Trọng số gợi ý",
  service_packages: "Gói dịch vụ báo giá",
  settings: "Cấu hình chung",
};

export default async function TkbDashboardPage() {
  await requirePermission("tkb.read");
  const [counts, published, products] = await Promise.all([
    tkbCounts(),
    getPublishedPointer(),
    listTkbProducts(),
  ]);
  const onWeb = products.filter((p) => p.onWeb !== false).length;

  return (
    <div>
      <PageHero
        icon="sparkle"
        title="Quản trị Thiết kế bếp"
        subtitle="Quản lý đầu ra của web tư vấn thietkebep.bepngocbao.vn: sản phẩm, bộ lọc, câu hỏi tư vấn, báo giá. Sửa ở đây là NHÁP — bấm Xuất bản mới đẩy lên web."
        crumb={[["Trang chủ", "/dashboard"], ["Thiết kế bếp"]]}
      />

      {/* Trạng thái xuất bản */}
      <div className="grid-k g-3" style={{ alignItems: "start", marginBottom: 14 }}>
        <div className="card">
          <div className="small muted">Bản đang chạy trên web</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {published ? published.version : "Chưa xuất bản lần nào"}
          </div>
          <div className="small muted">
            {published ? `lúc ${new Date(published.at).toLocaleString("vi-VN")}${published.by ? ` · bởi ${published.by}` : ""}` : "Web đang dùng dữ liệu tĩnh cũ"}
          </div>
        </div>
        <div className="card">
          <div className="small muted">Sản phẩm trong nháp</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {counts.products.toLocaleString("vi-VN")}
          </div>
          <div className="small muted">{onWeb.toLocaleString("vi-VN")} đang bật hiện trên web</div>
        </div>
        <div className="card">
          <div className="small muted">Xuất bản</div>
          <PublishButton />
          <div className="small muted" style={{ marginTop: 6 }}>
            Gom toàn bộ nháp thành snapshot → web đọc qua /api/tkb/published
          </div>
        </div>
      </div>

      {/* Các khối quản trị */}
      <div className="grid-k g-3">
        {Object.entries(SECTION_LABEL).map(([key, label]) => (
          <Link key={key} href={key === "products" ? "/tkb/products" : "/tkb"} className="card" style={{ display: "block" }}>
            <div className="flex aic" style={{ justifyContent: "space-between" }}>
              <div>
                <b>{label}</b>
                <div className="small muted">
                  {counts[key]?.toLocaleString("vi-VN") ?? 0} mục
                  {published?.counts?.[key] != null ? ` · bản web: ${published.counts[key].toLocaleString("vi-VN")}` : ""}
                </div>
              </div>
              <span className="small muted">{key === "products" ? "Mở →" : "M1+"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
