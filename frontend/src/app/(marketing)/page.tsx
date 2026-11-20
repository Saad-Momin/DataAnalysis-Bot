import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import ProductMock from "@/components/marketing/ProductMock";
import FaqList from "@/components/marketing/FaqList";
import { FAQS } from "@/components/marketing/faq-data";
import { PLANS, perQuestion, usd } from "@/lib/pricing";
import { Badge, ButtonLink, Container, CTA, FeatureCard, Icon, Section, SectionHeading, FOCUS } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name} - ${BRAND.tagline}` },
  description: BRAND.description,
  openGraph: { title: `${BRAND.name} - ${BRAND.tagline}`, description: BRAND.description, url: "/" },
};

const STEPS = [
  { n: "1", title: "Add your data", body: "Upload a CSV, Excel or SQL file, or connect Snowflake, PostgreSQL or MySQL." },
  { n: "2", title: "We clean it", body: "Column names, types, duplicates and missing values are fixed on import. You see what changed." },
  { n: "3", title: "Ask in plain English", body: "Get an answer with the steps behind it. Say yes to get a chart." },
];

const USE_CASES = [
  { title: "Analysts", body: "Skip the first hour of every project. Get a clean table and quick answers, then check the computed steps before you use a number." },
  { title: "Founders", body: "Export from your billing tool or database and ask about revenue by month, top customers or churned accounts without writing a query." },
  { title: "Operations", body: "Drop in a spreadsheet of orders, tickets or shifts and find the slow regions, late items or busiest days." },
];

export default function HomePage() {
  return (
    <>
      <div className="overflow-hidden bg-gradient-to-b from-blue-50/80 to-white dark:from-slate-900 dark:to-slate-950">
        <Container className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <Badge>Open beta - free to use</Badge>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">{BRAND.tagline}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Upload a file or connect your database. {BRAND.name} cleans your data automatically, answers questions in plain English, and draws charts when you ask.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg">Get started free</ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary" size="lg">See how it works</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              No card needed. Already have an account?{" "}
              <Link href="/login" className={`rounded font-medium text-blue-700 underline dark:text-blue-400 ${FOCUS}`}>Log in</Link>
            </p>
          </div>
          <ProductMock />
        </Container>
      </div>

      <Section labelledBy="how-title">
        <SectionHeading id="how-title" eyebrow="How it works" title="From file to answer in three steps" />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-slate-200 p-6 dark:border-slate-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white" aria-hidden="true">{s.n}</span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white"><span className="sr-only">Step {s.n}: </span>{s.title}</h3>
              <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="subtle" labelledBy="features-title">
        <SectionHeading id="features-title" eyebrow="Features" title="What is in the beta" lead="Everything below works today." />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Icon name="upload" />} title="Files and databases">CSV, Excel and SQL uploads up to 100 MB, plus Snowflake, PostgreSQL and MySQL imports.</FeatureCard>
          <FeatureCard icon={<Icon name="sparkles" />} title="Automatic cleaning">Names, types, duplicates and gaps are handled on import, using rules we list in the docs.</FeatureCard>
          <FeatureCard icon={<Icon name="chat" />} title="Plain-English questions">Ask follow-ups in the same conversation. Dataloom remembers what you were looking at.</FeatureCard>
          <FeatureCard icon={<Icon name="chart" />} title="Charts on request">Bar, line, pie, area and scatter charts, offered after an answer and drawn when you say yes.</FeatureCard>
          <FeatureCard icon={<Icon name="code" />} title="Show your work">Every answer includes how it was computed, so you can check it.</FeatureCard>
          <FeatureCard icon={<Icon name="lock" />} title="Private by account">Your datasets are visible only to your account and are deleted when you delete them.</FeatureCard>
        </div>
        <p className="mt-8"><Link href="/features" className={`rounded font-semibold text-blue-700 underline dark:text-blue-400 ${FOCUS}`}>See all features</Link></p>
      </Section>

      <Section labelledBy="use-title">
        <SectionHeading id="use-title" eyebrow="Use cases" title="Built for people who need answers, not queries" />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {USE_CASES.map((u) => (
            <div key={u.title} className="border-l-4 border-blue-600 pl-5">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{u.title}</h3>
              <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">{u.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="subtle" labelledBy="sec-title">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              id="sec-title"
              eyebrow="Security"
              title="Clear about what happens to your data"
              lead="Generated code is validated and run in an isolated process. Database credentials are used once and not stored. Your datasets are private to your account."
            />
            <p className="mt-4 max-w-3xl leading-relaxed text-slate-600 dark:text-slate-300">
              To write answers, we send your dataset&apos;s schema, column names, a few sample values and aggregated results to Google&apos;s Gemini API. Full raw tables are not sent. We also do not have SOC 2 or SSO yet.
            </p>
            <p className="mt-6"><ButtonLink href="/security" variant="secondary">Read the security details</ButtonLink></p>
          </div>
          <ul className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <li>AST allow-list check on generated code</li>
            <li>30-second timeout in an isolated subprocess</li>
            <li>Read-only SELECT/WITH imports only</li>
            <li>Passwords hashed, httpOnly session cookies</li>
            <li>Deleting a dataset or account removes its files</li>
          </ul>
        </div>
      </Section>

      <Section tone="subtle" labelledBy="price-title">
        <SectionHeading id="price-title" eyebrow="Pricing" title="Priced by the size of your data" lead="Free during the open beta. When billing starts, pick the plan that fits your largest file." />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h3>
              <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{usd(p.priceMonthly)}<span className="ml-1 text-sm font-normal text-slate-600 dark:text-slate-400">per month</span></p>
              <p className="mt-3 text-slate-700 dark:text-slate-300">Files up to {p.maxFileMb} MB, {p.questions.toLocaleString()} questions a month (about {perQuestion(p)} each).</p>
            </div>
          ))}
        </div>
        <p className="mt-8"><Link href="/pricing" className={`rounded font-semibold text-blue-700 underline dark:text-blue-400 ${FOCUS}`}>See pricing by data size</Link></p>
      </Section>

      <Section labelledBy="faq-title">
        <SectionHeading id="faq-title" eyebrow="FAQ" title="Common questions" />
        <div className="mt-10 max-w-3xl"><FaqList items={FAQS.slice(0, 4)} /></div>
        <p className="mt-6"><Link href="/faq" className={`rounded font-semibold text-blue-700 underline dark:text-blue-400 ${FOCUS}`}>Read all questions</Link></p>
      </Section>

      <CTA />
    </>
  );
}
