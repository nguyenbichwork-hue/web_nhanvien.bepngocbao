import Link from "next/link";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { CountUp } from "@/components/charts";
import { DonutChart } from "@/components/charts/rich";
import { createJobOpeningAction } from "@/lib/org/actions";
import {
  listCandidates,
  listDepartments,
  listEntities,
  listJobOpenings,
  listJobTitles,
} from "@/lib/org/store";
import {
  EMPLOYMENT_TYPE_LABEL,
  OPENING_STATUS_BADGE,
  OPENING_STATUS_LABEL,
  type EmploymentType,
  type OpeningStatus,
} from "@/lib/org/types";
import { can, requirePermission } from "@/lib/auth/session";

export default async function RecruitPage() {
  const session = await requirePermission("recruit.read");
  const [allEntities, departments, jobTitles, openings, candidates] = await Promise.all([
    listEntities(),
    listDepartments(),
    listJobTitles(),
    listJobOpenings(),
    listCandidates(),
  ]);

  const company = allEntities[0];
  const canManage = can(session, "recruit.manage");

  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? "—";

  const candOf = (openingId: string) => candidates.filter((c) => c.openingId === openingId);
  const totalCandidates = candidates.filter((c) =>
    openings.some((o) => o.id === c.openingId),
  );
  const openCount = openings.filter((o) => o.status === "open").length;
  const offers = totalCandidates.filter((c) => c.stage === "offer").length;
  const hired = totalCandidates.filter((c) => c.stage === "hired").length;

  // Cơ cấu ứng viên theo giai đoạn (donut) — chỉ từ dữ liệu có sẵn.
  const STAGE_COLORS = ["#2563eb", "#7c3aed", "#0e9d6e", "#d98309", "#e23b54", "#0d9488", "#9aa1ab"];
  const stageCounts = new Map<string, number>();
  for (const c of totalCandidates) stageCounts.set(c.stage, (stageCounts.get(c.stage) ?? 0) + 1);
  const stageMix = [...stageCounts.entries()].map(([name, value], i) => ({
    name,
    value,
    color: STAGE_COLORS[i % STAGE_COLORS.length],
  }));

  return (
    <div>
      <PageHero
        icon="briefcase"
        title="Tuyển dụng"
        subtitle="Quản lý tin tuyển dụng và phễu ứng viên theo từng vị trí."
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Tuyển dụng"]]}
        stats={[
          { label: "Đang tuyển", value: openCount },
          { label: "Ứng viên", value: totalCandidates.length },
          { label: "Đã nhận việc", value: hired, tone: "up" },
        ]}
      />

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ marginBottom: 20 }}>
        <div className="card kpi grad hover gr-deepblue">
          <div className="ic"><Icon name="briefcase" /></div>
          <div className="val"><CountUp to={openCount} /></div>
          <div className="lbl">Vị trí đang tuyển</div>
        </div>
        <div className="card kpi grad hover gr-azure">
          <div className="ic"><Icon name="users" /></div>
          <div className="val"><CountUp to={totalCandidates.length} /></div>
          <div className="lbl">Tổng ứng viên</div>
        </div>
        <div className="card kpi grad hover gr-plum">
          <div className="ic"><Icon name="userplus" /></div>
          <div className="val"><CountUp to={offers} /></div>
          <div className="lbl">Đang offer</div>
        </div>
        <div className="card kpi grad hover gr-mint">
          <div className="ic"><Icon name="check" /></div>
          <div className="val"><CountUp to={hired} /></div>
          <div className="lbl">Đã nhận việc</div>
        </div>
      </div>

      {stageMix.length > 0 && (
        <div className="grid-k g-2 mt" style={{ marginBottom: 20 }}>
          <div className="card hover">
            <div className="card-h"><h3 className="sec-title">Cơ cấu ứng viên theo giai đoạn</h3></div>
            <DonutChart data={stageMix} height={250} centerValue={totalCandidates.length} centerLabel="ứng viên" unit=" ứng viên" />
          </div>
        </div>
      )}

      <div className="grid-k g-2" style={{ alignItems: "start" }}>
        {/* Danh sách tin */}
        <div className="card">
          <div className="card-h">
            <div>
              <h3 className="sec-title">Tin tuyển dụng</h3>
              <div className="sub">Bấm để xem phễu ứng viên</div>
            </div>
          </div>
          {openings.length === 0 ? (
            <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>
              Chưa có tin tuyển dụng nào.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Vị trí</th>
                  <th>Phòng ban</th>
                  <th style={{ textAlign: "center" }}>SL</th>
                  <th style={{ textAlign: "center" }}>Ứng viên</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {openings.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div className="uname">{o.title}</div>
                    </td>
                    <td>{deptName(o.departmentId)}</td>
                    <td style={{ textAlign: "center" }}>{o.headcount}</td>
                    <td style={{ textAlign: "center" }}>{candOf(o.id).length}</td>
                    <td>
                      <span className={`badge ${OPENING_STATUS_BADGE[o.status]}`}>
                        {OPENING_STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/recruit/${o.id}`} className="iconbtn" title="Phễu ứng viên">
                        <Icon name="chev" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Đăng tin mới — chỉ khi có quyền quản lý tuyển dụng */}
        {canManage && (
        <div className="card">
          <div className="card-h"><h3 className="sec-title">Đăng tin tuyển dụng</h3></div>
          <form action={createJobOpeningAction}>
            <input type="hidden" name="legalEntityId" value={company?.id ?? ""} />
            <div className="field">
              <label>Vị trí *</label>
              <input name="title" required placeholder="VD: Chuyên viên Kinh doanh" />
            </div>
            <div className="grid-k g-2">
              <div className="field">
                <label>Phòng ban</label>
                <select name="departmentId" defaultValue="">
                  <option value="">—</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Chức danh</label>
                <select name="jobTitleId" defaultValue="">
                  <option value="">—</option>
                  {jobTitles.filter((j) => j.isActive).map((j) => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Số lượng cần</label>
                <input type="number" name="headcount" min="1" step="1" defaultValue={1} />
              </div>
              <div className="field">
                <label>Trạng thái</label>
                <select name="status" defaultValue="open">
                  {(Object.keys(OPENING_STATUS_LABEL) as OpeningStatus[]).map((s) => (
                    <option key={s} value={s}>{OPENING_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Loại hình lao động</label>
                <select name="employmentType" defaultValue="">
                  <option value="">—</option>
                  {(Object.keys(EMPLOYMENT_TYPE_LABEL) as EmploymentType[]).map((t) => (
                    <option key={t} value={t}>{EMPLOYMENT_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Địa điểm làm việc</label>
                <input name="workLocation" placeholder="VD: TP. Hồ Chí Minh" />
              </div>
              <div className="field">
                <label>Lương từ (VND)</label>
                <input type="number" name="salaryMin" min="0" step="500000" placeholder="để trống nếu thoả thuận" />
              </div>
              <div className="field">
                <label>Lương đến (VND)</label>
                <input type="number" name="salaryMax" min="0" step="500000" />
              </div>
              <div className="field">
                <label>Mức lương (chữ)</label>
                <input name="salaryText" placeholder="VD: Thoả thuận / 10–15 triệu" />
              </div>
              <div className="field">
                <label>Kinh nghiệm</label>
                <input name="experience" placeholder="VD: 1–2 năm / Không yêu cầu" />
              </div>
              <div className="field">
                <label>Ngày mở tin</label>
                <input type="date" name="openDate" />
              </div>
              <div className="field">
                <label>Hạn nộp hồ sơ</label>
                <input type="date" name="closeDate" />
              </div>
            </div>
            <div className="field">
              <label>Mô tả công việc</label>
              <textarea name="description" rows={4} placeholder="Mô tả nhiệm vụ, trách nhiệm chính của vị trí…" />
            </div>
            <div className="field">
              <label>Yêu cầu ứng viên</label>
              <textarea name="requirements" rows={4} placeholder="Trình độ, kỹ năng, kinh nghiệm yêu cầu…" />
            </div>
            <div className="field">
              <label>Quyền lợi</label>
              <textarea name="benefits" rows={3} placeholder="Lương thưởng, BHXH, phúc lợi, môi trường…" />
            </div>
            <div className="grid-k g-3">
              <div className="field">
                <label>Người phụ trách tuyển dụng</label>
                <input name="contactName" />
              </div>
              <div className="field">
                <label>Email liên hệ</label>
                <input type="email" name="contactEmail" />
              </div>
              <div className="field">
                <label>Điện thoại liên hệ</label>
                <input name="contactPhone" />
              </div>
            </div>
            <button type="submit" className="btn primary"><Icon name="plus" /> Đăng tin</button>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}
