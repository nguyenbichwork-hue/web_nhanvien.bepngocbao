import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { getLead, listActivities, getCustomer } from "@/lib/bnb/store";
import { fmtVnd, fmtDateTime } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import {
  LEAD_STAGES, LEAD_STAGE_LABEL, LEAD_STAGE_BADGE, LEAD_SOURCE_LABEL, ACTIVITY_LABEL,
} from "@/lib/bnb/types";
import { setStageAction, addActivityAction, convertToCustomerAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission("lead.read");
  const canManage = session.permissions.has("lead.manage");
  const lead = await getLead(id);
  if (!lead) notFound();
  const [activities, names] = await Promise.all([listActivities(id), employeeNameMap()]);
  const customer = lead.customerId ? await getCustomer(lead.customerId) : undefined;

  return (
    <div>
      <PageHero
        icon="customer"
        title={lead.name}
        subtitle={`${lead.phone}${lead.email ? ` · ${lead.email}` : ""} · ${LEAD_SOURCE_LABEL[lead.source]}`}
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Khách hàng & Lead", "/crm"], [lead.code]]}
        actions={
          <>
            <span className={`badge ${LEAD_STAGE_BADGE[lead.stage]}`} style={{ fontSize: 13, padding: "7px 14px" }}>{LEAD_STAGE_LABEL[lead.stage]}</span>
            <Link href="/crm" className="btn ghost"><Icon name="chev" /> Quay lại</Link>
          </>
        }
      />

      <div className="grid-k g-2">
        {/* Cột trái: thông tin + timeline */}
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card">
            <div className="card-h"><h3 className="sec-title">Thông tin</h3></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Info label="Nhu cầu" value={lead.need} />
              <Info label="Ngân sách" value={lead.budget ? fmtVnd(lead.budget) : undefined} />
              <Info label="Địa chỉ" value={lead.address} />
              <Info label="Phụ trách" value={lead.assigneeId ? names[lead.assigneeId] : undefined} />
              <Info label="Tạo lúc" value={fmtDateTime(lead.createdAt)} />
              <Info label="Liên hệ gần nhất" value={lead.lastContactAt ? fmtDateTime(lead.lastContactAt) : undefined} />
            </div>
            {customer && (
              <p className="small mt">Đã là khách hàng: <Link href="/crm" className="badge b-green">{customer.code}</Link></p>
            )}
          </div>

          <div className="card">
            <div className="card-h"><h3 className="sec-title">Lịch sử hoạt động</h3><span className="badge b-gray">{activities.length}</span></div>
            {activities.length === 0 ? (
              <p className="muted small" style={{ padding: "14px 0" }}>Chưa có hoạt động.</p>
            ) : (
              <div style={{ display: "grid", gap: 0 }}>
                {activities.map((a) => (
                  <div key={a.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: "1px solid var(--line)" }}>
                    <div className="ic" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--c-indigo-soft)", color: "var(--c-indigo)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <Icon name="chat" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="flex between aic">
                        <b className="small">{ACTIVITY_LABEL[a.type]}</b>
                        <span className="urole">{fmtDateTime(a.at)}</span>
                      </div>
                      <p className="small muted">{a.content}{a.byId ? ` — ${names[a.byId] || ""}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: hành động */}
        <div style={{ display: "grid", gap: 20 }}>
          {canManage && (
            <>
              <div className="card">
                <div className="card-h"><h3 className="sec-title">Chuyển trạng thái</h3></div>
                <div className="chips">
                  {LEAD_STAGES.map((st) => (
                    <form key={st} action={setStageAction}>
                      <input type="hidden" name="id" value={lead.id} />
                      <input type="hidden" name="stage" value={st} />
                      <button type="submit" className={`chip${lead.stage === st ? " on" : ""}`}>{LEAD_STAGE_LABEL[st]}</button>
                    </form>
                  ))}
                </div>
                {lead.stage !== "won" && !customer && (
                  <form action={convertToCustomerAction} className="mt">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <button type="submit" className="btn primary" style={{ width: "100%" }}><Icon name="check" /> Chốt & tạo khách hàng</button>
                  </form>
                )}
              </div>

              <div className="card">
                <div className="card-h"><h3 className="sec-title">Ghi nhận liên hệ</h3></div>
                <form action={addActivityAction} style={{ display: "grid", gap: 12 }}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <div className="field" style={{ margin: 0 }}><label>Loại</label>
                    <select name="type" defaultValue="call">
                      {(["call", "zalo", "meeting", "note"] as const).map((t) => <option key={t} value={t}>{ACTIVITY_LABEL[t]}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ margin: 0 }}><label>Nội dung *</label><textarea name="content" required placeholder="Tóm tắt nội dung trao đổi..." /></div>
                  <div className="field" style={{ margin: 0 }}><label>Hẹn follow-up</label><input name="nextFollowUpAt" type="date" /></div>
                  <button type="submit" className="btn primary"><Icon name="plus" /> Ghi nhận</button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="urole" style={{ marginBottom: 2 }}>{label}</div>
      <div className="small" style={{ fontWeight: 600 }}>{value || "—"}</div>
    </div>
  );
}
