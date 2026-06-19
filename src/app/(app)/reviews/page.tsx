import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp, HBars } from "@/components/charts";
import { DonutChart } from "@/components/charts/rich";
import { TableFilter } from "@/components/table-filter";
import { listReviews } from "@/lib/bnb/store";
import { fmtDate, initials, avatarBg } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import {
  REVIEW_CHANNEL_LABEL, REVIEW_CHANNELS, REVIEW_STATUS_LABEL, REVIEW_STATUS_BADGE,
  type ReviewChannel,
} from "@/lib/bnb/types";
import { createReviewAction, respondReviewAction } from "./actions";

export const dynamic = "force-dynamic";

/** Hiển thị số sao dạng ★ đầy / ☆ rỗng. */
function Stars({ rating }: { rating: number }) {
  const r = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span style={{ color: "var(--c-amber)", letterSpacing: 1, whiteSpace: "nowrap" }} title={`${r}/5`}>
      {"★".repeat(r)}<span style={{ color: "var(--bd)" }}>{"☆".repeat(5 - r)}</span>
    </span>
  );
}

export default async function ReviewsPage() {
  const session = await requirePermission("review.read");
  const canManage = session.permissions.has("review.manage");
  const [reviews, empMap] = await Promise.all([listReviews(), employeeNameMap()]);

  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / total : 0;
  const flagged = reviews.filter((r) => r.status === "flagged").length;
  const fresh = reviews.filter((r) => !r.response).length;

  // Phân bố theo số sao (5 → 1) — donut.
  const STAR_COLOR: Record<number, string> = { 5: "#0e9d6e", 4: "#0d9488", 3: "#d98309", 2: "#e07a1f", 1: "#e23b54" };
  const starData = [5, 4, 3, 2, 1]
    .map((star) => ({
      name: `${star} ★`,
      value: reviews.filter((r) => Math.round(r.rating) === star).length,
      color: STAR_COLOR[star],
    }))
    .filter((d) => d.value > 0);

  // Phân bố theo kênh.
  const channelData = REVIEW_CHANNELS
    .map((ch) => ({
      label: REVIEW_CHANNEL_LABEL[ch],
      count: reviews.filter((r) => r.channel === ch).length,
      color: "var(--c-indigo)",
    }))
    .filter((d) => d.count > 0);

  return (
    <div>
      <PageHero
        icon="chat"
        title="Đánh giá khách hàng"
        subtitle="Theo dõi và phản hồi đánh giá từ các kênh Google, Facebook, sàn TMĐT và website."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Đánh giá"]]}
        stats={[
          { label: "Tổng đánh giá", value: total },
          { label: "Điểm TB", value: avg.toFixed(1), tone: avg >= 4 ? "up" : avg >= 3 ? "flat" : "down" },
          { label: "Chưa phản hồi", value: fresh, tone: fresh > 0 ? "down" : "flat" },
        ]}
      />

      {/* KPI */}
      <div className="grid-k g-4 stagger">
        <div className="card kpi grad hover gr-crimson">
          <div className="ic"><Icon name="chat" /></div>
          <div className="val"><CountUp to={total} /></div>
          <div className="lbl">Tổng đánh giá</div>
        </div>
        <div className="card kpi grad hover gr-sunny">
          <div className="ic"><Icon name="award" /></div>
          <div className="val">{avg.toFixed(1)}</div>
          <div className="lbl">Điểm trung bình</div>
        </div>
        <div className="card kpi grad hover gr-malinka">
          <div className="ic"><Icon name="alert" /></div>
          <div className="val"><CountUp to={flagged} /></div>
          <div className="lbl">Cần xử lý</div>
        </div>
        <div className="card kpi grad hover gr-teal">
          <div className="ic"><Icon name="bell" /></div>
          <div className="val"><CountUp to={fresh} /></div>
          <div className="lbl">Chưa phản hồi</div>
        </div>
      </div>

      {/* Phân bố */}
      <div className="grid-k g-2 mt">
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Phân bố theo số sao</h3><span className="badge b-amber">{total}</span></div>
          {starData.length === 0 ? (
            <p className="muted small" style={{ padding: "40px 0", textAlign: "center" }}>Chưa có đánh giá nào.</p>
          ) : (
            <DonutChart data={starData} height={250} centerValue={avg.toFixed(1)} centerLabel="điểm TB" unit=" đánh giá" />
          )}
        </div>
        <div className="card hover">
          <div className="card-h"><h3 className="sec-title">Phân bố theo kênh</h3><span className="badge b-indigo">{channelData.length}</span></div>
          <HBars data={channelData} />
        </div>
      </div>

      {/* Thêm đánh giá thủ công */}
      {canManage && (
        <details className="card mt">
          <summary style={{ cursor: "pointer", fontWeight: 700 }}>
            <Icon name="plus" /> Thêm đánh giá thủ công
          </summary>
          <form action={createReviewAction} style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <div className="grid-k g-2">
              <div className="field" style={{ margin: 0 }}>
                <label>Khách hàng *</label>
                <input name="customerName" required placeholder="Tên khách hàng" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Kênh</label>
                <select name="channel" defaultValue="google">
                  {REVIEW_CHANNELS.map((ch: ReviewChannel) => (
                    <option key={ch} value={ch}>{REVIEW_CHANNEL_LABEL[ch]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Số sao</label>
              <select name="rating" defaultValue="5">
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Nội dung</label>
              <textarea name="content" placeholder="Nội dung đánh giá của khách..." />
            </div>
            <button type="submit" className="btn primary"><Icon name="plus" /> Thêm đánh giá</button>
          </form>
        </details>
      )}

      {/* Bảng đánh giá */}
      <div className="card mt">
        <div className="card-h"><h3 className="sec-title">Danh sách đánh giá</h3><span className="badge b-gray">{total}</span></div>
        {reviews.length === 0 ? (
          <p className="muted small" style={{ padding: "14px 0" }}>Chưa có đánh giá nào.</p>
        ) : (
          <>
          <TableFilter
            targetId="rev-tbl"
            placeholder="Tìm khách, nội dung…"
            filters={[
              { key: "status", label: "Trạng thái", options: (Object.keys(REVIEW_STATUS_LABEL) as (keyof typeof REVIEW_STATUS_LABEL)[]).map((s) => ({ value: s, label: REVIEW_STATUS_LABEL[s] })) },
              { key: "channel", label: "Kênh", options: REVIEW_CHANNELS.map((c) => ({ value: c, label: REVIEW_CHANNEL_LABEL[c] })) },
              { key: "rating", label: "Số sao", options: [5,4,3,2,1].map((n) => ({ value: String(n), label: `${n} sao` })) },
            ]}
          />
          <table id="rev-tbl">
            <thead>
              <tr>
                <th>Khách</th>
                <th>Kênh</th>
                <th>Số sao</th>
                <th>Nội dung</th>
                <th>Trạng thái</th>
                <th>Ngày</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} data-status={r.status} data-channel={r.channel} data-rating={String(Math.round(r.rating))} data-search={`${r.customerName} ${r.content || ""} ${REVIEW_CHANNEL_LABEL[r.channel]}`}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="av" style={{ background: avatarBg(r.customerName) }}>{initials(r.customerName)}</span>
                      <span className="uname">{r.customerName}</span>
                    </div>
                  </td>
                  <td className="small muted">{REVIEW_CHANNEL_LABEL[r.channel]}</td>
                  <td><Stars rating={r.rating} /></td>
                  <td style={{ maxWidth: 340 }}>
                    {r.content ? <div className="small">{r.content}</div> : <span className="muted small">—</span>}
                    {r.response ? (
                      <div className="urole" style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <Icon name="chat" />
                        <span>
                          <b>Phản hồi{r.byId && empMap[r.byId] ? ` · ${empMap[r.byId]}` : ""}:</b> {r.response}
                        </span>
                      </div>
                    ) : canManage ? (
                      <form action={respondReviewAction} style={{ display: "grid", gap: 6, marginTop: 8 }}>
                        <input type="hidden" name="id" value={r.id} />
                        <textarea name="response" required placeholder="Soạn phản hồi..." rows={2} />
                        <button type="submit" className="btn sm"><Icon name="chat" /> Trả lời</button>
                      </form>
                    ) : null}
                  </td>
                  <td><span className={`badge ${REVIEW_STATUS_BADGE[r.status]}`}>{REVIEW_STATUS_LABEL[r.status]}</span></td>
                  <td className="small muted">{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>
    </div>
  );
}
