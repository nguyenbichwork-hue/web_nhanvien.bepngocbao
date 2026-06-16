import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseAuthEnabled } from "@/lib/supabase/env";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  if (isSupabaseAuthEnabled) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    // scope:"local" → chỉ xoá phiên & cookie, KHÔNG gọi mạng thu hồi (tránh treo trên Worker).
    await supabase.auth.signOut({ scope: "local" });
  }
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.delete(SESSION_COOKIE); // xoá phiên dev
  return res;
}
