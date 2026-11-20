import type { Metadata } from "next";
import { DonutMock } from "@/components/marketing/ProductMock";
import { CTA, FeatureCard, Icon, PageHero, Section, SectionHeading } from "@/components/marketing/ui";

const description = "Upload files or connect a database, get automatic cleaning, ask questions in plain English and draw charts on request.";
export const metadata: Metadata = {
  title: "Features",
  description,
  openGraph: { title: "Features | Dataloom", description, url: "/features" },
};

export default function FeaturesPage() {
  return (
    <>
      <PageHero eyebrow="Features" title="What Dataloom does" lead="A short list, all of it available in the open beta." />

      <Section labelledBy="f-data">
        <SectionHeading id="f-data" title="Bring your data" />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <FeatureCard icon={<Icon name="upload" />} title="File uploads">CSV, Excel (.xlsx) and SQL dump files up to 100 MB. For workbooks with several sheets, and SQL files with several tables, you choose which one to load.</FeatureCard>
          <FeatureCard icon={<Icon name="db" />} title="Database connections">Import from Snowflake, PostgreSQL or MySQL, including hosted ones such as Amazon RDS. Only read-only single SELECT or WITH statements are accepted, up to 1 million rows.</FeatureCard>
        </div>
      </Section>

      <Section tone="subtle" labelledBy="f-clean">
        <SectionHeading id="f-clean" title="Automatic cleaning" lead="Real files are messy. On import, Dataloom applies the same documented steps every time." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <FeatureCard icon={<Icon name="table" />} title="Tidy structure">Column names are normalized, whitespace is trimmed, duplicate rows are removed, and columns that are more than 60% empty are dropped.</FeatureCard>
          <FeatureCard icon={<Icon name="sparkles" />} title="Type inference">Text that looks like numbers, booleans or dates is converted. Null-like tokens such as &quot;N/A&quot; become empty values.</FeatureCard>
          <FeatureCard icon={<Icon name="clock" />} title="Gaps and dates">Missing values are filled with the median or &quot;Unknown&quot;. Date columns get year, month, quarter and weekday fields.</FeatureCard>
        </div>
      </Section>

      <Section labelledBy="f-ask">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading id="f-ask" title="Ask, then check" lead="Type a question the way you would ask a colleague. Dataloom writes and runs the analysis on your data and replies in plain language." />
            <ul className="mt-6 space-y-3 text-slate-700 dark:text-slate-300">
              <li><strong className="text-slate-900 dark:text-white">Follow-ups.</strong> The conversation keeps context, so &quot;and by quarter?&quot; works.</li>
              <li><strong className="text-slate-900 dark:text-white">How this was computed.</strong> Each answer shows its steps so you can verify the result.</li>
              <li><strong className="text-slate-900 dark:text-white">Charts on request.</strong> Bar, line, pie, area and scatter. Reply &quot;yes&quot; or &quot;yes as a pie chart&quot;.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Revenue share by product line</p>
            <DonutMock />
            <p className="mt-4 text-xs text-slate-600 dark:text-slate-400">Illustrative example. The numbers are invented.</p>
          </div>
        </div>
      </Section>

      <Section tone="subtle" labelledBy="f-safe">
        <SectionHeading id="f-safe" title="Private and contained" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <FeatureCard icon={<Icon name="lock" />} title="Per-account datasets">Datasets are visible only to the account that created them. Delete one, or your whole account, and its files are removed.</FeatureCard>
          <FeatureCard icon={<Icon name="code" />} title="Validated code">Generated analysis code is checked against an allow-list and run in an isolated subprocess with a timeout.</FeatureCard>
          <FeatureCard icon={<Icon name="shield" />} title="Honest limits">Limited data goes to Google&apos;s Gemini API to write answers. The security page explains exactly what.</FeatureCard>
        </div>
      </Section>

      <CTA />
    </>
  );
}
