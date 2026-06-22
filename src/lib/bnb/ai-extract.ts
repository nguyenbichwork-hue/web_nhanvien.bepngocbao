// BNB · RMS — bóc báo giá NCC (PDF/ảnh) → cặp (model, giá vốn) bằng AI vision.
// Theo quy ước repo (xem api/design/generate): fetch THUẦN, KHÔNG thêm SDK; tự chọn
// provider theo key có sẵn — Anthropic Claude (ưu tiên) → Gemini. Cả hai đọc được
// PDF + ảnh. Không có key → trả {ok:false, reason:"no_key"}; bộ nhập tay vẫn dùng được.

export type ExtractFile = { data: string; mediaType: string; name?: string }; // data = base64 (không prefix)
export type ExtractedPair = { model: string; von: number };
export type ExtractResult =
  | { ok: true; pairs: ExtractedPair[]; provider: string; model: string }
  | { ok: false; reason: "no_key" | "too_large" | "error"; message?: string };

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
// "Cheapest capable" cho OCR/bóc bảng số lượng lớn = Haiku 4.5 ($1/$5 per 1M). Đổi sang
// claude-opus-4-8 (chính xác nhất) hoặc claude-sonnet-4-6 qua env nếu cần.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_EXTRACT_MODEL || "claude-haiku-4-5";
const GEMINI_MODEL = process.env.GEMINI_EXTRACT_MODEL || "gemini-2.0-flash";

export const AI_EXTRACT_CONFIGURED = Boolean(ANTHROPIC_KEY || GEMINI_KEY);

const PROMPT = `Bạn là công cụ bóc bảng BÁO GIÁ nhà cung cấp thiết bị bếp (chữ tiếng Việt).
Đọc tài liệu (PDF hoặc ảnh chụp/Excel) và trích MỌI dòng sản phẩm. Mỗi dòng lấy 2 trường:
- "model": mã hàng / model sản phẩm, giữ NGUYÊN như in (vd "PID675DC1E", "KF-330I", "536.61.890", "CZ-9979 GRT").
- "von": GIÁ VỐN cho đại lý — ưu tiên cột mang nghĩa "giá đại lý / giá đại lý nhập / giá có VAT / GIA CT / Invoice Price (+VAT)". Nếu chỉ có 1 cột giá thì lấy cột đó. Trả SỐ NGUYÊN đồng, BỎ mọi dấu chấm/phẩy/đơn vị (vd "12.500.000" -> 12500000).
Bỏ qua dòng tiêu đề nhóm, dòng không có giá. CHỈ trả JSON đúng dạng {"rows":[{"model":"...","von":123}]}.`;

const SCHEMA = {
  type: "object",
  properties: {
    rows: {
      type: "array",
      items: {
        type: "object",
        properties: { model: { type: "string" }, von: { type: "integer" } },
        required: ["model", "von"],
        additionalProperties: false,
      },
    },
  },
  required: ["rows"],
  additionalProperties: false,
};

function parsePairs(text: string): ExtractedPair[] {
  let obj: unknown;
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    obj = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) { try { obj = JSON.parse(m[0]); } catch { /* ignore */ } }
  }
  const rows = (obj as { rows?: unknown })?.rows;
  if (!Array.isArray(rows)) return [];
  const out: ExtractedPair[] = [];
  for (const r of rows) {
    const model = String((r as { model?: unknown })?.model ?? "").trim();
    const von = Number(String((r as { von?: unknown })?.von ?? "").replace(/[^\d]/g, ""));
    if (model && von > 0) out.push({ model, von });
  }
  return out;
}

/** Claude (Messages API, fetch thuần). PDF -> document block; ảnh -> image block; rồi text. */
async function extractClaude(files: ExtractFile[]): Promise<ExtractResult> {
  const content: unknown[] = [];
  for (const f of files) {
    if (f.mediaType === "application/pdf") {
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } });
    } else {
      content.push({ type: "image", source: { type: "base64", media_type: f.mediaType, data: f.data } });
    }
  }
  content.push({ type: "text", text: PROMPT });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 16000,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) return { ok: false, reason: "error", message: `Claude ${res.status}: ${(await res.text()).slice(0, 240)}` };
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content || []).find((b) => b.type === "text")?.text || "";
  return { ok: true, pairs: parsePairs(text), provider: "Claude", model: ANTHROPIC_MODEL };
}

/** Gemini (generateContent, fetch thuần). inline_data base64 + responseMimeType JSON. */
async function extractGemini(files: ExtractFile[]): Promise<ExtractResult> {
  const parts: unknown[] = files.map((f) => ({ inline_data: { mime_type: f.mediaType, data: f.data } }));
  parts.push({ text: PROMPT });
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json" } }),
  });
  if (!res.ok) return { ok: false, reason: "error", message: `Gemini ${res.status}: ${(await res.text()).slice(0, 240)}` };
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  return { ok: true, pairs: parsePairs(text), provider: "Gemini", model: GEMINI_MODEL };
}

/** Bóc báo giá: chọn provider theo key. Không có key -> no_key. */
export async function extractQuotePairs(files: ExtractFile[]): Promise<ExtractResult> {
  if (!files.length) return { ok: false, reason: "error", message: "Không có file." };
  try {
    if (ANTHROPIC_KEY) return await extractClaude(files);
    if (GEMINI_KEY) return await extractGemini(files);
    return { ok: false, reason: "no_key" };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : String(e) };
  }
}
