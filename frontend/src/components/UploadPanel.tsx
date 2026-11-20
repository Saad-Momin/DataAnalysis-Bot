"use client";

import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { DatasetDetail } from "@/lib/types";

const EXTS = [".csv", ".xlsx", ".sql"];

export default function UploadPanel({ onCreated }: { onCreated: (d: DatasetDetail) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState("");
  const [table, setTable] = useState("");

  async function handle(file: File | undefined) {
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!EXTS.includes(ext)) {
      setError(`Unsupported file type. Please upload ${EXTS.join(", ")}.`);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      onCreated(await api.uploadFile(file, { sheet: sheet.trim() || undefined, table: table.trim() || undefined }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center rounded-xl border-2 border-dashed p-10 text-center transition ${
          drag ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-slate-300 dark:border-slate-700"
        }`}
      >
        <p className="text-sm font-medium">{busy ? "Uploading and cleaning your data…" : "Drag and drop a file here"}</p>
        <p className="mt-1 text-xs text-slate-500">CSV, Excel (.xlsx) or SQL dump · up to 100 MB</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Choose file
        </button>
        <input ref={inputRef} type="file" accept={EXTS.join(",")} hidden onChange={(e) => handle(e.target.files?.[0])} />
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-slate-500">Advanced options</summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-500">
            Excel sheet name (default: first)
            <input value={sheet} onChange={(e) => setSheet(e.target.value)} className="field mt-1" />
          </label>
          <label className="text-xs text-slate-500">
            SQL dump: table to load (default: largest)
            <input value={table} onChange={(e) => setTable(e.target.value)} className="field mt-1" />
          </label>
        </div>
      </details>

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
    </div>
  );
}
