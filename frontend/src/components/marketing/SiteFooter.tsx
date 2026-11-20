import Link from "next/link";
import Logo from "@/components/Logo";
import { BRAND } from "@/lib/brand";
import { FOCUS } from "./ui";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/security", label: "Security" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Documentation" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Sign up" },
      { href: "/app", label: "Open app" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_3fr]">
          <div>
            <Logo className={`rounded-md ${FOCUS}`} />
            <p className="mt-3 max-w-xs text-sm text-slate-600 dark:text-slate-400">{BRAND.tagline} Built with care for people who work with data.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{c.title}</h2>
                <ul className="mt-3 space-y-2">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={`rounded text-sm text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white ${FOCUS}`}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-slate-200 pt-6 text-sm text-slate-600 sm:flex-row sm:justify-between dark:border-slate-800 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} {BRAND.name}. Open beta.</p>
          <p>
            Questions? <a href={`mailto:${BRAND.supportEmail}`} className={`rounded underline ${FOCUS}`}>{BRAND.supportEmail}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
