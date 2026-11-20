"use client";

import { useId, useState } from "react";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  error?: string | null;
  hint?: React.ReactNode;
  autoFocus?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  maxLength?: number;
}

export function TextField({
  label, value, onChange, type = "text", autoComplete, error, hint, autoFocus, required = true, disabled, readOnly, id, maxLength,
}: FieldProps) {
  const auto = useId();
  const fid = id ?? auto;
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  const describedBy = [error ? `${fid}-err` : null, hint ? `${fid}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={fid} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={fid}
          name={fid}
          className={`field ${isPw ? "pr-16" : ""} ${error ? "!border-red-500" : ""} ${readOnly ? "cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-slate-900" : ""}`}
          type={isPw && show ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          spellCheck={false}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-pressed={show}
            aria-label="Show password"
            className="absolute inset-y-0 right-0 rounded-r-lg px-3 text-xs font-medium text-slate-500 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:text-slate-100"
          >
            {show ? "Hide" : "Show"}
          </button>
        )}
      </div>
      {error && (
        <p id={`${fid}-err`} className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {hint && (
        <div id={`${fid}-hint`} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </div>
      )}
    </div>
  );
}

/** Always-mounted live region so screen readers announce errors/notices as they appear. */
export function FormMessage({ error, notice }: { error?: string | null; notice?: string | null }) {
  return (
    <div aria-live="polite" className="empty:hidden">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}
      {!error && notice && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{notice}</p>
      )}
    </div>
  );
}

export function SubmitButton({
  busy, children, busyLabel, disabled, variant = "primary",
}: { busy: boolean; children: React.ReactNode; busyLabel?: string; disabled?: boolean; variant?: "primary" | "danger" }) {
  const color = variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700";
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${color}`}
    >
      {busy && <Spinner />}
      {busy ? busyLabel ?? "Please wait…" : children}
    </button>
  );
}

export const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "At least one letter", test: (p) => /[A-Za-z]/.test(p) },
  { label: "At least one number", test: (p) => /\d/.test(p) },
];

export function passwordValid(p: string): boolean {
  return p.length <= 128 && PASSWORD_RULES.every((r) => r.test(p));
}

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="space-y-0.5" aria-label="Password requirements">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.label} className={ok ? "text-green-700 dark:text-green-400" : ""}>
            <span aria-hidden="true">{ok ? "✓" : "○"} </span>
            {r.label}
            <span className="sr-only">{ok ? " (met)" : " (not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}

export const linkCls =
  "font-medium text-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-400";
