"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { safeNext } from "@/components/auth/safeNext";
import Logo from "@/components/Logo";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/auth";

const POINTS = [
  { title: "Clean automatically", body: "Upload CSV, Excel or SQL, or connect Postgres, MySQL or Snowflake. Messy columns and types are fixed for you." },
  { title: "Ask in plain English", body: "Type a question and get an answer with the exact numbers behind it, plus a note on how it was computed." },
  { title: "Charts on request", body: "Say \"yes\" or \"as a pie chart\" and get a bar, line, pie, area or scatter chart." },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Signed-in users have no business here: send them to ?next (if safe) or the app.
  useEffect(() => {
    if (!loading && user) {
      router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    }
  }, [loading, user, router]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <header>
          <Logo />
        </header>
        <main id="main" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {loading || user ? (
            <div role="status" aria-live="polite" className="space-y-4" aria-busy="true">
              <span className="sr-only">Loading…</span>
              <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : (
            children
          )}
        </main>
        <footer className="text-xs text-slate-500">
          <Link href="/terms" className="hover:underline">Terms</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/contact" className="hover:underline">Contact</Link>
        </footer>
      </div>

      <aside className="hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-12 text-white lg:flex lg:flex-col lg:justify-center" aria-label={`About ${BRAND.name}`}>
        <div className="mx-auto max-w-md">
          <p className="text-3xl font-semibold leading-tight tracking-tight">{BRAND.tagline}</p>
          <p className="mt-3 text-blue-100">{BRAND.description}</p>
          <ul className="mt-10 space-y-6">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs" aria-hidden="true">✓</span>
                <div>
                  <h2 className="font-medium">{p.title}</h2>
                  <p className="mt-0.5 text-sm text-blue-100">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-12 text-xs text-blue-200">Open beta. Your datasets are private to your account.</p>
        </div>
      </aside>
    </div>
  );
}
