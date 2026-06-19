"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ProductThumb } from "@/components/product-thumb";
import {
  FIT_QUESTIONS,
  matchScenario,
  TIER_ORDER,
  type FitAnswers,
  type FitScenario,
} from "@/lib/bnb/fit";
import { TIER_LABEL, type Product, type QuoteTier } from "@/lib/bnb/types";
import { fmtVnd } from "@/lib/bnb/util";

type Props = { products: Product[]; comboImages?: Record<string, string> };

type TierBadge = Record<QuoteTier, string>;
const TIER_BADGE: TierBadge = {
  basic: "b-gray",
  balanced: "b-amber",
  premium: "b-indigo",
};
const TIER_ICON: Record<QuoteTier, string> = {
  basic: "stove",
  balanced: "sparkle",
  premium: "crown",
};

type ResolvedLine = { sku: string; product?: Product; price: number };
type ResolvedTier = { tier: QuoteTier; lines: ResolvedLine[]; total: number; note?: string };

export default function FitWizard({ products, comboImages }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<FitAnswers>({});
  const [done, setDone] = useState(false);

  // Bản đồ SKU → sản phẩm (dựng 1 lần).
  const bySku = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) if (p.sku) m.set(p.sku, p);
    return m;
  }, [products]);

  const total = FIT_QUESTIONS.length;
  const answeredCount = FIT_QUESTIONS.filter((q) => answers[q.id]).length;
  const progress = done ? 100 : Math.round((answeredCount / total) * 100);

  const result = useMemo(() => {
    if (!done) return null;
    return matchScenario(answers);
  }, [done, answers]);

  const tiers = useMemo<ResolvedTier[]>(() => {
    if (!result) return [];
    const sc: FitScenario = result.scenario;
    return TIER_ORDER.map((tier) => {
      const ft = sc.tiers[tier];
      const lines: ResolvedLine[] = ft.skus.map((sku) => {
        const product = bySku.get(sku);
        return { sku, product, price: product?.price ?? 0 };
      });
      const sum = lines.reduce((s, l) => s + l.price, 0);
      return { tier, lines, total: sum, note: ft.note };
    });
  }, [result, bySku]);

  function pick(qid: string, optId: string) {
    setAnswers((prev) => ({ ...prev, [qid]: optId }));
  }

  function next() {
    if (step < total - 1) setStep((s) => s + 1);
    else setDone(true);
  }

  function back() {
    if (step > 0) setStep((s) => s - 1);
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setDone(false);
  }

  /* ---------- Màn kết quả ---------- */
  if (done && result) {
    const sc = result.scenario;
    return (
      <div className="view-in" key="result">
        <div className="card" style={{ borderColor: "var(--brand-1)" }}>
          <div className="flex between aic" style={{ flexWrap: "wrap", gap: 12 }}>
            <div className="flex aic gap">
              <div
                className="ic"
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 15,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--brand-grad)",
                  color: "#fff",
                }}
              >
                <Icon name="sparkle" />
              </div>
              <div>
                <div className="flex aic gap" style={{ flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0 }}>{sc.name}</h3>
                  <span className="badge b-rose">{sc.id}</span>
                </div>
                <p className="muted small" style={{ margin: "4px 0 0" }}>{sc.desc}</p>
              </div>
            </div>
            <button type="button" className="btn ghost" onClick={restart}>
              <Icon name="chev" /> Bắt đầu lại
            </button>
          </div>
        </div>

        {/* Ảnh phối cảnh dựng sẵn của combo (lấy từ Google Drive qua API) */}
        {comboImages?.[sc.id] && (
          <div className="card mt" style={{ padding: 0, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={comboImages[sc.id]}
              alt={`Phối cảnh bếp mẫu · ${sc.name} (${sc.id})`}
              style={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 440 }}
              loading="lazy"
            />
          </div>
        )}

        <div className="grid-k g-3 stagger mt">
          {tiers.map((t) => {
            const featured = t.tier === "balanced";
            return (
              <div
                key={t.tier}
                className="card hover"
                style={
                  featured
                    ? { borderColor: "var(--brand-1)", boxShadow: "var(--sh-md)" }
                    : undefined
                }
              >
                <div className="card-h">
                  <div className="flex aic gap">
                    <Icon name={TIER_ICON[t.tier]} />
                    <h3 style={{ margin: 0 }}>{TIER_LABEL[t.tier]}</h3>
                  </div>
                  {featured ? (
                    <span className="badge b-green">Đề xuất</span>
                  ) : (
                    <span className={`badge ${TIER_BADGE[t.tier]}`}>Phương án</span>
                  )}
                </div>

                <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
                  {t.lines.map((l, i) => (
                    <div key={`${l.sku}-${i}`} className="flex aic gap" style={{ justifyContent: "space-between" }}>
                      <div className="flex aic gap" style={{ minWidth: 0 }}>
                        <ProductThumb src={l.product?.image} name={l.product?.name} size={40} />
                        <div style={{ minWidth: 0 }}>
                          <div className="uname" style={{ whiteSpace: "normal" }}>
                            {l.product?.name || l.sku}
                          </div>
                          <div className="urole">
                            {l.product?.brand ? `${l.product.brand} · ` : ""}
                            {l.sku}
                          </div>
                        </div>
                      </div>
                      <b className="small" style={{ whiteSpace: "nowrap" }}>
                        {l.price ? fmtVnd(l.price) : "—"}
                      </b>
                    </div>
                  ))}
                </div>

                {t.note && <p className="muted small mt">{t.note}</p>}

                <div
                  className="flex between aic mt"
                  style={{ paddingTop: 12, borderTop: "1px solid var(--line)" }}
                >
                  <span className="muted small">Tạm tính</span>
                  <b style={{ fontSize: 18 }}>{fmtVnd(t.total)}</b>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap mt" style={{ flexWrap: "wrap" }}>
          <a href="https://thietkebep.bepngocbao.vn/" target="_blank" rel="noopener noreferrer" className="btn primary">
            <Icon name="quote" /> Tạo báo giá
          </a>
          <button type="button" className="btn ghost" onClick={restart}>
            <Icon name="chev" /> Bắt đầu lại
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Màn wizard ---------- */
  const q = FIT_QUESTIONS[step];
  const selected = answers[q.id];

  return (
    <div className="card">
      {/* Tiến độ */}
      <div className="flex between aic" style={{ marginBottom: 6 }}>
        <span className="muted small">
          Câu {step + 1}/{total}
        </span>
        <span className="muted small">{progress}%</span>
      </div>
      <div className="bar">
        <i style={{ width: `${progress}%`, background: "var(--brand-grad)" }} />
      </div>

      {/* Câu hỏi (đổi key để tái tạo hiệu ứng fade/slide) */}
      <div className="view-in" key={q.id} style={{ marginTop: 22 }}>
        <h3 style={{ marginBottom: 16 }}>{q.label}</h3>
        <div className="chips" style={{ gap: 12 }}>
          {q.options.map((opt) => (
            <button
              type="button"
              key={opt.id}
              className={`chip${selected === opt.id ? " on" : ""}`}
              style={{ padding: "13px 20px", fontSize: 14.5 }}
              onClick={() => pick(q.id, opt.id)}
            >
              {selected === opt.id && <Icon name="check" />} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Điều hướng */}
      <div className="flex between aic mt" style={{ marginTop: 26 }}>
        <button
          type="button"
          className="btn ghost"
          onClick={back}
          disabled={step === 0}
          style={step === 0 ? { opacity: 0.45, pointerEvents: "none" } : undefined}
        >
          <Icon name="chevleft" /> Quay lại
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={next}
          disabled={!selected}
          style={!selected ? { opacity: 0.55, pointerEvents: "none" } : undefined}
        >
          {step === total - 1 ? (
            <>
              <Icon name="sparkle" /> Xem đề xuất
            </>
          ) : (
            <>
              Tiếp <Icon name="chev" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
