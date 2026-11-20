"use client";

import { useState } from "react";
import { FormMessage, PasswordRequirements, SubmitButton, TextField, passwordValid } from "@/components/auth/fields";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import DeleteAccountModal from "./DeleteAccountModal";

const card = "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6";

function Success({ children }: { children: React.ReactNode }) {
  return (
    <div aria-live="polite" className="empty:hidden">
      {children && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          {children}
        </p>
      )}
    </div>
  );
}

function ProfileCard() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      setUser(await api.updateProfile(name.trim()));
      setOk("Profile updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update your profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={card} aria-labelledby="profile-h">
      <h2 id="profile-h" className="text-lg font-semibold">
        Profile
      </h2>
      <form onSubmit={submit} className="mt-4 max-w-md space-y-4">
        <FormMessage error={error} />
        <Success>{ok}</Success>
        <TextField label="Name" autoComplete="name" value={name} onChange={setName} maxLength={100} />
        <TextField label="Email" type="email" value={user?.email ?? ""} onChange={() => undefined} readOnly hint="Your email can't be changed yet." />
        <div className="sm:w-40">
          <SubmitButton busy={busy} busyLabel="Saving…" disabled={!name.trim() || name.trim() === user?.name}>
            Save changes
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [fe, setFe] = useState<{ next?: string; confirm?: string }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setOk(null);
    const errs: typeof fe = {};
    if (!passwordValid(next)) errs.next = "Password doesn't meet the requirements below.";
    else if (next !== confirm) errs.confirm = "Passwords don't match.";
    setFe(errs);
    if (errs.next) return void document.getElementById("pw-new")?.focus();
    if (errs.confirm) return void document.getElementById("pw-confirm")?.focus();
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setOk("Password changed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={card} aria-labelledby="pw-h">
      <h2 id="pw-h" className="text-lg font-semibold">
        Change password
      </h2>
      <form onSubmit={submit} className="mt-4 max-w-md space-y-4">
        <FormMessage error={error} />
        <Success>{ok}</Success>
        <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={setCurrent} />
        <TextField id="pw-new" label="New password" type="password" autoComplete="new-password" value={next} onChange={setNext} error={fe.next} maxLength={128} hint={<PasswordRequirements password={next} />} />
        <TextField id="pw-confirm" label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} error={fe.confirm} maxLength={128} />
        <div className="sm:w-48">
          <SubmitButton busy={busy} busyLabel="Updating…">
            Update password
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}

export default function SettingsPanels() {
  const [modal, setModal] = useState(false);
  return (
    <div className="space-y-6">
      <ProfileCard />
      <PasswordCard />
      <section className={card} aria-labelledby="data-h">
        <h2 id="data-h" className="text-lg font-semibold">
          Your data
        </h2>
        <p className="mt-2 max-w-prose text-sm text-slate-600 dark:text-slate-400">
          Your datasets are private to your account: no other user can see or query them. Deleting a dataset removes its files, and deleting your
          account removes everything you uploaded or imported.
        </p>
      </section>
      <section className="rounded-xl border border-red-300 bg-white p-5 dark:border-red-900 dark:bg-slate-900 sm:p-6" aria-labelledby="danger-h">
        <h2 id="danger-h" className="text-lg font-semibold text-red-700 dark:text-red-400">
          Danger zone
        </h2>
        <p className="mt-2 max-w-prose text-sm text-slate-600 dark:text-slate-400">
          Permanently delete your account and all your datasets. This can&apos;t be undone.
        </p>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="mt-4 rounded-lg border border-red-600 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 dark:text-red-400 dark:hover:bg-red-950"
        >
          Delete account…
        </button>
      </section>
      {modal && <DeleteAccountModal onClose={() => setModal(false)} />}
    </div>
  );
}
