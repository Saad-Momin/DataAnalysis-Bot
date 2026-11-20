"use client";

import { useCallback, useEffect, useState } from "react";
import Chat from "@/components/Chat";
import ConnectorForm from "@/components/ConnectorForm";
import DatasetPanel from "@/components/DatasetPanel";
import SampleDataButton from "@/components/app/SampleDataButton";
import UploadPanel from "@/components/UploadPanel";
import { api, ApiError } from "@/lib/api";
import type { DatasetDetail, DatasetSummary } from "@/lib/types";

const LAST_KEY = "dab:lastDataset";

function remember(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_KEY, id);
    else localStorage.removeItem(LAST_KEY);
  } catch {
    /* storage unavailable */
  }
}

export default function Workspace() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [current, setCurrent] = useState<DatasetDetail | null>(null);
  const [tab, setTab] = useState<"upload" | "connect">("upload");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setDatasets(await api.listDatasets());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load datasets.");
    }
  }, []);

  const select = useCallback(async (id: string) => {
    try {
      setCurrent(await api.getDataset(id));
      remember(id);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) remember(null);
      setError(e instanceof ApiError ? e.message : "Could not open that dataset.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      let last: string | null = null;
      try {
        last = localStorage.getItem(LAST_KEY);
      } catch {
        /* ignore */
      }
      if (last) await select(last);
      setLoading(false);
    })();
  }, [refresh, select]);

  function created(d: DatasetDetail) {
    setCurrent(d);
    remember(d.id);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this dataset and its cached data?")) return;
    try {
      await api.deleteDataset(id);
      if (current?.id === id) {
        setCurrent(null);
        remember(null);
      }
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete the dataset.");
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-64">
        <h1 className="mb-3 text-lg font-semibold">Datasets</h1>
        <button
          onClick={() => setCurrent(null)}
          className="mb-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New dataset
        </button>
        <ul className="space-y-1">
          {datasets.map((d) => (
            <li key={d.id} className="group flex items-center">
              <button
                onClick={() => select(d.id)}
                className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm ${
                  current?.id === d.id
                    ? "bg-slate-200 dark:bg-slate-800"
                    : "hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <span className="block truncate font-medium">{d.name}</span>
                <span className="block text-xs text-slate-500">
                  {d.rows.toLocaleString()} rows · {d.columns} cols
                </span>
              </button>
              <button
                onClick={() => remove(d.id)}
                aria-label={`Delete ${d.name}`}
                className="ml-1 rounded p-1 text-slate-400 hover:text-red-600 focus:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
              >
                ✕
              </button>
            </li>
          ))}
          {!loading && datasets.length === 0 && !error && (
            <li className="px-3 py-2 text-xs text-slate-500">No datasets yet. Add one to get started.</li>
          )}
        </ul>
      </aside>

      <main className="min-w-0 flex-1 space-y-4">
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : current ? (
          <>
            <DatasetPanel d={current} />
            <div className="h-[70vh] min-h-[480px]">
              <Chat key={current.id} dataset={current} />
            </div>
          </>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold">
              {datasets.length === 0 ? "Welcome to Dataloom. Let's look at some data." : "Add a dataset"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              We clean your data automatically, then you can ask questions in plain English and ask for charts.
            </p>
            {datasets.length === 0 && (
              <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40">
                <p className="text-sm font-medium">New here? Start with a sample.</p>
                <p className="mb-3 mt-1 text-sm text-slate-600 dark:text-slate-400">
                  200 made-up sales orders (date, region, product, units, revenue). Then try asking:
                  &ldquo;Which region has the highest revenue?&rdquo;
                </p>
                <SampleDataButton onCreated={created} />
              </div>
            )}
            <div className="mt-5 flex gap-1 border-b border-slate-200 dark:border-slate-800" role="tablist" aria-label="Data source">
              {([["upload", "Upload a file"], ["connect", "Connect a database"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  role="tab"
                  id={`tab-${k}`}
                  aria-selected={tab === k}
                  aria-controls="source-panel"
                  onClick={() => setTab(k)}
                  className={`-mb-px border-b-2 px-4 py-2 text-sm ${
                    tab === k ? "border-blue-600 font-medium text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-5" role="tabpanel" id="source-panel" aria-labelledby={`tab-${tab}`}>
              {tab === "upload" ? <UploadPanel onCreated={created} /> : <ConnectorForm onCreated={created} />}
            </div>
            {datasets.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="mb-2 text-sm text-slate-500">Or just explore with sample data:</p>
                <SampleDataButton onCreated={created} />
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
