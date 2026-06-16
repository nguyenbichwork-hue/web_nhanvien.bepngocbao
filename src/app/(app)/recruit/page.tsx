import Link from "next/link";
import { Icon } from "@/components/icon";
import { CountUp } from "@/components/charts";
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
import { visibleEntityIds } from "@/lib/auth/scope";

type SP = { entity?: string };

export default async function RecruitPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const session = await requirePermission("recruit.read");
  const sp = await searchParams;
  const entityId = sp.entity || undefined;
  const [allEntities, departments, jobTitles, allOpenings, candidates] = await Promise.all([
    listEntities(),
    listDepartments(),
    listJobTitles(),
    listJobOpenings(entityId),
    listCandidates(),
  ]);

  // Giới hạn tin tuyển dụng theo pháp nhân trong phạm vi của người dùng.
  const vEntities = await visibleEntityIds(session);
  const entities = vEntities === "all" ? allEntities : allEntities.filter((e) => vEntities.includes(e.id));
  const openings = vEntities === "all" ? allOpenings : allOpenings.filter((o) => vEntities.includes(o.legalEntityId));
  const canManage = can(session, "recruit.manage");

  const entityName = (id: string) => allEntities.find((e) => e.id === id)?.name ?? "—";
  const deptName = (id?: string | null) => departments.find((d) => d.id === id)?.name ?? "—";

  const candOf = (openingId: string) => candidates.filter((c) => c.openingId === openingId);
  const totalCandidates = candidates.filter((c) =>
    openings.some((o) => o.id === c.openingId),
  );
  const openCount = openings.filter((o) => o.status === "open").length;
  const offers = totalCandidates.filter((c) => c.stage === "offer").length;
  const hired = totalCandidates.filter((c) => c.stage === "hired").length;

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Tuyển dụng
      </div>
      <div className="page-head">
        <div>
          <h1>Tuyển dụng</h1>
          <p>{openings.length} tin tuyển dụng · {totalCandidates.length} ứng viên.</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid-k g-4 stagger" style={{ marginBottom: 20 }}>
        <div className="card kpi hover tone-i">
          <div className="ic"><Icon name="briefcase" /></div>
          <div className="val"><CountUp to={openCount} /></div>
          <div className="lbl">Vị trí đang tuyển</div>
        </div>
        <div className="card kpi hover tone-t">
          <div className="ic"><Icon name="users" /></div>
          <div className="val"><CountUp to={totalCandidates.length} /></div>
          <div className="lbl">Tổng ứng viên</div>
        </div>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="userplus" /></div>
          <div className="val"><CountUp to={offers} /></div>
          <div className="lbl">Đang offer</div>
        </div>
        <div className="card kpi hover tone-r">
          <div className="ic"><Icon name="check" /></div>
          <div className="val"><CountUp to={hired} /></div>
          <div className="lbl">Đã nhận việc</div>
        </div>
      </div>

      <div className="grid-k g-2" style={{ alignItems: "start" }}>
        {/* Danh sách tin */}
        <div className="card">
          <div className="card-h">
            <div>
              <h3>Tin tuyển dụng</h3>
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
                      <div className="small muted">{entityName(o.legalEntityId)}</div>
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
          <div className="card-h"><h3>Đăng tin tuyển dụng</h3></div>
          <form action={createJobOpeningAction}>
            <div className="field">
              <label>Vị trí *</label>
              <input name="title" required placeholder="VD: Chuyên viên Kinh doanh" />
            </div>
            <div className="grid-k g-2">
              <div className="field">
                <label>Pháp nhân *</label>
                <select name="legalEntityId" required defaultValue={entities[0]?.id ?? ""}>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>{e.code} · {e.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Phòng ban</label>
                <select name="departmentId" defaultValue="">
                  <option value="">—</option>
                  {entities.map((e) => {
                    const deps = departments.filter((d) => d.legalEntityId === e.id);
                    if (!deps.length) return null;
                    return (
                      <optgroup key={e.id} label={`${e.code} · ${e.name}`}>
                        {deps.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </optgroup>
                    );
                  })}
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
