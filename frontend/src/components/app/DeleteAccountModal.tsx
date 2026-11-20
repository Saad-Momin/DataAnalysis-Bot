"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormMessage, SubmitButton, TextField } from "@/components/auth/fields";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { markIntentionalExit } from "./session";

export default function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { setUser } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab" && box.current) {
        const f = box.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])");
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [busy, onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount(password);
      markIntentionalExit();
      setUser(null);
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete your account. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="del-title"
        aria-describedby="del-desc"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
      >
        <h2 id="del-title" className="text-lg font-semibold">
          Delete your account?
        </h2>
        <p id="del-desc" className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          This permanently deletes your account and all your datasets, including cleaned data and uploaded files. This can&apos;t be undone.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <FormMessage error={error} />
          <TextField label="Confirm with your password" type="password" autoComplete="current-password" value={password} onChange={setPassword} autoFocus />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <div className="sm:w-48">
              <SubmitButton busy={busy} busyLabel="Deleting…" variant="danger" disabled={!password}>
                Delete my account
              </SubmitButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
