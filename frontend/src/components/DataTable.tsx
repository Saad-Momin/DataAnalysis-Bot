"use client";

import { useState } from "react";
import { fmtValue } from "@/lib/viz";

interface Props {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows?: number;
  initialRows?: number;
}

export default function DataTable({ columns, rows, totalRows, initialRows = 8 }: Props) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, initialRows);
  const total = totalRows ?? rows.length;

  return (
    <div className="mt-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              {columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {shown.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td
                    key={c}
                    className={`whitespace-nowrap px-3 py-1.5 ${
                      typeof r[c] === "number" ? "text-right tabular-nums" : ""
                    }`}
                  >
                    {fmtValue(r[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>
          {rows.length < total ? `Showing ${shown.length} of ${total} rows` : `${total} row${total === 1 ? "" : "s"}`}
        </span>
        {rows.length > initialRows && (
          <button className="text-blue-600 hover:underline dark:text-blue-400" onClick={() => setAll((v) => !v)}>
            {all ? "Show fewer" : `Show all ${rows.length}`}
          </button>
        )}
      </div>
    </div>
  );
}
