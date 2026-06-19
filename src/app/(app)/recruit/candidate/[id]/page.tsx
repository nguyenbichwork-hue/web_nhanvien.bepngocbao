import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  convertCandidateAction,
  createInterviewAction,
  deleteInterviewAction,
  setInterviewResultAction,
  toggleOnboardingAction,
} from "@/lib/org/actions";
import {
  getCandidate,
  getEmployee,
  getJobOpening,
  listInterviews,
  listOnboarding,
} from "@/lib/org/store";
import {
  CANDIDATE_STAGE_BADGE,
  CANDIDATE_STAGE_LABEL,
  INTERVIEW_RESULT_BADGE,
  INTERVIEW_RESULT_LABEL,
  type InterviewResult,
} from "@/lib/org/types";
import { can, requirePermission } from "@/lib/auth/session";

const fmt = (iso?: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export default async function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("recruit.read");
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) notFound();

  const opening = await getJobOpening(candidate.openingId);

  const [interviews, onboarding, linkedEmp] = await Promise.all([
    listInterviews(id),
    listOnboarding(id),
    candidate.employeeId ? getEmployee(candidate.employeeId) : Promise.resolve(undefined),
  ]);

  const canManage = can(session, "recruit.manage");
  const canConvert = can(session, "employee.create");
  const nextRound = (interviews.at(-1)?.round ?? 0) + 1;
  const obDone = onboarding.filter((t) => t.done).length;

  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> <Link href="/recruit">Tuyển dụng</Link> <Icon name="chev" />{" "}
        {opening ? <Link href={`/recruit/${opening.id}`}>{opening.title}</Link> : "—"} <Icon name="chev" /> {candidate.fullName}
      </div>
      <div className="page-head">
        <div className="flex aic" style={{ gap: 12 }}>
          <Link href={opening ? `/recruit/${opening.id}` : "/recruit"} className="iconbtn" title="Quay lại"><Icon name="chevleft" /></Link>
          <div>
            <h1>{candidate.fullName} <span className={`badge ${CANDIDATE_STAGE_BADGE[candidate.stage]}`} style={{ verticalAlign: "middle" }}>{CANDIDATE_STAGE_LABEL[candidate.stage]}</span></h1>
            <p>
              {candidate.email ?? "—"} · {candidate.phone ?? "—"} · nguồn {candidate.source ?? "—"} · ứng tuyển {fmt(candidate.appliedDate)}
            </p>
          </div>
        </div>
        {/* Tuyển → tạo hồ sơ nhân viên (1 click) */}
        {canConvert && !candidate.employeeId && (
          <form action={convertCandidateAction}>
            <input type="hidden" name="candidateId" value={candidate.id} />
            <button type="submit" className="btn primary"><Icon name="userplus" /> Tuyển → tạo hồ sơ NV</button>
          </form>
        )}
        {linkedEmp && (
          <Link href={`/employees/${linkedEmp.id}`} className="btn"><Icon name="users" /> Hồ sơ: {linkedEmp.code}</Link>
        )}
      </div>

      {/* Phỏng vấn */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h"><div><h3>Vòng phỏng vấn</h3><div className="sub">{interviews.length} vòng</div></div></div>
        {interviews.length === 0 ? (
          <p className="muted" style={{ padding: "16px 0", textAlign: "center" }}>Chưa có vòng phỏng vấn nào.</p>
        ) : (
          <table>
            <thead><tr><th>Vòng</th><th>Nội dung</th><th>Người PV</th><th>Ngày</th><th style={{ textAlign: "center" }}>Điểm</th><th>Kết quả</th><th></th></tr></thead>
            <tbody>
              {interviews.map((iv) => (
                <tr key={iv.id}>
                  <td><b>V{iv.round}</b></td>
                  <td>{iv.title ?? "—"}{iv.note ? <div className="small muted">{iv.note}</div> : null}</td>
                  <td>{iv.interviewer ?? "—"}</td>
                  <td>{fmt(iv.scheduledDate)}</td>
                  <td style={{ textAlign: "center" }}>{iv.score ?? "—"}</td>
                  <td>
                    {canManage && iv.result === "pending" ? (
                      <div className="flex gap">
                        {(["pass", "fail"] as InterviewResult[]).map((r) => (
                          <form action={setInterviewResultAction} key={r}>
                            <input type="hidden" name="id" value={iv.id} />
                            <input type="hidden" name="candidateId" value={candidate.id} />
                            <input type="hidden" name="result" value={r} />
                            <button type="submit" className="btn small" style={{ color: r === "pass" ? "var(--c-teal)" : "var(--c-rose)" }}>
                              {INTERVIEW_RESULT_LABEL[r]}
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : (
                      <span className={`badge ${INTERVIEW_RESULT_BADGE[iv.result]}`}>{INTERVIEW_RESULT_LABEL[iv.result]}</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {canManage && (
                      <form action={deleteInterviewAction}>
                        <input type="hidden" name="id" value={iv.id} />
                        <input type="hidden" name="candidateId" value={candidate.id} />
                        <button type="submit" className="iconbtn" title="Xoá"><Icon name="trash" /></button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {canManage && (
          <form action={createInterviewAction} style={{ marginTop: 14 }}>
            <input type="hidden" name="candidateId" value={candidate.id} />
            <div className="grid-k g-4" style={{ gap: 12, alignItems: "end" }}>
              <div className="field" style={{ marginBottom: 0 }}><label>Vòng</label><input type="number" name="round" min="1" defaultValue={nextRound} /></div>
              <div className="field" style={{ marginBottom: 0 }}><label>Nội dung</label><input name="title" placeholder="Phỏng vấn chuyên môn" /></div>
              <div className="field" style={{ marginBottom: 0 }}><label>Người phỏng vấn</label><input name="interviewer" /></div>
              <div className="field" style={{ marginBottom: 0 }}><label>Ngày</label><input type="date" name="scheduledDate" /></div>
            </div>
            <button type="submit" className="btn primary" style={{ marginTop: 12 }}><Icon name="plus" /> Thêm vòng phỏng vấn</button>
          </form>
        )}
      </div>

      {/* Onboarding (hiện khi đã tạo hồ sơ NV / có checklist) */}
      {onboarding.length > 0 && (
        <div className="card">
          <div className="card-h">
            <div><h3>Hội nhập (Onboarding)</h3><div className="sub">{obDone}/{onboarding.length} đầu việc hoàn thành</div></div>
            {obDone === onboarding.length && <span className="badge b-green">Hoàn tất</span>}
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {onboarding.map((t) => (
              <form key={t.id} action={toggleOnboardingAction} className="flex aic" style={{ gap: 10, padding: "6px 0" }}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="candidateId" value={candidate.id} />
                {!t.done && <input type="hidden" name="done" value="1" />}
                <button type="submit" className="iconbtn" title={t.done ? "Bỏ đánh dấu" : "Đánh dấu hoàn thành"} disabled={!canManage}
                  style={{ color: t.done ? "var(--c-teal)" : "var(--tx-soft)" }}>
                  <Icon name={t.done ? "check" : "clock"} />
                </button>
                <span style={{ textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--tx-soft)" : "inherit" }}>{t.label}</span>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
