import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const PATHS = ["", "/features", "/how-it-works", "/pricing", "/security", "/docs", "/faq", "/about", "/contact", "/privacy", "/terms", "/login", "/signup"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.replace(/\/$/, "");
  return PATHS.map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.6,
  }));
}
