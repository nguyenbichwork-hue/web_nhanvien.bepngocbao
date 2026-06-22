import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { listCostItems } from "@/lib/bnb/cost-store";
import { suppliersRoster, catalogStats } from "@/lib/bnb/sourcing";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  await requirePermission("quote.read");
  const items = await listCostItems();
  const rows = suppliersRoster(items);
  const stats = catalogStats(items);
  const fullCost = rows.filter((r) => r.withCost === r.total).length;

  return (
    <div>
      <PageHero
        icon="truck"
        title="Nhà cung cấp (NCC)"
        subtitle="Danh sách hãng/NCC nguồn hàng, độ phủ giá vốn và file báo giá nguồn."
        crumb={[["Trang chủ", "/dashboard"], ["Tìm nguồn (RMS)"], ["Nhà cung cấp"]]}
        stats={[
          { label: "Số NCC", value: rows.length },
          { label: "NCC đủ giá vốn", value: `${fullCost}/${rows.length}`, tone: "up" },
          { label: "Tổng SP", value: stats.total },
        ]}
        actions={<Link href="/sourcing" className="btn"><Icon name="search" /> Tìm nguồn</Link>}
      />

      <div className="card">
        <div className="card-h">
          <h3 className="sec-title">Tất cả nhà cung cấp ({rows.length})</h3>
          <span className="badge b-gray">Liên hệ NCC chờ bổ sung</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nhà cung cấp</th>
              <th>Nhóm hàng mạnh</th>
              <th style={{ textAlign: "right" }}>Số SP</th>
              <th style={{ textAlign: "right" }}>Đã có giá vốn</th>
              <th>File báo giá nguồn</th>
              <th>Định dạng</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const full = r.withCost === r.total;
              return (
                <tr key={r.brand}>
                  <td>
                    <Link href={`/sourcing?brand=${encodeURIComponent(r.brand)}`} className="uname" style={{ fontWeight: 700 }}>{r.brand}</Link>
                  </td>
                  <td className="small muted">{r.cats.join(" · ") || "—"}</td>
                  <td className="small" style={{ textAlign: "right" }}>{r.total}</td>
                  <td className="small" style={{ textAlign: "right" }}>
                    <span className={`badge ${full ? "b-green" : "b-amber"}`}>{r.withCost}/{r.total}</span>
                  </td>
                  <td className="small muted">{r.file}</td>
                  <td className="small muted">{r.format}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
