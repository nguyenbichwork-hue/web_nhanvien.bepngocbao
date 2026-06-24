// Giá thị trường do AGENT (máy nhân viên cào local mỗi sáng) đẩy về. Chỉ đọc & hiển thị.
import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { Icon } from "@/components/icon";
import { listCostItems } from "@/lib/bnb/cost-store";
import { agentPriceMap, getAgentStatus } from "@/lib/bnb/market/agent-store";
import { fmtVnd, fmtDateTime } from "@/lib/bnb/util";

export const dynamic = "force-dynamic";

export default async function GiaAgentPage() {
  await requirePermission("quote.read");
  const [items, priceMap, status] = await Promise.all([
    listCostItems(),
    agentPriceMap(),
    getAgentStatus(),
  ]);

  const rows = items
    .filter((c) => c.code && priceMap.has(c.code))
    .map((c) => ({ c, p: priceMap.get(c.code as string)! }))
    .sort((a, b) => (b.p.at || "").localeCompare(a.p.at || ""));
  const priced = rows.length;
  const total = items.length;

  return (
    <div>
      <PageHero
        icon="search"
        title="Giá thị trường (Agent local)"
        subtitle="Máy nhân viên tự cào giá đối thủ mỗi sáng 8h (Chrome thật, vượt chặn) rồi đẩy về đây. Bảng dưới là giá mới nhất theo từng sản phẩm."
        crumb={[["Trang chủ", "/dashboard"], ["Tìm nguồn (RMS)"], ["Giá thị trường (Agent)"]]}
      />

      {/* Trạng thái lần chạy gần nhất */}
      <div className="grid-k g-3" style={{ alignItems: "start", marginBottom: 14 }}>
        <div className="card">
          <div className="small muted">Cập nhật gần nhất</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{fmtDateTime(status.lastRunAt)}</div>
          <div className="small muted">{status.machine ? `Máy: ${status.machine}` : "—"}{status.running ? " · đang chạy…" : ""}</div>
        </div>
        <div className="card">
          <div className="small muted">SP đã có giá thị trường</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{priced.toLocaleString("vi-VN")} / {total.toLocaleString("vi-VN")}</div>
          <div className="small muted">{total ? Math.round((priced / total) * 100) : 0}% catalog</div>
        </div>
        <div className="card">
          <div className="small muted">Lần cào gần nhất tìm được</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{(status.lastCount ?? 0).toLocaleString("vi-VN")} SP</div>
          <div className="small muted">trên tổng {(status.total ?? total).toLocaleString("vi-VN")} SP gửi đi</div>
        </div>
      </div>

      {priced === 0 ? (
        <div className="card">
          <div className="flex aic" style={{ gap: 10 }}>
            <Icon name="alert" />
            <div>
              <b>Chưa có dữ liệu giá từ agent.</b>
              <div className="small muted" style={{ marginTop: 4 }}>
                Cài file <code>BNB-CapNhatGia.exe</code> trên 1 máy nhân viên (chạy <code>--setup</code>, dán URL web + mã token).
                Máy đó sẽ tự cào giá mỗi sáng 8h và đổ về đây.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table className="tbl" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Sản phẩm</th>
                <th style={thR}>Giá vốn</th>
                <th style={thR}>Giá bán</th>
                <th style={thR}>Giá TT thấp nhất</th>
                <th style={thR}>So với giá bán</th>
                <th style={thC}>Số nguồn</th>
                <th style={th}>Rẻ nhất tại</th>
                <th style={thR}>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, p }) => {
                const ban = c.ban ?? null;
                const diff = ban != null && p.min != null ? p.min - ban : null;
                const cheapest = p.prices?.[0];
                return (
                  <tr key={c.code} style={{ borderTop: "1px solid var(--line,#eee)" }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{c.brand} {c.model}</div>
                      <div className="small muted">{c.cat || ""}</div>
                    </td>
                    <td style={tdR}>{c.von != null ? fmtVnd(c.von) : "—"}</td>
                    <td style={tdR}>{ban != null ? fmtVnd(ban) : "—"}</td>
                    <td style={{ ...tdR, fontWeight: 700 }}>{p.min != null ? fmtVnd(p.min) : "—"}</td>
                    <td style={{ ...tdR, color: diff == null ? "inherit" : diff < 0 ? "#e23b54" : "#0e9d6e" }}>
                      {diff == null ? "—" : (diff < 0 ? "−" : "+") + fmtVnd(Math.abs(diff))}
                    </td>
                    <td style={tdC}>{p.siteCount}</td>
                    <td style={td}>
                      {cheapest ? (
                        <a href={cheapest.url} target="_blank" rel="noreferrer" className="small" style={{ color: "var(--b-blue,#2563eb)" }}>
                          {cheapest.site}
                        </a>
                      ) : "—"}
                    </td>
                    <td style={{ ...tdR }} className="small muted">{fmtDateTime(p.at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontSize: 12, color: "var(--muted,#6b7280)", fontWeight: 600, whiteSpace: "nowrap" };
const thR: React.CSSProperties = { ...th, textAlign: "right" };
const thC: React.CSSProperties = { ...th, textAlign: "center" };
const td: React.CSSProperties = { padding: "9px 12px", fontSize: 14, verticalAlign: "top" };
const tdR: React.CSSProperties = { ...td, textAlign: "right", whiteSpace: "nowrap" };
const tdC: React.CSSProperties = { ...td, textAlign: "center" };
