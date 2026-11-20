"use client";

import type { DatasetDetail } from "@/lib/types";
import { fmtValue } from "@/lib/viz";

export default function DatasetPanel({ d }: { d: DatasetDetail }) {
  const r = d.cleaning_report;
  const filled = Object.entries(r.missing_filled);
  const dates = Object.entries(d.feature_report.date_features);
  const cats = Object.keys(d.feature_report.categorical_columns);

  const notes: string[] = [];
  if (r.rows_before !== r.rows_after) notes.push(`${r.rows_before - r.rows_after} empty or duplicate rows removed`);
  if (r.duplicates_removed) notes.push(`${r.duplicates_removed} duplicate row${r.duplicates_removed === 1 ? "" : "s"}`);
  if (filled.length) notes.push(`missing values filled in ${filled.length} column${filled.length === 1 ? "" : "s"}`);
  if (r.dropped_columns_mostly_missing.length) notes.push(`dropped mostly-empty columns: ${r.dropped_columns_mostly_missing.join(", ")}`);
  if (dates.length) notes.push(`date parts added for ${dates.map(([c]) => c).join(", ")}`);
  if (cats.length) notes.push(`${cats.length} text column${cats.length === 1 ? "" : "s"} encoded as categories`);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{d.name}</h2>
        <p className="text-xs text-slate-500">
          {d.rows.toLocaleString()} rows × {d.columns} columns · {d.source}
        </p>
      </div>
      {notes.length > 0 && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Auto-cleaned: {notes.join(" · ")}.</p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer select-none text-sm text-blue-600 dark:text-blue-400">Columns and data quality</summary>
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                {["Column", "Type", "Unique", "Missing", "Sample"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {d.profile.map((c) => (
                <tr key={c.name}>
                  <td className="px-3 py-1.5 font-medium">{c.name}</td>
                  <td className="px-3 py-1.5 text-slate-500">{c.dtype}</td>
                  <td className="px-3 py-1.5 tabular-nums">{c.unique_count}</td>
                  <td className="px-3 py-1.5 tabular-nums">{c.null_count}</td>
                  <td className="max-w-[18rem] truncate px-3 py-1.5 text-slate-500">{c.sample.map(fmtValue).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
