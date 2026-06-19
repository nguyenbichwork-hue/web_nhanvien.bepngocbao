import Link from "next/link";
import { Icon } from "@/components/icon";
import { createCandidateAction, moveCandidateAction, updateJobOpeningAction } from "@/lib/org/actions";
import {
  getJobOpening,
  listCandidates,
  listDepartments,
  listJobTitles,
} from "@/lib/org/store";
import { formatVND } from "@/lib/payroll/calc";
import {
  CANDIDATE_STAGE_BADGE,
  CANDIDATE_STAGE_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  OPENING_STATUS_BADGE,
  OPENING_STATUS_LABEL,
  PIPELINE_STAGES,
  nextStage,
  type Candidate,
  type EmploymentType,
  type OpeningStatus,
} from "@/lib/org/types";
import { can, requirePermission } from "@/lib/auth/session";

type Params = { id: string };

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const initials = (n: string) =>
  n.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase();

/** Hiển thị mức lương: ưu tiên khoảng min–max, sau đó chữ tự do. */
function salaryDisplay(o: { salaryMin?: number; salaryMax?: number; salaryText?: string }): string | undefined {
  if (o.salaryMin && o.salaryMax) return `${formatVND(o.salaryMin)} – ${formatVND(o.salaryMax)}`;
  if (o.salaryMin) return `Từ ${formatVND(o.salaryMin)}`;
  if (o.salaryMax) return `Đến ${formatVND(o.salaryMax)}`;
  return o.salaryText || undefined;
}

function OField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <div style={{ fontWeight: 600 }}>{value || "—"}</div>
    </div>
  );
}

function OText({ label, value }: { label: string; value: string }) {
  return (
    <div className="field" style={{ marginBottom: 6 }}>
      <label>{label}</label>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

/** Nút đổi bước (server action) — 1 form nhỏ. */
function MoveButton({
  candidateId,
  openingId,
  stage,
  label,
  className,
  icon,
}: {
  candidateId: string;
  openingId: string;
  stage: Candidate["stage"];
  label: string;
  className: string;
  icon: string;
}) {
  return (
    <form action={moveCandidateAction} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={candidateId} />
      <input type="hidden" name="openingId" value={openingId} />
      <input type="hidden" name="stage" value={stage} />
      <button type="submit" className={className} title={label}>
        <Icon name={icon} /> {label}
      </button>
    </form>
  );
}

export default async function OpeningBoardPage({ params }: { params: Promise<Params> }) {
  const session = await requirePermission("recruit.read");
  const { id } = await params;
  const [opening, departments, jobTitles, allCandidates] = await Promise.all([
    getJobOpening(id),
    listDepartments(),
    listJobTitles(),
    listCandidates(id),
  ]);

  const canManage = can(session, "recruit.manage");

  if (!opening) {
    return (
      <div className="view-in">
        <div className="crumbs">
          Trang chủ <Icon name="chev" /> Tuyển dụng <Icon name="chev" /> Chi tiết
        </div>
        <div className="card">
          <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>
            Không tìm thấy tin tuyển dụng.
          </p>
          <div style={{ textAlign: "center" }}>
            <Link href="/recruit" className="btn"><Icon name="chevleft" /> Về danh sách</Link>
          </div>
        </div>
      </div>
    );
  }

  const deptName = departments.find((d) => d.id === opening.departmentId)?.name ?? "—";
  const titleName = jobTitles.find((j) => j.id === opening.jobTitleId)?.name ?? "—";

  const byStage = (s: Candidate["stage"]) => allCandidates.filter((c) => c.stage === s);
  const rejected = byStage("rejected");

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> Tuyển dụng <Icon name="chev" /> {opening.title}
      </div>
      <div className="page-head">
        <div>
          <h1>{opening.title}</h1>
          <p>
            {deptName} · {titleName} · cần {opening.headcount} ·{" "}
            <span className={`badge ${OPENING_STATUS_BADGE[opening.status]}`}>
              {OPENING_STATUS_LABEL[opening.status]}
            </span>
          </p>
        </div>
        <div className="flex gap">
          <Link href={`/recruit/${opening.id}/preview`} className="btn"><Icon name="doc" /> Xem trước tin đăng</Link>
          <Link href="/recruit" className="btn"><Icon name="chevleft" /> Về danh sách</Link>
        </div>
      </div>

      {/* Thông tin tin tuyển dụng */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <div>
            <h3>Thông tin tin tuyển dụng</h3>
            <div className="sub">Nội dung hiển thị ở trang xem trước / dùng để đăng tuyển</div>
          </div>
          {canManage && (
            <span className="muted small">Bấm &quot;Sửa tin&quot; bên dưới để cập nhật</span>
          )}
        </div>
        <div className="grid-k g-3" style={{ gap: 14 }}>
          <OField label="Loại hình" value={opening.employmentType ? EMPLOYMENT_TYPE_LABEL[opening.employmentType] : undefined} />
          <OField label="Địa điểm làm việc" value={opening.workLocation} />
          <OField label="Mức lương" value={salaryDisplay(opening)} />
          <OField label="Kinh nghiệm" value={opening.experience} />
          <OField label="Ngày mở tin" value={opening.openDate} />
          <OField label="Hạn nộp hồ sơ" value={opening.closeDate} />
          <OField label="Số lượng cần" value={String(opening.headcount)} />
          <OField label="Liên hệ" value={[opening.contactName, opening.contactEmail, opening.contactPhone].filter(Boolean).join(" · ") || undefined} />
        </div>
        {(opening.description || opening.requirements || opening.benefits) && (
          <div style={{ marginTop: 8 }}>
            {opening.description && <OText label="Mô tả công việc" value={opening.description} />}
            {opening.requirements && <OText label="Yêu cầu ứng viên" value={opening.requirements} />}
            {opening.benefits && <OText label="Quyền lợi" value={opening.benefits} />}
          </div>
        )}

        {canManage && (
          <details style={{ marginTop: 14 }}>
            <summary className="btn" style={{ width: "fit-content", listStyle: "none" }}>
              <Icon name="edit" /> Sửa tin
            </summary>
            <form action={updateJobOpeningAction} style={{ marginTop: 14 }}>
              <input type="hidden" name="id" value={opening.id} />
              <input type="hidden" name="legalEntityId" value={opening.legalEntityId} />
              <div className="grid-k g-2">
                <div className="field">
                  <label>Vị trí *</label>
                  <input name="title" required defaultValue={opening.title} />
                </div>
                <div className="field">
                  <label>Phòng ban</label>
                  <select name="departmentId" defaultValue={opening.departmentId ?? ""}>
                    <option value="">—</option>
                    {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                </div>
                <div className="field">
                  <label>Chức danh</label>
                  <select name="jobTitleId" defaultValue={opening.jobTitleId ?? ""}>
                    <option value="">—</option>
                    {jobTitles.filter((j) => j.isActive || j.id === opening.jobTitleId).map((j) => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Số lượng cần</label>
                  <input type="number" name="headcount" min="1" step="1" defaultValue={opening.headcount} />
                </div>
                <div className="field">
                  <label>Trạng thái</label>
                  <select name="status" defaultValue={opening.status}>
                    {(Object.keys(OPENING_STATUS_LABEL) as OpeningStatus[]).map((s) => (
                      <option key={s} value={s}>{OPENING_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Loại hình lao động</label>
                  <select name="employmentType" defaultValue={opening.employmentType ?? ""}>
                    <option value="">—</option>
                    {(Object.keys(EMPLOYMENT_TYPE_LABEL) as EmploymentType[]).map((t) => (
                      <option key={t} value={t}>{EMPLOYMENT_TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Địa điểm làm việc</label>
                  <input name="workLocation" defaultValue={opening.workLocation ?? ""} />
                </div>
                <div className="field">
                  <label>Lương từ (VND)</label>
                  <input type="number" name="salaryMin" min="0" step="500000" defaultValue={opening.salaryMin ?? ""} />
                </div>
                <div className="field">
                  <label>Lương đến (VND)</label>
                  <input type="number" name="salaryMax" min="0" step="500000" defaultValue={opening.salaryMax ?? ""} />
                </div>
                <div className="field">
                  <label>Mức lương (chữ)</label>
                  <input name="salaryText" defaultValue={opening.salaryText ?? ""} placeholder="Thoả thuận…" />
                </div>
                <div className="field">
                  <label>Kinh nghiệm</label>
                  <input name="experience" defaultValue={opening.experience ?? ""} />
                </div>
                <div className="field">
                  <label>Ngày mở tin</label>
                  <input type="date" name="openDate" defaultValue={opening.openDate} />
                </div>
                <div className="field">
                  <label>Hạn nộp hồ sơ</label>
                  <input type="date" name="closeDate" defaultValue={opening.closeDate ?? ""} />
                </div>
              </div>
              <div className="field">
                <label>Mô tả công việc</label>
                <textarea name="description" rows={4} defaultValue={opening.description ?? ""} />
              </div>
              <div className="field">
                <label>Yêu cầu ứng viên</label>
                <textarea name="requirements" rows={4} defaultValue={opening.requirements ?? ""} />
              </div>
              <div className="field">
                <label>Quyền lợi</label>
                <textarea name="benefits" rows={3} defaultValue={opening.benefits ?? ""} />
              </div>
              <div className="grid-k g-3">
                <div className="field"><label>Người phụ trách</label><input name="contactName" defaultValue={opening.contactName ?? ""} /></div>
                <div className="field"><label>Email liên hệ</label><input type="email" name="contactEmail" defaultValue={opening.contactEmail ?? ""} /></div>
                <div className="field"><label>Điện thoại liên hệ</label><input name="contactPhone" defaultValue={opening.contactPhone ?? ""} /></div>
              </div>
              <button type="submit" className="btn primary"><Icon name="check" /> Lưu tin tuyển dụng</button>
            </form>
          </details>
        )}
      </div>

      {/* Thêm ứng viên — chỉ khi có quyền quản lý tuyển dụng */}
      {canManage && (
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h"><h3>Thêm ứng viên</h3></div>
        <form action={createCandidateAction}>
          <input type="hidden" name="openingId" value={opening.id} />
          <div className="grid-k g-4" style={{ alignItems: "end" }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Họ tên *</label>
              <input name="fullName" required placeholder="Nguyễn Văn A" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Email</label>
              <input type="email" name="email" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Điện thoại</label>
              <input name="phone" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Nguồn</label>
              <input name="source" placeholder="Website, Giới thiệu…" />
            </div>
          </div>
          <button type="submit" className="btn primary" style={{ marginTop: 14 }}>
            <Icon name="userplus" /> Thêm vào phễu
          </button>
        </form>
      </div>
      )}

      {/* Bảng Kanban */}
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
        {PIPELINE_STAGES.map((stage) => {
          const cards = byStage(stage);
          const next = nextStage(stage);
          return (
            <div
              key={stage}
              style={{
                flex: "1 0 230px",
                minWidth: 230,
                background: "var(--bg-soft, var(--surface-2, #f6f7fb))",
                borderRadius: "var(--r-md)",
                padding: 12,
              }}
            >
              <div className="flex between aic" style={{ marginBottom: 10 }}>
                <b className="small">
                  <span className={`badge ${CANDIDATE_STAGE_BADGE[stage]}`}>{CANDIDATE_STAGE_LABEL[stage]}</span>
                </b>
                <span className="small muted">{cards.length}</span>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {cards.length === 0 && (
                  <p className="muted small" style={{ textAlign: "center", padding: "10px 0" }}>—</p>
                )}
                {cards.map((c) => (
                  <div key={c.id} className="card" style={{ padding: 12 }}>
                    <div className="flex aic" style={{ gap: 10 }}>
                      <div className="av" style={{ background: "var(--brand-1)" }}>{initials(c.fullName)}</div>
                      <div style={{ minWidth: 0 }}>
                        <Link href={`/recruit/candidate/${c.id}`} style={{ fontWeight: 600, fontSize: 13.5, color: "inherit" }}>
                          {c.fullName}
                        </Link>
                        <div className="small muted">{c.source ?? "—"} · {fmtDate(c.appliedDate)}</div>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap" style={{ marginTop: 10, flexWrap: "wrap" }}>
                        {next && (
                          <MoveButton
                            candidateId={c.id}
                            openingId={opening.id}
                            stage={next}
                            label={CANDIDATE_STAGE_LABEL[next]}
                            className="btn primary small"
                            icon="chev"
                          />
                        )}
                        {stage !== "hired" && (
                          <MoveButton
                            candidateId={c.id}
                            openingId={opening.id}
                            stage="rejected"
                            label="Loại"
                            className="btn ghost small"
                            icon="x"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ứng viên bị loại */}
      {rejected.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-h">
            <h3>Đã loại</h3>
            <span className="badge b-rose">{rejected.length}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Ứng viên</th>
                <th>Nguồn</th>
                <th>Ngày ứng tuyển</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rejected.map((c) => (
                <tr key={c.id}>
                  <td className="uname">{c.fullName}</td>
                  <td>{c.source ?? "—"}</td>
                  <td>{fmtDate(c.appliedDate)}</td>
                  <td style={{ textAlign: "right" }}>
                    {canManage && (
                      <MoveButton
                        candidateId={c.id}
                        openingId={opening.id}
                        stage="applied"
                        label="Khôi phục"
                        className="btn ghost small"
                        icon="up"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
