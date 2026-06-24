// Xác thực AGENT cào giá (máy nhân viên) — token bí mật dùng chung, đặt ở env AGENT_TOKEN.
// Agent gửi token qua header `x-agent-token` hoặc query `?token=`. So sánh timing-safe.
import crypto from "crypto";
import type { NextRequest } from "next/server";

/** Trả về null nếu hợp lệ; nếu sai trả về chuỗi lý do (để route trả 401). */
export function checkAgentToken(req: NextRequest): string | null {
  const secret = process.env.AGENT_TOKEN || "";
  if (!secret) return "AGENT_TOKEN chưa cấu hình trên máy chủ";
  const sent =
    req.headers.get("x-agent-token") ||
    new URL(req.url).searchParams.get("token") ||
    "";
  const a = Buffer.from(sent);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return "Token không hợp lệ";
  return null;
}
