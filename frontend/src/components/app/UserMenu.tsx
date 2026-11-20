"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { markIntentionalExit } from "./session";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const items = () => Array.from(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) btn.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list[list.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  async function doLogout() {
    setOpen(false);
    markIntentionalExit();
    try {
      await logout();
    } finally {
      router.replace("/");
    }
  }

  const itemCls =
    "block w-full px-4 py-2 text-left text-sm hover:bg-slate-100 focus:bg-slate-100 focus:outline-none dark:hover:bg-slate-800 dark:focus:bg-slate-800";

  return (
    <div className="relative" ref={wrap} onKeyDown={onKeyDown}>
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-slate-800"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white" aria-hidden="true">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm sm:inline">{user.name || user.email}</span>
        <span className="sr-only sm:hidden">Account menu</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="text-slate-500">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-200 px-4 py-2 dark:border-slate-700" role="none">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <Link href="/app/settings" role="menuitem" className={itemCls} onClick={() => close(false)}>
            Settings
          </Link>
          <button type="button" role="menuitem" className={itemCls} onClick={doLogout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
