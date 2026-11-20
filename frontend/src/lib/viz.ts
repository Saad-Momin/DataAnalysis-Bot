"use client";

import { useEffect, useState } from "react";

import { SERIES_DARK, SERIES_LIGHT } from "./palette";

export interface Tokens {
  series: string[];
  surface: string;
  grid: string;
  textPrimary: string;
  textSecondary: string;
  other: string;
}

export const LIGHT: Tokens = {
  series: SERIES_LIGHT,
  surface: "#fcfcfb",
  grid: "#e7e6e2",
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  other: "#9a9a94",
};
export const DARK: Tokens = {
  series: SERIES_DARK,
  surface: "#1a1a19",
  grid: "#33322f",
  textPrimary: "#f0efec",
  textSecondary: "#c3c2b7",
  other: "#7d7c75",
};

export function useTokens(): Tokens {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return dark ? DARK : LIGHT;
}

const full = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

export function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return full.format(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

export function fmtCompact(v: unknown): string {
  return typeof v === "number" ? compact.format(v) : String(v);
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
