import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { Icon } from "@/components/icon";
import { listConversations, listMessages, getConversation } from "@/lib/bnb/store";
import { oaConfigured } from "@/lib/zalo/oa";
import { employeeNameMap, fmtDateTime, initials, avatarBg } from "@/lib/bnb/util";
import {
  ZALO_CONV_STATUS_LABEL, ZALO_CONV_STATUS_BADGE, type ZaloConvStatus,
} from "@/lib/bnb/types";
import { replyAction, setConvStatusAction, markReadAction } from "./actions";

export const dynamic = "force-dynamic";

type SP = { c?: string };

const STATUSES: ZaloConvStatus[] = ["open", "pending", "closed"];

export default async function InboxPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await requirePermission("inbox.read");
  const canManage = session.permissions.has("inbox.manage");
  const sp = await searchParams;

  const [conversations, empMap] = await Promise.all([listConversations(), employeeNameMap()]);
  const activeId = sp.c || conversations[0]?.id;
  const active = activeId ? await getConversation(activeId) : undefined;
  const messages = active ? await listMessages(active.id) : [];

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);
  const pending = conversations.filter((c) => c.status === "pending").length;

  return (
    <div className="view-in">
      <div className="crumbs">Trang chủ <Icon name="chev" /> Hộp thoại Zalo</div>
      <div className="page-head">
        <div>
          <h1><Icon name="chat" /> Hộp thoại Zalo OA</h1>
          <p>Chat hai chiều với khách qua Zalo Official Account — tư vấn, chăm sóc, chốt đơn.</p>
        </div>
        <div className="flex gap aic">
          <span className="badge b-rose">{totalUnread} chưa đọc</span>
          <span className="badge b-amber">{pending} chờ xử lý</span>
        </div>
      </div>

      {!oaConfigured() && (
        <div className="card mt" style={{ borderColor: "var(--c-amber)", background: "var(--surface-2)" }}>
          <p className="small" style={{ margin: 0 }}>
            <Icon name="alert" /> <b>Chế độ xem trước:</b> chưa cấu hình <code>ZALO_OA_ACCESS_TOKEN</code> nên
            tin trả lời chỉ lưu nội bộ, chưa gửi thật lên Zalo. Cắm token OA vào <code>.env.local</code> để bật chat live.
          </p>
        </div>
      )}

      <div className="grid-k mt" style={{ gridTemplateColumns: "minmax(260px,340px) 1fr", gap: 16, alignItems: "start" }}>
        {/* Danh sách hội thoại */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="card-h" style={{ padding: "14px 16px" }}>
            <h3>Hội thoại</h3><span className="badge b-gray">{conversations.length}</span>
          </div>
          {conversations.length === 0 ? (
            <p className="muted small" style={{ padding: 16 }}>Chưa có hội thoại nào.</p>
          ) : (
            <div>
              {conversations.map((c) => {
                const sel = c.id === activeId;
                return (
                  <Link
                    key={c.id}
                    href={`/inbox?c=${c.id}`}
                    style={{
                      display: "flex", gap: 10, padding: "12px 16px", alignItems: "center",
                      borderTop: "1px solid var(--bd)", textDecoration: "none", color: "inherit",
                      background: sel ? "var(--surface-2)" : "transparent",
                    }}
                  >
                    <span className="av" style={{ background: avatarBg(c.name), flexShrink: 0 }}>{initials(c.name)}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="flex between aic">
                        <b className="small" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</b>
                        <span className="small muted" style={{ flexShrink: 0 }}>{c.lastAt ? fmtDateTime(c.lastAt) : ""}</span>
                      </div>
                      <div className="urole" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.lastDirection === "out" ? "Bạn: " : ""}{c.lastText || "—"}
                      </div>
                    </div>
                    {c.unread ? <span className="badge b-rose" style={{ flexShrink: 0 }}>{c.unread}</span> : null}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Khung chat */}
        <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 460 }}>
          {!active ? (
            <p className="muted small" style={{ padding: "14px 0" }}>Chọn một hội thoại để xem.</p>
          ) : (
            <>
              <div className="card-h" style={{ marginBottom: 8 }}>
                <div className="flex gap aic">
                  <span className="av" style={{ background: avatarBg(active.name) }}>{initials(active.name)}</span>
                  <div>
                    <b>{active.name}</b>
                    <div className="urole">
                      {active.phone || "—"}
                      {active.customerId ? <> · <Link href={`/customers/${active.customerId}`} className="badge b-indigo">KH 360</Link></> : null}
                      {active.assigneeId ? ` · ${empMap[active.assigneeId] || "—"}` : ""}
                    </div>
                  </div>
                </div>
                <span className={`badge ${ZALO_CONV_STATUS_BADGE[active.status]}`}>{ZALO_CONV_STATUS_LABEL[active.status]}</span>
              </div>

              {/* Hành động hội thoại */}
              {canManage && (
                <div className="flex gap aic" style={{ flexWrap: "wrap", marginBottom: 10 }}>
                  {STATUSES.filter((st) => st !== active.status).map((st) => (
                    <form key={st} action={setConvStatusAction}>
                      <input type="hidden" name="id" value={active.id} />
                      <input type="hidden" name="status" value={st} />
                      <button type="submit" className="btn sm">{ZALO_CONV_STATUS_LABEL[st]}</button>
                    </form>
                  ))}
                  {active.unread ? (
                    <form action={markReadAction}>
                      <input type="hidden" name="id" value={active.id} />
                      <button type="submit" className="btn sm"><Icon name="check" /> Đã đọc</button>
                    </form>
                  ) : null}
                </div>
              )}

              {/* Dòng tin */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: "8px 2px", overflowY: "auto" }}>
                {messages.length === 0 ? (
                  <p className="muted small">Chưa có tin nhắn.</p>
                ) : (
                  messages.map((m) => {
                    const out = m.direction === "out";
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
                        <div
                          style={{
                            maxWidth: "72%", padding: "9px 13px", borderRadius: 14,
                            background: out ? "var(--brand-grad)" : "var(--surface-2)",
                            color: out ? "#fff" : "inherit",
                            border: out ? "none" : "1px solid var(--bd)",
                          }}
                        >
                          <div className="small" style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4, textAlign: "right" }}>
                            {out && m.byId ? `${empMap[m.byId] || ""} · ` : ""}{fmtDateTime(m.at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Ô soạn tin */}
              {canManage ? (
                <form action={replyAction} style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "flex-end" }}>
                  <input type="hidden" name="id" value={active.id} />
                  <textarea name="text" required placeholder="Nhập tin trả lời khách..." rows={2} style={{ flex: 1 }} />
                  <button type="submit" className="btn primary"><Icon name="chat" /> Gửi</button>
                </form>
              ) : (
                <p className="muted small" style={{ marginTop: 10 }}>Bạn chỉ có quyền xem hội thoại.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
