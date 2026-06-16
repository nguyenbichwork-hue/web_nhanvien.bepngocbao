// BNB · Thiết kế bếp AI — Route Handler sinh phối cảnh bếp.
//
// Nhận {layout, style, tier, palette, note} → dựng prompt tiếng Anh mô tả nhà bếp
// → gọi OpenAI Images API (gpt-image-1) HOẶC Gemini (gemini-2.5-flash-image) qua
// `fetch` thuần (KHÔNG thêm SDK/dependency). Tự chọn provider theo key có sẵn.
//
// Khi KHÔNG có key → trả { ok:false, reason:"no_key", placeholder:true } để client
// hiện trạng thái cần cấu hình + ảnh minh hoạ; KHÔNG ném lỗi, KHÔNG gãy build/runtime.
//
// Toàn bộ logic bọc try/catch → route không bao giờ throw ra ngoài.

import type { KitchenLayout, QuoteTier } from "@/lib/bnb/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Sinh ảnh có thể mất 15–40s → nới thời lượng tối đa.
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

type Body = {
  layout?: KitchenLayout;
  style?: string;
  tier?: QuoteTier;
  palette?: string;
  note?: string;
};

/* ============ Từ điển mô tả (tiếng Anh) để dựng prompt ============ */

const LAYOUT_DESC: Record<KitchenLayout, string> = {
  I: "single-wall I-shape kitchen layout, all cabinetry and appliances along ONE continuous straight wall, viewed head-on at eye level",
  L: "corner L-shape kitchen layout, TWO perpendicular counter runs meeting at an inside corner, viewed from a 3/4 angle",
  U: "U-shape kitchen layout wrapping THREE walls, all three counter runs clearly visible, viewed from the open fourth-wall side",
  G: "G-shape kitchen layout — a U-shape with an extra short peninsula return, four counter surfaces forming a near-enclosed work core",
  island:
    "open-plan kitchen with a SEPARATE central kitchen island holding the cooktop below a ceiling-suspended island rangehood, plus a parallel back wall of cabinets for the sink and storage",
  parallel:
    "galley / parallel kitchen layout with TWO facing counter runs along opposite walls and a clear central walkway between them",
};

// Phong cách — id phải khớp danh sách trong designer.tsx.
const STYLE_DESC: Record<string, string> = {
  modern:
    "modern style — flat handleless slab cabinet doors, light oak plank floor, thin-profile quartz countertop, clean painted walls, soft cool daylight",
  neoclassic:
    "neoclassical style — framed shaker cabinet doors with subtle moulding, marble-look countertop, brushed brass handles, warm symmetric lighting, elegant crown detailing",
  minimal:
    "ultra-minimal style — seamless handleless cabinetry, monolithic stone countertop, hidden appliances, very few decorations, calm diffuse daylight",
  luxury:
    "luxury style — walnut wood-grain cabinets mixed with matte dark uppers, polished Calacatta marble countertop and backsplash, brushed brass trim, herringbone hardwood floor, warm accent lighting",
  scandi:
    "Scandinavian style — pale natural oak base cabinets with chalk-white uppers, light terrazzo countertop, wide-plank oak floor, sheer curtains, bright diffuse daylight, a few green plants",
  industrial:
    "industrial style — dark charcoal matte cabinets with rough oak open shelves, butcher-block countertop, exposed concrete back wall, blackened steel framing, moody warm lighting",
};

const TIER_QUALITY: Record<QuoteTier, string> = {
  basic:
    "a tidy, value-oriented family kitchen with essential built-in appliances (induction cooktop and rangehood)",
  balanced:
    "a well-equipped mid-range kitchen with a coordinated set of built-in appliances (induction cooktop, rangehood, oven and sink)",
  premium:
    "a high-end fully-equipped kitchen with a premium coordinated appliance suite (induction cooktop, rangehood, oven, dishwasher and designer sink/faucet)",
};

const FALLBACK_STYLE =
  "contemporary style — clean cabinetry, stone countertop and balanced soft daylight";

/** Dựng prompt tiếng Anh từ lựa chọn của người dùng. */
function buildPrompt(b: Body): string {
  const layout = (b.layout && LAYOUT_DESC[b.layout]) || LAYOUT_DESC.L;
  const style = (b.style && STYLE_DESC[b.style]) || FALLBACK_STYLE;
  const tier = (b.tier && TIER_QUALITY[b.tier]) || TIER_QUALITY.balanced;
  const palette = (b.palette || "").trim();
  const note = (b.note || "").trim();

  return [
    "Professional architectural interior photograph of a modern Vietnamese home kitchen.",
    `Layout (mandatory): ${layout}.`,
    `Design: ${style}.`,
    `Scope: ${tier}.`,
    palette ? `Colour palette: predominantly ${palette}; keep tones harmonious and consistent across cabinets, walls and countertop.` : "",
    note ? `Extra request from the homeowner: ${note}.` : "",
    "Constraints: a realistic, buildable kitchen; no people, no text overlays, no brand logos, no clutter on the counters.",
    "Magazine-quality interior photography, photorealistic, sharp focus, balanced soft daylight, 8K, warm and inviting color grade.",
  ]
    .filter(Boolean)
    .join(" ");
}

/* ============ Provider qua fetch thuần ============ */

/** OpenAI Images API (gpt-image-1) → trả data URL base64. */
async function generateOpenAI(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "medium",
      n: 1,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const item = json.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item?.url) return item.url;
  throw new Error("OpenAI không trả về ảnh");
}

/** Gemini (generateContent, model *-image) → trả data URL base64. */
async function generateGemini(prompt: string): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent` +
    `?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string; inlineData?: { data?: string; mimeType?: string } }[] } }[];
  };
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    if (p.inlineData?.data) {
      const mime = p.inlineData.mimeType || "image/png";
      return `data:${mime};base64,${p.inlineData.data}`;
    }
  }
  const text = parts.find((p) => p.text)?.text;
  throw new Error(text ? `Gemini trả text: ${text.slice(0, 160)}` : "Gemini không trả về ảnh");
}

/* ============ Handler ============ */

export async function POST(req: Request): Promise<Response> {
  // Tất cả bọc try/catch — route KHÔNG bao giờ ném.
  try {
    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch {
      body = {};
    }

    const prompt = buildPrompt(body);
    const hasOpenAI = Boolean(OPENAI_API_KEY);
    const hasGemini = Boolean(GEMINI_API_KEY);

    // Không có key → placeholder, KHÔNG lỗi.
    if (!hasOpenAI && !hasGemini) {
      return Response.json({ ok: false, reason: "no_key", placeholder: true, prompt });
    }

    const provider: "openai" | "gemini" = hasOpenAI ? "openai" : "gemini";
    try {
      const imageUrl =
        provider === "openai" ? await generateOpenAI(prompt) : await generateGemini(prompt);
      return Response.json({
        ok: true,
        provider,
        model: provider === "openai" ? "gpt-image-1" : GEMINI_MODEL,
        imageUrl,
        prompt,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      return Response.json(
        { ok: false, reason: "provider_error", message: msg, prompt },
        { status: 200 },
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi không xác định";
    return Response.json({ ok: false, reason: "server_error", message: msg }, { status: 200 });
  }
}
