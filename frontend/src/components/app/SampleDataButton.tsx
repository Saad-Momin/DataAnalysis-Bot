"use client";

import { useState } from "react";
import { Spinner } from "@/components/auth/fields";
import { api, ApiError } from "@/lib/api";
import type { DatasetDetail } from "@/lib/types";

export default function SampleDataButton({ onCreated }: { onCreated: (d: DatasetDetail) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/sample-sales.csv");
      if (!res.ok) throw new Error("sample missing");
      const blob = await res.blob();
      const file = new File([blob], "sample-sales.csv", { type: "text/csv" });
      onCreated(await api.uploadFile(file));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the sample data. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={load}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy && <Spinner />}
        {busy ? "Loading sample data…" : "Try with sample data"}
      </button>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
