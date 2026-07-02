// TKB · API CÔNG KHAI cho web thietkebep đọc bản ĐÃ XUẤT BẢN.
//   GET /api/tkb/published                → meta con trỏ (version, at, counts)
//   GET /api/tkb/published?section=products → dữ liệu section của bản đã xuất bản
// Snapshot bất biến theo version → cache CDN dài, stale-while-revalidate.
// Dữ liệu là catalog công khai (thietkebep vốn bundle sẵn trong client).
import { NextRequest, NextResponse } from "next/server";
import { getPublishedPointer, getPublishedSection } from "@/lib/tkb/store";
import { TKB_SECTIONS, type TkbSection } from "@/lib/tkb/types";

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=300, stale-while-revalidate=3600";

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section");
  const ptr = await getPublishedPointer();
  if (!ptr) {
    return NextResponse.json(
      { ok: false, error: "Chưa xuất bản lần nào" },
      { status: 404, headers: { "Cache-Control": "public, s-maxage=30" } },
    );
  }
  if (!section) {
    return NextResponse.json(
      { ok: true, ...ptr, sections: TKB_SECTIONS },
      { headers: { "Cache-Control": CACHE } },
    );
  }
  if (!(TKB_SECTIONS as readonly string[]).includes(section)) {
    return NextResponse.json({ ok: false, error: "section không hợp lệ" }, { status: 400 });
  }
  const data = await getPublishedSection(section as TkbSection);
  return NextResponse.json(
    { ok: true, version: ptr.version, at: ptr.at, section, data },
    { headers: { "Cache-Control": CACHE } },
  );
}
