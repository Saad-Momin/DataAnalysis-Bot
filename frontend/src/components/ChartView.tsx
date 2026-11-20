"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSpec } from "@/lib/types";
import { fmtCompact, fmtValue, truncate, useTokens, type Tokens } from "@/lib/viz";
import DataTable from "./DataTable";

const MAX_PIE_SLICES = 8;

// ---- tooltip -------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
function ChartTooltip({ active, payload, label, tokens }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p: any) => p.value !== undefined);
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{ background: tokens.surface, borderColor: tokens.grid, color: tokens.textPrimary }}
    >
      {label !== undefined && label !== "" && <div className="mb-1 font-medium">{String(label)}</div>}
      {rows.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: p.color ?? p.payload?.fill ?? p.fill }}
          />
          <span style={{ color: tokens.textSecondary }}>{p.name}</span>
          <span className="ml-auto pl-4 font-medium tabular-nums">{fmtValue(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { name: string; color: string; value?: string }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
      {items.map((it) => (
        <li key={it.name} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
          <span>{it.name}</span>
          {it.value && <span className="text-slate-400 dark:text-slate-500">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}

// ---- helpers -------------------------------------------------------------
function axisProps(t: Tokens) {
  return {
    tick: { fill: t.textSecondary, fontSize: 12 },
    tickLine: false as const,
    axisLine: { stroke: t.grid },
  };
}

function foldPie(data: Record<string, unknown>[], x: string, y: string) {
  const sorted = [...data].sort((a, b) => Number(b[y] ?? 0) - Number(a[y] ?? 0));
  if (sorted.length <= MAX_PIE_SLICES) return sorted;
  const head = sorted.slice(0, MAX_PIE_SLICES - 1);
  const rest = sorted.slice(MAX_PIE_SLICES - 1).reduce((s, r) => s + Number(r[y] ?? 0), 0);
  return [...head, { [x]: "Other", [y]: rest, __other: true }];
}

// ---- main ----------------------------------------------------------------
export default function ChartView({ spec }: { spec: ChartSpec }) {
  const t = useTokens();
  const [view, setView] = useState<"chart" | "table">("chart");

  const { chart_type, x_key, x_label, y_label, title } = spec;
  const numericX = spec.data.every((r) => typeof r[x_key] === "number");
  const type = chart_type === "scatter" && !numericX ? "bar" : chart_type;
  const yKeys = type === "scatter" ? spec.y_keys.slice(0, 3) : type === "pie" ? spec.y_keys.slice(0, 1) : spec.y_keys;
  const many = spec.data.length > 6;
  const color = (i: number) => t.series[i % t.series.length];

  const body = useMemo(() => {
    const margin = { top: 8, right: 16, bottom: many ? 28 : 8, left: 0 };
    const xAxis = (
      <XAxis
        dataKey={x_key}
        {...axisProps(t)}
        interval={spec.data.length > 24 ? "preserveStartEnd" : 0}
        angle={many ? -30 : 0}
        textAnchor={many ? "end" : "middle"}
        height={many ? 60 : 30}
        tickFormatter={(v) => truncate(String(v), 16)}
        minTickGap={12}
      />
    );
    const yAxis = (
      <YAxis {...axisProps(t)} axisLine={false} width={52} tickFormatter={fmtCompact} />
    );
    const grid = <CartesianGrid vertical={false} stroke={t.grid} />;
    const tip = <Tooltip content={<ChartTooltip tokens={t} />} cursor={{ fill: t.grid, fillOpacity: 0.35, stroke: t.grid }} />;

    if (type === "bar") {
      return (
        <BarChart data={spec.data} margin={margin} barGap={2} barCategoryGap="22%">
          {grid}
          {xAxis}
          {yAxis}
          {tip}
          {yKeys.map((k, i) => (
            <Bar
              isAnimationActive={false}
              key={k}
              dataKey={k}
              name={k}
              fill={color(i)}
              stroke={t.surface}
              strokeWidth={2}
              radius={[4, 4, 0, 0]}
              maxBarSize={44}
            />
          ))}
        </BarChart>
      );
    }
    if (type === "line") {
      const dots = spec.data.length <= 24;
      return (
        <LineChart data={spec.data} margin={margin}>
          {grid}
          {xAxis}
          {yAxis}
          {tip}
          {yKeys.map((k, i) => (
            <Line
              isAnimationActive={false}
              key={k}
              type="linear"
              dataKey={k}
              name={k}
              stroke={color(i)}
              strokeWidth={2}
              dot={dots ? { r: 4, fill: color(i), stroke: t.surface, strokeWidth: 2 } : false}
              activeDot={{ r: 5, fill: color(i), stroke: t.surface, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      );
    }
    if (type === "area") {
      return (
        <AreaChart data={spec.data} margin={margin}>
          {grid}
          {xAxis}
          {yAxis}
          {tip}
          {yKeys.map((k, i) => (
            <Area
              isAnimationActive={false}
              key={k}
              type="linear"
              dataKey={k}
              name={k}
              stroke={color(i)}
              strokeWidth={2}
              fill={color(i)}
              fillOpacity={0.14}
              dot={false}
              activeDot={{ r: 5, fill: color(i), stroke: t.surface, strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      );
    }
    if (type === "scatter") {
      return (
        <ScatterChart margin={margin}>
          {grid}
          <XAxis type="number" dataKey={x_key} name={x_key} {...axisProps(t)} tickFormatter={fmtCompact} domain={["auto", "auto"]} />
          <YAxis type="number" {...axisProps(t)} axisLine={false} width={52} tickFormatter={fmtCompact} />
          <Tooltip content={<ChartTooltip tokens={t} />} cursor={{ stroke: t.grid, strokeDasharray: "3 3" }} />
          {yKeys.map((k, i) => (
            <Scatter isAnimationActive={false} key={k} name={k} data={spec.data} dataKey={k} fill={color(i)} stroke={t.surface} strokeWidth={2} />
          ))}
        </ScatterChart>
      );
    }
    // pie (donut)
    const y = yKeys[0];
    const slices = foldPie(spec.data, x_key, y);
    return (
      <PieChart>
        <Tooltip content={<ChartTooltip tokens={t} />} />
        <Pie data={slices} dataKey={y} nameKey={x_key} innerRadius="52%" outerRadius="88%" stroke={t.surface} strokeWidth={2} isAnimationActive={false}>
          {slices.map((s, i) => (
            <Cell key={i} fill={(s as { __other?: boolean }).__other ? t.other : color(i)} />
          ))}
        </Pie>
      </PieChart>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, t, type]);

  // legend: required for >= 2 series; pies always list their slices
  let legend: React.ReactNode = null;
  if (type === "pie") {
    const y = yKeys[0];
    const slices = foldPie(spec.data, x_key, y);
    const total = slices.reduce((s, r) => s + Number(r[y] ?? 0), 0) || 1;
    legend = (
      <Legend
        items={slices.map((s, i) => ({
          name: String(s[x_key]),
          color: (s as { __other?: boolean }).__other ? t.other : color(i),
          value: `${((Number(s[y] ?? 0) / total) * 100).toFixed(1)}%`,
        }))}
      />
    );
  } else if (yKeys.length >= 2) {
    legend = <Legend items={yKeys.map((k, i) => ({ name: k, color: color(i) }))} />;
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-[#fcfcfb] p-4 dark:border-slate-700 dark:bg-[#1a1a19]">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {type !== "pie" && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {y_label && `${y_label} · `}by {x_label}
            </p>
          )}
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-slate-200 text-xs dark:border-slate-700" role="tablist">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 capitalize ${
                view === v
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "chart" ? (
        <>
          {legend}
          <div className="h-[320px] w-full" role="img" aria-label={`${title}. ${spec.data.length} data points.`}>
            <ResponsiveContainer width="100%" height="100%">
              {body}
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <DataTable columns={[x_key, ...spec.y_keys]} rows={spec.data} initialRows={12} />
      )}
      {spec.truncated && <p className="mt-2 text-xs text-slate-500">Showing the first {spec.data.length} points.</p>}
    </div>
  );
}
