"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { ButtonLink, FOCUS } from "./ui";

export const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/docs", label: "Docs" },
];

export default function SiteHeader() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // close the menu on navigation
  useEffect(() => setOpen(false), [pathname]);

  // Escape closes the menu and returns focus to the toggle
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const linkCls = (href: string) =>
    `rounded-md px-3 py-2 text-sm font-medium ${FOCUS} ${
      pathname === href
        ? "text-blue-700 dark:text-blue-400"
        : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
    }`;

  const actions = loading ? null : user ? (
    <ButtonLink href="/app">Open app</ButtonLink>
  ) : (
    <>
      <ButtonLink href="/login" variant="ghost">
        Log in
      </ButtonLink>
      <ButtonLink href="/signup">Get started</ButtonLink>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo className={`rounded-md ${FOCUS}`} />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls(l.href)} aria-current={pathname === l.href ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">{actions}</div>

        <button
          ref={btnRef}
          type="button"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 md:hidden dark:text-slate-200 dark:hover:bg-slate-800 ${FOCUS}`}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div id="mobile-menu" hidden={!open} className="border-t border-slate-200 bg-white md:hidden dark:border-slate-800 dark:bg-slate-950">
        <nav aria-label="Mobile" className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`${linkCls(l.href)} py-3 text-base`} aria-current={pathname === l.href ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">{actions}</div>
        </nav>
      </div>
    </header>
  );
}
