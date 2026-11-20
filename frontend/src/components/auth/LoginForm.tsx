"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FormMessage, SubmitButton, TextField, linkCls } from "./fields";
import { safeNext } from "./safeNext";

export default function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const expired = params.get("expired") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Please try again.");
      setBusy(false);
    }
  }

  const q = params.get("next") ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Log in to keep exploring your data.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <FormMessage error={error} notice={expired ? "Your session expired. Please log in again." : null} />
        <TextField label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} autoFocus />
        <div>
          <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
          <p className="mt-1.5 text-right text-xs">
            <Link href="/forgot-password" className={linkCls}>
              Forgot password?
            </Link>
          </p>
        </div>
        <SubmitButton busy={busy} busyLabel="Logging in…">
          Log in
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        New to Dataloom?{" "}
        <Link href={`/signup${q}`} className={linkCls}>
          Create an account
        </Link>
      </p>
    </div>
  );
}
