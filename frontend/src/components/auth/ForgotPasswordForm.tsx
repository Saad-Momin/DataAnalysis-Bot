"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { FormMessage, SubmitButton, TextField, linkCls } from "./fields";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ devUrl?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const r = await api.forgotPassword(email.trim());
      setDone({ devUrl: r.dev_reset_url });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Enter your account email and we&apos;ll send you a link to choose a new password.
      </p>
      {done ? (
        <div className="mt-6 space-y-4" role="status">
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            If an account exists for that email, a reset link is on its way. The link expires in 1 hour.
          </p>
          {done.devUrl && (
            <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3 text-sm dark:border-amber-600 dark:bg-amber-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Dev only</p>
              <p className="mt-1 text-slate-700 dark:text-slate-300">
                Email delivery isn&apos;t configured in development. Use this link:
              </p>
              <a href={done.devUrl} className={`${linkCls} mt-1 block break-all`}>
                {done.devUrl}
              </a>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <FormMessage error={error} />
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} autoFocus />
          <SubmitButton busy={busy} busyLabel="Sending…">
            Send reset link
          </SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className={linkCls}>
          Back to log in
        </Link>
      </p>
    </div>
  );
}
