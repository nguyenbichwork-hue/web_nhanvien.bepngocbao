import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { extractQuotePairs, type ExtractFile } from "@/lib/bnb/ai-extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Bóc PDF/ảnh có thể mất 15–40s.
export const maxDuration = 60;

const MAX_FILE = 20 * 1024 * 1024; // ~20MB/file (request Anthropic tối đa ~32MB sau base64)

export async function POST(req: NextRequest) {
  await requirePermission("quote.manage");
  const form = await req.formData();
  const blobs = form.getAll("files").filter((x): x is File => x instanceof File);
  if (!blobs.length) return NextResponse.json({ ok: false, reason: "error", message: "Chưa chọn file báo giá." });

  const files: ExtractFile[] = [];
  for (const b of blobs) {
    if (b.size > MAX_FILE) {
      return NextResponse.json({ ok: false, reason: "too_large", message: `File "${b.name}" > 20MB — gửi ảnh chụp hoặc file nhỏ hơn.` });
    }
    let mt = b.type || "";
    if (!mt) mt = b.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg";
    const buf = Buffer.from(await b.arrayBuffer());
    files.push({ data: buf.toString("base64"), mediaType: mt, name: b.name });
  }

  const r = await extractQuotePairs(files);
  if (!r.ok) return NextResponse.json(r);
  const text = r.pairs.map((p) => `${p.model}\t${p.von}`).join("\n");
  return NextResponse.json({ ok: true, count: r.pairs.length, text, provider: r.provider, model: r.model });
}
