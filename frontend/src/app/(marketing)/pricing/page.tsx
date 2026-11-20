import type { Metadata } from "next";
import { Badge, ButtonLink, Check, PageHero, Section } from "@/components/marketing/ui";
import FaqList from "@/components/marketing/FaqList";
import { FAQS } from "@/components/marketing/faq-data";
import { PLANS, SIZE_TABLE, perQuestion, usd } from "@/lib/pricing";

const description =
  "Simple pricing by data size: Starter $3.66, Standard $9.13 and Pro $28.62 per month. Free during the open beta.";
export const metadata: Metadata = {
  title: "Pricing",
  description,
  openGraph: { title: "Pricing | Dataloom", description, url: "/pricing" },
};

const th = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
const td = "px-4 py-3 text-slate-700 dark:text-slate-300";

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Pricing by data size"
        lead="Pick the plan that fits your largest file. A question costs the same whether your file is 1 MB or 100 MB."
      />

      <Section labelledBy="plans">
        <h2 id="plans" className="sr-only">Plans</h2>
        <p role="note" className="mb-8 flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-slate-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-slate-200">
          <Badge>Open beta</Badge>
          <span>Everything is free during the beta. These prices apply when billing starts, and we will announce the date before anyone is charged.</span>
        </p>

        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.tagline}</p>
              <p className="mt-5 flex items-baseline gap-1 text-slate-900 dark:text-white">
                <span className="text-4xl font-bold">{usd(p.priceMonthly)}</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">per month</span>
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">About {perQuestion(p)} per question</p>
              <ul className="mt-6 flex-1 space-y-3 text-slate-700 dark:text-slate-300">
                <Check>{p.questions.toLocaleString()} questions per month</Check>
                <Check>Files up to {p.maxFileMb} MB ({p.approxRows})</Check>
                <Check>Store up to {p.datasets} datasets</Check>
                <Check>Charts, database imports and automatic cleaning included</Check>
                <Check>Datasets private to your account</Check>
              </ul>
              <ButtonLink href="/signup" size="lg" className="mt-8">Start free in the beta</ButtonLink>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
          Prices are in US dollars per month; taxes may apply. Need files over 100 MB or more than 1,000 questions a month?{" "}
          <a href="/contact" className="font-semibold text-blue-700 underline dark:text-blue-400">Contact us</a>.
        </p>
      </Section>

      <Section tone="subtle" labelledBy="by-size">
        <h2 id="by-size" className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">What your file size needs</h2>
        <p className="mt-3 max-w-3xl text-lg text-slate-700 dark:text-slate-300">
          Bigger files take longer to prepare and use more storage. They do not make questions cost more. Figures come from running Dataloom on test files; your timing will vary.
        </p>
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <caption className="sr-only">Plan needed by file size</caption>
            <thead>
              <tr>
                <th scope="col" className={th}>File size</th>
                <th scope="col" className={th}>Rows</th>
                <th scope="col" className={th}>Stored in your account</th>
                <th scope="col" className={th}>Preparing the file</th>
                <th scope="col" className={th}>Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {SIZE_TABLE.map((r) => (
                <tr key={r.upTo}>
                  <th scope="row" className={`${td} text-left font-semibold text-slate-900 dark:text-white`}>Up to {r.upTo}</th>
                  <td className={td}>{r.rows}</td>
                  <td className={td}>{r.stored}</td>
                  <td className={td}>{r.prep}</td>
                  <td className={td}>{r.plan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Stored size includes the file you uploaded plus the cleaned copy Dataloom analyses. Deleting a dataset removes both.
        </p>
      </Section>

      <Section labelledBy="compare">
        <h2 id="compare" className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Compare plans</h2>
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <caption className="sr-only">Plan comparison</caption>
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th scope="col" className={th}>&nbsp;</th>
                {PLANS.map((p) => <th key={p.id} scope="col" className={th}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                ["Price per month", (p: (typeof PLANS)[number]) => usd(p.priceMonthly)],
                ["Questions per month", (p: (typeof PLANS)[number]) => p.questions.toLocaleString()],
                ["Cost per question (about)", (p: (typeof PLANS)[number]) => perQuestion(p)],
                ["Largest file", (p: (typeof PLANS)[number]) => `${p.maxFileMb} MB`],
                ["Rows in the largest file", (p: (typeof PLANS)[number]) => p.approxRows],
                ["Datasets stored", (p: (typeof PLANS)[number]) => String(p.datasets)],
                ["Charts (bar, line, pie, area, scatter)", () => "Included"],
                ["Snowflake, PostgreSQL and MySQL imports", () => "Included"],
                ["Automatic cleaning", () => "Included"],
              ].map(([label, f]) => (
                <tr key={label as string}>
                  <th scope="row" className={`${td} text-left font-medium text-slate-900 dark:text-white`}>{label as string}</th>
                  {PLANS.map((p) => <td key={p.id} className={td}>{(f as (p: (typeof PLANS)[number]) => string)(p)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section tone="subtle" labelledBy="count">
        <h2 id="count" className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">How questions are counted</h2>
        <ul className="mt-6 max-w-3xl space-y-3 text-slate-700 dark:text-slate-300">
          <Check>One question is one message you send that gets an answer.</Check>
          <Check>Saying yes to a chart is part of the same question, so charts do not use up extra questions.</Check>
          <Check>Messages that fail with an error are not counted.</Check>
          <Check>Questions reset each month. Unused questions do not roll over.</Check>
          <Check>Database imports (Snowflake, PostgreSQL, MySQL) run on your own database, so any query charges there are billed by your provider, not by Dataloom.</Check>
        </ul>
      </Section>

      <Section labelledBy="pq">
        <h2 id="pq" className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Questions</h2>
        <div className="mt-8 max-w-3xl">
          <FaqList items={FAQS.filter((f) => ["What does it cost?", "What are the limits?", "Can I self-host Dataloom?"].includes(f.q))} />
        </div>
      </Section>
    </>
  );
}
