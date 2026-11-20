"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ChartSpec, DatasetDetail, TableResult } from "@/lib/types";
import ChartView from "./ChartView";
import DataTable from "./DataTable";

interface Msg {
  id: number;
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
  retry?: string;
  table?: TableResult | null;
  chart?: ChartSpec | null;
  code?: string | null;
  offer?: boolean;
}

function suggestions(d: DatasetDetail): string[] {
  const num = d.profile.filter((c) => /int|float/.test(c.dtype) && !/_(year|month|quarter)$/.test(c.name) && !/(^|_)id$/.test(c.name));
  const cat = d.profile.filter((c) => /category|object|str/.test(c.dtype) && c.unique_count > 1 && c.unique_count <= 30);
  const out = ["Give me a quick overview of this dataset"];
  if (num[0]) out.push(`What is the average ${num[0].name.replace(/_/g, " ")}?`);
  if (cat[0] && num[0]) out.push(`Which ${cat[0].name.replace(/_/g, " ")} has the highest total ${num[0].name.replace(/_/g, " ")}?`);
  const date = d.profile.find((c) => c.dtype.startsWith("datetime"));
  if (date && num[0]) out.push(`How does ${num[0].name.replace(/_/g, " ")} change over time?`);
  return out.slice(0, 4);
}

export default function Chat({ dataset }: { dataset: DatasetDetail }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const convRef = useRef<string | null>(null);
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hints = useMemo(() => suggestions(dataset), [dataset]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, loading]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    setInput("");
    setMsgs((m) => [
      ...m.map((x) => ({ ...x, offer: false, retry: undefined })), // only the latest offer/retry stays actionable
      { id: nextId.current++, role: "user", text: t },
    ]);
    setLoading(true);
    try {
      const r = await api.chat(dataset.id, t, convRef.current);
      convRef.current = r.conversation_id;
      setMsgs((m) => [
        ...m,
        {
          id: nextId.current++,
          role: "assistant",
          text: r.message,
          isError: r.kind === "error",
          table: r.table,
          chart: r.chart,
          code: r.code,
          offer: r.offer_visualization,
        },
      ]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Something went wrong. Please try again.";
      setMsgs((m) => [...m, { id: nextId.current++, role: "assistant", text: msg, isError: true, retry: t }]);
    } finally {
      setLoading(false);
    }
  }

  const lastId = msgs.length ? msgs[msgs.length - 1].id : -1;

  return (
    <div className="flex h-full min-h-[480px] flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {msgs.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Ask anything about <span className="font-medium">{dataset.name}</span> in plain English.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {hints.map((h) => (
                <button
                  key={h}
                  onClick={() => send(h)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[92%] ${m.chart || m.table ? "w-full" : ""} rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-blue-600 text-white"
                  : m.isError
                    ? "border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
                    : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.table && m.table.rows.length > 0 && (
                <DataTable columns={m.table.columns} rows={m.table.rows} totalRows={m.table.total_rows} />
              )}
              {m.chart && <ChartView spec={m.chart} />}
              {m.code && (
                <details className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <summary className="cursor-pointer select-none">How this was computed</summary>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-slate-900 p-2 text-slate-100">{m.code}</pre>
                </details>
              )}
              {m.id === lastId && m.offer && !loading && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => send("Yes, show a chart")} className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700">
                    Yes, show chart
                  </button>
                  {["bar", "line", "pie"].map((c) => (
                    <button
                      key={c}
                      onClick={() => send(`Yes, as a ${c} chart`)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:bg-white dark:border-slate-600 dark:hover:bg-slate-700"
                    >
                      {c[0].toUpperCase() + c.slice(1)}
                    </button>
                  ))}
                  <button onClick={() => send("No thanks")} className="rounded-full px-3 py-1 text-xs text-slate-500 hover:underline">
                    No thanks
                  </button>
                </div>
              )}
              {m.id === lastId && m.retry && !loading && (
                <button onClick={() => send(m.retry!)} className="mt-2 text-xs font-medium underline">
                  Try again
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <span className="inline-flex gap-1 align-middle">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
              <span className="ml-2">Analyzing your data… this can take 10–20 seconds</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder="Ask a question about your data…"
          aria-label="Your question"
          className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
