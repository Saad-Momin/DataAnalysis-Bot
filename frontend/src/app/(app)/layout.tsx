"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import SessionWatcher from "@/components/app/SessionWatcher";
import UserMenu from "@/components/app/UserMenu";
import { consumeExitState } from "@/components/app/session";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Auth guard: signed-out visitors go to /login?next=<current path>.
  useEffect(() => {
    if (loading || user) return;
    const { intentionalExit, sessionExpired } = consumeExitState();
    if (intentionalExit) return; // logout / delete account navigate on their own
    const search = typeof window === "undefined" ? "" : window.location.search;
    const next = encodeURIComponent(pathname + search);
    router.replace(`/login?next=${next}${sessionExpired ? "&expired=1" : ""}`);
  }, [loading, user, pathname, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow dark:focus:bg-slate-900"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <Logo href="/app" />
          <nav aria-label="App" className="flex items-center gap-3 sm:gap-5">
            <Link href="/docs" className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              Docs
            </Link>
            {user && <UserMenu />}
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {loading || !user ? (
          <div role="status" aria-busy="true" className="mx-auto max-w-7xl space-y-4 p-4">
            <span className="sr-only">Loading your workspace…</span>
            <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        ) : (
          <>
            <SessionWatcher />
            {children}
          </>
        )}
      </main>
    </div>
  );
}
