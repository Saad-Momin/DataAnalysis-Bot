"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { FormMessage, PasswordRequirements, SubmitButton, TextField, linkCls, passwordValid } from "./fields";

interface FieldErrors {
  password?: string;
  confirm?: string;
}

export default function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reset link is missing</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This page needs a valid reset link. Request a new one and try again.
        </p>
        <p className="mt-6">
          <Link href="/forgot-password" className={linkCls}>
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div role="status">
        <h1 className="text-2xl font-semibold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">You can now log in with your new password.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Go to log in
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !token) return;
    setError(null);
    const fe: FieldErrors = {};
    if (!passwordValid(password)) fe.password = "Password doesn't meet the requirements below.";
    else if (password !== confirm) fe.confirm = "Passwords don't match.";
    setFieldError(fe);
    if (fe.password) {
      document.getElementById("reset-password")?.focus();
      return;
    }
    if (fe.confirm) {
      document.getElementById("reset-confirm")?.focus();
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "This reset link is invalid or has expired. Please request a new one."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <FormMessage error={error} />
        {error && (
          <p className="text-sm">
            <Link href="/forgot-password" className={linkCls}>
              Request a new link
            </Link>
          </p>
        )}
        <TextField
          id="reset-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          autoFocus
          error={fieldError.password}
          maxLength={128}
          hint={<PasswordRequirements password={password} />}
        />
        <TextField
          id="reset-confirm"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={fieldError.confirm}
          maxLength={128}
        />
        <SubmitButton busy={busy} busyLabel="Updating…">
          Update password
        </SubmitButton>
      </form>
    </div>
  );
}
