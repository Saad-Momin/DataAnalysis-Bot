import Link from "next/link";
import type { ReactNode } from "react";

export const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function Section({
  children,
  id,
  tone = "plain",
  className = "",
  labelledBy,
}: {
  children: ReactNode;
  id?: string;
  tone?: "plain" | "subtle";
  className?: string;
  labelledBy?: string;
}) {
  const bg =
    tone === "subtle"
      ? "bg-slate-50 border-y border-slate-200 dark:bg-slate-900/50 dark:border-slate-800"
      : "";
  return (
    <section id={id} aria-labelledby={labelledBy} className={`py-16 sm:py-20 ${bg} ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">{children}</p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
  align = "left",
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  id?: string;
  align?: "left" | "center";
  as?: "h1" | "h2";
}) {
  const size = Tag === "h1" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl";
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Tag id={id} className={`${eyebrow ? "mt-3" : ""} ${size} font-bold tracking-tight text-slate-900 dark:text-white`}>
        {title}
      </Tag>
      {lead && <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">{lead}</p>}
    </div>
  );
}

/** Top-of-page header block for inner pages (contains the single h1). */
export function PageHero({ eyebrow, title, lead, children }: { eyebrow?: string; title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="border-b border-slate-200 bg-gradient-to-b from-blue-50/70 to-white dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
      <Container className="py-14 sm:py-20">
        <SectionHeading as="h1" eyebrow={eyebrow} title={title} lead={lead} />
        {children}
      </Container>
    </div>
  );
}

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "slate" | "amber" }) {
  const tones = {
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    amber: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  className?: string;
}) {
  const v = {
    primary: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
    secondary:
      "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
    ghost: "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  }[variant];
  const s = size === "lg" ? "px-6 py-3 text-base" : "px-4 py-2 text-sm";
  return (
    <Link href={href} className={`inline-flex items-center justify-center rounded-lg font-semibold transition-colors ${v} ${s} ${FOCUS} ${className}`}>
      {children}
    </Link>
  );
}

export function FeatureCard({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {icon && (
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">{children}</p>
    </div>
  );
}

export function CTA({
  title = "Try it on your own data",
  lead = "Dataloom is in open beta and free to use. Create an account, upload a file, and ask your first question.",
}: {
  title?: string;
  lead?: string;
}) {
  return (
    <section aria-labelledby="cta-title" className="py-16 sm:py-20">
      <Container>
        <div className="rounded-2xl bg-slate-900 px-6 py-12 text-center sm:px-12 dark:border dark:border-slate-800">
          <h2 id="cta-title" className="text-3xl font-bold tracking-tight text-white">
            {title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">{lead}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" size="lg" className="w-full sm:w-auto">
              Get started free
            </ButtonLink>
            <Link
              href="/login"
              className={`inline-flex w-full items-center justify-center rounded-lg border border-slate-600 px-6 py-3 text-base font-semibold text-white hover:bg-slate-800 sm:w-auto ${FOCUS}`}
            >
              Log in
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function DraftBanner() {
  return (
    <div role="note" className="mb-8 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
      Draft - have legal counsel review before launch.
    </div>
  );
}

/** Typography wrapper for long-form text pages. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4 leading-relaxed text-slate-700 dark:text-slate-300 [&_a]:font-medium [&_a]:text-blue-700 [&_a]:underline dark:[&_a]:text-blue-400 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-sm dark:[&_code]:bg-slate-800 [&_h2]:mt-10 [&_h2]:scroll-mt-24 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-white [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_strong]:text-slate-900 dark:[&_strong]:text-white">
      {children}
    </div>
  );
}

export function Check({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <svg className="mt-1 h-5 w-5 flex-none text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

export type IconName = "upload" | "sparkles" | "chart" | "db" | "shield" | "table" | "code" | "lock" | "chat" | "clock";

/** Simple stroke icons (24px grid). */
export function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    upload: "M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3",
    sparkles: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z",
    chart: "M4 20V10m6 10V4m6 16v-7m4 7H3",
    db: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
    shield: "M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z",
    table: "M4 5h16v14H4zM4 10h16M4 15h16M10 5v14",
    code: "M8 8l-4 4 4 4m8-8l4 4-4 4m-3-10l-2 12",
    lock: "M6 11V8a6 6 0 1112 0v3M5 11h14v9H5z",
    chat: "M4 5h16v11H9l-5 4V5z",
    clock: "M12 7v5l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z",
  };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
