"use client";

// BNB · Biểu đồ "thật" trên Recharts — line/area/bar/donut có tooltip, tô theo
// --accent (đổi màu theo nhóm). Là Client Component nên Next code-split tự động
// theo route; chỉ trang nào import mới tải Recharts. Render skeleton tới khi
// mounted để tránh lỗi window/hydration và cho cảm giác tải mượt.

import { useEffect, useState, useId } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const AXIS = "var(--tx-soft)";
const GRID = "var(--line)";

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

function ChartSkeleton({ height }: { height: number }) {
  return <div className="chart-skel" style={{ height }} aria-hidden />;
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  boxShadow: "var(--sh-md)",
  fontSize: 12.5,
  fontFamily: "inherit",
  color: "var(--tx)",
  padding: "8px 12px",
};
const tooltipLabelStyle = { color: "var(--tx-soft)", fontWeight: 600, marginBottom: 2 };

const nf = (n: number) => n.toLocaleString("vi-VN");
/** Rút gọn số lớn: 1.2tr / 850k. */
export const compact = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace(/\.0$/, "") + " tỷ";
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "tr";
  if (a >= 1e3) return (n / 1e3).toFixed(0) + "k";
  return nf(n);
};

export type XYPoint = { label: string; value: number; value2?: number };

/** Biểu đồ vùng (area) — xu hướng theo thời gian, tô gradient accent. */
export function AreaTrend({
  data, height = 240, money = false, name = "Giá trị", name2, fill2,
}: {
  data: XYPoint[]; height?: number; money?: boolean; name?: string; name2?: string; fill2?: string;
}) {
  const mounted = useMounted();
  const gid = useId().replace(/:/g, "");
  if (!mounted) return <ChartSkeleton height={height} />;
  const fmt = money ? compact : nf;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={`a${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
          </linearGradient>
          {name2 && (
            <linearGradient id={`b${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill2 || "var(--c-teal)"} stopOpacity={0.28} />
              <stop offset="100%" stopColor={fill2 || "var(--c-teal)"} stopOpacity={0.02} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={48} tickFormatter={fmt} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} formatter={(v) => fmt(Number(v))} cursor={{ stroke: "var(--accent)", strokeOpacity: 0.25 }} />
        {name2 && (
          <Area type="monotone" dataKey="value2" name={name2} stroke={fill2 || "var(--c-teal)"} strokeWidth={2.4} fill={`url(#b${gid})`} dot={false} />
        )}
        <Area type="monotone" dataKey="value" name={name} stroke="var(--accent)" strokeWidth={2.6} fill={`url(#a${gid})`} dot={false} activeDot={{ r: 4, fill: "var(--accent)" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Cột — so sánh theo hạng mục; tô accent, có thể 2 series. */
export function BarsChart({
  data, height = 240, money = false, name = "Giá trị", name2, color2,
}: {
  data: XYPoint[]; height?: number; money?: boolean; name?: string; name2?: string; color2?: string;
}) {
  const mounted = useMounted();
  const gid = useId().replace(/:/g, "");
  if (!mounted) return <ChartSkeleton height={height} />;
  const fmt = money ? compact : nf;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barCategoryGap="22%">
        <defs>
          <linearGradient id={`bar${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-2)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={48} tickFormatter={fmt} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} formatter={(v) => fmt(Number(v))} cursor={{ fill: "var(--accent)", fillOpacity: 0.07 }} />
        {name2 && <Bar dataKey="value2" name={name2} fill={color2 || "var(--c-teal)"} radius={[6, 6, 0, 0]} maxBarSize={46} />}
        <Bar dataKey="value" name={name} fill={`url(#bar${gid})`} radius={[6, 6, 0, 0]} maxBarSize={46} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Đường — nhiều series mảnh, cho xu hướng so sánh. */
export function LineTrend({
  data, series, height = 240, money = false,
}: {
  data: Record<string, number | string>[];
  series: { key: string; name: string; color: string }[];
  height?: number; money?: boolean;
}) {
  const mounted = useMounted();
  if (!mounted) return <ChartSkeleton height={height} />;
  const fmt = money ? compact : nf;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={false} width={48} tickFormatter={fmt} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} formatter={(v) => fmt(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--tx-muted)" }} iconType="circle" />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export type Slice = { name: string; value: number; color: string };

/** Donut có tooltip + legend; center hiển thị tổng/nhãn. */
export function DonutChart({
  data, height = 240, centerValue, centerLabel, unit = "",
}: {
  data: Slice[]; height?: number; centerValue?: string | number; centerLabel?: string; unit?: string;
}) {
  const mounted = useMounted();
  if (!mounted) return <ChartSkeleton height={height} />;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ position: "relative" }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data} dataKey="value" nameKey="name"
            innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="var(--surface)" strokeWidth={3}
            startAngle={90} endAngle={-270}
          >
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} formatter={(v, n) => [`${nf(Number(v))}${unit}`, n]} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--tx-muted)" }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center" style={{ height }}>
        <b>{centerValue ?? nf(total)}</b>
        {centerLabel && <span>{centerLabel}</span>}
      </div>
    </div>
  );
}

/** Sparkline tí hon — nhúng trong KPI/ô nhỏ, không trục, không tooltip. */
export function Sparkline({ data, height = 40, color }: { data: number[]; height?: number; color?: string }) {
  const mounted = useMounted();
  const gid = useId().replace(/:/g, "");
  if (!mounted) return <div style={{ height }} />;
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sp${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color || "var(--accent)"} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color || "var(--accent)"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color || "var(--accent)"} strokeWidth={2} fill={`url(#sp${gid})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
