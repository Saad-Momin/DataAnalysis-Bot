"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ConnectorPayload, ConnectorType, DatasetDetail } from "@/lib/types";

const LABELS: Record<ConnectorType, string> = {
  snowflake: "Snowflake",
  postgres: "PostgreSQL (incl. AWS RDS)",
  mysql: "MySQL (incl. AWS RDS)",
};

type FormCtx = {
  f: Record<string, string>;
  set: (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

function Field({
  form, k, label, type = "text", required = false, placeholder = "",
}: { form: FormCtx; k: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="text-xs text-slate-500">
      {label}
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={form.f[k] ?? ""}
        onChange={form.set(k)}
        autoComplete="off"
        className="field mt-1"
      />
    </label>
  );
}

export default function ConnectorForm({ onCreated }: { onCreated: (d: DatasetDetail) => void }) {
  const [type, setType] = useState<ConnectorType>("postgres");
  const [mode, setMode] = useState<"table" | "query">("table");
  const [f, setF] = useState<Record<string, string>>({ max_rows: "100000" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));
  const snow = type === "snowflake";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = (k: string) => f[k]?.trim() || undefined;
    const payload: ConnectorPayload = {
      type,
      name: v("name"),
      username: f.username ?? "",
      password: f.password ?? "",
      database: v("database"),
      schema: v("schema"),
      max_rows: Number(f.max_rows) || 100000,
      ...(snow
        ? { account: v("account"), warehouse: v("warehouse"), role: v("role") }
        : { host: v("host"), port: v("port") ? Number(f.port) : undefined }),
      ...(mode === "table" ? { table: v("table") } : { query: v("query") }),
    };
    setBusy(true);
    try {
      onCreated(await api.importRemote(payload));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const form = { f, set };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-xs text-slate-500">
        Database type
        <select value={type} onChange={(e) => setType(e.target.value as ConnectorType)} className="field mt-1">
          {(Object.keys(LABELS) as ConnectorType[]).map((k) => (
            <option key={k} value={k}>
              {LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {snow ? (
          <>
            <Field form={form} k="account" label="Account identifier" required placeholder="xy12345.us-east-1" />
            <Field form={form} k="warehouse" label="Warehouse" />
            <Field form={form} k="role" label="Role (optional)" />
          </>
        ) : (
          <>
            <Field form={form} k="host" label="Host" required placeholder="mydb.abc123.us-east-1.rds.amazonaws.com" />
            <Field form={form} k="port" label="Port (optional)" type="number" placeholder={type === "postgres" ? "5432" : "3306"} />
          </>
        )}
        <Field form={form} k="database" label="Database" required={!snow} />
        <Field form={form} k="schema" label="Schema (optional)" />
        <Field form={form} k="username" label="Username" required />
        <Field form={form} k="password" label="Password" type="password" required />
      </div>

      <div>
        <div className="mb-2 flex gap-4 text-sm">
          {(["table", "query"] as const).map((m) => (
            <label key={m} className="flex items-center gap-1.5">
              <input type="radio" checked={mode === m} onChange={() => setMode(m)} />
              {m === "table" ? "Import a table" : "Run a SELECT query"}
            </label>
          ))}
        </div>
        {mode === "table" ? (
          <Field form={form} k="table" label="Table name" required />
        ) : (
          <label className="block text-xs text-slate-500">
            SELECT query (read-only, single statement)
            <textarea required rows={4} value={f.query ?? ""} onChange={set("query")} className="field mt-1 font-mono" placeholder="SELECT * FROM orders WHERE created_at > '2024-01-01'" />
          </label>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field form={form} k="name" label="Dataset name (optional)" />
        <Field form={form} k="max_rows" label="Max rows" type="number" />
      </div>

      <p className="text-xs text-slate-500">Credentials are used for this import only and are never stored.</p>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}

      <button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {busy ? "Connecting and cleaning…" : "Connect and import"}
      </button>
    </form>
  );
}
