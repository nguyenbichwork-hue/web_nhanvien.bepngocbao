"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import {
  appendMessage, getConversation, markConversationRead, updateConversation,
} from "@/lib/bnb/store";
import { sendOAMessage } from "@/lib/zalo/oa";
import type { ZaloConvStatus } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();

/** Gửi tin trả lời khách qua Zalo OA + lưu vào hội thoại. */
export async function replyAction(fd: FormData) {
  const sess = await requirePermission("inbox.manage");
  const id = s(fd, "id");
  const text = s(fd, "text");
  if (!id || !text) return;
  const conv = await getConversation(id);
  if (!conv) return;
  // Gửi qua Zalo OA (no-op nếu chưa cấu hình token → vẫn lưu tin để theo dõi nội bộ).
  const res = await sendOAMessage(conv.zaloUserId, text);
  await appendMessage({
    conversationId: id,
    direction: "out",
    text,
    msgId: res.msgId,
    byId: sess.employee?.id,
  });
  revalidatePath("/inbox");
}

/** Đổi trạng thái hội thoại (mở / chờ xử lý / đóng). */
export async function setConvStatusAction(fd: FormData) {
  await requirePermission("inbox.manage");
  const id = s(fd, "id");
  const status = s(fd, "status") as ZaloConvStatus;
  if (!id || !status) return;
  await updateConversation(id, { status });
  revalidatePath("/inbox");
}

/** Đánh dấu đã đọc một hội thoại. */
export async function markReadAction(fd: FormData) {
  await requirePermission("inbox.read");
  const id = s(fd, "id");
  if (!id) return;
  await markConversationRead(id);
  revalidatePath("/inbox");
}
