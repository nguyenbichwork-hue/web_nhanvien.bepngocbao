import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { listCostItems } from "@/lib/bnb/cost-store";
import { distinctBrands } from "@/lib/bnb/sourcing";
import { applyWeeklyQuoteAction } from "../actions";

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
        subtitle="Dán bảng báo giá mới của 1 NCC (model + giá vốn) — hệ thống tự khớp và cập nhật giá bán."
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
          {miss ? (
            <p className="small muted" style={{ marginTop: 8 }}>Không khớp: {missList}{miss > 30 ? " …" : ""}</p>
          ) : null}
        </div>
      )}
      {sp.err && (
        <div className="card" style={{ borderLeft: "4px solid var(--b-rose, #e23b54)" }}>
          <div className="flex aic" style={{ gap: 10 }}><Icon name="alert" /> <b>Chưa nhập đủ.</b> Hãy chọn NCC và dán ít nhất 1 dòng (model + giá vốn).</div>
        </div>
      )}

      <div className="grid-k g-2 mt" style={{ alignItems: "start" }}>
        <div className="card">
          <form action={applyWeeklyQuoteAction}>
            <div className="field">
              <label>Nhà cung cấp *</label>
              <select name="brand" defaultValue={selBrand} required>
                <option value="">— Chọn NCC —</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Dán bảng giá (mỗi dòng: <code>model [TAB] giá vốn</code>)</label>
              <textarea
                name="rows"
                rows={14}
                placeholder={"PID675DC1E\t12500000\nPID775DC1E\t13800000\n…"}
                style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }}
              />
            </div>
            <button type="submit" className="btn primary"><Icon name="check" /> Khớp & cập nhật giá</button>
          </form>
        </div>

        <div className="card">
          <div className="card-h"><h3 className="sec-title">Hướng dẫn nhanh</h3></div>
          <ol className="small" style={{ lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
            <li>Mở file báo giá NCC (Excel), <b>bôi 2 cột Model + Giá vốn</b> rồi Ctrl+C.</li>
            <li>Chọn đúng <b>NCC</b> bên trái, dán (Ctrl+V) vào ô lớn, bấm <b>Khớp & cập nhật</b>.</li>
            <li>Hệ thống khớp theo <b>mã hãng</b> (bỏ dấu/khoảng trắng), cập nhật <b>giá vốn</b> và tính lại <b>giá bán = vốn × 1.2</b>.</li>
            <li>Dòng không khớp sẽ được liệt kê để kiểm tra lại tên model.</li>
          </ol>
          <p className="small muted" style={{ marginTop: 12 }}>
            Mẹo: copy từ Excel sẽ tự có dấu TAB giữa 2 cột. Cũng nhận “model &nbsp;&nbsp; giá” cách nhau bằng khoảng trắng.
          </p>
        </div>
      </div>
    </div>
  );
}
