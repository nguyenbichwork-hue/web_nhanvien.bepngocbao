"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import {
  LAYOUT_LABEL,
  TIER_LABEL,
  type KitchenLayout,
  type Product,
  type QuoteTier,
} from "@/lib/bnb/types";
import { TIER_ORDER } from "@/lib/bnb/fit";
import { fmtVnd } from "@/lib/bnb/util";

/* ============ Dữ liệu lựa chọn ============ */

type ScenarioLite = {
  id: string;
  name: string;
  desc: string;
  tiers: Record<QuoteTier, string[]>;
};

type Props = { products: Product[]; scenarios: ScenarioLite[] };

const LAYOUTS = Object.keys(LAYOUT_LABEL) as KitchenLayout[];

const LAYOUT_ICON: Record<KitchenLayout, string> = {
  I: "stove",
  L: "stove",
  U: "stove",
  G: "stove",
  island: "fire",
  parallel: "hood",
};

type StyleOpt = { id: string; label: string; desc: string };
const STYLES: StyleOpt[] = [
  { id: "modern", label: "Hiện đại", desc: "Tủ phẳng, gam trung tính, gọn gàng" },
  { id: "neoclassic", label: "Tân cổ điển", desc: "Khung soi, phào chỉ, ánh đồng" },
  { id: "minimal", label: "Tối giản", desc: "Liền mạch, ẩn tay nắm, ít chi tiết" },
  { id: "luxury", label: "Sang trọng", desc: "Gỗ óc chó, đá marble, điểm vàng đồng" },
  { id: "scandi", label: "Scandinavian", desc: "Gỗ sáng, trắng kem, nhiều ánh sáng" },
  { id: "industrial", label: "Industrial", desc: "Bê tông, kim loại, gam đậm" },
];

type PaletteOpt = { id: string; label: string; en: string; swatch: string };
const PALETTES: PaletteOpt[] = [
  { id: "white-wood", label: "Trắng – vân gỗ", en: "warm white and light oak wood tones", swatch: "linear-gradient(135deg,#f5f0e6,#d8c4a0)" },
  { id: "gray-black", label: "Xám – đen", en: "charcoal grey and matte black tones", swatch: "linear-gradient(135deg,#9aa1ab,#2b3038)" },
  { id: "cream-beige", label: "Kem – be", en: "cream and soft beige tones", swatch: "linear-gradient(135deg,#f3e9da,#e0c9a6)" },
  { id: "green-wood", label: "Xanh rêu – gỗ", en: "olive green and natural wood tones", swatch: "linear-gradient(135deg,#6b7a5a,#bfae8e)" },
  { id: "navy-brass", label: "Xanh navy – đồng", en: "deep navy blue with brushed brass accents", swatch: "linear-gradient(135deg,#27364d,#caa86a)" },
  { id: "marble", label: "Trắng marble", en: "white marble with subtle grey veining", swatch: "linear-gradient(135deg,#fafafa,#cfd3da)" },
];

/* ============ Ảnh placeholder (SVG gradient) khi chưa có key ============ */

function placeholderDataUrl(layout: KitchenLayout, palette: string): string {
  const grad =
    PALETTES.find((p) => p.id === palette)?.swatch.match(/#[0-9a-f]{3,6}/gi) ?? ["#9e1b32", "#c8203f"];
  const [c1, c2] = [grad[0] || "#9e1b32", grad[1] || "#c8203f"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="512" viewBox="0 0 768 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="768" height="512" fill="url(#g)"/>
  <rect x="64" y="300" width="640" height="150" rx="12" fill="rgba(255,255,255,.18)"/>
  <rect x="64" y="120" width="280" height="120" rx="10" fill="rgba(255,255,255,.12)"/>
  <circle cx="200" cy="360" r="26" fill="rgba(255,255,255,.30)"/>
  <circle cx="290" cy="360" r="26" fill="rgba(255,255,255,.30)"/>
  <text x="384" y="250" font-family="Segoe UI,Arial" font-size="30" font-weight="700"
    fill="rgba(255,255,255,.92)" text-anchor="middle">Phối cảnh bếp ${layout}</text>
  <text x="384" y="285" font-family="Segoe UI,Arial" font-size="16"
    fill="rgba(255,255,255,.75)" text-anchor="middle">Ảnh minh hoạ — cấu hình API key để tạo ảnh thật</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/* ============ Trạng thái kết quả ============ */

type GenState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ok"; imageUrl: string; provider?: string; model?: string }
  | { phase: "placeholder"; imageUrl: string }
  | { phase: "error"; message: string };

export default function Designer({ products, scenarios }: Props) {
  const [layout, setLayout] = useState<KitchenLayout>("L");
  const [style, setStyle] = useState<string>("modern");
  const [tier, setTier] = useState<QuoteTier>("balanced");
  const [palette, setPalette] = useState<string>("white-wood");
  const [note, setNote] = useState<string>("");
  const [gen, setGen] = useState<GenState>({ phase: "idle" });

  const bySku = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) if (p.sku) m.set(p.sku, p);
    return m;
  }, [products]);

  // Gợi ý thiết bị: lấy combo theo tier của scenario đầu tiên match số SKU > 0,
  // fallback gom vài sản phẩm đầu danh mục.
  const suggestions = useMemo<Product[]>(() => {
    for (const sc of scenarios) {
      const skus = sc.tiers[tier];
      if (skus && skus.length) {
        const items = skus.map((s) => bySku.get(s)).filter((p): p is Product => Boolean(p));
        if (items.length) return items.slice(0, 5);
      }
    }
    return products.slice(0, 4);
  }, [scenarios, tier, bySku, products]);

  const palObj = PALETTES.find((p) => p.id === palette);

  async function generate() {
    setGen({ phase: "loading" });
    try {
      const res = await fetch("/api/design/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout, style, tier, palette: palObj?.en || palette, note }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        reason?: string;
        placeholder?: boolean;
        imageUrl?: string;
        provider?: string;
        model?: string;
        message?: string;
      };
      if (data.ok && data.imageUrl) {
        setGen({ phase: "ok", imageUrl: data.imageUrl, provider: data.provider, model: data.model });
      } else if (data.reason === "no_key" || data.placeholder) {
        setGen({ phase: "placeholder", imageUrl: placeholderDataUrl(layout, palette) });
      } else {
        setGen({ phase: "error", message: data.message || "Không tạo được phối cảnh, vui lòng thử lại." });
      }
    } catch {
      setGen({ phase: "error", message: "Lỗi kết nối tới máy chủ tạo ảnh." });
    }
  }

  const currentImage =
    gen.phase === "ok" || gen.phase === "placeholder" ? gen.imageUrl : null;

  return (
    <div className="grid-k g-2">
      {/* ----- Cột trái: cấu hình ----- */}
      <div className="card">
        {/* Bố cục */}
        <h3 style={{ marginTop: 0 }}>Bố cục bếp</h3>
        <div className="chips" style={{ gap: 10 }}>
          {LAYOUTS.map((l) => (
            <button
              type="button"
              key={l}
              className={`chip${layout === l ? " on" : ""}`}
              style={{ padding: "11px 16px" }}
              onClick={() => setLayout(l)}
            >
              {layout === l && <Icon name="check" />} {LAYOUT_LABEL[l]}
            </button>
          ))}
        </div>

        {/* Phong cách */}
        <h3 style={{ marginTop: 22 }}>Phong cách</h3>
        <div className="grid-k" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {STYLES.map((s) => (
            <button
              type="button"
              key={s.id}
              className="card hover"
              onClick={() => setStyle(s.id)}
              style={{
                textAlign: "left",
                cursor: "pointer",
                padding: "12px 14px",
                borderColor: style === s.id ? "var(--brand-1)" : undefined,
                boxShadow: style === s.id ? "var(--sh)" : undefined,
              }}
            >
              <div className="flex aic gap" style={{ marginBottom: 2 }}>
                {style === s.id && <Icon name="check" />}
                <b style={{ fontSize: 14 }}>{s.label}</b>
              </div>
              <div className="urole" style={{ whiteSpace: "normal" }}>{s.desc}</div>
            </button>
          ))}
        </div>

        {/* Phân tầng */}
        <h3 style={{ marginTop: 22 }}>Phân tầng thiết bị</h3>
        <div className="chips" style={{ gap: 10 }}>
          {TIER_ORDER.map((t) => (
            <button
              type="button"
              key={t}
              className={`chip${tier === t ? " on" : ""}`}
              style={{ padding: "11px 18px" }}
              onClick={() => setTier(t)}
            >
              {tier === t && <Icon name="check" />} {TIER_LABEL[t]}
            </button>
          ))}
        </div>

        {/* Tông màu */}
        <h3 style={{ marginTop: 22 }}>Tông màu</h3>
        <div className="chips" style={{ gap: 10 }}>
          {PALETTES.map((p) => (
            <button
              type="button"
              key={p.id}
              className={`chip${palette === p.id ? " on" : ""}`}
              style={{ padding: "8px 14px 8px 8px", display: "inline-flex", alignItems: "center", gap: 8 }}
              onClick={() => setPalette(p.id)}
            >
              <span
                aria-hidden
                style={{ width: 18, height: 18, borderRadius: 6, background: p.swatch, display: "inline-block", flexShrink: 0 }}
              />
              {p.label}
            </button>
          ))}
        </div>

        {/* Ghi chú */}
        <div className="field" style={{ marginTop: 22, marginBottom: 0 }}>
          <label>Ghi chú thêm (tuỳ chọn)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: thêm đảo bếp nhỏ, nhiều ánh sáng tự nhiên, có quầy bar…"
          />
        </div>

        <button
          type="button"
          className="btn primary"
          onClick={generate}
          disabled={gen.phase === "loading"}
          style={{ marginTop: 18, width: "100%", justifyContent: "center", opacity: gen.phase === "loading" ? 0.7 : 1 }}
        >
          {gen.phase === "loading" ? (
            <>
              <Spinner /> Đang tạo phối cảnh…
            </>
          ) : (
            <>
              <Icon name="sparkle" /> Tạo phối cảnh
            </>
          )}
        </button>
      </div>

      {/* ----- Cột phải: kết quả ----- */}
      <div style={{ display: "grid", gap: 20, alignContent: "start" }}>
        <div className="card">
          <div className="card-h">
            <div className="flex aic gap">
              <Icon name="sparkle" />
              <h3 style={{ margin: 0 }}>Phối cảnh</h3>
            </div>
            {gen.phase === "ok" && gen.model && (
              <span className="badge b-green">{gen.model}</span>
            )}
            {gen.phase === "placeholder" && <span className="badge b-amber">Minh hoạ</span>}
          </div>

          {/* Khung ảnh */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "3 / 2",
              borderRadius: "var(--r-md)",
              overflow: "hidden",
              background: "var(--surface-2)",
              display: "grid",
              placeItems: "center",
            }}
          >
            {gen.phase === "loading" && (
              <div className="flex col aic gap" style={{ flexDirection: "column", color: "var(--tx-muted)" }}>
                <Spinner large />
                <span className="small muted">Đang dựng ảnh… có thể mất 15–40 giây</span>
              </div>
            )}
            {gen.phase === "idle" && (
              <div className="flex col aic" style={{ flexDirection: "column", gap: 8, color: "var(--tx-soft)" }}>
                <Icon name="sparkle" />
                <span className="small">Chọn cấu hình rồi bấm “Tạo phối cảnh”.</span>
              </div>
            )}
            {currentImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentImage}
                alt="Phối cảnh bếp AI"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>

          {/* Trạng thái cần cấu hình key */}
          {gen.phase === "placeholder" && (
            <div className="card" style={{ marginTop: 14, borderColor: "var(--brand-1)", background: "var(--surface-2)" }}>
              <div className="flex aic gap">
                <Icon name="alert" />
                <b className="small">Cần cấu hình OPENAI_API_KEY / GEMINI_API_KEY</b>
              </div>
              <p className="muted small" style={{ margin: "6px 0 0" }}>
                Đang hiển thị ảnh minh hoạ. Điền một trong hai khoá vào <code>.env.local</code> rồi
                khởi động lại để tạo phối cảnh thật.
              </p>
            </div>
          )}

          {gen.phase === "error" && (
            <p className="muted small" style={{ marginTop: 12, color: "var(--brand-2)" }}>
              {gen.message}
            </p>
          )}

          {/* Hành động trên ảnh */}
          {currentImage && (
            <div className="flex gap mt" style={{ flexWrap: "wrap" }}>
              <button type="button" className="btn ghost" onClick={generate} disabled={gen.phase === "loading"}>
                <Icon name="sparkle" /> Tạo lại
              </button>
              <a className="btn ghost" href={currentImage} download={`bep-${layout}-${style}.png`}>
                <Icon name="download" /> Tải ảnh
              </a>
            </div>
          )}
        </div>

        {/* Gợi ý thiết bị theo tier */}
        <div className="card">
          <div className="card-h">
            <div className="flex aic gap">
              <Icon name="stove" />
              <h3 style={{ margin: 0 }}>Gợi ý thiết bị · {TIER_LABEL[tier]}</h3>
            </div>
          </div>
          {suggestions.length === 0 ? (
            <p className="muted small">Chưa có dữ liệu sản phẩm.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {suggestions.map((p) => (
                <div key={p.id} className="flex between aic gap">
                  <div style={{ minWidth: 0 }}>
                    <div className="uname" style={{ whiteSpace: "normal" }}>{p.name}</div>
                    <div className="urole">
                      {p.brand ? `${p.brand} · ` : ""}
                      {p.sku || p.category || ""}
                    </div>
                  </div>
                  <b className="small" style={{ whiteSpace: "nowrap" }}>
                    {p.price ? fmtVnd(p.price) : "—"}
                  </b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Spinner keyframes cục bộ (globals.css chưa có .spin) */}
      <style>{`@keyframes bnb-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ============ Spinner SVG ============ */
function Spinner({ large }: { large?: boolean }) {
  const sz = large ? 40 : 18;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: sz,
        height: sz,
        border: `${large ? 4 : 2.4}px solid rgba(255,255,255,.35)`,
        borderTopColor: large ? "var(--brand-2)" : "#fff",
        borderRadius: "50%",
        animation: "bnb-spin .8s linear infinite",
      }}
    />
  );
}
