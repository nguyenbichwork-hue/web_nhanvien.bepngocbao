import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { listCostItems } from "@/lib/bnb/cost-store";
import { distinctBrands } from "@/lib/bnb/sourcing";
import { AI_EXTRACT_CONFIGURED } from "@/lib/bnb/ai-extract";
import { QuoteImporter } from "../quote-importer";

export const dynamic = "force-dynamic";

export default async function UpdateCostPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; ok?: string; miss?: string; missList?: string; err?: string }>;
}) {
  await requirePermission("quote.manage");
  const sp = await searchParams;
  const items = await listCostItems();
  const brands = distinctBrands(items);
  const selBrand = sp.brand || "";
  const ok = sp.ok ? Number(sp.ok) : null;
  const miss = sp.miss ? Number(sp.miss) : null;
  const missList = sp.missList || "";

  return (
    <div>
      <PageHero
        icon="download"
        title="Cập nhật giá vốn theo tuần"
        subtitle="Bóc bảng giá NCC bằng AI (PDF/ảnh) hoặc dán tay từ Excel → hệ thống tự khớp mã hãng & cập nhật giá bán."
        crumb={[["Trang chủ", "/dashboard"], ["Tìm nguồn (RMS)"], ["Cập nhật giá tuần"]]}
        actions={<Link href="/sourcing" className="btn"><Icon name="search" /> Về Tìm nguồn</Link>}
      />

      {ok != null && (
        <div className="card" style={{ borderLeft: "4px solid var(--b-green, #0e9d6e)" }}>
          <div className="flex aic" style={{ gap: 10 }}>
            <Icon name="check" />
            <div>
              <b>Đã cập nhật {ok} sản phẩm</b> cho NCC <b>{selBrand}</b>.
              {miss ? <span className="muted small"> · {miss} dòng không khớp.</span> : null}
            </div>
          </div>
          {miss ? <p className="small muted" style={{ marginTop: 8 }}>Không khớp: {missList}{miss > 30 ? " …" : ""}</p> : null}
        </div>
      )}
      {sp.err && (
        <div className="card" style={{ borderLeft: "4px solid var(--b-rose, #e23b54)" }}>
          <div className="flex aic" style={{ gap: 10 }}><Icon name="alert" /> <b>Chưa nhập đủ.</b> Chọn NCC và có ít nhất 1 dòng (model + giá vốn).</div>
        </div>
      )}

      {!AI_EXTRACT_CONFIGURED && (
        <div className="card" style={{ borderLeft: "4px solid var(--b-amber, #d98309)" }}>
          <div className="flex aic" style={{ gap: 10 }}><Icon name="alert" />
            <div className="small">Bóc AI <b>chưa bật</b> — cần thêm <code>ANTHROPIC_API_KEY</code> (khuyến nghị Claude Haiku, rẻ nhất) hoặc <code>GEMINI_API_KEY</code> vào biến môi trường. Trong lúc đó vẫn <b>dán tay từ Excel</b> được.</div>
          </div>
        </div>
      )}

      <QuoteImporter brands={brands} defaultBrand={selBrand} />

      <div className="card mt">
        <div className="card-h"><h3 className="sec-title">Hướng dẫn nhanh</h3></div>
        <ol className="small" style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
          <li><b>Bóc AI:</b> chọn NCC → tải PDF/ảnh bảng giá → bấm <b>“Bóc bằng AI”</b>. AI điền sẵn Model + Giá vốn sang ô duyệt.</li>
          <li><b>Hoặc dán tay:</b> mở Excel, bôi 2 cột Model + Giá vốn, Ctrl+C rồi dán vào ô duyệt.</li>
          <li>Kiểm tra/sửa rồi bấm <b>“Khớp &amp; cập nhật”</b> → hệ thống khớp theo mã hãng (bỏ dấu/khoảng trắng), cập nhật giá vốn &amp; tính lại giá bán.</li>
          <li>Dòng không khớp sẽ được liệt kê để rà lại tên model.</li>
        </ol>
      </div>
    </div>
  );
}
