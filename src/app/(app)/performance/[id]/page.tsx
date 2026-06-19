import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { saveReviewAction, saveSelfReviewAction } from "@/lib/org/actions";
import {
  getEmployee,
  getReview,
  getReviewCycle,
  listDepartments,
  listJobTitles,
} from "@/lib/org/store";
import {
  REVIEW_STATUS_BADGE,
  REVIEW_STATUS_LABEL,
  perfRating,
  type ReviewStatus,
} from "@/lib/org/types";
import { redirect } from "next/navigation";
import { can, requirePermission } from "@/lib/auth/session";
import { canSeeEmployee } from "@/lib/auth/scope";

type Params = { id: string };

const SCORE_LABEL: Record<number, string> = {
  1: "1 · Kém",
  2: "2 · Cần cải thiện",
  3: "3 · Đạt",
  4: "4 · Tốt",
  5: "5 · Xuất sắc",
};

export default async function ReviewDetailPage({ params }: { params: Promise<Params> }) {
  const session = await requirePermission("performance.read");
  const { id } = await params;
  const review = await getReview(id);
  if (review && !(await canSeeEmployee(session, review.employeeId))) redirect("/forbidden");

  if (!review) {
    return (
      <div>
        <PageHero
          icon="target"
          title="Chi tiết đánh giá"
          crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Đánh giá KPI", "/performance"], ["Chi tiết"]]}
          actions={
            <Link href="/performance" className="btn"><Icon name="chevleft" /> Về danh sách</Link>
          }
        />
        <div className="card">
          <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>
            Không tìm thấy bản đánh giá.
          </p>
          <div style={{ textAlign: "center" }}>
            <Link href="/performance" className="btn"><Icon name="chevleft" /> Về danh sách</Link>
          </div>
        </div>
      </div>
    );
  }

  const [cycle, employee, departments, jobTitles] = await Promise.all([
    getReviewCycle(review.cycleId),
    getEmployee(review.employeeId),
    listDepartments(),
    listJobTitles(),
  ]);
  const dept = departments.find((d) => d.id === employee?.departmentId)?.name ?? "—";
  const title = jobTitles.find((j) => j.id === employee?.jobTitleId)?.name ?? "—";
  const totalWeight = review.items.reduce((s, i) => s + i.weight, 0);
  const rating = perfRating(review.finalScore);
  const locked = review.status === "finalized";
  // Chỉ người có quyền chấm (vd Quản lý) mới sửa được; người khác chỉ xem.
  const canEdit = can(session, "performance.manage") && !locked;
  // Chính chủ được tự đánh giá khi chưa chốt.
  const isOwner = !!session.employee && session.employee.id === review.employeeId;
  const canSelf = isOwner && !locked;
  const SCORE_OPTS = [1, 2, 3, 4, 5];

  return (
    <div>
      <PageHero
        icon="target"
        title={employee?.fullName ?? "—"}
        subtitle={`${cycle?.name ?? "—"} · ${employee?.code ?? "—"} · ${dept} · ${title}`}
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Đánh giá KPI", "/performance"], [employee?.fullName ?? "—"]]}
        actions={
          <Link href="/performance" className="btn"><Icon name="chevleft" /> Về danh sách</Link>
        }
      />

      {/* Tổng quan điểm */}
      <div className="grid-k g-4 stagger" style={{ marginBottom: 20 }}>
        <div className="card kpi hover tone-i">
          <div className="ic"><Icon name="chart" /></div>
          <div className="val">{review.finalScore == null ? "—" : review.finalScore.toFixed(2).replace(".", ",")}</div>
          <div className="lbl">Điểm tổng (1–5)</div>
        </div>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="shield" /></div>
          <div className="val" style={{ fontSize: 22 }}>{rating ? `${rating.code} · ${rating.label}` : "—"}</div>
          <div className="lbl">Xếp loại</div>
        </div>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="target" /></div>
          <div className="val"><span style={{ fontSize: 22 }}>{totalWeight}%</span></div>
          <div className="lbl">Tổng trọng số {totalWeight !== 100 ? "(≠100%)" : ""}</div>
        </div>
        <div className="card kpi hover tone-r">
          <div className="ic"><Icon name="check" /></div>
          <div className="val" style={{ fontSize: 22 }}>
            <span className={`badge ${REVIEW_STATUS_BADGE[review.status as ReviewStatus]}`}>
              {REVIEW_STATUS_LABEL[review.status as ReviewStatus]}
            </span>
          </div>
          <div className="lbl">Trạng thái</div>
        </div>
      </div>

      {/* Nhân viên tự đánh giá (chính chủ, chưa chốt) */}
      {canSelf && (
        <div className="card" style={{ marginBottom: 18, borderLeft: "3px solid var(--brand-1)" }}>
          <div className="card-h"><div><h3 className="sec-title">Tự đánh giá của bạn</h3><div className="sub">Chấm điểm bản thân (1–5) trước khi quản lý đánh giá.</div></div></div>
          <form action={saveSelfReviewAction}>
            <input type="hidden" name="id" value={review.id} />
            <table>
              <thead><tr><th>Mục tiêu / KPI</th><th style={{ textAlign: "center", width: 90 }}>Trọng số</th><th style={{ width: 200 }}>Tự chấm (1–5)</th></tr></thead>
              <tbody>
                {review.items.map((it) => (
                  <tr key={it.id}>
                    <td><b>{it.title}</b></td>
                    <td style={{ textAlign: "center" }}>{it.weight}%</td>
                    <td>
                      <select name={`self_${it.id}`} defaultValue={it.selfScore ?? ""}>
                        <option value="">— Chưa chấm —</option>
                        {SCORE_OPTS.map((n) => (<option key={n} value={n}>{n}</option>))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Nhận xét của bản thân</label>
              <textarea name="selfComment" defaultValue={review.selfComment ?? ""} rows={3} placeholder="Tự nhận xét điểm mạnh, điểm cần cải thiện…" />
            </div>
            <button type="submit" className="btn primary"><Icon name="check" /> Gửi tự đánh giá</button>
          </form>
        </div>
      )}

      <form action={saveReviewAction}>
        <input type="hidden" name="id" value={review.id} />

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-h">
            <div>
              <h3 className="sec-title">Chấm điểm mục tiêu / KPI</h3>
              <div className="sub">Điểm tổng = trung bình có trọng số các mục đã chấm.</div>
            </div>
            {locked && <span className="badge b-green">Đã chốt</span>}
          </div>
          <table>
            <thead>
              <tr>
                <th>Mục tiêu / KPI</th>
                <th style={{ textAlign: "center", width: 90 }}>Trọng số</th>
                <th style={{ textAlign: "center", width: 70 }}>Tự ĐG</th>
                <th style={{ width: 200 }}>Điểm QL (1–5)</th>
                <th>Nhận xét</th>
              </tr>
            </thead>
            <tbody>
              {review.items.map((it) => (
                <tr key={it.id}>
                  <td><b>{it.title}</b></td>
                  <td style={{ textAlign: "center" }}>{it.weight}%</td>
                  <td style={{ textAlign: "center" }}>{it.selfScore ?? "—"}</td>
                  <td>
                    <select name={`score_${it.id}`} defaultValue={it.score ?? ""} disabled={!canEdit}>
                      <option value="">— Chưa chấm —</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{SCORE_LABEL[n]}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input name={`comment_${it.id}`} defaultValue={it.comment ?? ""} placeholder="Ghi chú…" disabled={!canEdit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-h"><h3 className="sec-title">Nhận xét chung của quản lý</h3></div>
          {review.selfComment && (
            <p className="small" style={{ background: "var(--surface-2, rgba(127,127,127,.08))", padding: "10px 12px", borderRadius: "var(--r-md)", marginTop: 0 }}>
              <b>NV tự nhận xét:</b> {review.selfComment}
            </p>
          )}
          <div className="field">
            <textarea name="managerComment" defaultValue={review.managerComment ?? ""} rows={3} disabled={!canEdit} placeholder="Đánh giá tổng quan, điểm mạnh, điểm cần cải thiện…" />
          </div>
          {review.managerName && <p className="small muted">Người đánh giá: {review.managerName}</p>}
        </div>

        {canEdit && (
          <div className="card" style={{ marginBottom: 18 }}>
            <label className="flex aic" style={{ gap: 8, fontWeight: 600, fontSize: 13.5 }}>
              <input type="checkbox" name="finalize" value="1" style={{ width: 18, height: 18 }} />
              Chốt đánh giá (yêu cầu đã chấm đủ tất cả mục)
            </label>
            <div className="flex gap" style={{ marginTop: 16 }}>
              <button type="submit" className="btn primary"><Icon name="check" /> Lưu điểm</button>
              <Link href="/performance" className="btn">Huỷ</Link>
            </div>
          </div>
        )}
      </form>

      {locked && (
        <p className="muted small">
          Bản đánh giá đã chốt nên không thể sửa. (Mở lại cần thao tác quản trị — bổ sung sau.)
        </p>
      )}
    </div>
  );
}
