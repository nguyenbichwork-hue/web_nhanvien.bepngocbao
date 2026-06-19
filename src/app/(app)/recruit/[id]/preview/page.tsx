import Link from "next/link";
import { Icon } from "@/components/icon";
import { PrintButton } from "@/components/print-button";
import { getGroup, getJobOpening, listDepartments, listEntities, listJobTitles } from "@/lib/org/store";
import { EMPLOYMENT_TYPE_LABEL, OPENING_STATUS_BADGE, OPENING_STATUS_LABEL } from "@/lib/org/types";
import { formatVND } from "@/lib/payroll/calc";
import { requirePermission } from "@/lib/auth/session";

type Params = { id: string };

const fmtDate = (iso?: string | null) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

function salaryDisplay(o: { salaryMin?: number; salaryMax?: number; salaryText?: string }): string {
  if (o.salaryMin && o.salaryMax) return `${formatVND(o.salaryMin)} – ${formatVND(o.salaryMax)}`;
  if (o.salaryMin) return `Từ ${formatVND(o.salaryMin)}`;
  if (o.salaryMax) return `Đến ${formatVND(o.salaryMax)}`;
  return o.salaryText || "Thoả thuận";
}

/** Khối nội dung dài (mô tả/yêu cầu/quyền lợi) — giữ xuống dòng. */
function Block({ title, value }: { title: string; value?: string }) {
  if (!value) return null;
  return (
    <section style={{ marginTop: 22 }}>
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>{title}</h3>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{value}</div>
    </section>
  );
}

export default async function OpeningPreviewPage({ params }: { params: Promise<Params> }) {
  await requirePermission("recruit.read");
  const { id } = await params;
  const [opening, group, entities, departments, jobTitles] = await Promise.all([
    getJobOpening(id),
    getGroup(),
    listEntities(),
    listDepartments(),
    listJobTitles(),
  ]);

  if (!opening) {
    return (
      <div className="view-in">
        <div className="card">
          <p className="muted" style={{ padding: "28px 0", textAlign: "center" }}>Không tìm thấy tin tuyển dụng.</p>
          <div style={{ textAlign: "center" }}>
            <Link href="/recruit" className="btn"><Icon name="chevleft" /> Về danh sách</Link>
          </div>
        </div>
      </div>
    );
  }

  const entity = entities.find((e) => e.id === opening.legalEntityId);
  const deptName = departments.find((d) => d.id === opening.departmentId)?.name;
  const titleName = jobTitles.find((j) => j.id === opening.jobTitleId)?.name;
  const meta: { label: string; value?: string | null }[] = [
    { label: "Công ty", value: entity?.name },
    { label: "Phòng ban", value: deptName },
    { label: "Chức danh", value: titleName },
    { label: "Loại hình", value: opening.employmentType ? EMPLOYMENT_TYPE_LABEL[opening.employmentType] : null },
    { label: "Địa điểm", value: opening.workLocation },
    { label: "Mức lương", value: salaryDisplay(opening) },
    { label: "Kinh nghiệm", value: opening.experience },
    { label: "Số lượng", value: `${opening.headcount} người` },
    { label: "Hạn nộp", value: fmtDate(opening.closeDate) },
  ].filter((m) => m.value);

  return (
    <div className="view-in">
      <div className="page-head no-print">
        <div className="crumbs">
          Trang chủ <Icon name="chev" /> <Link href="/recruit">Tuyển dụng</Link> <Icon name="chev" /> Xem trước tin
        </div>
        <div className="flex gap">
          <PrintButton />
          <Link href={`/recruit/${opening.id}`} className="btn"><Icon name="chevleft" /> Quay lại</Link>
        </div>
      </div>

      {/* Bản tin đăng tuyển */}
      <div className="card" style={{ maxWidth: 820, margin: "0 auto", padding: 32 }}>
        <div className="flex between aic" style={{ flexWrap: "wrap", gap: 12 }}>
          <div className="small muted" style={{ fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {group.name} · Tin tuyển dụng
          </div>
          <span className={`badge ${OPENING_STATUS_BADGE[opening.status]}`}>{OPENING_STATUS_LABEL[opening.status]}</span>
        </div>

        <h1 style={{ fontSize: 28, margin: "10px 0 4px" }}>{opening.title}</h1>
        {entity && <div className="muted" style={{ marginBottom: 18 }}>{entity.legalName ?? entity.name}</div>}

        <div className="grid-k g-3" style={{ gap: 14, padding: "16px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          {meta.map((m) => (
            <div key={m.label} className="field" style={{ marginBottom: 0 }}>
              <label>{m.label}</label>
              <div style={{ fontWeight: 600 }}>{m.value}</div>
            </div>
          ))}
        </div>

        <Block title="Mô tả công việc" value={opening.description} />
        <Block title="Yêu cầu ứng viên" value={opening.requirements} />
        <Block title="Quyền lợi" value={opening.benefits} />

        {(opening.contactName || opening.contactEmail || opening.contactPhone) && (
          <section style={{ marginTop: 22, padding: 16, background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>Liên hệ ứng tuyển</h3>
            <div style={{ lineHeight: 1.8 }}>
              {opening.contactName && <div>Người phụ trách: <b>{opening.contactName}</b></div>}
              {opening.contactEmail && <div>Email: <b>{opening.contactEmail}</b></div>}
              {opening.contactPhone && <div>Điện thoại: <b>{opening.contactPhone}</b></div>}
            </div>
          </section>
        )}

        <p className="muted small" style={{ marginTop: 24, marginBottom: 0 }}>
          Tin được tạo ngày {fmtDate(opening.openDate)} · {group.name}.
        </p>
      </div>
    </div>
  );
}
