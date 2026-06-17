import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { TableFilter } from "@/components/table-filter";
import { listLeads } from "@/lib/bnb/store";
import { employeeNameMap, fmtVnd, fmtDate, initials, avatarBg } from "@/lib/bnb/util";
import {
  LEAD_STAGES, LEAD_STAGE_LABEL, LEAD_STAGE_BADGE, LEAD_SOURCE_LABEL, LEAD_SOURCES,
} from "@/lib/bnb/types";
import { createLeadAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const session = await requirePermission("lead.read");
  const canManage = session.permissions.has("lead.manage");
  const [leads, names] = await Promise.all([listLeads(), employeeNameMap()]);
  const sorted = [...leads].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const byStage = (stage: string) => leads.filter((l) => l.stage === stage);
  const won = byStage("won").length;
  const total = leads.length;
  const convRate = total ? Math.round((won / total) * 100) : 0;

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Khách hàng & Lead</div>
      <div className="page-head">
        <div>
          <h1>Khách hàng & Lead</h1>
          <p>Lưu toàn bộ lịch sử khách hàng — không để mất thông tin. Tỷ lệ chốt: <b>{convRate}%</b></p>
        </div>
      </div>

      {/* Pipeline */}
      <div className="grid-k g-4 stagger" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        {LEAD_STAGES.map((st) => (
          <div key={st} className="card kpi">
            <span className={`badge ${LEAD_STAGE_BADGE[st]}`} style={{ alignSelf: "flex-start" }}>{LEAD_STAGE_LABEL[st]}</span>
            <div className="val" style={{ marginTop: 12 }}>{byStage(st).length}</div>
            <div className="lbl">lead</div>
          </div>
        ))}
      </div>

      {/* Tạo lead */}
      {canManage && (
        <details className="card mt">
          <summary style={{ fontWeight: 700, fontSize: 15.5, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="plus" /> Thêm khách hàng tiềm năng
          </summary>
          <form action={createLeadAction} className="mt" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div className="field" style={{ margin: 0 }}><label>Họ tên *</label><input name="name" required placeholder="Nguyễn Văn A" /></div>
            <div className="field" style={{ margin: 0 }}><label>Số điện thoại *</label><input name="phone" required placeholder="09xx xxx xxx" /></div>
            <div className="field" style={{ margin: 0 }}><label>Nguồn</label>
              <select name="source" defaultValue="zalo">
                {LEAD_SOURCES.map((s) => <option key={s} value={s}>{LEAD_SOURCE_LABEL[s]}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}><label>Email</label><input name="email" type="email" placeholder="email@..." /></div>
            <div className="field" style={{ margin: 0 }}><label>Ngân sách (đ)</label><input name="budget" inputMode="numeric" placeholder="30000000" /></div>
            <div className="field" style={{ margin: 0 }}><label>Địa chỉ</label><input name="address" placeholder="Quận / Phường" /></div>
            <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}><label>Nhu cầu</label><input name="need" placeholder="VD: Bếp từ + hút mùi cho căn hộ 2PN" /></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn primary"><Icon name="check" /> Lưu lead</button>
            </div>
          </form>
        </details>
      )}

      {/* Danh sách */}
      <div className="card mt">
        <div className="card-h"><h3>Tất cả lead ({total})</h3></div>
        <TableFilter
          targetId="leads-tbl"
          placeholder="Tìm tên, SĐT, nhu cầu, phụ trách…"
          filters={[
            { key: "stage", label: "Trạng thái", options: LEAD_STAGES.map((s) => ({ value: s, label: LEAD_STAGE_LABEL[s] })) },
            { key: "source", label: "Nguồn", options: LEAD_SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABEL[s] })) },
          ]}
        />
        <table id="leads-tbl">
          <thead>
            <tr><th>Khách hàng</th><th>Nguồn</th><th>Nhu cầu</th><th>Ngân sách</th><th>Phụ trách</th><th>Trạng thái</th><th></th></tr>
          </thead>
          <tbody>
            {sorted.map((l) => (
              <tr key={l.id} data-stage={l.stage} data-source={l.source} data-search={`${l.name} ${l.phone} ${l.need || ""} ${l.assigneeId ? names[l.assigneeId] || "" : ""} ${LEAD_SOURCE_LABEL[l.source]} ${LEAD_STAGE_LABEL[l.stage]}`}>
                <td>
                  <div className="urow">
                    <div className="av" style={{ background: avatarBg(l.name) }}>{initials(l.name)}</div>
                    <div>
                      <div className="uname">{l.name}</div>
                      <div className="urole">{l.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="small">{LEAD_SOURCE_LABEL[l.source]}</td>
                <td className="small muted" style={{ maxWidth: 220 }}>{l.need || "—"}</td>
                <td className="small">{l.budget ? fmtVnd(l.budget) : "—"}</td>
                <td className="small muted">{l.assigneeId ? names[l.assigneeId] || "—" : "—"}</td>
                <td><span className={`badge ${LEAD_STAGE_BADGE[l.stage]}`}>{LEAD_STAGE_LABEL[l.stage]}</span></td>
                <td style={{ textAlign: "right" }}>
                  <Link href={`/crm/${l.id}`} className="btn ghost" style={{ padding: "7px 12px" }}>Chi tiết</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small mt">Cập nhật lần cuối {fmtDate(sorted[0]?.updatedAt)}.</p>
      </div>
    </div>
  );
}
