"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "./icon";
import { fmtVnd, compactVnd } from "@/lib/bnb/util";

export type ComboTier = { key: string; label: string; total: number; lines: { name: string; price: number }[] };
export type ComboCard = {
  id: string; name: string; desc: string; cat: string;
  count: number; fromPrice: number; cover?: string; tiers: ComboTier[];
};

export function ComboGalleryClient({ combos }: { combos: ComboCard[] }) {
  const [open, setOpen] = useState<ComboCard | null>(null);
  return (
    <>
      <div className="combo-grid">
        {combos.map((c) => (
          <button type="button" key={c.id} className="combo-card card hover" onClick={() => setOpen(c)}>
            <div className="combo-cover">
              {c.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.cover} alt={`Phối cảnh ${c.name}`} loading="lazy" />
              ) : (
                <div className="combo-cover-ph"><Icon name="sparkle" /></div>
              )}
              <span className="combo-code">{c.id}</span>
            </div>
            <div className="combo-body">
              <b className="combo-name">{c.name}</b>
              {c.cat && <div className="combo-cat">{c.cat}</div>}
              <p className="combo-desc">{c.desc}</p>
              <div className="combo-foot">
                <span className="badge b-gray">{c.count} thiết bị</span>
                {c.fromPrice > 0 && <b className="combo-price">từ {compactVnd(c.fromPrice)}</b>}
              </div>
            </div>
          </button>
        ))}
      </div>
      {open && <ComboModal combo={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ComboModal({ combo, onClose }: { combo: ComboCard; onClose: () => void }) {
  const [imgs, setImgs] = useState<{ url: string; label: string }[]>(
    combo.cover ? [{ url: combo.cover, label: combo.id }] : [],
  );
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/combo/${combo.id}`)
      .then((r) => r.json())
      .then((d: { images?: { url: string; label: string }[] }) => {
        if (!alive) return;
        if (d.images?.length) setImgs(d.images);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [combo.id]);

  // Đóng bằng phím Esc + khoá cuộn nền.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const cur = imgs[active];

  return (
    <div className="sch-overlay" onClick={onClose}>
      <div className="combo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="combo-modal-hero">
          <button type="button" className="combo-modal-close" onClick={onClose} aria-label="Đóng"><Icon name="x" /></button>
          {cur ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cur.url} alt={`${combo.name} — ${cur.label}`} />
          ) : (
            <div style={{ height: 280, display: "grid", placeItems: "center", color: "rgba(255,255,255,.4)" }}>
              <Icon name="sparkle" />
            </div>
          )}
        </div>

        {imgs.length > 1 && (
          <div className="combo-thumbs">
            {imgs.map((im, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={im.url} alt={im.label} className={i === active ? "on" : ""} onClick={() => setActive(i)} loading="lazy" />
            ))}
          </div>
        )}

        <div className="combo-modal-body">
          <div className="flex between aic" style={{ flexWrap: "wrap", gap: 8 }}>
            <div>
              <div className="flex aic gap" style={{ flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>{combo.name}</h3>
                <span className="badge b-rose">{combo.id}</span>
              </div>
              {combo.cat && <div className="combo-cat" style={{ marginTop: 2 }}>{combo.cat}</div>}
            </div>
            {cur && <span className="badge b-indigo">{cur.label}</span>}
          </div>
          <p className="muted small" style={{ margin: "6px 0 16px" }}>
            {combo.desc} {loading && "· đang tải thêm ảnh…"}
          </p>

          {/* 3 phương án phân tầng */}
          <div className="grid-k g-3" style={{ gap: 12 }}>
            {combo.tiers.map((t) => (
              <div key={t.key} className={`combo-tier${t.key === "balanced" ? " feat" : ""}`}>
                <div className="flex between aic" style={{ marginBottom: 8 }}>
                  <b className="small">{t.label}</b>
                  {t.key === "balanced" && <span className="badge b-green">Đề xuất</span>}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  {t.lines.map((l, i) => (
                    <div key={i} className="flex between aic gap">
                      <span className="small" style={{ minWidth: 0 }}>{l.name}</span>
                      <b className="small" style={{ whiteSpace: "nowrap" }}>{l.price ? fmtVnd(l.price) : "—"}</b>
                    </div>
                  ))}
                </div>
                <div className="flex between aic" style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                  <span className="muted small">Tạm tính</span>
                  <b>{fmtVnd(t.total)}</b>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap mt" style={{ flexWrap: "wrap" }}>
            <a href="https://thietkebep.bepngocbao.vn/" target="_blank" rel="noopener noreferrer" className="btn primary"><Icon name="quote" /> Tạo báo giá theo combo</a>
            <Link href="/fit" className="btn ghost"><Icon name="fit" /> Chẩn đoán cho khách</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
