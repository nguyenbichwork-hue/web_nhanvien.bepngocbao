// Trả tất cả ảnh dựng sẵn của 1 combo (KB-0N) — modal chi tiết gọi khi mở.
import { requireSession } from "@/lib/auth/session";
import { comboImages } from "@/lib/drive/combo-images";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ scenario: string }> }) {
  await requireSession();
  const { scenario } = await params;
  const images = await comboImages(scenario);
  return Response.json({ images });
}
