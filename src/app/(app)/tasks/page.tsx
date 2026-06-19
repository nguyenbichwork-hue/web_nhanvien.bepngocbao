import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { listTasks } from "@/lib/bnb/store";
import { fmtDate } from "@/lib/bnb/util";
import { employeeNameMap } from "@/lib/bnb/names";
import {
  TASK_STATUS_LABEL, TASK_STATUS_BADGE,
  PRIORITY_LABEL, PRIORITY_BADGE,
  TASK_CAT_LABEL,
  type TaskCategory, type TaskPriority, type TaskStatus,
} from "@/lib/bnb/types";
import { createTaskAction, setTaskStatusAction, deleteTaskAction } from "./actions";

export const dynamic = "force-dynamic";

const CATS = Object.keys(TASK_CAT_LABEL) as TaskCategory[];
const PRIOS = Object.keys(PRIORITY_LABEL) as TaskPriority[];

const today = () => new Date().toISOString().slice(0, 10);

/** Tình trạng hạn của 1 việc chưa hoàn tất. */
function dueState(dueAt?: string, status?: TaskStatus): "overdue" | "today" | "none" {
  if (!dueAt || status === "done" || status === "cancelled") return "none";
  const d = dueAt.slice(0, 10);
  const t = today();
  if (d < t) return "overdue";
  if (d === t) return "today";
  return "none";
}

export default async function TasksPage() {
  const session = await requirePermission("task.read");
  const canManage = session.permissions.has("task.manage");
  const [tasks, names] = await Promise.all([listTasks(), employeeNameMap()]);

  const sorted = [...tasks].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const active = sorted.filter((t) => t.status === "open" || t.status === "doing");

  const openCount = tasks.filter((t) => t.status === "open").length;
  const urgentCount = active.filter((t) => t.priority === "urgent").length;
  const overdueCount = active.filter((t) => dueState(t.dueAt, t.status) === "overdue").length;

  // Board theo trạng thái
  const cols: { key: TaskStatus; items: typeof sorted }[] = [
    { key: "open", items: sorted.filter((t) => t.status === "open") },
    { key: "doing", items: sorted.filter((t) => t.status === "doing") },
    { key: "done", items: sorted.filter((t) => t.status === "done") },
  ];

  const employees = Object.entries(names);

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Việc nội bộ & Sự cố</div>
      <div className="page-head">
        <div>
          <h1>Việc nội bộ & Sự cố</h1>
          <p>Giao task, xử lý vấn đề vận hành, IT và showroom — không để việc rơi rớt.</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid-k g-3 stagger">
        <div className="card kpi hover tone-i">
          <div className="ic"><Icon name="briefcase" /></div>
          <div className="val">{openCount}</div>
          <div className="lbl">Việc đang mở</div>
        </div>
        <div className="card kpi hover tone-r">
          <div className="ic"><Icon name="alert" /></div>
          <div className="val">{urgentCount}</div>
          <div className="lbl">Việc khẩn chưa xong</div>
        </div>
        <div className="card kpi hover tone-a">
          <div className="ic"><Icon name="clock" /></div>
          <div className="val">{overdueCount}</div>
          <div className="lbl">Quá hạn</div>
        </div>
      </div>

      {/* Form tạo việc / sự cố */}
      {canManage && (
        <details className="card mt">
          <summary style={{ fontWeight: 700, fontSize: 15.5, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="plus" /> Giao việc mới / Báo sự cố
          </summary>
          <form action={createTaskAction} className="mt" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}>
              <label>Tiêu đề *</label>
              <input name="title" required placeholder="VD: Máy POS showroom không in được hoá đơn" />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Loại</label>
              <select name="type" defaultValue="task">
                <option value="task">Việc nội bộ</option>
                <option value="incident">Sự cố</option>
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Nhóm</label>
              <select name="category" defaultValue="ops">
                {CATS.map((c) => <option key={c} value={c}>{TASK_CAT_LABEL[c]}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Ưu tiên</label>
              <select name="priority" defaultValue="normal">
                {PRIOS.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Người phụ trách</label>
              <select name="assigneeId" defaultValue="">
                <option value="">— Chưa giao —</option>
                {employees.map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Hạn xử lý</label>
              <input name="dueAt" type="date" />
            </div>
            <div className="field" style={{ margin: 0, gridColumn: "1 / -1" }}>
              <label>Mô tả chi tiết</label>
              <input name="detail" placeholder="Nêu hiện tượng, mức ảnh hưởng, các bước đã thử…" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn primary"><Icon name="check" /> Tạo</button>
            </div>
          </form>
        </details>
      )}

      {/* Board theo trạng thái */}
      <div className="grid-k g-3 mt">
        {cols.map(({ key, items }) => (
          <div key={key} className="card">
            <div className="card-h">
              <h3>{TASK_STATUS_LABEL[key]}</h3>
              <span className={`badge ${TASK_STATUS_BADGE[key]}`}>{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="muted small" style={{ padding: "14px 0" }}>Không có việc.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {items.map((t) => {
                  const ds = dueState(t.dueAt, t.status);
                  return (
                    <div key={t.id} style={{ display: "grid", gap: 6, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
                      <div className="flex between aic" style={{ gap: 8 }}>
                        <b className="small" style={{ flex: 1 }}>
                          {t.type === "incident" && <Icon name="alert" />} {t.title}
                        </b>
                        <span className={`badge ${PRIORITY_BADGE[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                      </div>
                      <div className="urole">
                        {TASK_CAT_LABEL[t.category]} · {t.assigneeId ? names[t.assigneeId] || "—" : "Chưa giao"}
                        {t.dueAt && (
                          <> · Hạn{" "}
                            <span style={ds === "overdue" ? { color: "var(--c-rose)", fontWeight: 700 } : ds === "today" ? { color: "var(--c-amber)", fontWeight: 700 } : undefined}>
                              {fmtDate(t.dueAt)}{ds === "overdue" ? " (trễ)" : ds === "today" ? " (hôm nay)" : ""}
                            </span>
                          </>
                        )}
                      </div>
                      {t.detail && <div className="small muted">{t.detail}</div>}
                      {canManage && (
                        <div className="flex gap" style={{ flexWrap: "wrap" }}>
                          {key === "open" && (
                            <form action={setTaskStatusAction}>
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="status" value="doing" />
                              <button type="submit" className="btn ghost" style={{ padding: "5px 11px" }}>Bắt đầu</button>
                            </form>
                          )}
                          {(key === "open" || key === "doing") && (
                            <form action={setTaskStatusAction}>
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="status" value="done" />
                              <button type="submit" className="btn ghost" style={{ padding: "5px 11px" }}><Icon name="check" /> Hoàn tất</button>
                            </form>
                          )}
                          {key === "done" && (
                            <form action={setTaskStatusAction}>
                              <input type="hidden" name="id" value={t.id} />
                              <input type="hidden" name="status" value="open" />
                              <button type="submit" className="btn ghost" style={{ padding: "5px 11px" }}>Mở lại</button>
                            </form>
                          )}
                          <form action={deleteTaskAction}>
                            <input type="hidden" name="id" value={t.id} />
                            <button type="submit" className="btn ghost" style={{ padding: "5px 11px", color: "var(--c-rose)" }}><Icon name="trash" /></button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bảng đầy đủ */}
      <div className="card mt">
        <div className="card-h"><h3>Tất cả việc & sự cố ({tasks.length})</h3></div>
        <table>
          <thead>
            <tr><th>Việc</th><th>Nhóm</th><th>Ưu tiên</th><th>Phụ trách</th><th>Hạn</th><th>Trạng thái</th></tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const ds = dueState(t.dueAt, t.status);
              return (
                <tr key={t.id}>
                  <td>
                    <div className="uname">{t.type === "incident" ? "⚠ " : ""}{t.title}</div>
                    <div className="urole">{t.code}</div>
                  </td>
                  <td className="small">{TASK_CAT_LABEL[t.category]}</td>
                  <td><span className={`badge ${PRIORITY_BADGE[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span></td>
                  <td className="small muted">{t.assigneeId ? names[t.assigneeId] || "—" : "—"}</td>
                  <td className="small" style={ds === "overdue" ? { color: "var(--c-rose)", fontWeight: 700 } : ds === "today" ? { color: "var(--c-amber)", fontWeight: 700 } : undefined}>
                    {t.dueAt ? fmtDate(t.dueAt) : "—"}
                  </td>
                  <td><span className={`badge ${TASK_STATUS_BADGE[t.status]}`}>{TASK_STATUS_LABEL[t.status]}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
