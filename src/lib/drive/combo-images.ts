// BNB · Ảnh combo dựng sẵn lấy từ Google Drive QUA API (KHÔNG lưu ảnh ở Supabase).
// Supabase/app chỉ cần biết folder + API key; map "KB-0N → ảnh" được dựng runtime
// và cache (Drive đổi ảnh hiếm). Ảnh render qua CDN Google (lh3) — hotlink được
// với file chia sẻ "ai có link".
//
// CẦN ENV:
//   GOOGLE_DRIVE_API_KEY   — API key Google đã bật Drive API
//   DRIVE_COMBO_FOLDER_ID  — (tuỳ chọn) id folder; mặc định folder combo hiện tại
// Folder phải để "Anyone with the link · Viewer".

import { unstable_cache } from "next/cache";

const API_KEY = process.env.GOOGLE_DRIVE_API_KEY ?? "";
const FOLDER_ID = process.env.DRIVE_COMBO_FOLDER_ID || "1EBdJVNlWub__xe1FqNHRirlN8GcPqK64";

const FOLDER_MIME = "application/vnd.google-apps.folder";

export function driveConfigured(): boolean {
  return Boolean(API_KEY);
}

type DriveFile = { id: string; name: string; mimeType: string };

/** Liệt kê con trực tiếp của một folder Drive (public) qua Drive API v3. */
async function listChildren(folderId: string): Promise<DriveFile[]> {
  if (!API_KEY) return [];
  const q = `'${folderId}' in parents and trashed=false`;
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}` +
    `&fields=${encodeURIComponent("files(id,name,mimeType)")}` +
    `&pageSize=1000&orderBy=name&key=${API_KEY}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      console.error("[drive] list lỗi", r.status, await r.text());
      return [];
    }
    const j = (await r.json()) as { files?: DriveFile[] };
    return j.files ?? [];
  } catch (e) {
    console.error("[drive] list exception", e);
    return [];
  }
}

/** Trích mã kịch bản từ tên file/thư mục: "KB1-done","KB-8-Done","KB12" → "KB-0N". */
function scenarioIdFromName(name: string): string | null {
  const m = name.match(/KB[\s_-]*0*(\d{1,2})/i);
  return m ? `KB-${m[1].padStart(2, "0")}` : null;
}

const isImage = (f: DriveFile) => f.mimeType.startsWith("image/");

/** URL ảnh qua CDN Google cho file public. w = chiều rộng mong muốn. */
export function driveImageUrl(id: string, w = 1600): string {
  return `https://lh3.googleusercontent.com/d/${id}=w${w}`;
}

// Dựng map KB-0N → fileId. Hỗ trợ 2 kiểu sắp xếp trên Drive:
//  (a) 12 file ảnh đặt thẳng trong folder (tên chứa KBx) → 1 ảnh/kịch bản.
//  (b) 12 thư mục con KBx, mỗi thư mục chứa ảnh → lấy ảnh đầu tiên làm ảnh bìa.
async function buildMap(): Promise<Record<string, string>> {
  const entries = await listChildren(FOLDER_ID);
  const map: Record<string, string> = {};

  // (a) ảnh đặt thẳng
  for (const f of entries) {
    if (!isImage(f)) continue;
    const sid = scenarioIdFromName(f.name);
    if (sid && !map[sid]) map[sid] = f.id;
  }

  // (b) thư mục con — lấy ảnh bìa (ưu tiên file tên có 'cover'/'bia', nếu không lấy ảnh đầu)
  const folders = entries.filter((f) => f.mimeType === FOLDER_MIME);
  await Promise.all(
    folders.map(async (folder) => {
      const sid = scenarioIdFromName(folder.name);
      if (!sid || map[sid]) return;
      const children = (await listChildren(folder.id)).filter(isImage);
      if (!children.length) return;
      const cover =
        children.find((c) => /cover|bia|main|01|^1\b/i.test(c.name)) ?? children[0];
      map[sid] = cover.id;
    }),
  );

  return map;
}

/** Map "KB-0N" → URL ảnh combo (cache 1h). Rỗng nếu chưa cấu hình API key. */
export const comboImageMap = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const ids = await buildMap();
    const out: Record<string, string> = {};
    for (const [sid, id] of Object.entries(ids)) out[sid] = driveImageUrl(id);
    return out;
  },
  ["combo-image-map"],
  { revalidate: 3600, tags: ["combo-images"] },
);
