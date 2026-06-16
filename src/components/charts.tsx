"use client";

import { useEffect, useRef, useState } from "react";

/** Số đếm tăng dần (count-up) định dạng vi-VN. */
export function CountUp({ to, duration = 900 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{val.toLocaleString("vi-VN")}</>;
}

/** Cột biểu đồ — mảng [label, value, value2?]. */
export function BarChart({ data }: { data: [string, number, number?][] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="barchart">
      {data.flatMap(([lab, v, v2], i) => {
        const cols = [
          <div className="col" key={`${i}-a`}>
            <div className="bx" style={{ height: mounted ? `${v}%` : 0 }} />
            <div className="lab">{lab}</div>
          </div>,
        ];
        if (v2 !== undefined) {
          cols.push(
            <div className="col" key={`${i}-b`}>
              <div className="bx alt" style={{ height: mounted ? `${v2}%` : 0 }} />
              <div className="lab">{lab}</div>
            </div>
          );
        }
        return cols;
      })}
    </div>
  );
}

/** Thanh tiến độ ngang. */
export function ProgressBar({ value, color }: { value: number; color: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="bar">
      <i style={{ width: mounted ? `${value}%` : 0, background: color }} />
    </div>
  );
}

/** Danh sách thanh ngang có nhãn + số đếm, độ dài theo tỷ lệ giá trị lớn nhất. */
export function HBars({
  data,
  unit = "",
}: {
  data: { label: string; count: number; color: string }[];
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (!data.length)
    return <p className="muted" style={{ padding: "18px 0", textAlign: "center" }}>Chưa có dữ liệu.</p>;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {data.map((d) => (
        <div
          key={d.label}
          style={{ display: "grid", gridTemplateColumns: "minmax(96px,34%) 1fr auto", alignItems: "center", gap: 12 }}
        >
          <span className="small" style={{ color: "var(--tx-soft)" }}>{d.label}</span>
          <ProgressBar value={(d.count / max) * 100} color={d.color} />
          <b className="small" style={{ minWidth: 28, textAlign: "right" }}>
            {d.count.toLocaleString("vi-VN")}{unit}
          </b>
        </div>
      ))}
    </div>
  );
}

/** Donut bằng conic-gradient. data = [name, value, color][]. */
export function Donut({
  data,
  total,
  unit = "NV",
}: {
  data: [string, number, string][];
  total: number;
  unit?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    let acc = 0;
    const grad = data
      .map(([, v, c]) => {
        const a = acc;
        acc += (v / total) * 360;
        return `${c} ${a}deg ${acc}deg`;
      })
      .join(",");
    ref.current.style.background = `conic-gradient(${grad})`;
  }, [data, total]);

  return (
    <div className="donut" ref={ref}>
      <div className="ctr">
        <div
          style={{
            background: "var(--surface)",
            width: 96,
            height: 96,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div>
            <b>{total}</b>
            <span style={{ display: "block" }}>{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
