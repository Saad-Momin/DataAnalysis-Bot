"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { FormMessage, PasswordRequirements, SubmitButton, TextField, linkCls, passwordValid } from "./fields";
import { safeNext } from "./safeNext";

interface FieldErrors {
  password?: string;
  agree?: string;
  email?: string;
}

export default function SignupForm() {
  const { signup } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const fe: FieldErrors = {};
    if (!passwordValid(password)) fe.password = "Password doesn't meet the requirements below.";
    if (!agree) fe.agree = "Please accept the Terms and Privacy Policy to continue.";
    setFieldErrors(fe);
    if (fe.password) {
      document.getElementById("signup-password")?.focus();
      return;
    }
    if (fe.agree) {
      document.getElementById("signup-agree")?.focus();
      return;
    }
    setBusy(true);
    try {
      await signup(name.trim(), email.trim(), password);
      router.replace(next);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not create your account. Please try again.";
      if (err instanceof ApiError && err.status === 409) {
        setFieldErrors({ email: msg });
        document.getElementById("signup-email")?.focus();
      } else setError(msg);
      setBusy(false);
    }
  }

  const q = params.get("next") ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Free during the open beta. No credit card.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <FormMessage error={error} />
        <TextField label="Name" autoComplete="name" value={name} onChange={setName} autoFocus maxLength={100} />
        <TextField
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            setFieldErrors((f) => ({ ...f, email: undefined }));
          }}
          error={fieldErrors.email}
        />
        <TextField
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            setFieldErrors((f) => (f.password ? { ...f, password: undefined } : f));
          }}
          error={fieldErrors.password}
          maxLength={128}
          hint={<PasswordRequirements password={password} />}
        />
        <div>
          <div className="flex items-start gap-2">
            <input
              id="signup-agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => {
                setAgree(e.target.checked);
                setFieldErrors((f) => ({ ...f, agree: undefined }));
              }}
              aria-invalid={fieldErrors.agree ? true : undefined}
              aria-describedby={fieldErrors.agree ? "signup-agree-err" : undefined}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            <label htmlFor="signup-agree" className="text-sm text-slate-600 dark:text-slate-400">
              I agree to the{" "}
              <Link href="/terms" target="_blank" className={linkCls}>
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className={linkCls}>
                Privacy Policy
              </Link>
              .
            </label>
          </div>
          {fieldErrors.agree && (
            <p id="signup-agree-err" className="mt-1 text-xs text-red-600 dark:text-red-400">
              {fieldErrors.agree}
            </p>
          )}
        </div>
        <SubmitButton busy={busy} busyLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{" "}
        <Link href={`/login${q}`} className={linkCls}>
          Log in
        </Link>
      </p>
    </div>
  );
}
