import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { DonutChart } from "@/components/charts/rich";
import { TableFilter } from "@/components/table-filter";
import { listDepartments, listEmployees, listReviewCycles, listReviews } from "@/lib/org/store";
import {
  REVIEW_STATUS_BADGE,
  REVIEW_STATUS_LABEL,
  perfRating,
  type ReviewStatus,
} from "@/lib/org/types";
import { requirePermission } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/scope";

type SP = { cycle?: string };

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await requirePermission("performance.read");
  const sp = await searchParams;
  const [cycles, allEmployees, departments] = await Promise.all([
    listReviewCycles(),
    listEmployees(),
    listDepartments(),
  ]);

  // Giới hạn theo phạm vi: chỉ thấy đánh giá của nhân viên trong tầm của mình.
  const visIds = await visibleEmployeeIds(session);
  const employees = visIds === "all" ? allEmployees : allEmployees.filter((e) => visIds.has(e.id));
  const isSelf = session.scope === "SELF";

  const cycleId = cycles.find((c) => c.id === sp.cycle)?.id ?? cycles.find((c) => c.status === "open")?.id ?? cycles[0]?.id;
  const cycle = cycles.find((c) => c.id === cycleId);
  const allReviews = await listReviews(cycleId);
  const reviews = visIds === "all" ? allReviews : allReviews.filter((r) => visIds.has(r.employeeId));

  const emp = (id: string) => employees.find((e) => e.id === id);
  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? "—";

  const rows = reviews.map((r) => ({ r, e: emp(r.employeeId), rating: perfRating(r.finalScore) }));

  const finalized = rows.filter((x) => x.r.status === "finalized").length;
  const scored = rows.filter((x) => x.r.finalScore != null);
  const avg = scored.length
    ? scored.reduce((s, x) => s + (x.r.finalScore as number), 0) / scored.length
    : null;

  // Phân bố xếp loại
  const ratingCounts = new Map<string, number>();
  for (const x of rows) {
    const code = x.rating?.code ?? "—";
    ratingCounts.set(code, (ratingCounts.get(code) ?? 0) + 1);
  }
  const ratingColor: Record<string, string> = { A: "#10B981", B: "#6366F1", C: "#F59E0B", D: "#F43F5E", "—": "#94A3B8" };
  const ratingLabel: Record<string, string> = { A: "A · Xuất sắc", B: "B · Tốt", C: "C · Đạt", D: "D · Cần cải thiện", "—": "Chưa chấm" };
  const distribution = ["A", "B", "C", "D", "—"]
    .filter((c) => ratingCounts.get(c))
    .map((c) => ({ name: ratingLabel[c], value: ratingCounts.get(c) ?? 0, color: ratingColor[c] }));

  return (
    <div>
      <PageHero
        icon="target"
        title={isSelf ? "KPI của tôi" : "Đánh giá hiệu suất"}
        subtitle={cycle ? `${cycle.name} · ${rows.length} bản đánh giá` : "Chưa có kỳ đánh giá."}
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Đánh giá KPI"]]}
        stats={[
          { label: "Bản đánh giá", value: rows.length },
          { label: "Đã chốt", value: finalized, tone: "up" },
          { label: "Điểm TB", value: avg == null ? "—" : avg.toFixed(2).replace(".", ",") },
        ]}
      />

      {/* Bộ lọc */}
      <form className="card" method="get" style={{ marginBottom: 20 }}>
        <div className="grid-k g-2" style={{ gap: 14, alignItems: "end" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Kỳ đánh giá</label>
            <select name="cycle" defaultValue={cycleId ?? ""}>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.status === "open" ? "(đang mở)" : "(đã đóng)"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap" style={{ marginBottom: 0 }}>
            <button type="submit" className="btn primary">
              <Icon name="filter" /> Xem
            </button>
          </div>
        </div>
      </form>

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ marginBottom: 20 }}>
        <div className="card kpi grad hover gr-deepblue">
          <div className="ic"><Icon name="target" /></div>
          <div className="val"><CountUp to={rows.length} /></div>
          <div className="lbl">Bản đánh giá</div>
        </div>
        <div className="card kpi grad hover gr-mint">
          <div className="ic"><Icon name="check" /></div>
          <div className="val"><CountUp to={finalized} /></div>
          <div className="lbl">Đã chốt</div>
        </div>
        <div className="card kpi grad hover gr-azure">
          <div className="ic"><Icon name="chart" /></div>
          <div className="val">{avg == null ? "—" : avg.toFixed(2).replace(".", ",")}</div>
          <div className="lbl">Điểm trung bình</div>
        </div>
        <div className="card kpi grad hover gr-sunny">
          <div className="ic"><Icon name="clock" /></div>
          <div className="val"><CountUp to={rows.length - finalized} /></div>
          <div className="lbl">Chưa chốt</div>
        </div>
      </div>

      <div className="grid-k g-2 stagger" style={{ alignItems: "start" }}>
        {/* Danh sách */}
        <div className="card" style={{ gridColumn: "span 1" }}>
          <div className="card-h">
            <h3 className="sec-title">Danh sách đánh giá</h3>
            {rows.length > 8 && <TableFilter targetId="perf-table" />}
          </div>
          {rows.length === 0 ? (
            <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>
              Chưa có bản đánh giá nào trong kỳ này.
            </p>
          ) : (
            <table id="perf-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Phòng ban</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "center" }}>Điểm</th>
                  <th>Xếp loại</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ r, e, rating }) => (
                  <tr key={r.id}>
                    <td>
                      <div className="uname">{e?.fullName ?? "—"}</div>
                      <div className="small muted">{e?.code ?? ""}</div>
                    </td>
                    <td>{deptName(e?.departmentId)}</td>
                    <td>
                      <span className={`badge ${REVIEW_STATUS_BADGE[r.status as ReviewStatus]}`}>
                        {REVIEW_STATUS_LABEL[r.status as ReviewStatus]}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {r.finalScore == null ? "—" : <b>{r.finalScore.toFixed(2).replace(".", ",")}</b>}
                    </td>
                    <td>
                      {rating ? <span className={`badge ${rating.badge}`}>{rating.code} · {rating.label}</span> : <span className="muted small">—</span>}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/performance/${r.id}`} className="iconbtn" title="Chấm điểm / xem">
                        <Icon name="edit" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Phân bố xếp loại */}
        <div className="card hover">
          <div className="card-h">
            <h3 className="sec-title">Phân bố xếp loại</h3>
            <span className="badge b-indigo">{rows.length} NV</span>
          </div>
          {distribution.length === 0 ? (
            <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>Chưa có dữ liệu.</p>
          ) : (
            <DonutChart data={distribution} height={260} centerValue={rows.length} centerLabel="bản đánh giá" unit=" NV" />
          )}
        </div>
      </div>
    </div>
  );
}
